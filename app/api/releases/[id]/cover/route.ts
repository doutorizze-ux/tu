import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getObject } from "../../../../lib/object-storage";
import { releaseStoragePath } from "../../../../lib/release-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const release = await prisma.release.findUnique({
    where: { id },
    include: { assets: true },
  });

  if (!release) {
    return new NextResponse("Release not found", { status: 404 });
  }

  const coverAsset = release.assets.find((asset) => asset.type === "COVER");
  if (!coverAsset) {
    return new NextResponse("Cover asset not found", { status: 404 });
  }

  try {
    const bytes = await getObject(releaseStoragePath(coverAsset.storageKey));
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": coverAsset.mimeType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new NextResponse("Error loading cover asset", { status: 500 });
  }
}
