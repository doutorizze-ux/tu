import "server-only";

import type { Release, ReleaseAsset, ReleaseContributor, ReleasePlatform } from "@prisma/client";
import { decryptSecret } from "./crypto-secrets";
import { prisma } from "./prisma";

type ReleaseWithRelations = Release & {
  assets?: ReleaseAsset[];
  contributors: ReleaseContributor[];
  platforms: ReleasePlatform[];
};

export type PartnerDeliveryResult = {
  ok: boolean;
  status: "CONFIG_REQUIRED" | "SENT" | "PROVIDER_ERROR";
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
};

export function buildDistributionPayload(release: ReleaseWithRelations) {
  return {
    externalReleaseId: release.id,
    title: release.title,
    artistName: release.artistName,
    labelName: release.labelName,
    genre: release.genre,
    language: release.language,
    releaseType: release.releaseType,
    releaseDate: release.releaseDate?.toISOString() ?? null,
    identifiers: {
      isrc: release.isrc,
      upc: release.upc,
    },
    files: {
      master: release.assets?.find((asset) => asset.type === "MASTER") ?? null,
      cover: release.assets?.find((asset) => asset.type === "COVER") ?? null,
      legacyMasterFileName: release.masterFileName,
      legacyCoverFileName: release.coverFileName,
    },
    platforms: release.platforms.map((item) => item.platform),
    contributors: release.contributors.map((item) => ({
      name: item.name,
      role: item.role,
      royaltyShare: item.royaltyShare,
    })),
  };
}

export async function getDistributionProviderConfig() {
  const integration = await prisma.distributionIntegration.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (integration) {
    return {
      provider: integration.provider,
      environment: integration.environment,
      endpoint: integration.endpoint,
      apiKey: decryptSecret(integration.apiKeyEncrypted),
      integrationId: integration.id,
    };
  }

  return {
    provider: process.env.DISTRIBUTION_PROVIDER_NAME || "UNCONFIGURED_PROVIDER",
    environment: "ENV",
    endpoint: process.env.DISTRIBUTION_PROVIDER_ENDPOINT || "",
    apiKey: process.env.DISTRIBUTION_PROVIDER_API_KEY || "",
    integrationId: null,
  };
}

export async function submitToDistributionPartner(payload: unknown): Promise<PartnerDeliveryResult> {
  const config = await getDistributionProviderConfig();

  if (!config.endpoint || !config.apiKey) {
    return {
      ok: false,
      status: "CONFIG_REQUIRED",
      errorMessage: "DISTRIBUTION_PROVIDER_ENDPOINT e DISTRIBUTION_PROVIDER_API_KEY precisam ser configurados.",
    };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const responseBody = await response.text();

    return {
      ok: response.ok,
      status: response.ok ? "SENT" : "PROVIDER_ERROR",
      responseStatus: response.status,
      responseBody,
      errorMessage: response.ok ? undefined : `Provider returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: "PROVIDER_ERROR",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido ao chamar provider.",
    };
  }
}
