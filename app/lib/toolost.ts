import "server-only";

import { getObject } from "./object-storage";
import { releaseStoragePath } from "./release-storage";

const TOOLOST_APP_URL = "https://toolost.com";
const TOOLOST_TOKEN_URL = "https://toolost.com/oauth/token";
export const TOOLOST_API_BASE_URL = "https://api.toolost.com/v1";
export const TOOLOST_DEFAULT_SCOPES = "read:profile read:catalog write:releases";

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
  return (
    process.env.TOOLOST_REDIRECT_URI?.trim()
    || `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tunix.com.br"}/api/toolost/oauth/callback`
  );
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
}: {
  accessToken: string;
  body?: unknown;
  method: "GET" | "POST" | "PATCH" | "PUT";
  path: string;
}) {
  const response = await fetch(`${TOOLOST_API_BASE_URL}${path}`, {
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
  return (payload.contributors ?? [])
    .filter((item) => /composer|compositor|writer|autor/i.test(item.role))
    .map((item) => ({
      name: item.name,
      role: ["composer"],
    }));
}

function yyyyMmDd(value?: string | null) {
  return value?.slice(0, 10) || undefined;
}

async function uploadMaster(accessToken: string, releaseId: number, master: NonNullable<TooLostRequestPayload["files"]>["master"]) {
  if (!master) {
    throw new Error("Master FLAC obrigatório para envio à distribuidora.");
  }

  if (master.mimeType !== "audio/flac" && !master.fileName.toLowerCase().endsWith(".flac")) {
    throw new Error("A Too Lost exige master final no formato FLAC.");
  }

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
      contentType: "audio/flac",
    },
  });
  const bytes = await getObject(releaseStoragePath(master.storageKey));
  const response = await fetch(upload.payload.data.uploadUrl, {
    method: "PUT",
    headers: {
      ...(upload.payload.data.headers ?? {}),
      "Content-Type": "audio/flac",
    },
    body: bytes,
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

export async function submitTooLostDistribution(accessToken: string, payload: TooLostRequestPayload) {
  const existingReleaseId = Number(payload.providerReleaseId);
  const created = Number.isInteger(existingReleaseId) && existingReleaseId > 0
    ? null
    : await apiRequest<{ data: { id: number } }>({
      accessToken,
      method: "POST",
      path: "/releases",
      body: {
        type: releaseType(payload.releaseType),
        title: payload.title,
        label: payload.labelName || payload.artistName || "Tunix",
        participants: primaryParticipant(payload),
      },
    });
  const releaseId = created?.payload.data.id ?? existingReleaseId;

  try {
    const metadata = await apiRequest({
    accessToken,
    method: "PATCH",
    path: `/releases/${releaseId}/metadata`,
    body: {
      type: releaseType(payload.releaseType),
      title: payload.title,
      version: payload.versionTitle || undefined,
      label: payload.labelName || payload.artistName || "Tunix",
      primaryGenre: payload.genre,
      language: payload.language,
      releaseDate: yyyyMmDd(payload.releaseDate),
      licenseType: "Copyright",
      cYear: payload.copyright?.year,
      cLine: payload.copyright?.cLine,
      pYear: payload.copyright?.year,
      pLine: payload.copyright?.pLine,
      upc: payload.identifiers?.requestUpcAssignment ? undefined : payload.identifiers?.upc || undefined,
      participants: primaryParticipant(payload),
    },
  });
    const audioFileKey = await uploadMaster(accessToken, releaseId, payload.files?.master);
    const track = {
    title: payload.trackTitle || payload.title,
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
  });

    const delivery = await apiRequest({
    accessToken,
    method: "PATCH",
    path: `/releases/${releaseId}/delivery`,
    body: {
      delivery: {
        platforms: payload.platforms ?? [],
        territories: deliveryTerritories(payload.territories),
        additional: {
          youtube: payload.platforms?.some((platform) => platform.toLowerCase().includes("youtube")) ?? false,
          facebook: payload.platforms?.some((platform) => platform.toLowerCase().includes("facebook")) ?? false,
        },
      },
    },
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
  });
    const current = await apiRequest<{ data: TooLostRelease }>({
    accessToken,
    method: "GET",
    path: `/releases/${releaseId}`,
  });
    const identifiers = providerIdentifiers(current.payload.data);

    return {
      releaseId,
      trackId: identifiers.trackId,
      isrc: identifiers.isrc,
      upc: identifiers.upc,
      status: submitted.status,
      responseBody: JSON.stringify({
        created: created?.payload ?? null,
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
