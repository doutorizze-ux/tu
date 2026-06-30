import Link from "next/link";
import { AppShell, PageHeader, SongMeta } from "../components";
import { deleteComposition } from "../actions";
import { requireUser } from "../lib/auth";
import { statusLabel } from "../lib/format";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
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

      {params.erro ? (
        <p className="formError">
          {params.erro === "permissao"
            ? "Você não tem permissão para excluir esta composição."
            : "Ocorreu um erro ao excluir a composição."}
        </p>
      ) : null}

      {params.sucesso ? (
        <p className="formSuccess">
          Composição excluída com sucesso.
        </p>
      ) : null}

      <section className="tablePanel">
        <div className="tableHeader">
          <span>Composição</span>
          <span>Status</span>
          <span>Interesses</span>
          <span>Favoritos</span>
          <span style={{ textAlign: "right", paddingRight: "1rem" }}>Ações</span>
        </div>
        {compositions.map((song) => (
          <article className="compositionRow" key={song.title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <strong>{song.title}</strong>
              <small>{song.genre} · {song.mood ?? "Sem clima"} · {song.voiceType ?? "Voz livre"}</small>
            </div>
            <span className="songStatus" style={{ minWidth: "120px" }}>{statusLabel(song.status)}</span>
            <span style={{ minWidth: "100px" }}>{song._count.interests}</span>
            <span style={{ minWidth: "100px" }}>{song._count.favorites}</span>
            
            <div style={{ minWidth: "180px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
              <Link 
                href={`/composicoes/${song.id}/certificado`} 
                className="secondaryButton linkButton" 
                style={{ 
                  padding: "0.3rem 0.6rem", 
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  display: "inline-block",
                  margin: 0
                }}
              >
                Certidão
              </Link>
              <form action={deleteComposition} style={{ margin: 0 }}>
                <input type="hidden" name="compositionId" value={song.id} />
                <button 
                  type="submit" 
                  style={{ 
                    background: "transparent", 
                    color: "var(--danger, #ef4444)", 
                    border: "none", 
                    cursor: "pointer", 
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    padding: "0.2rem 0.5rem" 
                  }}
                >
                  Excluir
                </button>
              </form>
            </div>
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
            
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <Link 
                href={`/composicoes/${song.id}/certificado`} 
                className="secondaryButton linkButton" 
                style={{ 
                  flex: 1, 
                  padding: "0.4rem", 
                  fontSize: "0.8rem", 
                  textAlign: "center",
                  textDecoration: "none" 
                }}
              >
                Certidão
              </Link>
              
              <form action={deleteComposition} style={{ flex: 1, margin: 0 }}>
                <input type="hidden" name="compositionId" value={song.id} />
                <button 
                  type="submit" 
                  className="secondaryButton" 
                  style={{ 
                    width: "100%",
                    color: "var(--danger, #ef4444)", 
                    borderColor: "var(--danger, #ef4444)", 
                    padding: "0.4rem", 
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  Excluir
                </button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
