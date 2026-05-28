import Link from "next/link";
import { AppShell, PageHeader } from "../components";
import { requireUser } from "../lib/auth";
import { platformLabel, releaseStatusLabel } from "../lib/format";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const user = await requireUser();
  const releases = await prisma.release.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      platforms: true,
      contributors: true,
      royaltyStatements: true,
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Distribuição"
        title="Lançamentos musicais"
        description="Prepare singles, EPs e álbuns para envio simultâneo às plataformas digitais."
        action={
          <Link className="primaryButton linkButton" href="/lancamentos/novo">
            Novo lançamento
          </Link>
        }
      />

      {releases.length ? (
        <section className="releaseGrid">
          {releases.map((release) => (
            <article className="releaseCard" key={release.id}>
              <span className="songStatus">{releaseStatusLabel(release.status)}</span>
              <h2>
                <Link href={`/lancamentos/${release.id}`}>{release.title}</Link>
              </h2>
              <p>{release.artistName}</p>
              <dl className="releaseFacts">
                <div>
                  <dt>Tipo</dt>
                  <dd>{release.releaseType}</dd>
                </div>
                <div>
                  <dt>Gênero</dt>
                  <dd>{release.genre}</dd>
                </div>
                <div>
                  <dt>Plataformas</dt>
                  <dd>{release.platforms.length}</dd>
                </div>
                <div>
                  <dt>Créditos</dt>
                  <dd>{release.contributors.length}</dd>
                </div>
                <div>
                  <dt>Royalties</dt>
                  <dd>{release.royaltyStatements.length}</dd>
                </div>
              </dl>
              <div className="platformChips">
                {release.platforms.slice(0, 4).map((item) => (
                  <span key={item.id}>{platformLabel(item.platform)}</span>
                ))}
              </div>
              <div className="cardActions releaseActions">
                <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}`}>
                  Pacote
                </Link>
                <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}/financeiro`}>
                  Royalties
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="emptyState">
          <h2>Nenhum lançamento preparado ainda</h2>
          <p>Cadastre um single pronto para organizar arquivos, créditos, splits e plataformas.</p>
          <Link className="primaryButton linkButton" href="/lancamentos/novo">
            Preparar lançamento
          </Link>
        </section>
      )}
    </AppShell>
  );
}
