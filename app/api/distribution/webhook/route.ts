import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

type PlatformUpdate = {
  platform: string;
  status: string;
};

type DistributionWebhookPayload = {
  releaseId: string;
  status?: string;
  platforms?: PlatformUpdate[];
  providerReference?: string;
};

const allowedReleaseStatuses = new Set(["SUBMITTED", "DELIVERED", "REJECTED"]);
const allowedPlatformStatuses = new Set(["QUEUED", "SENT", "DELIVERED", "ERROR"]);

export async function POST(request: Request) {
  const configuredSecret = process.env.DISTRIBUTION_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-distribution-secret");

  if (!configuredSecret || receivedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as DistributionWebhookPayload;

  if (!payload.releaseId) {
    return NextResponse.json({ error: "releaseId is required" }, { status: 400 });
  }

  const release = await prisma.release.findUnique({
    where: { id: payload.releaseId },
    include: { platforms: true },
  });

  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  if (payload.status && allowedReleaseStatuses.has(payload.status)) {
    await prisma.release.update({
      where: { id: release.id },
      data: { status: payload.status },
    });
  }

  for (const item of payload.platforms ?? []) {
    if (!allowedPlatformStatuses.has(item.status)) {
      continue;
    }

    await prisma.releasePlatform.updateMany({
      where: {
        releaseId: release.id,
        platform: item.platform,
      },
      data: {
        status: item.status,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "DISTRIBUTION_WEBHOOK_RECEIVED",
      entity: "Release",
      entityId: release.id,
      metadata: {
        providerReference: payload.providerReference ?? null,
        status: payload.status ?? null,
        platforms: payload.platforms ?? [],
      },
    },
  });

  return NextResponse.json({ ok: true });
}
