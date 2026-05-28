import { NextResponse } from "next/server";
import { canAccessProtectedContent } from "../../../lib/access";
import { audioStoragePath } from "../../../lib/audio-storage";
import { getCurrentUser } from "../../../lib/auth";
import { getObject } from "../../../lib/object-storage";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ compositionId: string }> },
) {
  const { compositionId } = await params;
  const user = await getCurrentUser();
  const composition = await prisma.composition.findUnique({
    where: { id: compositionId },
    include: {
      audio: true,
      interests: {
        where: {
          userId: user?.id ?? "__guest__",
        },
      },
    },
  });

  if (!composition?.audio) {
    return new NextResponse("Audio nao encontrado.", { status: 404 });
  }

  const isOwner = user?.id === composition.composerId;
  const hasInterest = Boolean(composition.interests.length);
  const canHearAudio = canAccessProtectedContent({
    visibility: composition.audioVisibility,
    isOwner,
    hasInterest,
  });

  if (!canHearAudio) {
    return new NextResponse("Acesso negado.", { status: 403 });
  }

  const bytes = await getObject(audioStoragePath(composition.audio.storageKey));

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": composition.audio.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${composition.audio.fileName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
