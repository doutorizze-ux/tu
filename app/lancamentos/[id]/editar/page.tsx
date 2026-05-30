import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRelease } from "../../../actions";
import { AppShell, PageHeader } from "../../../components";
import { requireUser } from "../../../lib/auth";
import { getAvailableDistributionPlatforms } from "../../../lib/distribution-platform-options";
import { releaseStatusLabel } from "../../../lib/format";
import { normalizePlatformValue } from "../../../lib/platforms";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function inputDate(date: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function EditReleasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [user, { id }, query, platforms] = await Promise.all([
    requireUser(),
    params,
    searchParams,
    getAvailableDistributionPlatforms(),
  ]);
  const release = await prisma.release.findFirst({
    where: { id, ownerId: user.id },
    include: {
      assets: true,
      contributors: true,
      platforms: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          reviewer: true,
        },
      },
    },
  });

  if (!release) {
    notFound();
  }

  const canEdit = ["DRAFT", "REVIEW", "REJECTED"].includes(release.status);
  const selectedPlatforms = new Set(release.platforms.map((platform) => normalizePlatformValue(platform.platform)));
  const platformOptions = [
    ...platforms,
    ...[...selectedPlatforms]
      .filter((platform) => !platforms.some((option) => option.value === platform))
      .map((platform) => ({ value: platform, label: platform })),
  ];
  const masterAsset = release.assets.find((asset) => asset.type === "MASTER");
  const coverAsset = release.assets.find((asset) => asset.type === "COVER");
  const contributorRows = [...release.contributors];

  while (contributorRows.length < 3) {
    contributorRows.push({
      id: `empty-${contributorRows.length}`,
      releaseId: release.id,
      name: "",
      role: "",
      royaltyShare: null,
      createdAt: new Date(),
    });
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Correcao de pacote"
        title={release.title}
        description={`Atualize metadados, arquivos, plataformas e creditos. Status atual: ${releaseStatusLabel(release.status)}.`}
        action={
          <Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}`}>
            Voltar ao pacote
          </Link>
        }
      />

      {!canEdit ? (
        <section className="emptyState">
          <h2>Pacote travado para edicao</h2>
          <p>Este lancamento ja entrou na etapa operacional de envio. Alteracoes agora precisam virar uma nova solicitacao.</p>
        </section>
      ) : (
        <form className="compositionForm" action={updateRelease}>
          <input name="releaseId" type="hidden" value={release.id} />
          {query.erro ? (
            <p className="formError">
              {query.erro === "status"
                ? "Este pacote nao pode mais ser editado por ja estar em envio."
                : query.erro === "declaracao"
                  ? "Confirme novamente a declaracao de titularidade antes de reenviar."
                  : "Informe titulo, artista, genero e pelo menos uma plataforma."}
            </p>
          ) : null}

          {release.reviews.length ? (
            <section className="formSection">
              <h2>Pendencias e historico operacional</h2>
              <div className="logList">
                {release.reviews.map((review) => (
                  <div key={review.id}>
                    <strong>{review.decision} - {review.reviewer.name}</strong>
                    <span>{review.note || "Sem nota"} - {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(review.createdAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="formSection">
            <h2>Identificacao do lancamento</h2>
            <div className="formGrid">
              <label>
                Titulo do lancamento
                <input name="title" defaultValue={release.title} />
              </label>
              <label>
                Titulo da faixa principal
                <input name="trackTitle" defaultValue={release.trackTitle ?? release.title} />
              </label>
              <label>
                Versao
                <input name="versionTitle" defaultValue={release.versionTitle ?? ""} placeholder="Original, remix, ao vivo..." />
              </label>
              <label>
                Artista principal
                <input name="artistName" defaultValue={release.artistName} />
              </label>
              <label>
                Nome legal do artista
                <input name="primaryArtistLegalName" defaultValue={release.primaryArtistLegalName ?? ""} />
              </label>
              <label>
                Selo/gravadora
                <input name="labelName" defaultValue={release.labelName ?? ""} />
              </label>
              <label>
                Genero
                <input name="genre" defaultValue={release.genre} />
              </label>
              <label>
                Idioma
                <select name="language" defaultValue={release.language}>
                  <option value="pt-BR">Portugues (Brasil)</option>
                  <option value="en">Ingles</option>
                  <option value="es">Espanhol</option>
                  <option value="instrumental">Instrumental</option>
                </select>
              </label>
              <label>
                Tipo
                <select name="releaseType" defaultValue={release.releaseType}>
                  <option value="SINGLE">Single</option>
                  <option value="EP">EP</option>
                  <option value="ALBUM">Album</option>
                </select>
              </label>
              <label>
                Data de lancamento
                <input name="releaseDate" type="date" defaultValue={inputDate(release.releaseDate)} />
              </label>
              <label>
                ISRC
                <input name="isrc" defaultValue={release.isrc ?? ""} placeholder="BRABC2600001" />
              </label>
              <label>
                UPC
                <input name="upc" defaultValue={release.upc ?? ""} placeholder="7890000000000" />
              </label>
            </div>
            <div className="checkList legalChecks">
              <label>
                <input name="requestIsrcAssignment" type="checkbox" defaultChecked={release.requestIsrcAssignment} />
                <span>Solicitar ISRC oficial à distribuidora caso o campo esteja vazio.</span>
              </label>
              <label>
                <input name="requestUpcAssignment" type="checkbox" defaultChecked={release.requestUpcAssignment} />
                <span>Solicitar UPC/EAN oficial à distribuidora caso o campo esteja vazio.</span>
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Direitos e territorios</h2>
            <div className="formGrid">
              <label>
                Titular dos direitos
                <input name="rightsHolderName" defaultValue={release.rightsHolderName ?? release.labelName ?? release.artistName} />
              </label>
              <label>
                CPF/CNPJ do titular
                <input name="rightsHolderDocument" inputMode="numeric" defaultValue={release.rightsHolderDocument ?? ""} />
              </label>
              <label>
                Ano de copyright
                <input name="copyrightYear" type="number" min="1900" max="2100" defaultValue={release.copyrightYear ?? new Date().getFullYear()} />
              </label>
              <label>
                Linha P
                <input name="pLine" defaultValue={release.pLine ?? ""} />
              </label>
              <label>
                Linha C
                <input name="cLine" defaultValue={release.cLine ?? ""} />
              </label>
              <label>
                Territorios
                <select name="territories" defaultValue={release.territories}>
                  <option value="WORLDWIDE">Mundial</option>
                  <option value="BRAZIL">Brasil</option>
                  <option value="CUSTOM">Restrito / revisar com operacao</option>
                </select>
              </label>
              <label>
                Inicio do preview
                <input name="previewStartSec" type="number" min="0" defaultValue={release.previewStartSec ?? ""} />
              </label>
            </div>
            <div className="checkList legalChecks">
              <label>
                <input name="explicitContent" type="checkbox" defaultChecked={release.explicitContent} />
                <span>Este lancamento possui conteudo explicito.</span>
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Arquivos do lancamento</h2>
            <div className="assetList">
              <div>
                <strong>Master atual</strong>
                <span>{masterAsset ? `${masterAsset.fileName} - ${Math.round(masterAsset.sizeBytes / 1024)} KB` : "Pendente"}</span>
                {masterAsset?.checksum ? <small>SHA-256 {masterAsset.checksum.slice(0, 16)}...</small> : null}
              </div>
              <div>
                <strong>Capa atual</strong>
                <span>{coverAsset ? `${coverAsset.fileName} - ${Math.round(coverAsset.sizeBytes / 1024)} KB` : "Pendente"}</span>
                {coverAsset?.checksum ? <small>SHA-256 {coverAsset.checksum.slice(0, 16)}...</small> : null}
              </div>
            </div>
            <div className="formGrid">
              <label>
                Substituir master final
                <input name="master" type="file" accept="audio/flac,.flac" />
                <small>Arquivo FLAC obrigatório para a entrega oficial.</small>
              </label>
              <label>
                Substituir capa
                <input name="cover" type="file" accept="image/*" />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Plataformas de destino</h2>
            <div className="platformChecklist">
              {platformOptions.map((platform) => (
                <label key={platform.value}>
                  <input name="platforms" type="checkbox" value={platform.value} defaultChecked={selectedPlatforms.has(platform.value)} />
                  {platform.label}
                </label>
              ))}
            </div>
          </section>

          <section className="formSection">
            <h2>Creditos e splits</h2>
            {contributorRows.map((contributor, index) => (
              <div className="splitRow" key={contributor.id}>
                <input name="contributorName" defaultValue={contributor.name} placeholder={index === 0 ? "Nome do artista/compositor" : "Nome"} />
                <input name="contributorRole" defaultValue={contributor.role} placeholder="Funcao: artista, compositor, produtor" />
                <input name="contributorShare" type="number" min="0" max="100" step="0.01" defaultValue={contributor.royaltyShare ?? ""} placeholder="%" />
              </div>
            ))}
            <label>
              Observacoes para revisao
              <textarea name="notes" rows={4} defaultValue={release.notes ?? ""} />
            </label>
          </section>

          <section className="formSection">
            <h2>Reenvio</h2>
            <p className="mutedText">
              Ao salvar, o pacote volta para a revisao operacional da empresa com os dados corrigidos.
            </p>
            <div className="checkList legalChecks">
              <label>
                <input name="rightsDeclaration" type="checkbox" />
                <span>Confirmo que as informacoes corrigidas continuam autorizadas pelos titulares e participantes.</span>
              </label>
            </div>
            <div className="formActions">
              <button className="primaryButton" type="submit">Salvar e reenviar para revisao</button>
            </div>
          </section>
        </form>
      )}
    </AppShell>
  );
}
