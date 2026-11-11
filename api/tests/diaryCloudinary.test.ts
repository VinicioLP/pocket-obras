import assert from "node:assert/strict";
import { test } from "node:test";
import { PassThrough } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryDiaryId, getCloudinaryDiaryId, uploadDiaryPhoto } from "../src/services/diaryPhotos";

test("a referência da foto é estável na repetição e separada por obra", () => {
  const bytes = Buffer.from([255, 216, 255, 217]);
  const id = cloudinaryDiaryId("owner", "obra-1", "2026-11-11T22:00:00Z", "UTC", "Piso", bytes);
  assert.equal(id, cloudinaryDiaryId("owner", "obra-1", "2026-11-11T22:00:00Z", "UTC", "Piso", bytes));
  assert.notEqual(id, cloudinaryDiaryId("owner", "obra-2", "2026-11-11T22:00:00Z", "UTC", "Piso", bytes));
  assert.equal(getCloudinaryDiaryId(`cloudinary/${id}`), id);
  assert.equal(getCloudinaryDiaryId("owner/budget/old.jpg"), null);
  assert.equal(getCloudinaryDiaryId("cloudinary/https://example.test"), null);
});

test("o SDK envia JPEG autenticado sem sobrescrever o arquivo em tentativas repetidas", async (t) => {
  process.env.CLOUDINARY_CLOUD_NAME = "test-diary";
  process.env.CLOUDINARY_API_KEY = "test-key";
  process.env.CLOUDINARY_API_SECRET = "test-secret";
  const jpeg = Buffer.from([255, 216, 255, 217]);
  const id = cloudinaryDiaryId("owner", "obra-1", "2026-11-11T22:00:00Z", "UTC", "Piso", jpeg);
  const upload = t.mock.method(cloudinary.uploader, "upload_stream", (options, callback) => {
    assert.equal(options.public_id, id);
    assert.equal(options.type, "authenticated");
    assert.equal(options.overwrite, false);
    const stream = new PassThrough();
    stream.once("data", (body: Buffer) => assert.deepEqual(body, jpeg));
    stream.once("end", () => callback(undefined, { public_id: id }));
    return stream;
  });
  await uploadDiaryPhoto(id, jpeg);
  assert.equal(upload.mock.callCount(), 1);
});
