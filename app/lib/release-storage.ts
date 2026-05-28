import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { putObject } from "./object-storage";

const MAX_MASTER_SIZE = 200 * 1024 * 1024;
const MAX_COVER_SIZE = 20 * 1024 * 1024;
const ALLOWED_MASTER_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/aiff",
  "audio/x-aiff",
]);
const ALLOWED_COVER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function hasImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a;
  }

  if (mimeType === "image/webp") {
    return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
}

function hasAudioSignature(bytes: Buffer, mimeType: string) {
  const header = bytes.subarray(0, 16);
  const ascii = header.toString("ascii");

  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return ascii.startsWith("ID3") || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
  }

  if (mimeType.includes("wav")) {
    return ascii.startsWith("RIFF") && bytes.subarray(8, 12).toString("ascii") === "WAVE";
  }

  if (mimeType.includes("flac")) {
    return ascii.startsWith("fLaC");
  }

  if (mimeType.includes("aiff")) {
    return ascii.startsWith("FORM");
  }

  return true;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

function validateReleaseAsset(file: File, type: "MASTER" | "COVER") {
  const maxSize = type === "MASTER" ? MAX_MASTER_SIZE : MAX_COVER_SIZE;
  const allowedTypes = type === "MASTER" ? ALLOWED_MASTER_TYPES : ALLOWED_COVER_TYPES;

  if (!file.size) {
    return false;
  }

  if (file.size > maxSize) {
    throw new Error(type === "MASTER" ? "Master acima do limite de 200MB." : "Capa acima do limite de 20MB.");
  }

  if (!allowedTypes.has(file.type)) {
    throw new Error(type === "MASTER" ? "Formato de master nao suportado." : "Formato de capa nao suportado.");
  }

  return true;
}

export function releaseStoragePath(storageKey: string) {
  return `releases/${storageKey}`;
}

export async function saveReleaseAsset(file: File, releaseId: string, type: "MASTER" | "COVER") {
  if (!validateReleaseAsset(file, type)) {
    return null;
  }

  const originalName = sanitizeFileName(file.name || type.toLowerCase());
  const extension = extname(originalName);
  const storageKey = `${releaseId}-${type.toLowerCase()}-${randomUUID()}${extension || ".asset"}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (type === "COVER" && !hasImageSignature(bytes, file.type)) {
    throw new Error("Assinatura da imagem nao corresponde ao formato informado.");
  }

  if (type === "MASTER" && !hasAudioSignature(bytes, file.type)) {
    throw new Error("Assinatura do master nao corresponde ao formato informado.");
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");

  await putObject({
    key: releaseStoragePath(storageKey),
    body: bytes,
    contentType: file.type,
  });

  return {
    type,
    storageKey,
    fileName: originalName,
    mimeType: file.type,
    sizeBytes: file.size,
    checksum,
  };
}
