import Link from "next/link";
import { notFound } from "next/navigation";
import { expressInterest, toggleFavorite } from "../../actions";
import { AppShell, PageHeader, SongMeta } from "../../components";
import { canAccessProtectedContent } from "../../lib/access";
import { getCurrentUser } from "../../lib/auth";
import { purposeLabel, statusLabel, visibilityLabel } from "../../lib/format";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompositionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const composition = await prisma.composition.findUnique({
    where: { id },
    include: {
      composer: {
        include: {
          profile: true,
        },
      },
      favorites: { where: { userId: user?.id ?? "__guest__" } },
      interests: { where: { userId: user?.id ?? "__guest__" } },
      audio: true,
      _count: {
        select: { favorites: true, interests: true },
      },
    },
  });

  if (!composition || (!composition.isPublished && composition.composerId !== user?.id)) {
    notFound();
  }

  const isOwner = user?.id === composition.composerId;
  const hasInterest = Boolean(composition.interests.length);
  const canReadLyrics = canAccessProtectedContent({
    visibility: composition.lyricsVisibility,
    isOwner,
    hasInterest,
  });
  const canHearAudio = canAccessProtectedContent({
    visibility: composition.audioVisibility,
    isOwner,
    hasInterest,
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Detalhe da composição"
        title={composition.title}
        description={`Composição de ${composition.composer.name}, publicada para avaliação profissional.`}
        action={
          <Link className="secondaryButton linkButton" href="/catalogo">
            Voltar ao catálogo
          </Link>
        }
      />

      <section className="detailGrid">
        <article className="detailMain">
          {query.erro ? (
            <p className="formError">
              {query.erro === "creditos"
                ? "Saldo insuficiente. Compre créditos para enviar novo interesse."
                : "Entre com uma conta e escolha uma obra de outro compositor."}
            </p>
          ) : null}
          {query.sucesso ? <p className="formSuccess">Interesse enviado ao compositor.</p> : null}

          <div className="detailStatus">
            <span className="songStatus">{statusLabel(composition.status)}</span>
            <span>{composition._count.favorites} favoritos</span>
            <span>{composition._count.interests} interesses</span>
          </div>

          <SongMeta
            genre={composition.genre}
            mood={composition.mood ?? "Sem clima"}
            voice={composition.voiceType ?? "Voz livre"}
            bpm={composition.bpm ?? 0}
          />

          <section className="protectedBlock">
            <div className="blockHeader">
              <h2>Letra</h2>
              <span>{visibilityLabel(composition.lyricsVisibility)}</span>
            </div>
            {canReadLyrics ? (
              <pre className="lyricsBox">{composition.lyrics || "Letra não informada."}</pre>
            ) : (
              <p className="lockedText">
                O compositor liberou a letra apenas após manifestação de interesse.
              </p>
            )}
          </section>

          <section className="protectedBlock">
            <div className="blockHeader">
              <h2>Áudio guia</h2>
              <span>{visibilityLabel(composition.audioVisibility)}</span>
            </div>
            {canHearAudio && composition.audio ? (
              <div className="audioPlayerBox">
                <audio
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  src={`/api/audio/${composition.id}`}
                />
                <span>{composition.audio.fileName}</span>
              </div>
            ) : canHearAudio ? (
              <p className="lockedText">Nenhum áudio guia enviado para esta composição.</p>
            ) : (
              <p className="lockedText">
                Áudio guia restrito. Envie interesse para solicitar acesso ao compositor.
              </p>
            )}
          </section>
        </article>

        <aside className="detailSide">
          <section className="sidePanel">
            <h2>Controle de acesso</h2>
            <dl className="accessList">
              <div>
                <dt>Letra</dt>
                <dd>{visibilityLabel(composition.lyricsVisibility)}</dd>
              </div>
              <div>
                <dt>Audio</dt>
                <dd>{visibilityLabel(composition.audioVisibility)}</dd>
              </div>
              <div>
                <dt>Autor</dt>
                <dd>{composition.composer.name}</dd>
              </div>
            </dl>
            {composition.accessNote ? <p>{composition.accessNote}</p> : null}
          </section>

          {isOwner ? (
            <section className="sidePanel">
              <h2>Esta obra é sua</h2>
              <p>Artistas não podem favoritar ou enviar interesse nas próprias composições.</p>
            </section>
          ) : (
            <section className="sidePanel">
              <h2>Ações do artista</h2>
              <form action={toggleFavorite}>
                <input name="compositionId" type="hidden" value={composition.id} />
                <input name="returnTo" type="hidden" value={`/catalogo/${composition.id}`} />
                <button className="secondaryButton" type="submit">
                  {composition.favorites.length ? "Remover favorito" : "Favoritar"}
                </button>
              </form>
              <form className="interestForm" action={expressInterest}>
                <input name="compositionId" type="hidden" value={composition.id} />
                <input name="returnTo" type="hidden" value={`/catalogo/${composition.id}`} />
                <label>
                  Finalidade
                  <select name="purpose" defaultValue={composition.interests[0]?.purpose ?? "CONTACT_AUTHOR"}>
                    <option value="RECORD">{purposeLabel("RECORD")}</option>
                    <option value="EVALUATE">{purposeLabel("EVALUATE")}</option>
                    <option value="RESERVE">{purposeLabel("RESERVE")}</option>
                    <option value="CONTACT_AUTHOR">{purposeLabel("CONTACT_AUTHOR")}</option>
                  </select>
                </label>
                <label>
                  Mensagem
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Conte rapidamente seu interesse nessa composição"
                    defaultValue={composition.interests[0]?.message ?? ""}
                  />
                </label>
                <button type="submit">
                  {composition.interests.length ? "Atualizar interesse" : "Tenho interesse"}
                </button>
              </form>
            </section>
          )}
        </aside>
      </section>
    </AppShell>
  );
}
