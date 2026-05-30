import { createRelease } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { getAvailableDistributionPlatforms } from "../../lib/distribution-platform-options";

export const dynamic = "force-dynamic";

export default async function NewReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const [, params, platforms] = await Promise.all([
    requireUser(),
    searchParams,
    getAvailableDistributionPlatforms(),
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Novo lancamento"
        title="Distribuir musica"
        description="Monte um pacote profissional com metadados, arquivos, direitos e validacao operacional antes do envio."
      />

      <form className="compositionForm" action={createRelease}>
        {params.erro ? (
          <p className="formError">
            {params.erro === "declaracao"
              ? "Aceite as declaracoes de titularidade e autorizacao antes de preparar a distribuicao."
              : params.erro === "creditos"
                ? "Saldo insuficiente. Compre creditos para preparar o lancamento."
                : "Confira titulo, artista, genero, idioma, titular, copyright e plataformas."}
          </p>
        ) : null}

        <section className="formSection">
          <h2>Identificacao do lancamento</h2>
          <div className="formGrid">
            <label>
              Titulo do lancamento
              <input name="title" placeholder="Ex: Meu Novo Single" required />
            </label>
            <label>
              Titulo da faixa principal
              <input name="trackTitle" placeholder="Ex: Meu Novo Single" required />
            </label>
            <label>
              Versao
              <input name="versionTitle" placeholder="Original, remix, ao vivo..." />
            </label>
            <label>
              Artista principal
              <input name="artistName" placeholder="Nome artistico" required />
            </label>
            <label>
              Nome legal do artista
              <input name="primaryArtistLegalName" placeholder="Nome completo ou razao social" />
            </label>
            <label>
              Selo/gravadora
              <input name="labelName" placeholder="Independente, selo ou gravadora" />
            </label>
            <label>
              Genero
              <input name="genre" placeholder="Sertanejo, gospel, trap..." required />
            </label>
            <label>
              Idioma
              <select name="language" defaultValue="pt-BR" required>
                <option value="pt-BR">Portugues (Brasil)</option>
                <option value="en">Ingles</option>
                <option value="es">Espanhol</option>
                <option value="instrumental">Instrumental</option>
              </select>
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
              Data de lancamento
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
            <label>
              <input name="requestIsrcAssignment" type="checkbox" defaultChecked />
              <span>Solicitar ISRC oficial à distribuidora caso o campo esteja vazio.</span>
            </label>
            <label>
              <input name="requestUpcAssignment" type="checkbox" defaultChecked />
              <span>Solicitar UPC/EAN oficial à distribuidora caso o campo esteja vazio.</span>
            </label>
          </div>
        </section>

        <section className="formSection">
          <h2>Direitos e territorios</h2>
          <div className="formGrid">
            <label>
              Titular dos direitos
              <input name="rightsHolderName" placeholder="Pessoa, selo ou empresa responsavel" required />
            </label>
            <label>
              CPF/CNPJ do titular
              <input name="rightsHolderDocument" inputMode="numeric" placeholder="Somente numeros" />
            </label>
            <label>
              Ano de copyright
              <input name="copyrightYear" type="number" min="1900" max="2100" placeholder="2026" required />
            </label>
            <label>
              Linha P
              <input name="pLine" placeholder="2026 Nome do titular" required />
            </label>
            <label>
              Linha C
              <input name="cLine" placeholder="2026 Nome do titular" required />
            </label>
            <label>
              Territorios
              <select name="territories" defaultValue="WORLDWIDE" required>
                <option value="WORLDWIDE">Mundial</option>
                <option value="BRAZIL">Brasil</option>
                <option value="CUSTOM">Restrito / revisar com operacao</option>
              </select>
            </label>
            <label>
              Inicio do preview
              <input name="previewStartSec" type="number" min="0" placeholder="Ex: 30 segundos" />
            </label>
          </div>
          <div className="checkList legalChecks">
            <label>
              <input name="explicitContent" type="checkbox" />
              <span>Este lancamento possui conteudo explicito.</span>
            </label>
          </div>
        </section>

        <section className="formSection">
          <h2>Arquivos do lancamento</h2>
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
              <label key={platform.value}>
                <input name="platforms" type="checkbox" value={platform.value} defaultChecked />
                {platform.label}
              </label>
            ))}
          </div>
        </section>

        <section className="formSection">
          <h2>Creditos e splits</h2>
          {[0, 1, 2].map((index) => (
            <div className="splitRow" key={index}>
              <input name="contributorName" placeholder={index === 0 ? "Nome do artista/compositor" : "Nome"} />
              <input name="contributorRole" placeholder="Funcao: artista, compositor, produtor" />
              <input name="contributorShare" type="number" min="0" max="100" placeholder="%" />
            </div>
          ))}
          <label>
            Observacoes para revisao
            <textarea name="notes" rows={4} placeholder="Ex: confirmar ISRC com operacao antes do envio" />
          </label>
        </section>

        <section className="formSection">
          <h2>Declaracoes e envio</h2>
          <p className="mutedText">
            Esta etapa prepara o pacote para revisao operacional e entrega digital sob a marca Tunix.
          </p>
          <div className="checkList legalChecks">
            <label>
              <input name="rightsDeclaration" type="checkbox" />
              <span>Declaro que sou titular ou possuo autorizacao para distribuir o fonograma, capa, creditos e metadados informados.</span>
            </label>
            <label>
              <input name="distributionAgreement" type="checkbox" />
              <span>Autorizo a Tunix a processar este pacote para revisao operacional e distribuicao conforme contrato aplicavel.</span>
            </label>
          </div>
          <div className="formActions">
            <button className="primaryButton" type="submit">Preparar distribuicao</button>
          </div>
        </section>
      </form>
    </AppShell>
  );
}
