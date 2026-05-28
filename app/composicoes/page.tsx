import Link from "next/link";
import { AppShell, PageHeader, SongMeta } from "../components";
import { requireUser } from "../lib/auth";
import { statusLabel } from "../lib/format";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompositionsPage() {
  const user = await requireUser();
  const compositions = await prisma.composition.findMany({
    where: { composerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      composer: true,
      _count: {
        select: { favorites: true, interests: true },
      },
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Biblioteca"
        title="Minhas composições"
        description="Organize obras, acompanhe status e veja quais músicas estão chamando atenção."
        action={
          <Link className="primaryButton linkButton" href="/composicoes/nova">
            Cadastrar música
          </Link>
        }
      />

      <section className="tablePanel">
        <div className="tableHeader">
          <span>Composição</span>
          <span>Status</span>
          <span>Interesses</span>
          <span>Favoritos</span>
        </div>
        {compositions.map((song) => (
          <article className="compositionRow" key={song.title}>
            <div>
              <strong>{song.title}</strong>
              <small>{song.genre} · {song.mood ?? "Sem clima"} · {song.voiceType ?? "Voz livre"}</small>
            </div>
            <span className="songStatus">{statusLabel(song.status)}</span>
            <span>{song._count.interests}</span>
            <span>{song._count.favorites}</span>
          </article>
        ))}
      </section>

      <section className="compositionGrid compactGrid">
        {compositions.map((song) => (
          <article className="songCard" key={`card-${song.title}`}>
            <div className="songStatus">{statusLabel(song.status)}</div>
            <h3>{song.title}</h3>
            <p>por {song.composer.name}</p>
            <SongMeta
              genre={song.genre}
              mood={song.mood ?? "Sem clima"}
              voice={song.voiceType ?? "Voz livre"}
              bpm={song.bpm ?? 0}
            />
            <button>Editar composição</button>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
