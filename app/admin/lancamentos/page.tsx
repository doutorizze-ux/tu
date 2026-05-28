import Link from "next/link";
import { adminApproveRelease, adminRejectRelease } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { platformLabel, releaseStatusLabel } from "../../lib/format";
import { prisma } from "../../lib/prisma";
import { validateReleasePackage } from "../../lib/release-validator";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });

  if (!roles.some((role) => role.role === "ADMIN")) {
    return null;
  }

  return user;
}

function formatDate(date: Date | null) {
  if (!date) {
    return "Pendente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

export default async function AdminReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; releaseId?: string; sucesso?: string }>;
}) {
  const [user, params] = await Promise.all([requireAdminUser(), searchParams]);

  if (!user) {
    return (
      <AppShell>
        <section className="emptyState">
          <h2>Acesso restrito</h2>
          <p>Somente administradores podem revisar pacotes de lançamento.</p>
        </section>
      </AppShell>
    );
  }

  const [releases, reviewHistory] = await Promise.all([
    prisma.release.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        assets: true,
        contributors: true,
        owner: true,
        platforms: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            reviewer: true,
          },
        },
      },
    }),
    prisma.releaseReview.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        release: true,
        reviewer: true,
      },
    }),
  ]);

  const queue = releases.filter((release) => ["REVIEW", "REJECTED"].includes(release.status));
  const readyReleases = releases.filter((release) => release.status === "READY");
  const deliveryReleases = releases.filter((release) => ["SUBMITTED", "DELIVERED"].includes(release.status));
  const readyCount = releases.filter((release) => release.status === "READY").length;
  const submittedCount = releases.filter((release) => ["SUBMITTED", "DELIVERED"].includes(release.status)).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Revisão de lançamentos"
        description="Fila operacional para validar pacotes, aprovar envio e registrar pendências antes da distribuição real."
        action={
          <Link className="secondaryButton linkButton" href="/admin/integracoes">
            Integrações
          </Link>
        }
      />

      {params.erro ? (
        <p className="formError">
          {params.erro === "nota"
            ? "Informe uma pendência antes de reprovar o pacote."
            : "O pacote ainda tem bloqueios no validador profissional."}
        </p>
      ) : null}
      {params.sucesso ? (
        <p className="formSuccess">
          {params.sucesso === "aprovado" ? "Lançamento aprovado para envio." : "Pendência registrada para o cliente."}
        </p>
      ) : null}

      <section className="metricGrid">
        <article className="metricCard">
          <strong>{queue.length}</strong>
          <span>Na revisão operacional</span>
        </article>
        <article className="metricCard">
          <strong>{readyCount}</strong>
          <span>Prontos para envio</span>
        </article>
        <article className="metricCard">
          <strong>{submittedCount}</strong>
          <span>Em distribuição</span>
        </article>
        <article className="metricCard">
          <strong>{releases.length}</strong>
          <span>Total de lançamentos</span>
        </article>
      </section>

      <section className="adminReleaseGrid">
        <article className="adminPanel">
          <div className="blockHeader">
            <h2>Fila de revisão</h2>
            <span className="songStatus">{queue.length} pacote(s)</span>
          </div>

          <div className="reviewQueue">
            {queue.length ? queue.map((release) => {
              const validation = validateReleasePackage(release);
              const master = release.assets.find((asset) => asset.type === "MASTER");
              const cover = release.assets.find((asset) => asset.type === "COVER");
              const highlighted = params.releaseId === release.id;

              return (
                <section className={highlighted ? "reviewCard highlighted" : "reviewCard"} key={release.id}>
                  <div className="reviewCardHeader">
                    <div>
                      <span className="songStatus">{releaseStatusLabel(release.status)}</span>
                      <h3>{release.title}</h3>
                      <p>{release.artistName} - {release.owner.name}</p>
                    </div>
                    <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}`}>
                      Abrir pacote
                    </Link>
                  </div>

                  <dl className="reviewFacts">
                    <div>
                      <dt>Data</dt>
                      <dd>{formatDate(release.releaseDate)}</dd>
                    </div>
                    <div>
                      <dt>ISRC</dt>
                      <dd>{release.isrc || "Pendente"}</dd>
                    </div>
                    <div>
                      <dt>UPC</dt>
                      <dd>{release.upc || "Pendente"}</dd>
                    </div>
                    <div>
                      <dt>Arquivos</dt>
                      <dd>{master ? "Master" : "Sem master"} / {cover ? "Capa" : "Sem capa"}</dd>
                    </div>
                  </dl>

                  <div className="platformChips">
                    {release.platforms.map((platform) => (
                      <span key={platform.id}>{platformLabel(platform.platform)}</span>
                    ))}
                  </div>

                  <div className="validationList compact">
                    {validation.issues.length ? validation.issues.slice(0, 4).map((issue) => (
                      <div className={issue.severity === "WARNING" ? "validationItem warning" : "validationItem blocker"} key={issue.code}>
                        <span>{issue.severity === "WARNING" ? "Alerta" : "Bloqueio"}</span>
                        <strong>{issue.label}</strong>
                        <small>{issue.detail}</small>
                      </div>
                    )) : <p className="formSuccess">Pacote pronto para aprovação.</p>}
                  </div>

                  <div className="reviewActions">
                    <form action={adminApproveRelease}>
                      <input name="releaseId" type="hidden" value={release.id} />
                      <input name="note" placeholder="Nota interna opcional" />
                      <button className="primaryButton" disabled={!validation.canSubmit} type="submit">
                        Aprovar para envio
                      </button>
                    </form>
                    <form action={adminRejectRelease}>
                      <input name="releaseId" type="hidden" value={release.id} />
                      <textarea name="note" placeholder="Descreva a pendência para o cliente" rows={3} />
                      <button className="secondaryButton" type="submit">
                        Registrar pendência
                      </button>
                    </form>
                  </div>
                </section>
              );
            }) : <p className="mutedText">Nenhum pacote aguardando revisão agora.</p>}
          </div>
        </article>

        <aside className="adminPanel">
          <h2>Prontos para envio</h2>
          <div className="logList">
            {readyReleases.length ? readyReleases.map((release) => (
              <div key={release.id}>
                <strong>{release.title}</strong>
                <span>{release.artistName} - {release.platforms.length} plataforma(s)</span>
                <Link className="secondaryButton linkButton" href={`/admin/lancamentos/${release.id}/envio`}>
                  Preparar envio
                </Link>
              </div>
            )) : <p className="mutedText">Nenhum pacote aprovado aguardando envio.</p>}
          </div>

          <h2>Histórico de decisão</h2>
          <div className="logList">
            {reviewHistory.length ? reviewHistory.map((review) => (
              <div key={review.id}>
                <strong>{review.release.title} - {review.decision}</strong>
                <span>{review.reviewer.name} - {review.note || "sem nota"} - {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(review.createdAt)}</span>
              </div>
            )) : <p className="mutedText">Nenhuma decisão registrada.</p>}
          </div>

          <h2>Em distribuição</h2>
          <div className="logList">
            {deliveryReleases.length ? deliveryReleases.map((release) => (
              <div key={release.id}>
                <strong>{release.title}</strong>
                <span>{releaseStatusLabel(release.status)} - {release.platforms.length} plataforma(s)</span>
                <Link className="secondaryButton linkButton" href={`/admin/lancamentos/${release.id}/status`}>
                  Acompanhar status
                </Link>
                <Link className="secondaryButton linkButton" href={`/admin/lancamentos/${release.id}/financeiro`}>
                  Financeiro
                </Link>
              </div>
            )) : <p className="mutedText">Nenhum pacote em distribuição agora.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
