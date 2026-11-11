import { randomBytes } from "node:crypto";
import { raw, Router } from "express";
import { createDiaryServerClient } from "../lib/supabase";
import { requireAuth } from "../middleware/requireAuth";
import { renderDiary, validDiaryToken } from "../services/diaryPage";
import { cloudinaryDiaryId, readDiaryPhoto, uploadDiaryPhoto } from "../services/diaryPhotos";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const diaryRoutes = Router();

diaryRoutes.use((_request, response, next) => {
  response.set({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow" });
  next();
});

diaryRoutes.post("/acesso/:budgetId", requireAuth, async (request, response) => {
  const { budgetId } = request.params;
  const action = request.body?.action;
  if (typeof budgetId !== "string" || !uuid.test(budgetId) ||
      (action !== "enable" && action !== "revoke")) {
    response.sendStatus(400);
    return;
  }
  if (action === "enable") createDiaryServerClient();
  const token = action === "enable" ? randomBytes(32).toString("hex") : null;
  const update = request.supabase.from("work_diaries")
    .update({ share_token: token }).eq("budget_id", budgetId);
  if (action === "enable") update.is("share_token", null);
  const { data, error } = await update.select("share_token").maybeSingle();
  if (error) throw error;
  if (data) { response.json({ token: data.share_token }); return; }
  if (action === "enable") {
    const existing = await request.supabase.from("work_diaries")
      .select("share_token").eq("budget_id", budgetId).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.share_token) {
      response.json({ token: existing.data.share_token });
      return;
    }
  }
  response.sendStatus(404);
});

diaryRoutes.post("/obras/:budgetId/atualizacoes", requireAuth,
  raw({ type: "image/jpeg", limit: "8mb", inflate: false }), async (request, response) => {
    const budgetId = request.params.budgetId;
    if (typeof budgetId !== "string" || !uuid.test(budgetId)) { response.sendStatus(400); return; }
    const jpeg = request.body;
    if (!Buffer.isBuffer(jpeg) || jpeg.length < 4 || jpeg[0] !== 255 || jpeg[1] !== 216 ||
        jpeg[jpeg.length - 2] !== 255 || jpeg[jpeg.length - 1] !== 217) {
      response.status(400).json({ error: "Envie uma foto JPEG válida." });
      return;
    }
    let details: { description?: unknown; captured_at?: unknown; capture_timezone?: unknown };
    try {
      const value = JSON.parse(decodeURIComponent(request.get("X-Diary-Metadata") ?? ""));
      if (!value || typeof value !== "object") throw new Error();
      details = value;
    } catch {
      response.status(400).json({ error: "Dados da atualização inválidos." });
      return;
    }
    const description = typeof details.description === "string" ? details.description.trim() : "";
    const capturedAt = typeof details.captured_at === "string" ? new Date(details.captured_at) : null;
    const timezone = details.capture_timezone;
    if (!description || description.length > 500 || !capturedAt || !Number.isFinite(capturedAt.getTime()) ||
        typeof timezone !== "string" || !timezone || timezone.length > 80) {
      response.status(400).json({ error: "Informe a descrição, a data e o fuso da foto." });
      return;
    }
    try {
      new Intl.DateTimeFormat("pt-BR", { timeZone: timezone });
    } catch {
      response.status(400).json({ error: "Fuso horário inválido." });
      return;
    }
    const { data: diary, error: ownerError } = await request.supabase.from("work_diaries")
      .select("budget_id").eq("budget_id", budgetId).maybeSingle();
    if (ownerError) throw ownerError;
    if (!diary) { response.sendStatus(404); return; }

    const captured_at = capturedAt.toISOString();
    const cloudinaryId = cloudinaryDiaryId(request.user.id, budgetId, captured_at, timezone, description, jpeg);
    const photo_path = `cloudinary/${cloudinaryId}`;
    const db = createDiaryServerClient();
    const { data: existing, error: lookupError } = await db.from("work_diary_entries")
      .select("id").eq("budget_id", budgetId).eq("photo_path", photo_path).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) { response.sendStatus(204); return; }
    await uploadDiaryPhoto(cloudinaryId, jpeg);
    const { error } = await db.from("work_diary_entries").upsert({
      budget_id: budgetId, description, photo_path, captured_at, capture_timezone: timezone,
    }, { onConflict: "photo_path", ignoreDuplicates: true });
    if (error) throw error;
    response.sendStatus(201);
  },
);

diaryRoutes.get("/obras/:budgetId/foto/:id", requireAuth, async (request, response) => {
  const { budgetId, id } = request.params;
  if (typeof budgetId !== "string" || typeof id !== "string" ||
      !uuid.test(budgetId) || !uuid.test(id)) { response.sendStatus(404); return; }
  const { data, error } = await request.supabase.from("work_diary_entries")
    .select("photo_path").eq("budget_id", budgetId).eq("id", id).maybeSingle();
  if (error) throw error;
  const photo = data && await readDiaryPhoto(request.supabase, data.photo_path);
  if (!photo) { response.sendStatus(404); return; }
  response.type(photo.type).send(photo.body);
});

async function openDiary(token: string) {
  if (!validDiaryToken(token)) return null;
  const db = createDiaryServerClient();
  const { data, error } = await db.from("work_diaries")
    .select("budget_id, budget:budgets(title)").eq("share_token", token).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const budget = Array.isArray(data.budget) ? data.budget[0] : data.budget;
  return { db, budgetId: data.budget_id, title: budget?.title ?? "Obra" };
}

diaryRoutes.get("/:token/foto/:id", async (request, response) => {
  const { token, id } = request.params;
  if (!uuid.test(id)) { response.sendStatus(404); return; }
  const diary = await openDiary(token);
  if (!diary) { response.sendStatus(404); return; }
  const { data, error } = await diary.db.from("work_diary_entries")
    .select("photo_path").eq("budget_id", diary.budgetId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) { response.sendStatus(404); return; }
  const photo = await readDiaryPhoto(diary.db, data.photo_path);
  if (!photo) { response.sendStatus(404); return; }
  response.type(photo.type).send(photo.body);
});

diaryRoutes.get("/:token", async (request, response) => {
  const { token } = request.params;
  const diary = await openDiary(token);
  if (!diary) {
    response.status(404).type("html").send(renderDiary("Link indisponível", []));
    return;
  }
  const { data, error } = await diary.db.from("work_diary_entries")
    .select("id, description, captured_at, capture_timezone")
    .eq("budget_id", diary.budgetId).order("captured_at", { ascending: false });
  if (error) throw error;
  response.type("html").send(renderDiary(diary.title, (data ?? []).map((entry) => ({
    ...entry, photoUrl: `/diario/${token}/foto/${entry.id}`,
  }))));
});
