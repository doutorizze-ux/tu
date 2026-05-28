import Link from "next/link";
import { notFound } from "next/navigation";
import {
  markReleaseDelivered,
  submitReleaseToPartner,
  submitReleaseForReview,
} from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { platformLabel, platformStatusLabel, releaseStatusLabel } from "../../lib/format";
import { prisma } from "../../lib/prisma";
import { buildReleaseTimeline } from "../../lib/release-timeline";
import { validateReleasePackage } from "../../lib/release-validator";

export const dynamic = "force-dynamic";

export default async function ReleaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const release = await prisma.release.findFirst({
    where: { id, ownerId: user.id },
    include: {
      assets: true,
      platforms: true,
      contributors: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
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
  const masterAsset = release.assets.find((asset) => asset.type === "MASTER");
  const coverAsset = release.assets.find((asset) => asset.type === "COVER");
  const validation = validateReleasePackage(release);
  const timeline = buildReleaseTimeline({
    assets: release.assets,
    auditLogs,
    deliveries: release.deliveries,
    reviews: release.reviews,
  });
  const checklist = [
    { label: "Master final enviado", done: Boolean(masterAsset) },
    { label: "Capa enviada", done: Boolean(coverAsset) },
    { label: "Data de lançamento definida", done: Boolean(release.releaseDate) },
    { label: "ISRC informado ou pendente com distribuidora", done: Boolean(release.isrc) },
    { label: "UPC informado ou pendente com distribuidora", done: Boolean(release.upc) },
    { label: "Créditos cadastrados", done: release.contributors.length > 0 },
    { label: "Plataformas selecionadas", done: release.platforms.length > 0 },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pacote de distribuição"
        title={release.title}
        description={`Lançamento de ${release.artistName}, status: ${releaseStatusLabel(release.status)}.`}
        action={
          <Link className="secondaryButton linkButton" href="/lancamentos">
            Voltar
          </Link>
        }
      />

      <section className="releaseDetailGrid">
        <article className="detailMain">
          {query.erro ? (
            <p className="formError">
              {query.erro === "incompleto"
                ? "O validador encontrou pendências bloqueantes antes do envio."
                : query.erro === "provider"
                  ? "A integração com a distribuidora parceira ainda não está configurada. Configure endpoint e API key."
                  : "Este lançamento ainda não está no status correto para essa ação."}
            </p>
          ) : null}
          {query.sucesso ? (
            <p className="formSuccess">
              {query.sucesso === "revisao"
                ? "Lançamento enviado para revisão operacional."
                : query.sucesso === "envio"
                  ? "Pacote enviado para a distribuidora parceira."
                  : query.sucesso === "corrigido"
                    ? "Pacote corrigido e reenviado para revisão."
                    : "Entrega confirmada pelas plataformas."}
            </p>
          ) : null}

          <div className="detailStatus">
            <span className="songStatus">{releaseStatusLabel(release.status)}</span>
            <span>{release.releaseType}</span>
            <span>{release.genre}</span>
          </div>

          <section className="protectedBlock">
            <div className="blockHeader">
              <h2>Validador profissional</h2>
              <span>{validation.canSubmit ? "Pronto" : `${validation.blockers.length} bloqueio(s)`}</span>
            </div>
            {validation.issues.length ? (
              <div className="validationList">
                {validation.issues.map((issue) => (
                  <div className={issue.severity === "WARNING" ? "validationItem warning" : "validationItem blocker"} key={issue.code}>
                    <span>{issue.severity === "WARNING" ? "Alerta" : "Bloqueio"}</span>
                    <strong>{issue.label}</strong>
                    <small>{issue.detail}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="formSuccess">Pacote aprovado pelo validador interno.</p>
            )}
            <div className="distributionChecklist">
              {checklist.map((item) => (
                <div className={item.done ? "checkItem done" : "checkItem"} key={item.label}>
                  <span>{item.done ? "OK" : "Pendente"}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="protectedBlock">
            <div className="blockHeader">
              <h2>Status por plataforma</h2>
            </div>
            <div className="platformDeliveryList">
              {release.platforms.map((item) => (
                <div key={item.id}>
                  <strong>{platformLabel(item.platform)}</strong>
                  <span>{platformStatusLabel(item.status)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="protectedBlock">
            <div className="blockHeader">
              <h2>Arquivos do pacote</h2>
            </div>
            <div className="assetList">
              <div>
                <strong>Master final</strong>
                <span>{masterAsset ? `${masterAsset.fileName} - ${Math.round(masterAsset.sizeBytes / 1024)} KB` : "Pendente"}</span>
                {masterAsset?.checksum ? <small>SHA-256 {masterAsset.checksum.slice(0, 16)}...</small> : null}
              </div>
              <div>
                <strong>Capa</strong>
                <span>{coverAsset ? `${coverAsset.fileName} - ${Math.round(coverAsset.sizeBytes / 1024)} KB` : "Pendente"}</span>
                {coverAsset?.checksum ? <small>SHA-256 {coverAsset.checksum.slice(0, 16)}...</small> : null}
              </div>
            </div>
          </section>

          <section className="protectedBlock">
            <div className="blockHeader">
              <h2>Linha do tempo operacional</h2>
              <span>{timeline.length} evento(s)</span>
            </div>
            <div className="timelineList">
              {timeline.map((item) => (
                <div className="timelineItem" key={item.id}>
                  <span>{item.source}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <small>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(item.at)}
                      {item.status ? ` - ${item.status}` : ""}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>

        <aside className="detailSide">
          <section className="sidePanel">
            <h2>Operação de distribuição</h2>
            <p>
              Envio real por provider configurado. O retorno de entrega deve chegar por webhook/API da
              distribuidora parceira.
            </p>
            <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}/relatorio`}>
              Ver dossiê
            </Link>
            <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}/financeiro`}>
              Ver royalties
            </Link>
            <Link className="secondaryButton linkButton" href={`/api/releases/${release.id}/export`}>
              Exportar JSON
            </Link>
            <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}/solicitacoes`}>
              Solicitar alteração
            </Link>
            <form action={submitReleaseForReview}>
              <input name="releaseId" type="hidden" value={release.id} />
              <button
                className="secondaryButton"
                type="submit"
                disabled={release.status !== "REVIEW" && release.status !== "DRAFT"}
              >
                Enviar para revisão
              </button>
            </form>
            {["DRAFT", "REVIEW", "REJECTED"].includes(release.status) ? (
              <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}/editar`}>
                Corrigir pacote
              </Link>
            ) : null}
            <form action={submitReleaseToPartner}>
              <input name="releaseId" type="hidden" value={release.id} />
              <button className="primaryButton" type="submit" disabled={!validation.canSubmit || release.status !== "READY"}>
                Enviar para distribuidora
              </button>
            </form>
            <form action={markReleaseDelivered}>
              <input name="releaseId" type="hidden" value={release.id} />
              <button className="secondaryButton" type="submit" disabled={release.status !== "SUBMITTED"}>
                Registrar entrega operacional
              </button>
            </form>
          </section>

          {release.reviews.length ? (
            <section className="sidePanel">
              <h2>Histórico operacional</h2>
              <div className="logList">
                {release.reviews.map((review) => (
                  <div key={review.id}>
                    <strong>{review.decision} - {review.reviewer.name}</strong>
                    <span>{review.note || "Sem nota"} - {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(review.createdAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="sidePanel">
            <h2>Metadados</h2>
            <dl className="accessList">
              <div>
                <dt>Artista</dt>
                <dd>{release.artistName}</dd>
              </div>
              <div>
                <dt>Selo</dt>
                <dd>{release.labelName || "Independente"}</dd>
              </div>
              <div>
                <dt>ISRC</dt>
                <dd>{release.isrc || "Pendente"}</dd>
              </div>
              <div>
                <dt>UPC</dt>
                <dd>{release.upc || "Pendente"}</dd>
              </div>
            </dl>
          </section>

          <section className="sidePanel">
            <h2>Créditos e splits</h2>
            {release.contributors.length ? (
              <div className="creditList">
                {release.contributors.map((contributor) => (
                  <div key={contributor.id}>
                    <strong>{contributor.name}</strong>
                    <span>{contributor.role} - {contributor.royaltyShare ?? 0}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Nenhum crédito cadastrado.</p>
            )}
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
