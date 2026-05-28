import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "../../../components";
import { requireUser } from "../../../lib/auth";
import { platformLabel, platformStatusLabel, releaseStatusLabel } from "../../../lib/format";
import { prisma } from "../../../lib/prisma";
import { buildReleaseTimeline } from "../../../lib/release-timeline";
import { validateReleasePackage } from "../../../lib/release-validator";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null) {
  if (!date) {
    return "Pendente";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function fileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return `${Math.round(sizeBytes / 1024)} KB`;
}

export default async function ReleaseReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((role) => role.role === "ADMIN");
  const release = await prisma.release.findFirst({
    where: {
      id,
      ...(isAdmin ? {} : { ownerId: user.id }),
    },
    include: {
      assets: true,
      contributors: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
      },
      owner: true,
      platforms: true,
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
    take: 120,
  });
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

  return (
    <AppShell>
      <PageHeader
        eyebrow="Dossie operacional"
        title={release.title}
        description={`Relatorio interno gerado em ${formatDate(new Date())}. Status: ${releaseStatusLabel(release.status)}.`}
        action={
          <div className="reportActions">
            <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}`}>
              Voltar
            </Link>
            <Link className="secondaryButton linkButton" href={`/api/releases/${release.id}/export`}>
              Exportar JSON
            </Link>
            <PrintButton />
          </div>
        }
      />

      <article className="reportSheet">
        <section className="reportHero">
          <div>
            <p className="eyebrow">Tunix</p>
            <h2>{release.title}</h2>
            <p>{release.artistName}</p>
          </div>
          <dl>
            <div>
              <dt>ID interno</dt>
              <dd>{release.id}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{releaseStatusLabel(release.status)}</dd>
            </div>
            <div>
              <dt>Responsavel</dt>
              <dd>{release.owner.name}</dd>
            </div>
          </dl>
        </section>

        <section className="reportSection">
          <h2>Metadados do lancamento</h2>
          <dl className="reportGrid">
            <div>
              <dt>Artista</dt>
              <dd>{release.artistName}</dd>
            </div>
            <div>
              <dt>Selo/gravadora</dt>
              <dd>{release.labelName || "Independente"}</dd>
            </div>
            <div>
              <dt>Genero</dt>
              <dd>{release.genre}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{release.releaseType}</dd>
            </div>
            <div>
              <dt>Idioma</dt>
              <dd>{release.language}</dd>
            </div>
            <div>
              <dt>Data de lancamento</dt>
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
          </dl>
        </section>

        <section className="reportSection">
          <h2>Arquivos</h2>
          <div className="reportTable">
            <div className="reportTableHeader">
              <span>Tipo</span>
              <span>Arquivo</span>
              <span>Tamanho</span>
              <span>Checksum</span>
            </div>
            {release.assets.map((asset) => (
              <div className="reportTableRow" key={asset.id}>
                <span>{asset.type}</span>
                <span>{asset.fileName}</span>
                <span>{fileSize(asset.sizeBytes)}</span>
                <span>{asset.checksum || "Pendente"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="reportSection">
          <h2>Creditos e splits</h2>
          <div className="reportTable">
            <div className="reportTableHeader">
              <span>Nome</span>
              <span>Funcao</span>
              <span>Split</span>
            </div>
            {release.contributors.map((contributor) => (
              <div className="reportTableRow three" key={contributor.id}>
                <span>{contributor.name}</span>
                <span>{contributor.role}</span>
                <span>{contributor.royaltyShare ?? 0}%</span>
              </div>
            ))}
            <div className="reportTableRow three total">
              <span>Total</span>
              <span>Participacao declarada</span>
              <span>{splitTotal}%</span>
            </div>
          </div>
        </section>

        <section className="reportSection">
          <h2>Plataformas</h2>
          <div className="reportTable">
            <div className="reportTableHeader">
              <span>Plataforma</span>
              <span>Status</span>
            </div>
            {release.platforms.map((platform) => (
              <div className="reportTableRow two" key={platform.id}>
                <span>{platformLabel(platform.platform)}</span>
                <span>{platformStatusLabel(platform.status)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="reportSection">
          <h2>Validador</h2>
          {validation.issues.length ? (
            <div className="reportList">
              {validation.issues.map((issue) => (
                <div key={issue.code}>
                  <strong>{issue.severity} - {issue.label}</strong>
                  <span>{issue.detail}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="formSuccess">Pacote aprovado pelo validador interno.</p>
          )}
        </section>

        <section className="reportSection">
          <h2>Tentativas de envio</h2>
          {release.deliveries.length ? (
            <div className="reportList">
              {release.deliveries.map((delivery) => (
                <div key={delivery.id}>
                  <strong>{delivery.provider} - {delivery.status}</strong>
                  <span>{formatDate(delivery.createdAt)} - HTTP {delivery.responseStatus ?? "sem resposta"} - {delivery.errorMessage ?? "sem erro"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mutedText">Nenhuma tentativa registrada.</p>
          )}
        </section>

        <section className="reportSection">
          <h2>Linha do tempo</h2>
          <div className="timelineList">
            {timeline.map((item) => (
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
        </section>
      </article>
    </AppShell>
  );
}
