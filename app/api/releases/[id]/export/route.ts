import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { buildReleaseExport, exportFileName } from "../../../../lib/release-export";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = user.roles.some((role) => role.role === "ADMIN");
  const release = await prisma.release.findFirst({
    where: {
      id,
      ...(isAdmin ? {} : { ownerId: user.id }),
    },
    include: {
      assets: true,
      contributors: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
      },
      owner: true,
      platforms: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: true,
        },
      },
    },
  });

  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entity: "Release",
      entityId: release.id,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const body = JSON.stringify(buildReleaseExport(release, auditLogs), null, 2);

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${exportFileName(release.title, release.id)}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
