import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer, type Server } from "node:http";
import { app } from "../src/app";
import { renderDiary, validDiaryToken } from "../src/services/diaryPage";

test("validates share tokens and renders client updates as text", () => {
  assert.equal(validDiaryToken("a".repeat(64)), true);
  assert.equal(validDiaryToken("../budget"), false);
  const page = renderDiary("<script>obra</script>", [{
    description: '<img src=x onerror="alert(1)">',
    captured_at: "2026-11-11T17:00:00Z",
    capture_timezone: "America/Sao_Paulo",
    photoUrl: "/diario/example/photo/example",
  }]);
  assert.ok(page.includes("14:00"));
  assert.ok(page.includes("&lt;script&gt;"));
  assert.ok(!page.includes("<img src=x"));
});
test("as fotos antigas e do Cloudinary exigem link ativo e ficam limitadas à obra", async (t) => {
  const token = "b".repeat(64);
  const entryId = "00000000-0000-4000-8000-000000000001";
  const otherId = "00000000-0000-4000-8000-000000000002";
  let active = true;
  let photoPath = "owner/budget/photo.jpg";
  let cloudinaryReads = 0;
  const upstream = createServer((req, res) => {
    const url = new URL(req.url!, "http://localhost");
    if (url.pathname === "/storage/v1/object/work-diary-photos/owner/budget/photo.jpg") {
      res.setHeader("Content-Type", "image/jpeg");
      res.end(Buffer.from([255, 216, 255, 217]));
      return;
    }
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/rest/v1/work_diaries") {
      res.end(JSON.stringify(active && url.searchParams.get("share_token") === `eq.${token}`
        ? [{ budget_id: "budget", budget: { title: "Reforma" } }] : []));
      return;
    }
    if (url.pathname === "/rest/v1/work_diary_entries" && url.searchParams.get("budget_id") === "eq.budget") {
      const id = url.searchParams.get("id");
      res.end(JSON.stringify(id && id !== `eq.${entryId}` ? [] : [{
        id: entryId, description: "Pintura concluída", captured_at: "2026-11-11T17:00:00Z",
        capture_timezone: "America/Sao_Paulo", photo_path: photoPath,
      }]));
      return;
    }
    res.writeHead(404).end("{}");
  });
  const api = createServer(app);
  const listen = async (server: Server) => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address !== "string");
    return `http://127.0.0.1:${address.port}`;
  };
  try {
    process.env.SUPABASE_URL = await listen(upstream);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
    process.env.CLOUDINARY_CLOUD_NAME = "test-diary";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    const realFetch = globalThis.fetch;
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.hostname !== "res.cloudinary.com") return realFetch(input, init);
      cloudinaryReads++;
      assert.match(url.pathname, /^\/test-diary\/image\/authenticated\/s--[^/]+--\//);
      return new Response(Uint8Array.of(255, 216, 255, 217), { headers: { "Content-Type": "image/jpeg" } });
    });
    const base = await listen(api);
    const link = `${base}/diario/${token}`;
    const page = await fetch(link);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("cache-control") ?? "", /no-store/);
    assert.match(await page.text(), /Pintura concluída/);
    assert.equal((await fetch(`${link}/foto/${otherId}`)).status, 404);
    assert.equal((await fetch(`${link}/foto/${entryId}`)).status, 200);
    photoPath = `cloudinary/pocket-obras/diario/${"a".repeat(64)}`;
    const photo = await fetch(`${link}/foto/${entryId}`);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get("location"), null);
    assert.equal(cloudinaryReads, 1);
    active = false;
    assert.equal((await fetch(link)).status, 404);
    assert.equal((await fetch(`${link}/foto/${entryId}`)).status, 404);
    assert.equal(cloudinaryReads, 1, "link revogado não consulta o Cloudinary");
  } finally {
    for (const server of [api, upstream]) {
      if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
});
