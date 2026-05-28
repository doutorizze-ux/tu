import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      service: "tunix",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      service: "tunix",
      error: error instanceof Error ? error.message : "unknown",
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
