import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { buildRoyaltyCsv, buildRoyaltyExport, royaltyExportFileName } from "../../../../lib/royalty-export";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.roles.some((role) => role.role === "ADMIN");
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      owner: true,
      royaltyStatements: {
        orderBy: { createdAt: "desc" },
        include: {
          participants: true,
        },
      },
    },
  });

  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  if (!isAdmin && release.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (format === "csv") {
    return new NextResponse(buildRoyaltyCsv(release), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${royaltyExportFileName(release.title, release.id, "csv")}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  return new NextResponse(JSON.stringify(buildRoyaltyExport(release), null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${royaltyExportFileName(release.title, release.id, "json")}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
