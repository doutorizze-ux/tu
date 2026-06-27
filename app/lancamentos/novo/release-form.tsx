"use client";

import { useState, useRef, FormEvent } from "react";
import { createRelease } from "../../actions";

interface PlatformOption {
  value: string;
  label: string;
}

export function ReleaseForm({
  platforms,
  erroParam,
}: {
  platforms: PlatformOption[];
  erroParam?: string;
}) {
  const currentYear = new Date().getFullYear().toString();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [artistName, setArtistName] = useState("");
  const [rightsHolder, setRightsHolder] = useState("");
  const [pLineVal, setPLineVal] = useState("");
  const [cLineVal, setCLineVal] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

  // Auto-fill P and C lines if user hasn't typed a custom line yet
  const handleArtistChange = (val: string) => {
    setArtistName(val);
    const holder = rightsHolder || val || "Artista";
    if (!pLineVal) setPLineVal(`${currentYear} ${holder}`);
    if (!cLineVal) setCLineVal(`${currentYear} ${holder}`);
  };

  const handleRightsHolderChange = (val: string) => {
    setRightsHolder(val);
    const holder = val || artistName || "Artista";
    if (!pLineVal || pLineVal.includes("Artista")) setPLineVal(`${currentYear} ${holder}`);
    if (!cLineVal || cLineVal.includes("Artista")) setCLineVal(`${currentYear} ${holder}`);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const form = formRef.current;
    if (!form) return;

    // Check custom required logic and highlight missing fields
    const missingFields: string[] = [];

    const titleInput = form.querySelector<HTMLInputElement>('input[name="title"]');
    const trackTitleInput = form.querySelector<HTMLInputElement>('input[name="trackTitle"]');
    const artistInput = form.querySelector<HTMLInputElement>('input[name="artistName"]');
    const genreInput = form.querySelector<HTMLInputElement>('input[name="genre"]');
    const rightsHolderInput = form.querySelector<HTMLInputElement>('input[name="rightsHolderName"]');
    const copyrightYearInput = form.querySelector<HTMLInputElement>('input[name="copyrightYear"]');
    const pLineInput = form.querySelector<HTMLInputElement>('input[name="pLine"]');
    const cLineInput = form.querySelector<HTMLInputElement>('input[name="cLine"]');

    const rightsDec = form.querySelector<HTMLInputElement>('input[name="rightsDeclaration"]');
    const distAgrem = form.querySelector<HTMLInputElement>('input[name="distributionAgreement"]');

    if (!titleInput?.value.trim()) missingFields.push("Título do lançamento");
    if (!trackTitleInput?.value.trim()) missingFields.push("Título da faixa principal");
    if (!artistInput?.value.trim()) missingFields.push("Artista principal");
    if (!genreInput?.value.trim()) missingFields.push("Gênero");
    if (!rightsHolderInput?.value.trim()) missingFields.push("Titular dos direitos");
    if (!copyrightYearInput?.value.trim()) missingFields.push("Ano de copyright");
    if (!pLineInput?.value.trim()) missingFields.push("Linha P");
    if (!cLineInput?.value.trim()) missingFields.push("Linha C");

    let firstMissingEl: HTMLElement | null = null;

    if (!titleInput?.value.trim() && !firstMissingEl) firstMissingEl = titleInput;
    if (!trackTitleInput?.value.trim() && !firstMissingEl) firstMissingEl = trackTitleInput;
    if (!artistInput?.value.trim() && !firstMissingEl) firstMissingEl = artistInput;
    if (!genreInput?.value.trim() && !firstMissingEl) firstMissingEl = genreInput;
    if (!rightsHolderInput?.value.trim() && !firstMissingEl) firstMissingEl = rightsHolderInput;
    if (!copyrightYearInput?.value.trim() && !firstMissingEl) firstMissingEl = copyrightYearInput;
    if (!pLineInput?.value.trim() && !firstMissingEl) firstMissingEl = pLineInput;
    if (!cLineInput?.value.trim() && !firstMissingEl) firstMissingEl = cLineInput;

    if (missingFields.length > 0) {
      setFormError(`Por favor, preencha os seguintes campos obrigatórios acima: ${missingFields.join(", ")}.`);
      if (firstMissingEl) {
        firstMissingEl.scrollIntoView({ behavior: "smooth", block: "center" });
        firstMissingEl.focus();
      }
      return;
    }

    if (!rightsDec?.checked || !distAgrem?.checked) {
      setFormError("Você precisa marcar as duas caixas de declaração de titularidade e autorização ao final da página.");
      const decBox = !rightsDec?.checked ? rightsDec : distAgrem;
      if (decBox) {
        decBox.scrollIntoView({ behavior: "smooth", block: "center" });
        decBox.focus();
      }
      return;
    }

    // Form is valid and submitting! Show feedback state
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);
      await createRelease(formData);
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT" || err?.digest?.includes("NEXT_REDIRECT")) {
        throw err;
      }
      setIsSubmitting(false);
      setFormError(err?.message || "Ocorreu um erro ao enviar os arquivos do lançamento. Tente novamente.");
    }
  };

  return (
    <form 
      ref={formRef}
      className="compositionForm" 
      action={createRelease} 
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      {erroParam || formError ? (
        <p className="formError" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "1rem", borderRadius: "8px", fontWeight: "bold" }}>
          {formError
            ? formError
            : erroParam === "declaracao"
            ? "Aceite as declarações de titularidade e autorização antes de preparar a distribuição."
            : erroParam === "creditos"
            ? "Saldo insuficiente. Compre créditos para preparar o lançamento."
            : "Confira título, artista, gênero, idioma, titular, copyright e plataformas."}
        </p>
      ) : null}

      <section className="formSection">
        <h2>Identificação do lançamento</h2>
        <div className="formGrid">
          <label>
            Título do lançamento *
            <input name="title" placeholder="Ex: Meu Novo Single" required />
          </label>
          <label>
            Título da faixa principal *
            <input name="trackTitle" placeholder="Ex: Meu Novo Single" required />
          </label>
          <label>
            Versão
            <input name="versionTitle" placeholder="Original, remix, ao vivo..." />
          </label>
          <label>
            Artista principal *
            <input 
              name="artistName" 
              placeholder="Nome artístico" 
              required 
              onChange={(e) => handleArtistChange(e.target.value)}
            />
          </label>
          <label>
            Nome legal do artista
            <input name="primaryArtistLegalName" placeholder="Nome completo ou razão social" />
          </label>
          <label>
            Selo/gravadora
            <input name="labelName" placeholder="Independente, selo ou gravadora" />
          </label>
          <label>
            Gênero *
            <input name="genre" placeholder="Sertanejo, gospel, trap..." required />
          </label>
          <label>
            Idioma *
            <select name="language" defaultValue="pt-BR" required>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
              <option value="instrumental">Instrumental</option>
            </select>
          </label>
          <label>
            Tipo
            <select name="releaseType" defaultValue="SINGLE">
              <option value="SINGLE">Single</option>
              <option value="EP">EP</option>
              <option value="ALBUM">Álbum</option>
            </select>
          </label>
          <label>
            Data de lançamento
            <input name="releaseDate" type="date" />
          </label>
          <label>
            ISRC
            <input name="isrc" placeholder="Preencha somente se já possuir um ISRC oficial" />
          </label>
          <label>
            UPC
            <input name="upc" placeholder="Preencha somente se já possuir um UPC/EAN oficial" />
          </label>
        </div>
        <div className="checkList legalChecks">
          <label className="inlineCheck">
            <input name="requestIsrcAssignment" type="checkbox" defaultChecked />
            <span>Solicitar ISRC oficial à distribuidora caso o campo esteja vazio.</span>
          </label>
          <label className="inlineCheck">
            <input name="requestUpcAssignment" type="checkbox" defaultChecked />
            <span>Solicitar UPC/EAN oficial à distribuidora caso o campo esteja vazio.</span>
          </label>
        </div>
      </section>

      <section className="formSection">
        <h2>Direitos e territórios</h2>
        <div className="formGrid">
          <label>
            Titular dos direitos *
            <input 
              name="rightsHolderName" 
              placeholder="Pessoa, selo ou empresa responsável" 
              required 
              onChange={(e) => handleRightsHolderChange(e.target.value)}
            />
          </label>
          <label>
            CPF/CNPJ do titular
            <input name="rightsHolderDocument" inputMode="numeric" placeholder="Somente números" />
          </label>
          <label>
            Ano de copyright *
            <input name="copyrightYear" type="number" min="1900" max="2100" defaultValue={currentYear} required />
          </label>
          <label>
            Linha P *
            <input 
              name="pLine" 
              placeholder={`Ex: ${currentYear} Nome do titular`} 
              value={pLineVal}
              onChange={(e) => setPLineVal(e.target.value)}
              required 
            />
          </label>
          <label>
            Linha C *
            <input 
              name="cLine" 
              placeholder={`Ex: ${currentYear} Nome do titular`} 
              value={cLineVal}
              onChange={(e) => setCLineVal(e.target.value)}
              required 
            />
          </label>
          <label>
            Territórios *
            <select name="territories" defaultValue="WORLDWIDE" required>
              <option value="WORLDWIDE">Mundial</option>
              <option value="BRAZIL">Brasil</option>
              <option value="CUSTOM">Restrito / revisar com operação</option>
            </select>
          </label>
          <label>
            Início do preview
            <input name="previewStartSec" type="number" min="0" placeholder="Ex: 30 segundos" />
          </label>
        </div>
        <div className="checkList legalChecks">
          <label className="inlineCheck">
            <input name="explicitContent" type="checkbox" />
            <span>Este lançamento possui conteúdo explícito.</span>
          </label>
        </div>
      </section>

      <section className="formSection">
        <h2>Arquivos do lançamento</h2>
        <div className="formGrid">
          <label>
            Master final
            <input name="master" type="file" accept="audio/flac,.flac" />
            <small>Arquivo FLAC obrigatório para a entrega oficial.</small>
          </label>
          <label>
            Capa
            <input name="cover" type="file" accept="image/*" />
          </label>
        </div>
      </section>

      <section className="formSection">
        <h2>Plataformas de destino</h2>
        <div className="platformChecklist">
          {platforms.map((platform) => (
            <label key={platform.value} className="inlineCheck">
              <input name="platforms" type="checkbox" value={platform.value} defaultChecked />
              <span>{platform.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="formSection">
        <h2>Créditos e splits</h2>
        {[0, 1, 2].map((index) => (
          <div className="splitRow" key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: "10px", marginBottom: "10px" }}>
            <input name="contributorName" placeholder={index === 0 ? "Nome do artista/compositor" : "Nome"} />
            <input name="contributorRole" placeholder="Função: artista, compositor, produtor" />
            <input name="contributorShare" type="number" min="0" max="100" placeholder="%" />
          </div>
        ))}
        <label>
          Observações para revisão
          <textarea name="notes" rows={4} placeholder="Ex: confirmar ISRC com operação antes do envio" />
        </label>
      </section>

      <section className="formSection">
        <h2>Declarações e envio</h2>
        <p className="mutedText">
          Esta etapa prepara o pacote para revisão operacional e entrega digital sob a marca Tunix.
        </p>

        {formError ? (
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", borderRadius: "6px", color: "var(--danger)", marginBottom: "1rem", fontWeight: "bold", fontSize: "0.9rem" }}>
            {formError}
          </div>
        ) : null}

        <div className="checkList legalChecks">
          <label className="inlineCheck">
            <input name="rightsDeclaration" type="checkbox" />
            <span>Declaro que sou titular ou possuo autorização para distribuir o fonograma, capa, créditos e metadados informados.</span>
          </label>
          <label className="inlineCheck">
            <input name="distributionAgreement" type="checkbox" />
            <span>Autorizo a Tunix a processar este pacote para revisão operacional e distribuição conforme contrato aplicável.</span>
          </label>
        </div>
        <div className="formActions" style={{ marginTop: "1.5rem" }}>
          <button 
            className="primaryButton" 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              opacity: isSubmitting ? 0.7 : 1, 
              cursor: isSubmitting ? "not-allowed" : "pointer",
              padding: "0.8rem 2rem",
              fontSize: "1rem"
            }}
          >
            {isSubmitting ? "Preparando lançamento... (Aguarde)" : "Preparar distribuição"}
          </button>
        </div>
      </section>
    </form>
  );
}
