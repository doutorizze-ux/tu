import type {
  AuditLog,
  DistributionDelivery,
  Release,
  ReleaseAsset,
  ReleaseContributor,
  ReleasePlatform,
  ReleaseReview,
  User,
} from "@prisma/client";
import { buildDistributionPayload } from "./distribution-provider";
import { buildReleaseTimeline } from "./release-timeline";
import { validateReleasePackage } from "./release-validator";

type ReleaseReviewWithReviewer = ReleaseReview & {
  reviewer: User;
};

type ReleaseForExport = Release & {
  assets: ReleaseAsset[];
  contributors: ReleaseContributor[];
  deliveries: DistributionDelivery[];
  owner: User;
  platforms: ReleasePlatform[];
  reviews: ReleaseReviewWithReviewer[];
};

export function buildReleaseExport(release: ReleaseForExport, auditLogs: AuditLog[]) {
  const validation = validateReleasePackage(release);
  const timeline = buildReleaseTimeline({
    assets: release.assets,
    auditLogs,
    deliveries: release.deliveries,
    reviews: release.reviews,
  });
  const splitTotal = release.contributors.reduce(
    (total, contributor) => total + (contributor.royaltyShare ?? 0),
    0,
  );

  return {
    export: {
      schema: "tunix.release-package.v1",
      generatedAt: new Date().toISOString(),
    },
    release: {
      id: release.id,
      title: release.title,
      artistName: release.artistName,
      labelName: release.labelName,
      genre: release.genre,
      language: release.language,
      releaseType: release.releaseType,
      releaseDate: release.releaseDate?.toISOString() ?? null,
      isrc: release.isrc,
      upc: release.upc,
      status: release.status,
      notes: release.notes,
      createdAt: release.createdAt.toISOString(),
      updatedAt: release.updatedAt.toISOString(),
    },
    owner: {
      id: release.owner.id,
      name: release.owner.name,
      email: release.owner.email,
    },
    assets: release.assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      checksum: asset.checksum,
      storageKey: asset.storageKey,
      createdAt: asset.createdAt.toISOString(),
    })),
    platforms: release.platforms.map((platform) => ({
      id: platform.id,
      platform: platform.platform,
      status: platform.status,
      createdAt: platform.createdAt.toISOString(),
    })),
    contributors: release.contributors.map((contributor) => ({
      id: contributor.id,
      name: contributor.name,
      role: contributor.role,
      royaltyShare: contributor.royaltyShare,
      createdAt: contributor.createdAt.toISOString(),
    })),
    splits: {
      total: splitTotal,
      isBalanced: Math.abs(splitTotal - 100) <= 0.01,
    },
    validation: {
      canSubmit: validation.canSubmit,
      blockers: validation.blockers,
      warnings: validation.warnings,
      issues: validation.issues,
    },
    reviews: release.reviews.map((review) => ({
      id: review.id,
      decision: review.decision,
      note: review.note,
      reviewer: {
        id: review.reviewer.id,
        name: review.reviewer.name,
        email: review.reviewer.email,
      },
      createdAt: review.createdAt.toISOString(),
    })),
    deliveries: release.deliveries.map((delivery) => ({
      id: delivery.id,
      provider: delivery.provider,
      endpoint: delivery.endpoint,
      status: delivery.status,
      responseStatus: delivery.responseStatus,
      responseBody: delivery.responseBody,
      errorMessage: delivery.errorMessage,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    })),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    })),
    timeline: timeline.map((item) => ({
      id: item.id,
      source: item.source,
      title: item.title,
      detail: item.detail,
      status: item.status,
      at: item.at.toISOString(),
    })),
    distributionPayload: buildDistributionPayload(release),
  };
}

export function exportFileName(title: string, id: string) {
  const safeTitle = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return `tunix-${safeTitle || "lancamento"}-${id}.json`;
}
