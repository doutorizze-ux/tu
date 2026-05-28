import { createRelease } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { platformLabel } from "../../lib/format";

export const dynamic = "force-dynamic";

const platforms = [
  "SPOTIFY",
  "DEEZER",
  "APPLE_MUSIC",
  "YOUTUBE_MUSIC",
  "TIKTOK",
  "INSTAGRAM_FACEBOOK",
  "AMAZON_MUSIC",
  "TIDAL",
];

export default async function NewReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Novo lançamento"
        title="Distribuir música"
        description="Monte o pacote profissional do fonograma para envio simultâneo às plataformas digitais."
      />

      <form className="compositionForm" action={createRelease}>
        {params.erro ? (
          <p className="formError">
            {params.erro === "declaracao"
              ? "Aceite as declarações de titularidade e autorização antes de preparar a distribuição."
              : params.erro === "creditos"
                ? "Saldo insuficiente. Compre créditos para preparar o lançamento."
                : "Informe título, artista, gênero e pelo menos uma plataforma."}
          </p>
        ) : null}

        <section className="formSection">
          <h2>Dados do fonograma</h2>
          <div className="formGrid">
            <label>
              Título do lançamento
              <input name="title" placeholder="Ex: Meu Novo Single" />
            </label>
            <label>
              Artista principal
              <input name="artistName" placeholder="Nome artistico" />
            </label>
            <label>
              Selo/gravadora
              <input name="labelName" placeholder="Independente, selo ou gravadora" />
            </label>
            <label>
              Gênero
              <input name="genre" placeholder="Sertanejo, gospel, trap..." />
            </label>
            <label>
              Tipo
              <select name="releaseType" defaultValue="SINGLE">
                <option value="SINGLE">Single</option>
                <option value="EP">EP</option>
                <option value="ALBUM">Album</option>
              </select>
            </label>
            <label>
              Data de lançamento
              <input name="releaseDate" type="date" />
            </label>
            <label>
              ISRC
              <input name="isrc" placeholder="Opcional nesta etapa" />
            </label>
            <label>
              UPC
              <input name="upc" placeholder="Opcional nesta etapa" />
            </label>
          </div>
        </section>

        <section className="formSection">
          <h2>Arquivos do lançamento</h2>
          <div className="formGrid">
            <label>
              Master final
              <input name="master" type="file" accept="audio/*" />
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
              <label key={platform}>
                <input name="platforms" type="checkbox" value={platform} defaultChecked />
                {platformLabel(platform)}
              </label>
            ))}
          </div>
        </section>

        <section className="formSection">
          <h2>Créditos e splits</h2>
          {[0, 1, 2].map((index) => (
            <div className="splitRow" key={index}>
              <input name="contributorName" placeholder={index === 0 ? "Nome do artista/compositor" : "Nome"} />
              <input name="contributorRole" placeholder="Função: artista, compositor, produtor" />
              <input name="contributorShare" type="number" min="0" max="100" placeholder="%" />
            </div>
          ))}
          <label>
            Observações para revisão
            <textarea name="notes" rows={4} placeholder="Ex: confirmar ISRC com distribuidora parceira" />
          </label>
        </section>

        <section className="formSection">
          <h2>Declarações e envio</h2>
          <p className="mutedText">
            Esta etapa prepara o pacote para envio. A entrega real para DSPs entra por integração com
            agregadora/distribuidora parceira.
          </p>
          <div className="checkList legalChecks">
            <label>
              <input name="rightsDeclaration" type="checkbox" />
              <span>Declaro que sou titular ou possuo autorização para distribuir o fonograma, capa, créditos e metadados informados.</span>
            </label>
            <label>
              <input name="distributionAgreement" type="checkbox" />
              <span>Autorizo a Tunix a processar este pacote para revisão operacional e distribuição conforme contrato aplicável.</span>
            </label>
          </div>
          <div className="formActions">
            <button className="primaryButton" type="submit">Preparar distribuição</button>
          </div>
        </section>
      </form>
    </AppShell>
  );
}
