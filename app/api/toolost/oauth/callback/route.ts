import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  await prisma.auditLog.create({
    data: {
      action: error ? "DISTRIBUTION_OAUTH_ERROR" : "DISTRIBUTION_OAUTH_CALLBACK_RECEIVED",
      entity: "DistributionIntegration",
      entityId: state || "oauth-callback",
      metadata: {
        hasCode: Boolean(code),
        error,
        state,
      },
    },
  });

  const redirectUrl = new URL("/admin/integracoes", request.url);
  redirectUrl.searchParams.set("sucesso", error ? "oauth_erro" : "oauth_recebido");
  if (error) {
    redirectUrl.searchParams.set("status", error);
  }

  return NextResponse.redirect(redirectUrl);
}
