import type { ApiConnection } from "../types";
import {
  getConnectionById,
  getConnectionCredentials,
  mergeConnectionCredentials,
} from "../persistence";
import { resolveOAuth2Config } from "./config";
import { createCodeVerifier } from "./pkce";
import { buildAuthorizationUrl } from "./authorize-url";
import { createOAuthSession, consumeOAuthSession } from "./session-store";
import { exchangeAuthorizationCode } from "./token-client";
import { oauthRedirectUri } from "./public-url";

export async function startOAuth2Authorization(input: {
  userId: string;
  connectionId: string;
  request: Request;
  returnTo?: string;
}): Promise<
  | { ok: true; authorizeUrl: string; state: string }
  | { ok: false; error: string; status?: number }
> {
  const connection = await getConnectionById(input.connectionId);
  if (!connection || connection.userId !== input.userId) {
    return { ok: false, error: "Connection not found.", status: 404 };
  }
  const resolved = resolveOAuth2Config(connection);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, status: 400 };
  }

  const redirectUri = oauthRedirectUri(input.request);
  const codeVerifier = resolved.config.usePkce ? createCodeVerifier() : "";
  const returnTo = input.returnTo?.trim() || "/connections";
  const session = await createOAuthSession({
    userId: input.userId,
    connectionId: connection.id,
    codeVerifier,
    usePkce: resolved.config.usePkce,
    redirectUri,
    returnTo,
  });

  const authorizeUrl = buildAuthorizationUrl({
    config: resolved.config,
    state: session.id,
    redirectUri,
    codeVerifier: resolved.config.usePkce ? codeVerifier : undefined,
  });

  return { ok: true, authorizeUrl, state: session.id };
}

export async function completeOAuth2Callback(input: {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  errorDescription?: string | null;
}): Promise<
  | { ok: true; returnTo: string; connectionId: string }
  | { ok: false; error: string; status?: number }
> {
  if (input.error) {
    const detail = input.errorDescription?.trim();
    return {
      ok: false,
      error: detail
        ? `OAuth provider error (${input.error}): ${detail}`
        : `OAuth provider error (${input.error}).`,
      status: 400,
    };
  }
  const code = input.code?.trim();
  const state = input.state?.trim();
  if (!code || !state) {
    return { ok: false, error: "Missing OAuth authorization code or state.", status: 400 };
  }

  const session = await consumeOAuthSession(state);
  if (!session) {
    return {
      ok: false,
      error: "OAuth session expired or was already used. Start authorization again.",
      status: 400,
    };
  }

  const connection = await getConnectionById(session.connectionId);
  if (!connection || connection.userId !== session.userId) {
    return { ok: false, error: "Connection no longer exists.", status: 404 };
  }
  const resolved = resolveOAuth2Config(connection);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, status: 400 };
  }

  const existing = await getConnectionCredentials(connection.id);
  const clientSecret = existing?.oauth2ClientSecret;

  try {
    const tokenPatch = await exchangeAuthorizationCode({
      tokenUrl: resolved.config.tokenUrl,
      clientId: resolved.config.clientId,
      clientSecret,
      code,
      redirectUri: session.redirectUri,
      codeVerifier: session.usePkce ? session.codeVerifier : undefined,
    });
    const merged = await mergeConnectionCredentials(connection.id, {
      auth: "oauth2",
      ...tokenPatch,
      oauth2ClientSecret: clientSecret,
    });
    if (!merged) {
      return { ok: false, error: "Could not store OAuth tokens.", status: 500 };
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OAuth token exchange failed.";
    return { ok: false, error: message, status: 502 };
  }

  return {
    ok: true,
    returnTo: session.returnTo,
    connectionId: connection.id,
  };
}

export function oauth2ConnectionReady(connection: ApiConnection): boolean {
  return connection.auth === "oauth2" && resolveOAuth2Config(connection).ok;
}
