import { platformDisplayName } from "./platforms";

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    AVAILABLE: "Disponível",
    IN_NEGOTIATION: "Em negociação",
    RESERVED: "Reservada",
    RECORDED: "Gravada",
    UNAVAILABLE: "Indisponível",
  };

  return labels[status] ?? status;
}

export function purposeLabel(purpose: string) {
  const labels: Record<string, string> = {
    RECORD: "Gravar single",
    EVALUATE: "Avaliar repertorio",
    RESERVE: "Reservar obra",
    CONTACT_AUTHOR: "Falar com autor",
  };

  return labels[purpose] ?? purpose;
}

export function interestStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SENT: "Novo interesse",
    VIEWED: "Aguardando resposta",
    ACCEPTED: "Em conversa",
    DECLINED: "Recusado",
    CLOSED: "Encerrado",
  };

  return labels[status] ?? status;
}

export function visibilityLabel(visibility: string) {
  const labels: Record<string, string> = {
    PUBLIC: "Publico",
    INTERESTED: "Apos interesse",
    PRIVATE: "Privado",
  };

  return labels[visibility] ?? visibility;
}

export function releaseStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    REVIEW: "Em revisão",
    READY: "Pronto para envio",
    SUBMITTED: "Enviado para distribuidora",
    DELIVERED: "Entregue às plataformas",
    REJECTED: "Reprovado",
  };

  return labels[status] ?? status;
}

export function platformLabel(platform: string) {
  return platformDisplayName(platform);
}

export function platformStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Aguardando pacote",
    QUEUED: "Na fila de envio",
    SENT: "Enviado",
    DELIVERED: "Entregue",
    ERROR: "Com pendência",
  };

  return labels[status] ?? status;
}
