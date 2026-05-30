import type { Release, ReleaseAsset, ReleaseContributor, ReleasePlatform } from "@prisma/client";

export type ReleaseValidationSeverity = "BLOCKER" | "WARNING" | "OK";

export type ReleaseValidationIssue = {
  code: string;
  label: string;
  detail: string;
  severity: ReleaseValidationSeverity;
};

type ReleaseForValidation = Pick<
  Release,
  | "artistName"
  | "cLine"
  | "copyrightYear"
  | "genre"
  | "isrc"
  | "language"
  | "pLine"
  | "requestIsrcAssignment"
  | "requestUpcAssignment"
  | "releaseDate"
  | "rightsHolderName"
  | "territories"
  | "title"
  | "trackTitle"
  | "upc"
> & {
  assets: ReleaseAsset[];
  contributors: ReleaseContributor[];
  platforms: ReleasePlatform[];
};

const ISRC_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/;
const UPC_PATTERN = /^[0-9]{12,14}$/;

function normalizeCode(value: string | null | undefined) {
  return (value ?? "").replace(/[\s-]/g, "").toUpperCase();
}

function beginningOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysFromToday(date: Date) {
  const today = beginningOfToday().getTime();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today) / 86_400_000);
}

function validationIssue(
  severity: ReleaseValidationSeverity,
  code: string,
  label: string,
  detail: string,
): ReleaseValidationIssue {
  return { code, detail, label, severity };
}

