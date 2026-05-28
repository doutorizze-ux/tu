import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const STORAGE_ROOT = join(process.cwd(), "storage", "audio");
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
]);

function hasAudioSignature(bytes: Buffer, mimeType: string) {
  const header = bytes.subarray(0, 16);
  const ascii = header.toString("ascii");

  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return ascii.startsWith("ID3") || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
  }

  if (mimeType.includes("wav")) {
    return ascii.startsWith("RIFF") && bytes.subarray(8, 12).toString("ascii") === "WAVE";
  }

  if (mimeType.includes("ogg")) {
    return ascii.startsWith("OggS");
  }

  if (mimeType.includes("webm")) {
    return header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  }

  if (mimeType.includes("mp4") || mimeType.includes("aac")) {
    return bytes.subarray(4, 8).toString("ascii") === "ftyp" || ascii.startsWith("ADIF") || ascii.startsWith("ADTS");
  }

  return true;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export function audioStoragePath(storageKey: string) {
  return join(STORAGE_ROOT, storageKey);
}

export async function saveAudioGuide(file: File, compositionId: string) {
  if (!file.size) {
    return null;
  }

  if (file.size > MAX_AUDIO_SIZE) {
    throw new Error("Audio acima do limite de 25MB.");
  }

  if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
    throw new Error("Formato de audio nao suportado.");
  }

  await mkdir(STORAGE_ROOT, { recursive: true });

  const originalName = sanitizeFileName(file.name || "audio-guia");
  const extension = extname(originalName);
  const storageKey = `${compositionId}-${randomUUID()}${extension || ".audio"}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (!hasAudioSignature(bytes, file.type)) {
    throw new Error("Assinatura do arquivo de audio nao corresponde ao formato informado.");
  }

  await writeFile(audioStoragePath(storageKey), bytes);

  return {
    storageKey,
    fileName: originalName,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
