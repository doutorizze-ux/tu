import type { AuditLog, DistributionDelivery, ReleaseAsset, ReleaseReview, User } from "@prisma/client";

type ReviewWithReviewer = ReleaseReview & {
  reviewer: User;
};

type TimelineInput = {
  assets: ReleaseAsset[];
  auditLogs: AuditLog[];
  deliveries: DistributionDelivery[];
  reviews: ReviewWithReviewer[];
};

export type ReleaseTimelineItem = {
  at: Date;
  detail: string;
  id: string;
  source: "AUDIT" | "DELIVERY" | "REVIEW" | "ASSET";
  status?: string;
  title: string;
};

const auditLabels: Record<string, string> = {
  DISTRIBUTION_WEBHOOK_RECEIVED: "Retorno recebido da distribuidora",
  RELEASE_APPROVED_BY_OPERATIONS: "Pacote aprovado pela operacao",
  RELEASE_ASSETS_UPLOADED: "Arquivos enviados",
  RELEASE_CORRECTED_AND_RESUBMITTED: "Pacote corrigido e reenviado",
  RELEASE_CREATED: "Lancamento criado",
  RELEASE_DELIVERED_TO_PLATFORMS: "Entrega registrada nas plataformas",
  RELEASE_DELIVERY_BLOCKED: "Envio bloqueado pela integracao",
  RELEASE_REJECTED_BY_OPERATIONS: "Pendencia registrada pela operacao",
  RELEASE_SUBMITTED_FOR_OPERATIONS_REVIEW: "Enviado para revisao operacional",
  RELEASE_SUBMITTED_TO_DISTRIBUTION_PARTNER: "Enviado para distribuidora",
};

function metadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function auditDetail(log: AuditLog) {
  const status = metadataValue(log.metadata, "status");
  const provider = metadataValue(log.metadata, "provider");
  const errorMessage = metadataValue(log.metadata, "errorMessage");
  const note = metadataValue(log.metadata, "note");

  return [provider ? `Provider: ${provider}` : null, status ? `Status: ${status}` : null, note, errorMessage]
    .filter(Boolean)
    .join(" - ") || "Evento registrado no historico do lancamento.";
}

export function buildReleaseTimeline({
  assets,
  auditLogs,
  deliveries,
  reviews,
}: TimelineInput): ReleaseTimelineItem[] {
  const assetItems = assets.map((asset) => ({
    at: asset.createdAt,
    detail: `${asset.fileName} - ${Math.round(asset.sizeBytes / 1024)} KB${asset.checksum ? ` - SHA-256 ${asset.checksum.slice(0, 16)}...` : ""}`,
    id: `asset-${asset.id}`,
    source: "ASSET" as const,
    status: asset.type,
    title: asset.type === "MASTER" ? "Master registrado" : "Capa registrada",
  }));

  const auditItems = auditLogs.map((log) => ({
    at: log.createdAt,
    detail: auditDetail(log),
    id: `audit-${log.id}`,
    source: "AUDIT" as const,
    status: log.action,
    title: auditLabels[log.action] ?? log.action,
  }));

  const deliveryItems = deliveries.map((delivery) => ({
    at: delivery.createdAt,
    detail: `${delivery.provider}${delivery.responseStatus ? ` - HTTP ${delivery.responseStatus}` : ""}${delivery.errorMessage ? ` - ${delivery.errorMessage}` : ""}`,
    id: `delivery-${delivery.id}`,
    source: "DELIVERY" as const,
    status: delivery.status,
    title: "Tentativa de envio para distribuidora",
  }));

  const reviewItems = reviews.map((review) => ({
    at: review.createdAt,
    detail: `${review.reviewer.name}${review.note ? ` - ${review.note}` : ""}`,
    id: `review-${review.id}`,
    source: "REVIEW" as const,
    status: review.decision,
    title: review.decision === "APPROVED" ? "Aprovacao operacional" : "Pendencia operacional",
  }));

  return [...assetItems, ...auditItems, ...deliveryItems, ...reviewItems].sort(
    (a, b) => b.at.getTime() - a.at.getTime(),
  );
}
