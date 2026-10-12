import type { OAuth2CredentialState } from "../types";

export type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export class OAuthTokenError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "OAuthTokenError";
  }
}

function parseTokenResponse(text: string): TokenResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new OAuthTokenError("Token endpoint returned non-JSON.", undefined, text);
  }
  if (parsed === null || typeof parsed !== "object") {
    throw new OAuthTokenError("Token endpoint returned an unexpected body.");
  }
  const access = (parsed as Record<string, unknown>).access_token;
  if (typeof access !== "string" || !access.trim()) {
    throw new OAuthTokenError("Token endpoint did not return access_token.", undefined, text);
  }
  return parsed as TokenResponse;
}

function expiresAtFromResponse(data: TokenResponse): string | undefined {
  if (typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in)) {
    return undefined;
  }
  return new Date(Date.now() + data.expires_in * 1000).toISOString();
}

export function tokensFromResponse(
  data: TokenResponse,
  previous?: OAuth2CredentialState,
): OAuth2CredentialState {
  return {
    oauth2ClientSecret: previous?.oauth2ClientSecret,
    oauth2AccessToken: data.access_token,
    oauth2RefreshToken:
      typeof data.refresh_token === "string" && data.refresh_token.trim()
        ? data.refresh_token
        : previous?.oauth2RefreshToken,
    oauth2ExpiresAt: expiresAtFromResponse(data) ?? previous?.oauth2ExpiresAt,
    oauth2TokenType:
      typeof data.token_type === "string" && data.token_type.trim()
        ? data.token_type
        : previous?.oauth2TokenType ?? "Bearer",
  };
}

async function postTokenRequest(
  tokenUrl: string,
  body: Record<string, string>,
): Promise<TokenResponse> {
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new OAuthTokenError(
      `Token endpoint failed (${res.status}).`,
      res.status,
      text.slice(0, 500),
    );
  }
  return parseTokenResponse(text);
}

export async function exchangeAuthorizationCode(input: {
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<OAuth2CredentialState> {
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
  };
  if (input.clientSecret) body.client_secret = input.clientSecret;
  if (input.codeVerifier) body.code_verifier = input.codeVerifier;
  const data = await postTokenRequest(input.tokenUrl, body);
  return tokensFromResponse(data);
}

export async function refreshAccessToken(input: {
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
  previous?: OAuth2CredentialState;
}): Promise<OAuth2CredentialState> {
  const body: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
  };
  if (input.clientSecret) body.client_secret = input.clientSecret;
  const data = await postTokenRequest(input.tokenUrl, body);
  return tokensFromResponse(data, {
    ...input.previous,
    oauth2RefreshToken: input.refreshToken,
  });
}
