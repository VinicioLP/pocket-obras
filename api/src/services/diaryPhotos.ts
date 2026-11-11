import { createHash } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import type { SupabaseClient } from "@supabase/supabase-js";

const cloudinaryPath = /^cloudinary\/(pocket-obras\/diario\/[a-f0-9]{64})$/;
const legacyBucket = "work-diary-photos";
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getCloudinaryDiaryId(path: string) {
  return cloudinaryPath.exec(path)?.[1] ?? null;
}

export function cloudinaryDiaryId(
  userId: string, budgetId: string, capturedAt: string, timezone: string, description: string, jpeg: Buffer,
) {
  const digest = createHash("sha256")
    .update(JSON.stringify([userId, budgetId, capturedAt, timezone, description]))
    .update(jpeg)
    .digest("hex");
  return `pocket-obras/diario/${digest}`;
}

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key,
    CLOUDINARY_API_SECRET: api_secret } = process.env;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary indisponível na API.");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

export function uploadDiaryPhoto(id: string, jpeg: Buffer) {
  configureCloudinary();
  return new Promise<void>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      public_id: id,
      resource_type: "image",
      type: "authenticated",
      format: "jpg",
      allowed_formats: ["jpg", "jpeg"],
      overwrite: false,
      timeout: 30000,
    }, (error, result) => {
      if (error || result?.public_id !== id) reject(new Error("Não foi possível salvar a foto no Cloudinary."));
      else resolve();
    });
    stream.on("error", () => reject(new Error("Não foi possível enviar a foto ao Cloudinary.")));
    stream.end(jpeg);
  });
}

export async function readDiaryPhoto(db: SupabaseClient, path: string) {
  const id = getCloudinaryDiaryId(path);
  if (id) {
    configureCloudinary();
    const url = cloudinary.url(id, { secure: true, sign_url: true, type: "authenticated", format: "jpg" });
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type")?.split(";")[0];
    if (type !== "image/jpeg") return null;
    return { type, body: Buffer.from(await response.arrayBuffer()) };
  }
  const { data, error } = await db.storage.from(legacyBucket).download(path);
  if (error || !data || !imageTypes.has(data.type)) return null;
  return { type: data.type, body: Buffer.from(await data.arrayBuffer()) };
}
