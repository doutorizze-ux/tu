import { AppShell, PageHeader } from "../../../components";
import { updateComposition } from "../../../actions";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const genreOptions = ["Sertanejo", "Gospel", "Piseiro", "Arrocha", "Forró", "Funk", "Pop", "Trap"];
const moodOptions = ["Romântica", "Sofrência", "Esperança", "Festa", "Adoração", "Superação"];
const voiceOptions = ["Voz masculina", "Voz feminina", "Dueto", "Grupo", "Indiferente"];

export default async function EditCompositionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const query = await searchParams;

    const composition = await prisma.composition.findUnique({
      where: { id },
      include: { audio: true },
    });

    if (!composition) {
      notFound();
    }

    if (composition.composerId !== user.id) {
      redirect("/composicoes?erro=permissao");
    }

    return (
      <AppShell>
        <PageHeader
          eyebrow="Editar obra"
          title={`Editar: ${composition.title}`}
          description="Corrija metadados da obra. A data de registro original e a assinatura de autoria são totalmente preservadas."
        />

        <form className="compositionForm" action={updateComposition} encType="multipart/form-data">
          <input type="hidden" name="compositionId" value={composition.id} />

          {query.erro ? (
            <p className="formError">
              {query.erro === "tamanho_audio"
                ? "O arquivo de áudio guia excede o limite de 5 MB. Por favor, utilize formato MP3 compactado."
                : "Informe título, gênero e preencha todos os campos obrigatórios."}
            </p>
          ) : null}

          <section className="formSection">
            <h2>Dados principais</h2>
            <div className="formGrid">
              <label>
                Título da composição
                <input name="title" defaultValue={composition.title} required />
              </label>
              <label>
                Gênero
                <select name="genre" defaultValue={composition.genre} required>
                  {genreOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                Tema
                <input name="theme" placeholder="Amor, fé, festa, saudade..." defaultValue={composition.theme ?? ""} />
              </label>
              <label>
                Clima
                <select name="mood" defaultValue={composition.mood ?? ""}>
                  <option value="">Selecione</option>
                  {moodOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                BPM (Batidas por minuto)
                <input name="bpm" type="number" placeholder="Ex: 120" defaultValue={composition.bpm ?? ""} />
              </label>
              <label>
                Tipo de voz recomendado
                <select name="voice" defaultValue={composition.voiceType ?? ""}>
                  <option value="">Selecione</option>
                  {voiceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                Idioma original
                <input name="language" defaultValue={composition.language} />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Letra da música</h2>
            <textarea
              name="lyrics"
              rows={15}
              placeholder="Digite ou cole a letra completa aqui..."
              defaultValue={composition.lyrics ?? ""}
            />
          </section>

          <section className="formSection">
            <h2>Áudio guia e privacidade</h2>
            <div className="formGrid">
              <label>
                Visibilidade da letra
                <select name="lyricsVisibility" defaultValue={composition.lyricsVisibility}>
                  <option value="PUBLIC">Letra pública</option>
                  <option value="INTERESTED">Liberar após interesse</option>
                  <option value="PRIVATE">Privada</option>
                </select>
              </label>
              <label>
                Visibilidade do áudio
                <select name="audioVisibility" defaultValue={composition.audioVisibility}>
                  <option value="PUBLIC">Preview público</option>
                  <option value="INTERESTED">Liberar após interesse</option>
                  <option value="PRIVATE">Privado</option>
                </select>
              </label>
            </div>
            <label style={{ marginTop: "15px", display: "block" }}>
              Atualizar Áudio Guia (Deixe em branco para manter o áudio atual)
              <input name="audio" type="file" accept="audio/mpeg,audio/mp3,audio/x-mpeg,audio/x-mp3,audio/m4a,audio/x-m4a,audio/aac" />
              {composition.audio && (
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "5px" }}>
                  Arquivo atual: <strong>{composition.audio.fileName}</strong>
                </p>
              )}
            </label>
            <label style={{ marginTop: "15px", display: "block" }}>
              Observação de acesso
              <textarea
                name="accessNote"
                rows={3}
                placeholder="Ex: áudio liberado apenas para artistas verificados ou após proposta"
                defaultValue={composition.accessNote ?? ""}
              />
            </label>
          </section>

          <div className="formActions">
            <Link className="secondaryButton linkButton" href="/composicoes" style={{ textDecoration: "none", textAlign: "center" }}>
              Cancelar
            </Link>
            <button className="primaryButton" type="submit">Salvar Alterações</button>
          </div>
        </form>
      </AppShell>
    );
  } catch (error: any) {
    if (
      error.digest?.startsWith("NEXT_REDIRECT") ||
      error.digest?.startsWith("NEXT_NOT_FOUND") ||
      error.message === "NEXT_REDIRECT" ||
      error.message === "NEXT_NOT_FOUND"
    ) {
      throw error;
    }
    console.error("EDIT COMPOSITION PAGE CRASH:", error);
    return (
      <AppShell>
        <div style={{ padding: "40px", maxWidth: "800px", margin: "40px auto", fontFamily: "sans-serif", background: "#fff0f0", border: "1px solid #ffc0c0", borderRadius: "12px", color: "#c00000", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "1.3rem" }}>Erro ao carregar página de edição</h2>
          <p style={{ color: "#555", fontSize: "0.9rem" }}>Por favor, envie este print ao suporte técnico com o erro abaixo:</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#ffffff", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "0.85rem", color: "#333", overflowX: "auto" }}>
            {error.stack || error.message || String(error)}
          </pre>
          <Link href="/composicoes" style={{ display: "inline-block", marginTop: "20px", color: "#0f6b5f", fontWeight: "bold", textDecoration: "underline" }}>
            Voltar para Minhas Composições
          </Link>
        </div>
      </AppShell>
    );
  }
}