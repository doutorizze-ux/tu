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
  const response = await fetch(`${TOOLOST_API_BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : `Too Lost HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as TooLostProfile;
}
