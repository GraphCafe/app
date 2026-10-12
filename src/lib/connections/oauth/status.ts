import type { ApiConnection, OAuth2ConnectionStatus } from "../types";
import type { ConnectionCredentials } from "../schemas";
import { resolveOAuth2Config } from "./config";

const REFRESH_BUFFER_MS = 60_000;

export function oauth2ConnectionStatus(
  connection: ApiConnection,
  credentials?: ConnectionCredentials,
): OAuth2ConnectionStatus {
  if (connection.auth !== "oauth2") {
    return { configured: false, connected: false };
  }
  const resolved = resolveOAuth2Config(connection);
  const configured = resolved.ok;
  const access = credentials?.oauth2AccessToken?.trim();
  const connected = Boolean(access);
  const expiresAt = credentials?.oauth2ExpiresAt;
  let expiresSoon = false;
  if (expiresAt) {
    const ms = Date.parse(expiresAt);
    if (Number.isFinite(ms)) {
      expiresSoon = ms - Date.now() <= REFRESH_BUFFER_MS;
    }
  }
  return {
    configured,
    connected,
    expiresAt,
    expiresSoon,
  };
}
