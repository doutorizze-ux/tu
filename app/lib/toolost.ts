import "server-only";

import { getObject } from "./object-storage";
import { releaseStoragePath } from "./release-storage";

function getToolostAppUrl() {
  const envUrl = process.env.TOOLOST_APP_URL?.trim();
  if (envUrl && !envUrl.includes("sandbox")) return envUrl;
  return "https://toolost.com";
}

function getToolostTokenUrl() {
  const envUrl = process.env.TOOLOST_TOKEN_URL?.trim();
  if (envUrl && !envUrl.includes("sandbox")) return envUrl;
  return "https://toolost.com/oauth/token";
}

function getToolostApiBaseUrl() {
  const envUrl = process.env.TOOLOST_API_BASE_URL?.trim();
  if (envUrl && !envUrl.includes("sandbox")) return envUrl;
  return "https://api.toolost.com/v1";
}

const TOOLOST_APP_URL = getToolostAppUrl();
const TOOLOST_TOKEN_URL = getToolostTokenUrl();
export const TOOLOST_API_BASE_URL = getToolostApiBaseUrl();
export const TOOLOST_DEFAULT_SCOPES = "read:profile read:releases write:releases";

type TooLostTokenResponse = {
  token_type: "Bearer";
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

type TooLostProfile = {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

type TooLostRequestPayload = {
  externalReleaseId?: string;
  providerReleaseId?: string | null;
  title?: string;
  trackTitle?: string;
  versionTitle?: string | null;
  artistName?: string;
  labelName?: string | null;
  genre?: string;
  language?: string;
  releaseType?: string;
  releaseDate?: string | null;
  explicitContent?: boolean;
  copyright?: {
    pLine?: string | null;
    cLine?: string | null;
    year?: number | null;
  };
  territories?: string | null;
  identifiers?: {
    isrc?: string | null;
    upc?: string | null;
    requestIsrcAssignment?: boolean;
    requestUpcAssignment?: boolean;
  };
  files?: {
    master?: {
      storageKey: string;
      fileName: string;
      mimeType: string;
    } | null;
    cover?: {
      storageKey: string;
      fileName: string;
      mimeType: string;
    } | null;
  };
  platforms?: string[];
  contributors?: Array<{
    name: string;
    role: string;
    royaltyShare: number | null;
  }>;
};

type TooLostTrack = {
  id?: number;
  isrc?: string | null;
};

type TooLostRelease = {
  id: number;
  upc?: string | null;
  status?: string | null;
  tracks?: TooLostTrack[];
};

export class TooLostDistributionError extends Error {
  releaseId: number;

  constructor(message: string, releaseId: number) {
    super(message);
    this.name = "TooLostDistributionError";
    this.releaseId = releaseId;
  }
}

export function tooLostClientId() {
  return process.env.TOOLOST_CLIENT_ID?.trim() || "";
}

export function tooLostClientSecret() {
  return process.env.TOOLOST_CLIENT_SECRET?.trim() || "";
}

export function tooLostRedirectUri() {
  const envUri = process.env.TOOLOST_REDIRECT_URI?.trim();
  if (envUri && !envUri.includes("localhost")) {
    return envUri;
  }
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tunix.com.br";
  const base = appUrl.includes("localhost") ? "https://tunix.com.br" : appUrl;
  return `${base}/callback`;
}

export function tooLostScopes() {
  return process.env.TOOLOST_SCOPES?.trim() || TOOLOST_DEFAULT_SCOPES;
}

export function isTooLostOAuthConfigured() {
  return Boolean(tooLostClientId() && tooLostClientSecret());
}

export function createTooLostAuthorizeUrl(state: string) {
  const url = new URL("/oauth/authorize", TOOLOST_APP_URL);

  url.searchParams.set("client_id", tooLostClientId());
  url.searchParams.set("redirect_uri", tooLostRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", tooLostScopes());
  url.searchParams.set("state", state);

  return url.toString();
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(TOOLOST_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : `Too Lost HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as TooLostTokenResponse;
}

async function apiRequest<T>({
  accessToken,
  body,
  method,
  path,
  baseUrl,
}: {
  accessToken: string;
  body?: unknown;
  method: "GET" | "POST" | "PATCH" | "PUT";
  path: string;
  baseUrl?: string;
}) {
  const apiBaseUrl = (baseUrl || TOOLOST_API_BASE_URL).replace(/\/+$/, "");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : `Distribution API HTTP ${response.status}`;
    throw new Error(message);
  }

  return { payload: payload as T, status: response.status, text };
}

export async function exchangeTooLostCode(code: string) {
  return tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    client_id: tooLostClientId(),
    client_secret: tooLostClientSecret(),
    redirect_uri: tooLostRedirectUri(),
    code,
  }));
}

export async function refreshTooLostToken(refreshToken: string) {
  return tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    client_id: tooLostClientId(),
    client_secret: tooLostClientSecret(),
    refresh_token: refreshToken,
  }));
}

export async function getTooLostProfile(accessToken: string) {
  const { payload } = await apiRequest<{ data: TooLostProfile }>({
    accessToken,
    method: "GET",
    path: "/me",
  });

  return payload.data;
}

export async function getTooLostPlatforms(accessToken: string) {
  const { payload } = await apiRequest<{
    data: {
      platforms?: string[];
      aiExcludedPlatforms?: string[];
      additionalDelivery?: {
        excluded?: string[];
      };
    };
  }>({
    accessToken,
    method: "GET",
    path: "/lookup/platforms",
  });

  return payload.data;
}

function releaseType(type?: string) {
  const labels: Record<string, string> = {
    SINGLE: "Single",
    EP: "EP",
    ALBUM: "Album",
  };

  return labels[type ?? ""] ?? type ?? "Single";
}

function deliveryTerritories(territories?: string | null) {
  if (!territories || territories === "WORLDWIDE") {
    return ["WORLDWIDE"];
  }

  if (territories === "BRAZIL") {
    return ["BR"];
  }

  return territories.split(",").map((item) => item.trim()).filter(Boolean);
}

function primaryParticipant(payload: TooLostRequestPayload) {
  const artist = payload.contributors?.find((item) => item.role.toLowerCase().includes("artist"));

  return [{
    name: artist?.name || payload.artistName || "Artista",
    role: ["primary"],
  }];
}

function writerParticipants(payload: TooLostRequestPayload) {
  const writers = (payload.contributors ?? [])
    .filter((item) => /composer|compositor|writer|autor|lyricist|letrista|instrumentalist|instrumentista/i.test(item.role))
    .map((item) => ({
      name: item.name,
      role: ["composer", "lyricist"],
    }));

  if (writers.length > 0) {
    return writers;
  }

  const fallbackName = payload.artistName || "Tunix";
  return [
    {
      name: fallbackName,
      role: ["composer", "lyricist"],
    },
  ];
}

function yyyyMmDd(value?: string | null) {
  return value?.slice(0, 10) || undefined;
}

async function uploadMaster(
  accessToken: string, 
  releaseId: number, 
  master: NonNullable<TooLostRequestPayload["files"]>["master"],
  baseUrl?: string
) {
  if (!master) {
    throw new Error("Master de audio (FLAC ou WAV) obrigatorio para envio a distribuidora.");
  }

  const isWav = master.mimeType.includes("wav") || master.fileName.toLowerCase().endsWith(".wav");
  const contentType = isWav ? "audio/wav" : "audio/flac";

  const upload = await apiRequest<{
    data: {
      uploadUrl: string;
      fileKey: string;
      headers?: Record<string, string>;
    };
  }>({
    accessToken,
    method: "POST",
    path: `/releases/${releaseId}/tracks/upload-url`,
    body: {
      kind: "audio",
      fileName: master.fileName,
      contentType,
    },
    baseUrl,
  });

  let bytes: Buffer;
  try {
    bytes = await getObject(releaseStoragePath(master.storageKey));
  } catch (err: any) {
    if (err?.code === "ENOENT" || err?.message?.includes("ENOENT") || err?.message?.includes("no such file")) {
      throw new Error(`O arquivo de áudio master (${master.fileName}) não foi encontrado no servidor storage. Por favor, solicite ao cliente o reenvio do arquivo FLAC.`);
    }
    throw err;
  }

  const response = await fetch(upload.payload.data.uploadUrl, {
    method: "PUT",
    headers: {
      ...(upload.payload.data.headers ?? {}),
      "Content-Type": "audio/flac",
    },
    body: new Uint8Array(bytes),
  });

  if (!response.ok) {
    throw new Error(`Falha no upload seguro do master FLAC: HTTP ${response.status}.`);
  }

  return upload.payload.data.fileKey;
}

function providerIdentifiers(release: TooLostRelease) {
  return {
    isrc: release.tracks?.[0]?.isrc ?? null,
    trackId: release.tracks?.[0]?.id ? String(release.tracks[0].id) : null,
    upc: release.upc ?? null,
  };
}

function normalizeTooLostGenre(genre?: string): string {
  if (!genre) return "Latin";
  const normalized = genre.trim().toLowerCase();

  const map: Record<string, string> = {
    sertanejo: "Latin",
    piseiro: "Latin",
    forro: "Latin",
    forró: "Latin",
    pagode: "Latin",
    samba: "Latin",
    funk: "Latin",
    mpb: "Latin",
    axe: "Latin",
    axé: "Latin",
    arrocha: "Latin",
    brega: "Latin",
    latino: "Latin",
    latin: "Latin",
    gospel: "Gospel/Christian",
    gospel_cristao: "Gospel/Christian",
    cristao: "Gospel/Christian",
    evangelico: "Gospel/Christian",
    pop: "Pop",
    rock: "Rock",
    eletronica: "Electronic",
    electronic: "Electronic",
    hiphop: "Hip-Hop/Rap",
    "hip-hop": "Hip-Hop/Rap",
    rap: "Hip-Hop/Rap",
    trap: "Hip-Hop/Rap",
    country: "Country",
    reggae: "Reggae",
    folk: "Folk",
    "r&b": "R&B/Soul",
    soul: "R&B/Soul",
    jazz: "Jazz",
    classica: "Classical",
    classical: "Classical",
    inspirational: "Inspirational",
    alternative: "Alternative",
  };

  return map[normalized] || "Latin";
}

async function createFreshReleaseOnTooLost(
  accessToken: string,
  payload: TooLostRequestPayload,
  baseUrl?: string
): Promise<number> {
  const created = await apiRequest<{ data: { id: number } }>({
    accessToken,
    method: "POST",
    path: "/releases",
    body: {
      type: releaseType(payload.releaseType),
      title: payload.title,
      label: payload.labelName || payload.artistName || "Tunix",
      participants: [
        ...primaryParticipant(payload),
        ...writerParticipants(payload),
      ],
    },
    baseUrl,
  });
  return created.payload.data.id;
}

export async function submitTooLostDistribution(
  accessToken: string, 
  payload: TooLostRequestPayload,
  baseUrl?: string
) {
  const existingReleaseId = Number(payload.providerReleaseId);

  if (Number.isInteger(existingReleaseId) && existingReleaseId > 0) {
    try {
      const current = await apiRequest<{ data: TooLostRelease }>({
        accessToken,
        method: "GET",
        path: `/releases/${existingReleaseId}`,
        baseUrl,
      });
      const status = current.payload.data.status?.toLowerCase();
      if (status && status !== "draft") {
        console.log(`[TooLost] Release ${existingReleaseId} is already submitted (status: ${status}). Skipping modification.`);
        return {
          status: 200,
          releaseId: existingReleaseId,
          trackId: current.payload.data.tracks?.[0]?.id ? String(current.payload.data.tracks[0].id) : undefined,
          isrc: current.payload.data.tracks?.[0]?.isrc || undefined,
          upc: current.payload.data.upc || undefined,
          responseBody: JSON.stringify(current.payload.data),
        };
      }
    } catch (err) {
      console.warn(`[TooLost] Failed to check status of existing release ${existingReleaseId}:`, err);
    }
  }

  let releaseId = Number.isInteger(existingReleaseId) && existingReleaseId > 0
    ? existingReleaseId
    : await createFreshReleaseOnTooLost(accessToken, payload, baseUrl);

  try {
    const appBaseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tunix.com.br";
    const coverUrl = payload.externalReleaseId && (payload.files?.cover || payload.files?.master)
      ? `${appBaseUrl}/api/releases/${payload.externalReleaseId}/cover`
      : undefined;

    const metadata = await apiRequest({
      accessToken,
      method: "PATCH",
      path: `/releases/${releaseId}/metadata`,
      body: {
        type: releaseType(payload.releaseType),
        title: payload.title,
        version: payload.versionTitle || undefined,
        label: payload.labelName || payload.artistName || "Tunix",
        primaryGenre: normalizeTooLostGenre(payload.genre),
        language: payload.language,
        releaseDate: yyyyMmDd(payload.releaseDate),
        licenseType: "Copyright",
        cYear: payload.copyright?.year,
        cLine: payload.copyright?.cLine,
        pYear: payload.copyright?.year,
        pLine: payload.copyright?.pLine,
        upc: payload.identifiers?.requestUpcAssignment ? undefined : payload.identifiers?.upc || undefined,
        ...(coverUrl ? { coverUrl, compressedArtwork: coverUrl } : {}),
        participants: [
          ...primaryParticipant(payload),
          ...writerParticipants(payload),
        ],
      },
      baseUrl,
    });

    const audioFileKey = await uploadMaster(accessToken, releaseId, payload.files?.master, baseUrl);
    
    // Standard DSP rule: For Single releases, track title MUST match release title
    const isSingle = !payload.releaseType || payload.releaseType.toUpperCase() === "SINGLE";
    const effectiveTrackTitle = isSingle ? payload.title : (payload.trackTitle || payload.title);

    const track = {
      title: effectiveTrackTitle,
      version: payload.versionTitle || undefined,
      language: payload.language,
      audioFileKey,
      artists: primaryParticipant(payload),
      writers: writerParticipants(payload),
      ...(!payload.identifiers?.requestIsrcAssignment && payload.identifiers?.isrc
        ? { isrc: payload.identifiers.isrc }
        : {}),
    };

    const tracks = await apiRequest<{ data: TooLostRelease }>({
      accessToken,
      method: "PUT",
      path: `/releases/${releaseId}/tracks`,
      body: { tracks: [track] },
      baseUrl,
    });

    let validPlatforms: string[] = [];
    try {
      const platformData = await getTooLostPlatforms(accessToken);
      const excluded = new Set([
        ...(platformData.aiExcludedPlatforms ?? []),
        ...(platformData.additionalDelivery?.excluded ?? []),
      ]);
      const available = (platformData.platforms ?? []).filter((p) => p && !excluded.has(p));
      const availableSet = new Set(available);

      if (payload.platforms && payload.platforms.length > 0) {
        validPlatforms = payload.platforms.filter((p) => availableSet.has(p));
      }
      if (validPlatforms.length === 0) {
        validPlatforms = available;
      }
    } catch {
      validPlatforms = payload.platforms ?? [];
    }

    const delivery = await apiRequest({
      accessToken,
      method: "PATCH",
      path: `/releases/${releaseId}/delivery`,
      body: {
        delivery: {
          platforms: validPlatforms,
          territories: deliveryTerritories(payload.territories),
          additional: {
            youtube: validPlatforms.some((platform) => platform.toLowerCase().includes("youtube")),
            facebook: validPlatforms.some((platform) => platform.toLowerCase().includes("facebook")),
          },
        },
      },
      baseUrl,
    });

    const submitted = await apiRequest({
      accessToken,
      method: "POST",
      path: `/releases/${releaseId}/submit`,
      body: {
        acceptTerms: true,
        confirmRights: true,
        confirmYoutubeRights: payload.platforms?.some((platform) => platform.toLowerCase().includes("youtube")) ?? false,
        idempotencyKey: `tunix-${payload.externalReleaseId ?? releaseId}`,
      },
      baseUrl,
    });

    const current = await apiRequest<{ data: TooLostRelease }>({
      accessToken,
      method: "GET",
      path: `/releases/${releaseId}`,
      baseUrl,
    });
    const identifiers = providerIdentifiers(current.payload.data);

    return {
      releaseId,
      trackId: identifiers.trackId,
      isrc: identifiers.isrc,
      upc: identifiers.upc,
      status: submitted.status,
      responseBody: JSON.stringify({
        releaseId,
        metadata: metadata.payload,
        tracks: tracks.payload,
        delivery: delivery.payload,
        submitted: submitted.payload,
        identifiers,
      }),
    };
  } catch (error) {
    throw new TooLostDistributionError(
      error instanceof Error ? error.message : "Falha desconhecida durante o envio à Too Lost.",
      releaseId,
    );
  }
}
