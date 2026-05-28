import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRetryReleaseDelivery, adminUpdatePlatformStatus } from "../../../../actions";
import { AppShell, PageHeader } from "../../../../components";
import { requireUser } from "../../../../lib/auth";
import { platformLabel, platformStatusLabel, releaseStatusLabel } from "../../../../lib/format";
import { prisma } from "../../../../lib/prisma";
import { buildReleaseTimeline } from "../../../../lib/release-timeline";
import { validateReleasePackage } from "../../../../lib/release-validator";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });

  if (!roles.some((role) => role.role === "ADMIN")) {
    return null;
  }

  return user;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminReleaseStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const [user, { id }, query] = await Promise.all([requireAdminUser(), params, searchParams]);

  if (!user) {
    return (
      <AppShell>
        <section className="emptyState">
          <h2>Acesso restrito</h2>
          <p>Somente administradores podem acompanhar a entrega operacional.</p>
        </section>
      </AppShell>
    );
  }

  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      assets: true,
      contributors: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
      },
      owner: true,
      platforms: {
        orderBy: { platform: "asc" },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: true,
        },
      },
    },
  });

  if (!release) {
    notFound();
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entity: "Release",
      entityId: release.id,
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const validation = validateReleasePackage(release);
  const timeline = buildReleaseTimeline({
    assets: release.assets,
    auditLogs,
    deliveries: release.deliveries,
    reviews: release.reviews,
  });
  const latestDelivery = release.deliveries[0];
  const hasPlatformError = release.platforms.some((platform) => platform.status === "ERROR");
  const canRetry = ["READY", "SUBMITTED"].includes(release.status);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pos-envio"
        title={release.title}
        description={`Acompanhe retorno da distribuidora, status por plataforma e tentativas. Status: ${releaseStatusLabel(release.status)}.`}
        action={
          <Link className="secondaryButton linkButton" href="/admin/lancamentos">
            Voltar
          </Link>
        }
      />

      {query.erro ? (
        <p className="formError">
          {query.erro === "confirmacao"
            ? "Informe motivo e confirme o reenvio antes de disparar."
            : query.erro === "provider"
              ? "O provider recusou ou a integracao nao esta configurada. A tentativa foi registrada."
              : query.erro === "dados"
                ? "Confira plataforma e status informado."
                : "O pacote ainda nao esta em status permitido para essa acao."}
        </p>
      ) : null}
      {query.sucesso ? (
        <p className="formSuccess">
          {query.sucesso === "reenvio" ? "Reenvio disparado e registrado." : "Status atualizado no historico operacional."}
        </p>
      ) : null}

      <section className="metricGrid">
        <article className="metricCard">
          <strong>{release.platforms.length}</strong>
          <span>Plataformas</span>
        </article>
        <article className="metricCard">
          <strong>{release.platforms.filter((item) => item.status === "DELIVERED").length}</strong>
          <span>Entregues</span>
        </article>
        <article className="metricCard">
          <strong>{release.deliveries.length}</strong>
          <span>Tentativas</span>
        </article>
        <article className="metricCard">
          <strong>{hasPlatformError ? "Sim" : "Nao"}</strong>
          <span>Pendencia ativa</span>
        </article>
      </section>

      <section className="adminGrid">
        <article className="adminPanel">
          <div className="blockHeader">
            <h2>Status por plataforma</h2>
            <span className="songStatus">{releaseStatusLabel(release.status)}</span>
          </div>
          <div className="platformOpsList">
            {release.platforms.map((platform) => (
              <section key={platform.id}>
                <div>
                  <strong>{platformLabel(platform.platform)}</strong>
                  <span>{platformStatusLabel(platform.status)}</span>
                </div>
                <form action={adminUpdatePlatformStatus}>
                  <input name="releaseId" type="hidden" value={release.id} />
                  <input name="platform" type="hidden" value={platform.platform} />
                  <select name="status" defaultValue={platform.status}>
                    <option value="QUEUED">Na fila</option>
                    <option value="SENT">Enviado</option>
                    <option value="DELIVERED">Entregue</option>
                    <option value="ERROR">Com pendencia</option>
                  </select>
                  <input name="note" placeholder="Nota operacional opcional" />
                  <button className="secondaryButton" type="submit">
                    Atualizar
                  </button>
                </form>
              </section>
            ))}
          </div>
        </article>

        <aside className="adminPanel">
          <h2>Reenvio controlado</h2>
          <p className="mutedText">
            Use apenas quando houve erro de provider, ajuste externo ou orientacao tecnica da distribuidora.
          </p>
          <form className="compositionForm" action={adminRetryReleaseDelivery}>
            <input name="releaseId" type="hidden" value={release.id} />
            <label>
              Motivo do reenvio
              <textarea name="reason" rows={4} placeholder="Ex: provider solicitou reprocessamento apos corrigir metadado externo" />
            </label>
            <div className="checkList">
              <label>
                <input name="confirmRetry" type="checkbox" />
                Confirmo que revisei o historico e quero reenviar para o provider.
              </label>
            </div>
            <button className="primaryButton" disabled={!canRetry || !validation.canSubmit} type="submit">
              Reenviar para provider
            </button>
          </form>

          <section className="protectedBlock">
            <h2>Ultima tentativa</h2>
            {latestDelivery ? (
              <dl className="accessList">
                <div>
                  <dt>Provider</dt>
                  <dd>{latestDelivery.provider}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{latestDelivery.status}</dd>
                </div>
                <div>
                  <dt>HTTP</dt>
                  <dd>{latestDelivery.responseStatus ?? "Sem resposta"}</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{formatDate(latestDelivery.createdAt)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mutedText">Nenhuma tentativa registrada.</p>
            )}
          </section>
        </aside>
      </section>

      <section className="adminGrid lower">
        <article className="adminPanel">
          <h2>Tentativas da distribuidora</h2>
          <div className="deliveryList">
            {release.deliveries.length ? release.deliveries.map((delivery) => (
              <details key={delivery.id}>
                <summary>
                  <strong>{delivery.provider} - {delivery.status}</strong>
                  <span>{formatDate(delivery.createdAt)} - HTTP {delivery.responseStatus ?? "sem resposta"}</span>
                </summary>
                <pre>{JSON.stringify({
                  endpoint: delivery.endpoint,
                  requestPayload: delivery.requestPayload,
                  responseBody: delivery.responseBody,
                  errorMessage: delivery.errorMessage,
                }, null, 2)}</pre>
              </details>
            )) : <p className="mutedText">Nenhuma tentativa registrada.</p>}
          </div>
        </article>

        <article className="adminPanel">
          <h2>Linha do tempo operacional</h2>
          <div className="timelineList">
            {timeline.slice(0, 12).map((item) => (
              <div className="timelineItem" key={item.id}>
                <span>{item.source}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <small>{formatDate(item.at)}{item.status ? ` - ${item.status}` : ""}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
