import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";

const LOCAL_STORAGE_ROOT = join(process.cwd(), "storage");

function s3Bucket() {
  return process.env.S3_BUCKET?.trim();
}

function s3Client() {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const region = process.env.S3_REGION?.trim() || "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!s3Bucket() || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function objectStorageEnabled() {
  return Boolean(s3Client());
}

function localPath(key: string) {
  return join(LOCAL_STORAGE_ROOT, key);
}

export async function putObject({
  body,
  contentType,
  key,
}: {
  body: Buffer;
  contentType: string;
  key: string;
}) {
  const client = s3Client();
  const bucket = s3Bucket();

  if (client && bucket) {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return;
  }

  const path = localPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

async function streamToBuffer(stream: unknown) {
  if (stream && typeof stream === "object" && "transformToByteArray" in stream) {
    const bytes = await (stream as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  if (stream instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }

  throw new Error("Formato de stream S3 nao suportado.");
}

export async function getObject(key: string) {
  const client = s3Client();
  const bucket = s3Bucket();

  if (client && bucket) {
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    return streamToBuffer(response.Body);
  }

  return readFile(localPath(key));
}
