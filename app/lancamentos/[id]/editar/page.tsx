import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRelease } from "../../../actions";
import { AppShell, PageHeader } from "../../../components";
import { requireUser } from "../../../lib/auth";
import { platformLabel, releaseStatusLabel } from "../../../lib/format";
import { prisma } from "../../../lib/prisma";

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
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
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
  const selectedPlatforms = new Set(release.platforms.map((platform) => platform.platform));
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
            <h2>Dados do fonograma</h2>
            <div className="formGrid">
              <label>
                Titulo do lancamento
                <input name="title" defaultValue={release.title} />
              </label>
              <label>
                Artista principal
                <input name="artistName" defaultValue={release.artistName} />
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
                <input name="master" type="file" accept="audio/*" />
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
              {platforms.map((platform) => (
                <label key={platform}>
                  <input name="platforms" type="checkbox" value={platform} defaultChecked={selectedPlatforms.has(platform)} />
                  {platformLabel(platform)}
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
