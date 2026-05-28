import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "../../../../lib/crypto-secrets";
import { prisma } from "../../../../lib/prisma";
import { exchangeTooLostCode, getTooLostProfile, TOOLOST_API_BASE_URL } from "../../../../lib/toolost";

export const dynamic = "force-dynamic";

function adminRedirect(request: NextRequest, params: Record<string, string>) {
  const redirectUrl = new URL("/admin/integracoes", request.url);

  for (const [key, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(key, value);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  if (error) {
    await prisma.auditLog.create({
      data: {
        action: "TOOLOST_OAUTH_ERROR",
        entity: "DistributionIntegration",
        entityId: state || "oauth-callback",
        metadata: { error, state },
      },
    });

    return adminRedirect(request, { erro: "toolost_oauth", status: error });
  }

  if (!code || !state) {
    return adminRedirect(request, { erro: "toolost_oauth", status: "missing_code_or_state" });
  }

  const startedFlow = await prisma.auditLog.findFirst({
    where: {
      action: "TOOLOST_OAUTH_STARTED",
      entity: "DistributionIntegration",
      entityId: state,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!startedFlow) {
    await prisma.auditLog.create({
      data: {
        action: "TOOLOST_OAUTH_STATE_REJECTED",
        entity: "DistributionIntegration",
        entityId: state,
        metadata: { hasCode: Boolean(code) },
      },
    });

    return adminRedirect(request, { erro: "toolost_oauth", status: "invalid_state" });
  }

  try {
    const tokens = await exchangeTooLostCode(code);
    let profile: Awaited<ReturnType<typeof getTooLostProfile>> | null = null;

    try {
      profile = await getTooLostProfile(tokens.access_token);
    } catch {
      profile = null;
    }

    await prisma.distributionIntegration.updateMany({
      data: { isActive: false },
    });

    const integration = await prisma.distributionIntegration.create({
      data: {
        provider: "Too Lost",
        environment: "PRODUCTION",
        endpoint: TOOLOST_API_BASE_URL,
        testEndpoint: `${TOOLOST_API_BASE_URL}/me`,
        apiKeyEncrypted: encryptSecret(tokens.access_token),
        webhookSecretEncrypted: encryptSecret(tokens.refresh_token),
        isActive: true,
        status: "ACTIVE",
        lastTestStatus: 200,
        lastTestMessage: profile ? `Conectado: ${profile.email ?? profile.name ?? "perfil Too Lost"}` : "Token recebido.",
        lastTestedAt: new Date(),
      },
    });

    await prisma.distributionIntegrationLog.create({
      data: {
        integrationId: integration.id,
        action: "OAUTH_CONNECT",
        status: "OK",
        responseStatus: 200,
        message: `Too Lost conectado. Token expira em ${tokens.expires_in} segundos.`,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "TOOLOST_OAUTH_CONNECTED",
        entity: "DistributionIntegration",
        entityId: integration.id,
        metadata: {
          state,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in,
          profile: profile ? JSON.parse(JSON.stringify(profile)) : null,
        },
      },
    });

    return adminRedirect(request, { sucesso: "toolost_conectado", status: "OK" });
  } catch (tokenError) {
    const message = tokenError instanceof Error ? tokenError.message : "Erro desconhecido no OAuth Too Lost.";

    await prisma.auditLog.create({
      data: {
        action: "TOOLOST_OAUTH_TOKEN_ERROR",
        entity: "DistributionIntegration",
        entityId: state,
        metadata: { message },
      },
    });

    return adminRedirect(request, { erro: "toolost_oauth", status: message });
  }
}
