import type { ApiConnection } from "../types";
import type { ConnectionCredentials } from "../schemas";
import {
  getConnectionCredentials,
  mergeConnectionCredentials,
} from "../persistence";
import { resolveOAuth2Config } from "./config";
import { refreshAccessToken } from "./token-client";

const REFRESH_BUFFER_MS = 60_000;

function accessTokenExpired(credentials: ConnectionCredentials): boolean {
  const expiresAt = credentials.oauth2ExpiresAt;
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return false;
  return ms - Date.now() <= REFRESH_BUFFER_MS;
}

/**
 * Ensure OAuth2 credentials carry a usable access token before proxying a request.
 * Refreshes and persists tokens when a refresh token and client configuration are present.
 */
export async function ensureOAuth2AccessToken(
  connection: ApiConnection,
  credentials: ConnectionCredentials,
): Promise<
  | { ok: true; credentials: ConnectionCredentials }
  | { ok: false; error: string }
> {
  if (connection.auth !== "oauth2") {
    return { ok: true, credentials };
  }

  const resolved = resolveOAuth2Config(connection);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const access = credentials.oauth2AccessToken?.trim();
  if (access && !accessTokenExpired(credentials)) {
    return { ok: true, credentials };
  }

  const refresh = credentials.oauth2RefreshToken?.trim();
  if (!refresh) {
    if (!access) {
      return {
        ok: false,
        error:
          "OAuth2 is not connected yet. Use “Connect with OAuth” on the connection to authorize.",
      };
    }
    return { ok: true, credentials };
  }

  try {
    const tokenPatch = await refreshAccessToken({
      tokenUrl: resolved.config.tokenUrl,
      clientId: resolved.config.clientId,
      clientSecret: credentials.oauth2ClientSecret,
      refreshToken: refresh,
      previous: credentials,
    });
    const merged = await mergeConnectionCredentials(connection.id, {
      auth: "oauth2",
      ...tokenPatch,
    });
    if (!merged) {
      return { ok: false, error: "Could not persist refreshed OAuth2 tokens." };
    }
    return { ok: true, credentials: merged };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "OAuth2 token refresh failed.";
    return { ok: false, error: message };
  }
}

/** Read credentials from disk and refresh when needed (for execute routes). */
export async function loadOAuth2ReadyCredentials(
  connection: ApiConnection,
): Promise<
  | { ok: true; credentials: ConnectionCredentials }
  | { ok: false; error: string }
> {
  const credentials = await getConnectionCredentials(connection.id);
  if (!credentials) {
    return { ok: false, error: "Connection credentials missing on server." };
  }
  return ensureOAuth2AccessToken(connection, credentials);
}
