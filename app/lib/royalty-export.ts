import type { Release, RoyaltyParticipant, RoyaltyStatement, User } from "@prisma/client";

type StatementWithParticipants = RoyaltyStatement & {
  participants: RoyaltyParticipant[];
};

type ReleaseForRoyaltyExport = Release & {
  owner: User;
  royaltyStatements: StatementWithParticipants[];
};

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildRoyaltyExport(release: ReleaseForRoyaltyExport) {
  const totalGross = release.royaltyStatements.reduce((total, statement) => total + statement.grossAmount, 0);
  const totalNet = release.royaltyStatements.reduce((total, statement) => total + statement.netAmount, 0);
  const totalPaid = release.royaltyStatements
    .filter((statement) => statement.status === "PAID")
    .reduce((total, statement) => total + statement.netAmount, 0);

  return {
    export: {
      schema: "tunix.royalty-export.v1",
      generatedAt: new Date().toISOString(),
    },
    release: {
      id: release.id,
      title: release.title,
      artistName: release.artistName,
      status: release.status,
      isrc: release.isrc,
      upc: release.upc,
    },
    owner: {
      id: release.owner.id,
      name: release.owner.name,
      email: release.owner.email,
    },
    totals: {
      grossAmount: Number(totalGross.toFixed(2)),
      netAmount: Number(totalNet.toFixed(2)),
      paidAmount: Number(totalPaid.toFixed(2)),
      pendingAmount: Number((totalNet - totalPaid).toFixed(2)),
    },
    statements: release.royaltyStatements.map((statement) => ({
      id: statement.id,
      platform: statement.platform,
      periodStart: statement.periodStart.toISOString(),
      periodEnd: statement.periodEnd.toISOString(),
      currency: statement.currency,
      grossAmount: statement.grossAmount,
      netAmount: statement.netAmount,
      status: statement.status,
      source: statement.source,
      notes: statement.notes,
      createdAt: statement.createdAt.toISOString(),
      participants: statement.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        role: participant.role,
        share: participant.share,
        amount: participant.amount,
        status: participant.status,
      })),
    })),
  };
}

export function buildRoyaltyCsv(release: ReleaseForRoyaltyExport) {
  const rows = [
    [
      "release_id",
      "release_title",
      "artist_name",
      "statement_id",
      "platform",
      "period_start",
      "period_end",
      "currency",
      "gross_amount",
      "net_amount",
      "statement_status",
      "participant_name",
      "participant_role",
      "participant_share",
      "participant_amount",
      "participant_status",
      "source",
      "notes",
    ],
  ];

  for (const statement of release.royaltyStatements) {
    for (const participant of statement.participants) {
      rows.push([
        release.id,
        release.title,
        release.artistName,
        statement.id,
        statement.platform,
        formatDate(statement.periodStart),
        formatDate(statement.periodEnd),
        statement.currency,
        statement.grossAmount.toFixed(2),
        statement.netAmount.toFixed(2),
        statement.status,
        participant.name,
        participant.role,
        participant.share.toFixed(2),
        participant.amount.toFixed(2),
        participant.status,
        statement.source ?? "",
        statement.notes ?? "",
      ]);
    }
  }

  return rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
}

export function royaltyExportFileName(title: string, id: string, extension: "csv" | "json") {
  const safeTitle = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return `tunix-royalties-${safeTitle || "lancamento"}-${id}.${extension}`;
}
