import "server-only";

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
  };
  platforms?: string[];
  contributors?: Array<{
    name: string;
    role: string;
    royaltyShare: number | null;
  }>;
};

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
  method: "GET" | "POST" | "PATCH";
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

export async function submitTooLostDistribution(accessToken: string, payload: TooLostRequestPayload) {
  const created = await apiRequest<{ data: { id: number } }>({
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
  const releaseId = created.payload.data.id;

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
      idempotencyKey: `tunix-${payload.externalReleaseId ?? releaseId}`,
    },
  });

  return {
    releaseId,
    status: submitted.status,
    responseBody: JSON.stringify({
      created: created.payload,
      delivery: delivery.payload,
      submitted: submitted.payload,
    }),
  };
}
