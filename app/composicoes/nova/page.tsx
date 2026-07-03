import { AppShell, PageHeader } from "../../components";
import { createComposition } from "../../actions";
import { requireUser } from "../../lib/auth";
import { formatCredits, getCreditActionCosts } from "../../lib/credits";
import Link from "next/link";

export const dynamic = "force-dynamic";

const genreOptions = ["Sertanejo", "Gospel", "Piseiro", "Arrocha", "Forró", "Funk", "Pop", "Trap"];
const moodOptions = ["Romântica", "Sofrência", "Esperança", "Festa", "Adoração", "Superação"];
const voiceOptions = ["Voz masculina", "Voz feminina", "Dueto", "Grupo", "Indiferente"];

export default async function NewCompositionPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  try {
    await requireUser();
    const params = await searchParams;
    const categoryCosts = await getCreditActionCosts();
    const compositionCosts = categoryCosts.filter((cost) => cost.code.startsWith("COMPOSITION_CATEGORY_") && cost.isActive);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Nova obra"
        title="Cadastrar composição"
        description="Registre a obra com metadados musicais, autoria e declaração de IA."
      />

      <form className="compositionForm" action={createComposition} encType="multipart/form-data">
        {params.erro ? (
          <p className="formError">
            {params.erro === "declaracao"
              ? "Aceite as declarações de autoria, originalidade e uso de IA antes de cadastrar."
              : params.erro === "ia"
                ? "Obras integralmente geradas por IA não entram no catálogo. Abra suporte se houver titularidade comprovada."
                : params.erro === "creditos"
                  ? "Saldo insuficiente para cadastrar esta composição. Compre créditos ou fale com o suporte."
                  : params.erro === "tamanho_audio"
                    ? "O arquivo de áudio guia excede o limite permitido de 5 MB. Por favor, utilize formato MP3 compactado."
                    : "Informe título, gênero e papel de autoria."}
          </p>
        ) : null}

        {compositionCosts.length ? (
          <section className="panelCard compactPanel">
            <div className="panelTitle">
              <h2>Custo por categoria</h2>
            </div>
            <div className="creditCosts">
              {compositionCosts.map((cost) => (
                <span key={cost.code}>
                  {cost.label.replace("Cadastrar composição - ", "")}: <strong>{formatCredits(cost.credits)}</strong>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="formSection">
          <h2>Dados principais</h2>
          <div className="formGrid">
            <label>
              Título da composição
              <input name="title" placeholder="Ex: Saudade que não passa" required />
            </label>
            <label>
              Autores declarados
              <input name="authors" placeholder="Nome dos compositores" />
            </label>
            <label>
              Gênero
              <select name="genre" defaultValue="" required>
                <option value="" disabled>Selecione</option>
                {genreOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Tema
              <input name="theme" placeholder="Amor, fé, festa, saudade..." />
            </label>
            <label>
              Clima
              <select name="mood" defaultValue="">
                <option value="" disabled>Selecione</option>
                {moodOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo de voz
              <select name="voice" defaultValue="">
                <option value="" disabled>Selecione</option>
                {voiceOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              BPM
              <input name="bpm" type="number" min="40" max="220" placeholder="84" />
            </label>
            <label>
              Idioma
              <input name="language" defaultValue="Português" />
            </label>
          </div>
        </section>

        <section className="formSection">
          <h2>Letra e áudio guia</h2>
          <label>
            Letra
            <textarea name="lyrics" rows={10} placeholder="Cole a letra da música aqui" />
          </label>
          <div className="formGrid">
            <label>
              Visibilidade da letra
              <select name="lyricsVisibility" defaultValue="INTERESTED">
                <option value="PUBLIC">Pública na página de detalhe</option>
                <option value="INTERESTED">Liberar após interesse</option>
                <option value="PRIVATE">Privada</option>
              </select>
            </label>
            <label>
              Visibilidade do áudio
              <select name="audioVisibility" defaultValue="INTERESTED">
                <option value="PUBLIC">Preview público</option>
                <option value="INTERESTED">Liberar após interesse</option>
                <option value="PRIVATE">Privado</option>
              </select>
            </label>
          </div>
          <label>
            Áudio guia (Máximo 5MB - Recomenda-se formato MP3)
            <input name="audio" type="file" accept="audio/mpeg,audio/mp3,audio/x-mpeg,audio/x-mp3,audio/m4a,audio/x-m4a,audio/aac" />
          </label>
          <label>
            Observação de acesso
            <textarea
              name="accessNote"
              rows={3}
              placeholder="Ex: áudio liberado apenas para artistas verificados ou após proposta"
            />
          </label>
        </section>

        <section className="formSection">
          <h2>Autoria e inteligência artificial</h2>
          <div className="formGrid">
            <label>
              Seu papel na obra
              <select name="authorshipRole" defaultValue="" required>
                <option value="" disabled>Selecione</option>
                <option value="ORIGINAL_AUTHOR">Autor original</option>
                <option value="COAUTHOR_AUTHORIZED">Coautor autorizado</option>
                <option value="RIGHTS_HOLDER">Titular/representante autorizado</option>
              </select>
            </label>
            <label>
              Uso de IA
              <select name="aiUsage" defaultValue="NONE">
                <option value="NONE">Não usei IA</option>
                <option value="ASSISTED">IA só auxiliou ideias/revisão</option>
                <option value="PARTIAL">IA participou de parte criativa</option>
                <option value="GENERATED">Obra integralmente gerada por IA</option>
              </select>
            </label>
          </div>
          <label>
            Detalhe do uso de IA
            <textarea name="aiDisclosure" rows={3} placeholder="Explique ferramenta, etapa usada e o que foi criação humana." />
          </label>
          <label>
            Observações de direitos/autorização
            <textarea name="rightsNotes" rows={3} placeholder="Ex: coautores, editora, contrato, registro ou autorização." />
          </label>
        </section>

        <section className="formSection">
          <h2>Publicação e declarações</h2>
          <div className="checkList legalChecks">
            <label>
              <input name="publish" type="checkbox" />
              <span>Publicar na vitrine para artistas e produtores</span>
            </label>
            <label>
              <input name="authorship" type="checkbox" required />
              <span>Declaro que sou autor, coautor autorizado ou titular autorizado desta composição.</span>
            </label>
            <label>
              <input name="ownershipDeclaration" type="checkbox" required />
              <span>Declaro que tenho direito de cadastrar e negociar esta obra na Tunix.</span>
            </label>
            <label>
              <input name="noPlagiarismDeclaration" type="checkbox" required />
              <span>Declaro que a obra não plagia nem usa material de terceiros sem autorização.</span>
            </label>
            <label>
              <input name="aiDeclaration" type="checkbox" required />
              <span>Declaro que informei corretamente qualquer uso de inteligência artificial.</span>
            </label>
            <label>
              <input name="noDownload" type="checkbox" defaultChecked />
              <span>Bloquear download do áudio guia</span>
            </label>
          </div>
          <div className="formActions">
            <button className="secondaryButton" type="submit">Salvar rascunho</button>
            <button className="primaryButton" type="submit">Cadastrar composição</button>
          </div>
        </section>
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
  console.error("NEW COMPOSITION PAGE CRASH:", error);
    return (
      <AppShell>
        <div style={{ padding: "40px", maxWidth: "800px", margin: "40px auto", fontFamily: "sans-serif", background: "#fff0f0", border: "1px solid #ffc0c0", borderRadius: "12px", color: "#c00000", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "1.3rem" }}>Erro ao carregar página de nova composição</h2>
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
