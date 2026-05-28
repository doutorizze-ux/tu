import Link from "next/link";
import { expressInterest, toggleFavorite } from "../actions";
import { AppShell, PageHeader, SongMeta } from "../components";
import { filters } from "../data";
import { getCurrentUser } from "../lib/auth";
import { purposeLabel, statusLabel } from "../lib/format";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const compositions = await prisma.composition.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    include: {
      composer: true,
      favorites: { where: { userId: user?.id ?? "__guest__" } },
      interests: { where: { userId: user?.id ?? "__guest__" } },
      _count: {
        select: { favorites: true, interests: true },
      },
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Descoberta"
        title="Catálogo de repertório"
        description="Busque composições por gênero, tema, clima, voz, BPM e status de disponibilidade."
      />

      <section className="searchPanel">
        {params.erro ? (
          <p className="formError">
            {params.erro === "creditos"
              ? "Saldo insuficiente. Compre créditos para enviar novo interesse."
              : "Entre com uma conta de artista/produtor e escolha uma composição de outro autor."}
          </p>
        ) : null}
        {params.sucesso ? (
          <p className="formSuccess">Interesse enviado ao compositor.</p>
        ) : null}
        <label>
          Buscar por palavra-chave
          <input placeholder="Ex: sofrência, adoração, festa, dueto..." />
        </label>
        <div className="filters compactFilters" aria-label="Filtros de catálogo">
          {filters.map((filter) => (
            <button key={filter}>{filter}</button>
          ))}
        </div>
      </section>

      <section className="compositionGrid">
        {compositions.map((song) => (
          <article className="songCard" key={song.title}>
            <div className="songStatus">{statusLabel(song.status)}</div>
            <h3>
              <Link href={`/catalogo/${song.id}`}>{song.title}</Link>
            </h3>
            <p>por {song.composer.name}</p>
            <SongMeta
              genre={song.genre}
              mood={song.mood ?? "Sem clima"}
              voice={song.voiceType ?? "Voz livre"}
              bpm={song.bpm ?? 0}
            />
            <div className="cardStats">
              <span>{song._count.favorites} favoritos</span>
              <span>{song._count.interests} interesses</span>
            </div>
            {user?.id === song.composerId ? (
              <p className="ownerNotice">Esta composição é sua.</p>
            ) : (
              <>
                <form action={toggleFavorite}>
                  <input name="compositionId" type="hidden" value={song.id} />
                  <input name="returnTo" type="hidden" value="/catalogo" />
                  <button className="secondaryButton" type="submit">
                    {song.favorites.length ? "Remover favorito" : "Favoritar"}
                  </button>
                </form>
                <form className="interestForm" action={expressInterest}>
                  <input name="compositionId" type="hidden" value={song.id} />
                  <input name="returnTo" type="hidden" value="/catalogo" />
                  <label>
                    Finalidade
                    <select name="purpose" defaultValue={song.interests[0]?.purpose ?? "CONTACT_AUTHOR"}>
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
                      rows={3}
                      placeholder="Conte rapidamente como pretende usar esta música"
                      defaultValue={song.interests[0]?.message ?? ""}
                    />
                  </label>
                  <button type="submit">
                    {song.interests.length ? "Atualizar interesse" : "Tenho interesse"}
                  </button>
                </form>
                <Link className="ghostButton linkButton cardDetailLink" href={`/catalogo/${song.id}`}>
                  Ver detalhes
                </Link>
              </>
            )}
          </article>
        ))}
      </section>
    </AppShell>
  );
}
