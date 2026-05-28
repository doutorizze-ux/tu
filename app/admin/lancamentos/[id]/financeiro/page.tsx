import Link from "next/link";
import { notFound } from "next/navigation";
import { adminCreateRoyaltyStatement, adminImportRoyaltyCsv, adminMarkRoyaltyStatementPaid } from "../../../../actions";
import { AppShell, PageHeader } from "../../../../components";
import { requireUser } from "../../../../lib/auth";
import { platformLabel, releaseStatusLabel } from "../../../../lib/format";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });

  if (!roles.some((role) => role.role === "ADMIN")) {
    return null;
  }

  return user;
}

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

export default async function AdminReleaseFinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; linhas?: string; sucesso?: string }>;
}) {
  const [user, { id }, query] = await Promise.all([requireAdminUser(), params, searchParams]);

  if (!user) {
    return (
      <AppShell>
        <section className="emptyState">
          <h2>Acesso restrito</h2>
          <p>Somente administradores podem acessar o financeiro do lancamento.</p>
        </section>
      </AppShell>
    );
  }

  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      contributors: true,
      owner: true,
      platforms: true,
      royaltyStatements: {
        orderBy: { createdAt: "desc" },
        include: {
          participants: true,
        },
      },
    },
  });

  if (!release) {
    notFound();
  }

  const splitTotal = release.contributors.reduce(
    (total, contributor) => total + (contributor.royaltyShare ?? 0),
    0,
  );
  const totalNet = release.royaltyStatements.reduce((total, statement) => total + statement.netAmount, 0);
  const totalPaid = release.royaltyStatements
    .filter((statement) => statement.status === "PAID")
    .reduce((total, statement) => total + statement.netAmount, 0);
  const totalPending = totalNet - totalPaid;
  const reconciliationKeys = new Map<string, number>();

  for (const statement of release.royaltyStatements) {
    const key = [
      statement.platform,
      statement.periodStart.toISOString().slice(0, 10),
      statement.periodEnd.toISOString().slice(0, 10),
      statement.currency,
    ].join("|");
    reconciliationKeys.set(key, (reconciliationKeys.get(key) ?? 0) + 1);
  }

  const reconciliationConflicts = [...reconciliationKeys.values()].filter((count) => count > 1).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Financeiro"
        title={release.title}
        description={`Royalties, splits e previsao de repasse. Status do lancamento: ${releaseStatusLabel(release.status)}.`}
        action={
          <div className="reportActions">
            <Link className="secondaryButton linkButton" href={`/api/releases/${release.id}/royalties?format=csv`}>
              Exportar CSV
            </Link>
            <Link className="secondaryButton linkButton" href={`/api/releases/${release.id}/royalties?format=json`}>
              Exportar JSON
            </Link>
            <Link className="secondaryButton linkButton" href="/admin/lancamentos">
              Voltar
            </Link>
          </div>
        }
      />

      {query.erro ? (
        <p className="formError">
          {query.erro === "splits" ? "Os splits precisam existir e fechar em 100% antes de gerar financeiro." : null}
          {query.erro === "arquivo" ? "Envie um arquivo CSV valido com ate 2 MB." : null}
          {query.erro === "csv" ? "O CSV foi recusado. Confira colunas, datas, valores e plataformas selecionadas no lancamento." : null}
          {query.erro === "duplicado" ? "Conciliação bloqueou fechamento duplicado para a mesma plataforma, periodo e moeda." : null}
          {!["splits", "arquivo", "csv", "duplicado"].includes(query.erro)
            ? "Confira plataforma, periodo e valores do fechamento."
            : null}
        </p>
      ) : null}
      {query.sucesso ? (
        <p className="formSuccess">
          {query.sucesso === "pago" ? "Fechamento marcado como pago." : null}
          {query.sucesso === "importado"
            ? `${query.linhas ?? "0"} fechamento(s) importado(s) do CSV com repasses calculados.`
            : null}
          {!["pago", "importado"].includes(query.sucesso)
            ? "Fechamento financeiro criado com repasses calculados."
            : null}
        </p>
      ) : null}

      <section className="metricGrid">
        <article className="metricCard">
          <strong>{money(totalNet, "BRL")}</strong>
          <span>Total liquido lancado</span>
        </article>
        <article className="metricCard">
          <strong>{money(totalPaid, "BRL")}</strong>
          <span>Total pago</span>
        </article>
        <article className="metricCard">
          <strong>{money(totalPending, "BRL")}</strong>
          <span>Pendente</span>
        </article>
        <article className="metricCard">
          <strong>{splitTotal}%</strong>
          <span>Split declarado</span>
        </article>
      </section>

      <section className="adminPanel reconciliationPanel">
        <div className="blockHeader">
          <div>
            <h2>Conciliação financeira</h2>
            <p className="mutedText">
              O sistema bloqueia duplicidade por lancamento, plataforma, periodo e moeda antes de gerar qualquer repasse.
            </p>
          </div>
          <span className={reconciliationConflicts ? "dangerPill" : "songStatus"}>
            {reconciliationConflicts ? `${reconciliationConflicts} conflito(s)` : "Sem conflitos"}
          </span>
        </div>
        <div className="reconciliationGrid">
          <div>
            <strong>{reconciliationKeys.size}</strong>
            <span>Chaves conciliadas</span>
          </div>
          <div>
            <strong>{release.royaltyStatements.length}</strong>
            <span>Fechamentos registrados</span>
          </div>
          <div>
            <strong>{release.platforms.length}</strong>
            <span>Plataformas no lancamento</span>
          </div>
        </div>
      </section>

      <section className="adminGrid">
        <article className="adminPanel">
          <h2>Novo fechamento</h2>
          <form className="compositionForm" action={adminCreateRoyaltyStatement}>
            <input name="releaseId" type="hidden" value={release.id} />
            <div className="formGrid">
              <label>
                Plataforma
                <select name="platform" defaultValue={release.platforms[0]?.platform ?? ""}>
                  {release.platforms.map((platform) => (
                    <option key={platform.id} value={platform.platform}>
                      {platformLabel(platform.platform)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Moeda
                <select name="currency" defaultValue="BRL">
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
              <label>
                Inicio do periodo
                <input name="periodStart" type="date" />
              </label>
              <label>
                Fim do periodo
                <input name="periodEnd" type="date" />
              </label>
              <label>
                Receita bruta
                <input name="grossAmount" min="0" step="0.01" type="number" />
              </label>
              <label>
                Receita liquida para split
                <input name="netAmount" min="0" step="0.01" type="number" />
              </label>
              <label>
                Fonte
                <input name="source" placeholder="Relatorio provider, planilha, ajuste manual" />
              </label>
            </div>
            <label>
              Observacoes
              <textarea name="notes" rows={3} placeholder="Notas internas sobre taxa, cambio ou ajuste." />
            </label>
            <div className="formActions">
              <button className="primaryButton" disabled={Math.abs(splitTotal - 100) > 0.01} type="submit">
                Gerar fechamento
              </button>
            </div>
          </form>
        </article>

        <aside className="adminPanel">
          <h2>Splits atuais</h2>
          <div className="royaltySplitList">
            {release.contributors.map((contributor) => (
              <div key={contributor.id}>
                <strong>{contributor.name}</strong>
                <span>{contributor.role} - {contributor.royaltyShare ?? 0}%</span>
              </div>
            ))}
          </div>
          <p className={Math.abs(splitTotal - 100) > 0.01 ? "formError" : "formSuccess"}>
            Total declarado: {splitTotal}%
          </p>
        </aside>
      </section>

      <section className="adminPanel importPanel">
        <div className="blockHeader">
          <div>
            <h2>Importar CSV da distribuidora</h2>
            <p className="mutedText">
              Use relatorios consolidados por plataforma e periodo. Cada linha vira um fechamento financeiro com repasses calculados pelos splits atuais.
            </p>
          </div>
          <Link className="secondaryButton linkButton" href={`/api/releases/${release.id}/royalties/template`}>
            Baixar modelo
          </Link>
        </div>
        <form className="compositionForm" action={adminImportRoyaltyCsv}>
          <input name="releaseId" type="hidden" value={release.id} />
          <div className="formGrid">
            <label>
              Arquivo CSV
              <input accept=".csv,text/csv" name="csvFile" type="file" />
            </label>
            <label>
              Moeda padrao
              <select name="defaultCurrency" defaultValue="BRL">
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label>
              Fonte padrao
              <input name="defaultSource" placeholder="Relatorio mensal da distribuidora" />
            </label>
          </div>
          <p className="csvHint">
            Colunas aceitas: platform, period_start, period_end, currency, gross_amount, net_amount, source, notes.
            Datas em AAAA-MM-DD. Valores aceitam 1234.56 ou 1.234,56. Linhas repetidas ou periodos ja lancados sao bloqueados pela conciliacao.
          </p>
          <div className="formActions">
            <button className="primaryButton" disabled={Math.abs(splitTotal - 100) > 0.01} type="submit">
              Importar e calcular repasses
            </button>
          </div>
        </form>
      </section>

      <section className="adminPanel financeHistory">
        <div className="blockHeader">
          <h2>Historico financeiro</h2>
          <span className="songStatus">{release.royaltyStatements.length} fechamento(s)</span>
        </div>
        {release.royaltyStatements.length ? release.royaltyStatements.map((statement) => (
          <article className="financeStatement" key={statement.id}>
            <header>
              <div>
                <strong>{platformLabel(statement.platform)} - {statement.status}</strong>
                <span>{dateOnly(statement.periodStart)} ate {dateOnly(statement.periodEnd)} - {statement.source || "sem fonte"}</span>
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
            {statement.status !== "PAID" ? (
              <form action={adminMarkRoyaltyStatementPaid}>
                <input name="statementId" type="hidden" value={statement.id} />
                <button className="secondaryButton" type="submit">
                  Marcar como pago
                </button>
              </form>
            ) : null}
          </article>
        )) : <p className="mutedText">Nenhum fechamento financeiro registrado.</p>}
      </section>
    </AppShell>
  );
}
