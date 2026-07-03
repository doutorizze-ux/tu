import Link from "next/link";
import { toggleFavorite } from "../actions";
import { AppShell, PageHeader, SongMeta } from "../components";
import { getCurrentUser } from "../lib/auth";
import { statusLabel } from "../lib/format";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    sucesso?: string;
    busca?: string;
    genero?: string;
    compositor?: string;
    ordem?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  const searchKeyword = params.busca || "";
  const filterGenre = params.genero || "";
  const filterComposerId = params.compositor || "";
  const sortBy = params.ordem || "newest";

  // Build dynamic where clause
  const whereClause: any = {
    isPublished: true,
  };

  if (searchKeyword) {
    whereClause.OR = [
      { title: { contains: searchKeyword } },
      { lyrics: { contains: searchKeyword } },
      { mood: { contains: searchKeyword } },
      { theme: { contains: searchKeyword } },
    ];
  }

  if (filterGenre) {
    whereClause.genre = filterGenre;
  }

  if (filterComposerId) {
    whereClause.composerId = filterComposerId;
  }

  // Determine sorting order
  let orderByClause: any = { createdAt: "desc" };
  if (sortBy === "oldest") {
    orderByClause = { createdAt: "asc" };
  } else if (sortBy === "title_az") {
    orderByClause = { title: "asc" };
  } else if (sortBy === "popular") {
    orderByClause = { interests: { _count: "desc" } };
  }

  // Query filtered database records
  const compositions = await prisma.composition.findMany({
    where: whereClause,
    orderBy: orderByClause,
    include: {
      composer: true,
      favorites: { where: { userId: user?.id ?? "__guest__" } },
      interests: { where: { userId: user?.id ?? "__guest__" } },
      _count: {
        select: { favorites: true, interests: true },
      },
    },
  });

  // Fetch unique list of active genres in database
  const publishedGenres = await prisma.composition.findMany({
    where: { isPublished: true },
    select: { genre: true },
    distinct: ["genre"],
  });
  const genresList = publishedGenres.map((g) => g.genre).sort();

  // Fetch unique list of composers who have published songs
  const publishedCompositions = await prisma.composition.findMany({
    where: { isPublished: true },
    select: {
      composer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    distinct: ["composerId"],
  });
  const composersList = publishedCompositions
    .map((c) => c.composer)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Descoberta"
        title="Catálogo de repertório"
        description="Filtre e descubra composições por palavra-chave, gênero ou compositor favorito."
      />

      <section className="searchPanelContainer">
        {params.erro ? (
          <p className="formError">
            {params.erro === "creditos"
              ? "Saldo insuficiente. Compre créditos para enviar novo interesse."
              : "Entre com uma conta de artista/produtor e escolha uma composição de outro autor."}
          </p>
        ) : null}
        {params.sucesso ? (
          <p className="formSuccess">Interesse enviado ao compositor com sucesso.</p>
        ) : null}

        <form method="GET" action="/catalogo" className="catalogFilterForm">
          <div className="filterRow">
            <label className="searchField">
              Palavra-chave
              <input
                name="busca"
                defaultValue={searchKeyword}
                placeholder="Ex: Título, trecho da letra..."
              />
            </label>

            <label>
              Gênero
              <select name="genero" defaultValue={filterGenre}>
                <option value="">Todos os gêneros</option>
                {genresList.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Compositor
              <select name="compositor" defaultValue={filterComposerId}>
                <option value="">Todos os compositores</option>
                {composersList.map((composer) => (
                  <option key={composer.id} value={composer.id}>
                    {composer.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ordenar por
              <select name="ordem" defaultValue={sortBy}>
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="title_az">Título (A-Z)</option>
                <option value="popular">Mais populares</option>
              </select>
            </label>
          </div>

          <div className="filterActions">
            {(searchKeyword || filterGenre || filterComposerId || sortBy !== "newest") && (
              <Link href="/catalogo" className="secondaryButton">
                Limpar Filtros
              </Link>
            )}
            <button type="submit" className="primaryButton">
              🔍 Filtrar Obras
            </button>
          </div>
        </form>
      </section>

      {compositions.length === 0 ? (
        <section className="emptyState">
          <h2>Nenhuma composição encontrada</h2>
          <p>Tente ajustar os filtros ou pesquisar por outra palavra-chave.</p>
          <Link href="/catalogo" className="primaryButton">
            Ver todas as composições
          </Link>
        </section>
      ) : (
        <section className="compositionGrid">
          {compositions.map((song) => (
            <article className="songCard" key={song.id}>
              <div className="songCardHeader">
                <span className="songStatus">{statusLabel(song.status)}</span>
                {user?.id !== song.composerId && (
                  <form action={toggleFavorite}>
                    <input name="compositionId" type="hidden" value={song.id} />
                    <input name="returnTo" type="hidden" value="/catalogo" />
                    <button
                      className="favoriteHeartBtn"
                      type="submit"
                      title={song.favorites.length ? "Remover dos favoritos" : "Favoritar obra"}
                    >
                      {song.favorites.length ? "❤️" : "🤍"}
                    </button>
                  </form>
                )}
              </div>

              <h3>
                <Link href={`/catalogo/${song.id}`}>{song.title}</Link>
              </h3>
              <p className="songComposer">
                por <strong>{song.composer.name}</strong>
              </p>

              <SongMeta
                genre={song.genre}
                mood={song.mood ?? "Sem clima"}
                voice={song.voiceType ?? "Voz livre"}
                bpm={song.bpm ?? 0}
              />

              <div className="songCardFooter">
                <div className="cardStats">
                  <span>{song._count.favorites} favs</span>
                  <span>{song._count.interests} int.</span>
                </div>
                {user?.id === song.composerId ? (
                  <span className="ownerNotice">Sua composição</span>
                ) : (
                  <Link className="primaryButton compact" href={`/catalogo/${song.id}`}>
                    Ver Obra & Enviar Interesse
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