export function validateReleasePackage(release: ReleaseForValidation) {
  const issues: ReleaseValidationIssue[] = [];
  const master = release.assets.find((asset) => asset.type === "MASTER");
  const cover = release.assets.find((asset) => asset.type === "COVER");
  const isrc = normalizeCode(release.isrc);
  const upc = normalizeCode(release.upc);
  const splitTotal = release.contributors.reduce(
    (total, contributor) => total + (contributor.royaltyShare ?? 0),
    0,
  );

  if (!release.title.trim()) {
    issues.push(validationIssue("BLOCKER", "TITLE_REQUIRED", "Titulo obrigatorio", "Informe o titulo comercial do lancamento."));
  }

  if (!release.trackTitle?.trim()) {
    issues.push(validationIssue("BLOCKER", "TRACK_TITLE_REQUIRED", "Titulo da faixa obrigatorio", "Informe o titulo da faixa principal."));
  }

  if (!release.artistName.trim()) {
    issues.push(validationIssue("BLOCKER", "ARTIST_REQUIRED", "Artista obrigatorio", "Informe o nome artistico principal."));
  }

  if (!release.genre.trim()) {
    issues.push(validationIssue("BLOCKER", "GENRE_REQUIRED", "Genero obrigatorio", "Informe o genero principal do lancamento."));
  }

  if (!release.language.trim()) {
    issues.push(validationIssue("BLOCKER", "LANGUAGE_REQUIRED", "Idioma obrigatorio", "Informe o idioma principal do fonograma."));
  }

  if (!release.rightsHolderName?.trim()) {
    issues.push(validationIssue("BLOCKER", "RIGHTS_HOLDER_REQUIRED", "Titular obrigatorio", "Informe o titular comercial ou selo responsavel pelo lancamento."));
  }

  if (!release.pLine?.trim() || !release.cLine?.trim() || !release.copyrightYear) {
    issues.push(validationIssue("BLOCKER", "COPYRIGHT_REQUIRED", "Copyright incompleto", "Informe linhas P e C e o ano de copyright."));
  }

  if (!release.territories.trim()) {
    issues.push(validationIssue("BLOCKER", "TERRITORIES_REQUIRED", "Territorios obrigatorios", "Informe se a distribuicao e mundial ou restrita."));
  }

  if (!master) {
    issues.push(validationIssue("BLOCKER", "MASTER_REQUIRED", "Master final obrigatorio", "Envie o arquivo final de audio do pacote."));
  } else if (!master.checksum) {
    issues.push(validationIssue("BLOCKER", "MASTER_CHECKSUM_REQUIRED", "Checksum do master ausente", "O master precisa ter hash SHA-256 para rastreabilidade."));
  } else if (master.mimeType !== "audio/flac" && !master.fileName.toLowerCase().endsWith(".flac")) {
    issues.push(validationIssue("BLOCKER", "MASTER_FLAC_REQUIRED", "Master precisa estar em FLAC", "A distribuidora oficial recebe o master final em FLAC para entrega às plataformas."));
  }

  if (!cover) {
    issues.push(validationIssue("BLOCKER", "COVER_REQUIRED", "Capa obrigatoria", "Envie a arte de capa do lancamento."));
  } else if (!cover.checksum) {
    issues.push(validationIssue("BLOCKER", "COVER_CHECKSUM_REQUIRED", "Checksum da capa ausente", "A capa precisa ter hash SHA-256 para rastreabilidade."));
  }

  if (!release.releaseDate) {
    issues.push(validationIssue("BLOCKER", "RELEASE_DATE_REQUIRED", "Data de lancamento obrigatoria", "Defina a data oficial de lancamento."));
  } else {
    const days = daysFromToday(release.releaseDate);

    if (days < 0) {
      issues.push(validationIssue("BLOCKER", "RELEASE_DATE_PAST", "Data no passado", "Use uma data futura para envio a plataformas."));
    } else if (days < 7) {
      issues.push(validationIssue("WARNING", "RELEASE_DATE_SHORT_LEAD", "Prazo curto", "Lancamentos com menos de 7 dias de antecedencia podem sofrer atraso nas plataformas."));
    }
  }

  if (!isrc) {
    issues.push(release.requestIsrcAssignment
      ? validationIssue("WARNING", "ISRC_PROVIDER_ASSIGNMENT_PENDING", "ISRC oficial será atribuído pela distribuidora", "A Tunix solicitará um ISRC real ao provider credenciado durante o envio.")
      : validationIssue("BLOCKER", "ISRC_REQUIRED", "ISRC obrigatorio", "Informe um ISRC existente ou autorize a atribuição oficial pela distribuidora."));
  } else if (!ISRC_PATTERN.test(isrc)) {
    issues.push(validationIssue("BLOCKER", "ISRC_INVALID", "ISRC invalido", "Use o formato internacional de 12 caracteres, como BRABC2600001."));
  }

  if (!upc) {
    issues.push(release.requestUpcAssignment
      ? validationIssue("WARNING", "UPC_PROVIDER_ASSIGNMENT_PENDING", "UPC oficial será atribuído pela distribuidora", "A Tunix solicitará um UPC/EAN real ao provider credenciado durante o envio.")
      : validationIssue("BLOCKER", "UPC_REQUIRED", "UPC obrigatorio", "Informe um UPC/EAN existente ou autorize a atribuição oficial pela distribuidora."));
  } else if (!UPC_PATTERN.test(upc)) {
    issues.push(validationIssue("BLOCKER", "UPC_INVALID", "UPC invalido", "Use apenas numeros, com 12 a 14 digitos."));
  }

  if (!release.platforms.length) {
    issues.push(validationIssue("BLOCKER", "PLATFORMS_REQUIRED", "Plataformas obrigatorias", "Selecione ao menos uma plataforma de destino."));
  }

  if (!release.contributors.length) {
    issues.push(validationIssue("BLOCKER", "CONTRIBUTORS_REQUIRED", "Creditos obrigatorios", "Cadastre artistas, compositores, produtores e splits."));
  } else {
    const contributorWithoutShare = release.contributors.find((contributor) => contributor.royaltyShare === null);

    if (contributorWithoutShare) {
      issues.push(validationIssue("BLOCKER", "SPLIT_SHARE_REQUIRED", "Split incompleto", "Todos os creditos precisam ter percentual de participacao."));
    }

    if (Math.abs(splitTotal - 100) > 0.01) {
      issues.push(validationIssue("BLOCKER", "SPLIT_TOTAL_INVALID", "Split precisa fechar em 100%", `O total atual esta em ${splitTotal}%.`));
    }
  }

  const blockers = issues.filter((issue) => issue.severity === "BLOCKER");
  const warnings = issues.filter((issue) => issue.severity === "WARNING");

  return {
    blockers,
    canSubmit: blockers.length === 0,
    issues,
    warnings,
  };
}
