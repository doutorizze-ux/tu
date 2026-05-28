import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { royaltyImportTemplateCsv } from "../../../../../lib/royalty-import";
import { royaltyExportFileName } from "../../../../../lib/royalty-export";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = user.roles.some((role) => role.role === "ADMIN");

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const release = await prisma.release.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
    },
  });

  if (!release) {
    return NextResponse.json({ error: "Release not found" }, { status: 404 });
  }

  return new NextResponse(royaltyImportTemplateCsv(), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${royaltyExportFileName(release.title, release.id, "csv").replace("royalties", "royalties-import-template")}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
