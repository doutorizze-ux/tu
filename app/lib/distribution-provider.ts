import "server-only";

import type { Release, ReleaseAsset, ReleaseContributor, ReleasePlatform } from "@prisma/client";
import { decryptSecret } from "./crypto-secrets";
import { normalizePlatformValue } from "./platforms";
import { prisma } from "./prisma";
import { submitTooLostDistribution, TOOLOST_API_BASE_URL, TooLostDistributionError } from "./toolost";

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
  providerReleaseId?: string;
  providerTrackId?: string | null;
  isrc?: string | null;
  upc?: string | null;
};

export function buildDistributionPayload(release: ReleaseWithRelations) {
  return {
    externalReleaseId: release.id,
    providerReleaseId: release.providerReleaseId,
    title: release.title,
    trackTitle: release.trackTitle ?? release.title,
    versionTitle: release.versionTitle,
    artistName: release.artistName,
    primaryArtistLegalName: release.primaryArtistLegalName,
    labelName: release.labelName,
    rightsHolder: {
      name: release.rightsHolderName,
      document: release.rightsHolderDocument,
    },
    genre: release.genre,
    language: release.language,
    releaseType: release.releaseType,
    releaseDate: release.releaseDate?.toISOString() ?? null,
    explicitContent: release.explicitContent,
    copyright: {
      pLine: release.pLine,
      cLine: release.cLine,
      year: release.copyrightYear,
    },
    territories: release.territories,
    previewStartSec: release.previewStartSec,
    identifiers: {
      isrc: release.isrc,
      upc: release.upc,
      requestIsrcAssignment: release.requestIsrcAssignment,
      requestUpcAssignment: release.requestUpcAssignment,
    },
    files: {
      master: release.assets?.find((asset) => asset.type === "MASTER") ?? null,
      cover: release.assets?.find((asset) => asset.type === "COVER") ?? null,
      legacyMasterFileName: release.masterFileName,
      legacyCoverFileName: release.coverFileName,
    },
    platforms: release.platforms.map((item) => normalizePlatformValue(item.platform)),
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
    if (config.endpoint.startsWith(TOOLOST_API_BASE_URL)) {
      const result = await submitTooLostDistribution(config.apiKey, payload as ReturnType<typeof buildDistributionPayload>);

      return {
        ok: true,
        status: "SENT",
        responseStatus: result.status,
        responseBody: result.responseBody,
        providerReleaseId: String(result.releaseId),
        providerTrackId: result.trackId,
        isrc: result.isrc,
        upc: result.upc,
      };
    }

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
      providerReleaseId: error instanceof TooLostDistributionError ? String(error.releaseId) : undefined,
    };
  }
}
