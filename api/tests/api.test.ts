import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer, type Server } from "node:http";
import { app } from "../src/app";

const id = "12345678-1234-4234-8234-123456789012";
let base: string;
let api: Server;
let upstream: Server;
let databaseCalls = 0;

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

before(async () => {
  // Only the external Auth/Data API is replaced; Express, Supabase JS and PDFKit are real.
  upstream = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/auth/v1/user") {
      if (req.headers.authorization !== "Bearer valid-token") {
        res.writeHead(401).end(JSON.stringify({ message: "expired", code: "bad_jwt" }));
      } else {
        res.end(JSON.stringify({ id, aud: "authenticated", role: "authenticated", email: "test@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" }));
      }
      return;
    }
    databaseCalls++;
    assert.equal(req.headers.authorization, "Bearer valid-token");
    const url = new URL(req.url!, "http://localhost");
    assert.equal(url.pathname, "/rest/v1/budgets");
    if (url.searchParams.get("id") !== `eq.${id}`) {
      res.end("[]");
      return;
    }
    res.end(JSON.stringify([{ id, code: "ORC/001", title: "Pintura", description: null, status: "draft", issue_date: "2026-11-04", valid_until: null, discount: 5, notes: null, client: { name: "Cliente de teste" }, items: [{ id, name: "Pintura", description: null, unit: "m2", quantity: 2, unit_price: 50, sort_order: 0 }] }]));
  });
  process.env.SUPABASE_URL = await listen(upstream);
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  api = createServer(app);
  base = await listen(api);
});

after(async () => {
  for (const server of [api, upstream]) {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("health is public and unknown routes return JSON 404", async () => {
  assert.equal((await fetch(`${base}/health`)).status, 200);
  const missing = await fetch(`${base}/missing`);
  assert.equal(missing.status, 404);
  assert.equal(typeof (await missing.json()).error, "string");
});

test("missing, expired and malformed credentials cannot read budgets", async () => {
  const before = databaseCalls;
  for (const authorization of ["", "Basic abc", "Bearer expired", "Bearer valid-token extra"]) {
    const response = await fetch(`${base}/budgets/${id}/pdf`, { headers: { authorization } });
    assert.equal(response.status, 401, authorization);
  }
  assert.equal(databaseCalls, before);
});

test("invalid budget UUID is rejected before querying the database", async () => {
  const before = databaseCalls;
  const response = await fetch(`${base}/budgets/invalid/pdf`, { headers: { authorization: "Bearer valid-token" } });
  assert.equal(response.status, 400);
  assert.equal(databaseCalls, before);
});

test("budget hidden by RLS or absent returns 404", async () => {
  const response = await fetch(`${base}/budgets/12345678-1234-4234-8234-123456789013/pdf`, { headers: { authorization: "Bearer valid-token" } });
  assert.equal(response.status, 404);
});

test("authenticated request produces a private PDF attachment", async () => {
  const response = await fetch(`${base}/budgets/${id}/pdf`, { headers: { authorization: "Bearer valid-token" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type")!, /application\/pdf/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="orcamento-ORC-001.pdf"');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.equal(Number(response.headers.get("content-length")), bytes.length);
});

test("malformed JSON returns 400 instead of a server error", async () => {
  const response = await fetch(`${base}/budgets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(response.status, 400);
});

test("oversized JSON returns 413", async () => {
  const response = await fetch(`${base}/budgets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: "a".repeat(1024 * 1024) }) });
  assert.equal(response.status, 413);
});
