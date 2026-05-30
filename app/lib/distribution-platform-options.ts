import "server-only";

import { decryptSecret } from "./crypto-secrets";
import { DEFAULT_DISTRIBUTION_PLATFORMS, type DistributionPlatformOption } from "./platforms";
import { prisma } from "./prisma";
import { getTooLostPlatforms, TOOLOST_API_BASE_URL } from "./toolost";

export async function getAvailableDistributionPlatforms(): Promise<DistributionPlatformOption[]> {
  const integration = await prisma.distributionIntegration.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!integration || !integration.endpoint.startsWith(TOOLOST_API_BASE_URL)) {
    return DEFAULT_DISTRIBUTION_PLATFORMS;
  }

  try {
    const data = await getTooLostPlatforms(decryptSecret(integration.apiKeyEncrypted));
    const excluded = new Set([
      ...(data.aiExcludedPlatforms ?? []),
      ...(data.additionalDelivery?.excluded ?? []),
    ]);
    const platforms = (data.platforms ?? []).filter((platform) => platform && !excluded.has(platform));

    if (!platforms.length) {
      return DEFAULT_DISTRIBUTION_PLATFORMS;
    }

    return platforms.map((platform) => ({
      value: platform,
      label: platform,
    }));
  } catch {
    return DEFAULT_DISTRIBUTION_PLATFORMS;
  }
}

