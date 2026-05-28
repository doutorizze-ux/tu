import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "../../../components";
import { requireUser } from "../../../lib/auth";
import { platformLabel, releaseStatusLabel } from "../../../lib/format";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency,
    style: "currency",
  }).format(value);
}

function dateOnly(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

export default async function ReleaseFinancePortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const release = await prisma.release.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
    include: {
      contributors: true,
      royaltyStatements: {
        orderBy: [
          { periodEnd: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          participants: true,
        },
      },
    },
  });

  if (!release) {
    notFound();
  }

  const totalNet = release.royaltyStatements.reduce((total, statement) => total + statement.netAmount, 0);
  const totalPaid = release.royaltyStatements
    .filter((statement) => statement.status === "PAID")
    .reduce((total, statement) => total + statement.netAmount, 0);
  const totalPending = totalNet - totalPaid;
  const splitTotal = release.contributors.reduce(
    (total, contributor) => total + (contributor.royaltyShare ?? 0),
    0,
  );
  const participantTotals = new Map<string, { amount: number; name: string; role: string; share: number }>();

  for (const statement of release.royaltyStatements) {
    for (const participant of statement.participants) {
      const key = `${participant.name}|${participant.role}|${participant.share}`;
      const current = participantTotals.get(key) ?? {
        amount: 0,
        name: participant.name,
        role: participant.role,
        share: participant.share,
      };
      current.amount += participant.amount;
      participantTotals.set(key, current);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Royalties"
        title={release.title}
        description={`Demonstrativo financeiro do lancamento de ${release.artistName}. Status: ${releaseStatusLabel(release.status)}.`}
        action={
          <div className="reportActions">
            <Link className="secondaryButton linkButton" href={`/api/releases/${release.id}/royalties?format=csv`}>
              Exportar CSV
            </Link>
            <Link className="secondaryButton linkButton" href={`/api/releases/${release.id}/royalties?format=json`}>
              Exportar JSON
            </Link>
            <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}`}>
              Voltar
            </Link>
          </div>
        }
      />

      <section className="metricGrid">
        <article className="metricCard">
          <strong>{money(totalNet, "BRL")}</strong>
          <span>Total liquido informado</span>
        </article>
        <article className="metricCard">
          <strong>{money(totalPaid, "BRL")}</strong>
          <span>Total pago</span>
        </article>
        <article className="metricCard">
          <strong>{money(totalPending, "BRL")}</strong>
          <span>Pendente de pagamento</span>
        </article>
        <article className="metricCard">
          <strong>{splitTotal}%</strong>
          <span>Split declarado</span>
        </article>
      </section>

      <section className="adminGrid clientFinanceGrid">
        <article className="adminPanel">
          <div className="blockHeader">
            <h2>Resumo por participante</h2>
            <span className="songStatus">{participantTotals.size} participante(s)</span>
          </div>
          {participantTotals.size ? (
            <div className="financeParticipantGrid">
              {[...participantTotals.values()].map((participant) => (
                <div key={`${participant.name}-${participant.role}-${participant.share}`}>
                  <strong>{participant.name}</strong>
                  <span>{participant.role} - {participant.share}% - {money(participant.amount, "BRL")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mutedText">Nenhum demonstrativo financeiro registrado para este lancamento.</p>
          )}
        </article>

        <aside className="adminPanel">
          <h2>Splits declarados</h2>
          <div className="royaltySplitList">
            {release.contributors.map((contributor) => (
              <div key={contributor.id}>
                <strong>{contributor.name}</strong>
                <span>{contributor.role} - {contributor.royaltyShare ?? 0}%</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="adminPanel financeHistory">
        <div className="blockHeader">
          <h2>Demonstrativos por plataforma</h2>
          <span className="songStatus">{release.royaltyStatements.length} fechamento(s)</span>
        </div>
        {release.royaltyStatements.length ? release.royaltyStatements.map((statement) => (
          <article className="financeStatement" key={statement.id}>
            <header>
              <div>
                <strong>{platformLabel(statement.platform)} - {statement.status}</strong>
                <span>{dateOnly(statement.periodStart)} ate {dateOnly(statement.periodEnd)}</span>
              </div>
              <div>
                <strong>{money(statement.netAmount, statement.currency)}</strong>
                <span>Liquido de {money(statement.grossAmount, statement.currency)}</span>
              </div>
            </header>
            <div className="financeParticipantGrid">
              {statement.participants.map((participant) => (
                <div key={participant.id}>
                  <strong>{participant.name}</strong>
                  <span>{participant.share}% - {money(participant.amount, statement.currency)} - {participant.status}</span>
                </div>
              ))}
            </div>
            {statement.notes ? <p className="mutedText">{statement.notes}</p> : null}
          </article>
        )) : <p className="mutedText">Quando a operacao importar ou lancar royalties, os demonstrativos aparecerao aqui.</p>}
      </section>
    </AppShell>
  );
}
