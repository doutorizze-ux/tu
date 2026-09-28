import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);
const MAX_MASTER_SIZE = 200 * 1024 * 1024;
const CONVERTIBLE_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".aac"]);

/** Converts only when the artist explicitly selected the FLAC conversion option. */
export async function prepareReleaseMaster(file: FormDataEntryValue | null, convertToFlac: boolean) {
  if (!(file instanceof File) || file.size === 0 || !convertToFlac) {
    return file;
  }

  const extension = extname(file.name).toLowerCase();
  if (extension === ".flac") {
    return file;
  }

  if (!CONVERTIBLE_EXTENSIONS.has(extension)) {
    throw new Error("Selecione um arquivo WAV, AIFF, MP3, M4A ou AAC para converter em FLAC.");
  }

  if (file.size > MAX_MASTER_SIZE) {
    throw new Error("O áudio original deve ter no máximo 200 MB.");
  }

  const executable = process.env.FFMPEG_PATH || ffmpegPath;
  if (!executable) {
    throw new Error("A conversão de áudio está indisponível neste servidor. Tente enviar um arquivo FLAC pronto.");
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "tunix-flac-"));
  const inputPath = join(temporaryDirectory, `original${extension}`);
  const outputPath = join(temporaryDirectory, "convertido.flac");

  try {
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    try {
      await execFileAsync(executable, [
        "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-i", inputPath,
        "-map", "0:a:0", "-vn", "-c:a", "flac", "-compression_level", "5",
        outputPath,
      ], { timeout: 5 * 60 * 1000, maxBuffer: 1024 * 1024, windowsHide: true });
    } catch {
      throw new Error("Não foi possível converter este áudio. Confira se o arquivo está íntegro e tente novamente.");
    }

    const output = await stat(outputPath);
    if (!output.size || output.size > MAX_MASTER_SIZE) {
      throw new Error("O FLAC convertido ultrapassou o limite de 200 MB. Envie um arquivo menor.");
    }

    const bytes = await readFile(outputPath);
    if (bytes.subarray(0, 4).toString("ascii") !== "fLaC") {
      throw new Error("O áudio convertido não gerou um arquivo FLAC válido.");
    }

    const name = file.name.slice(0, -extension.length).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "master";
    return new File([bytes], `${name}.flac`, { type: "audio/flac" });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
