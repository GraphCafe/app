import {
  DEFAULT_OAUTH2_QUERY_PARAM,
  type ApiConnection,
  type OAuth2TokenDelivery,
} from "../types";

export type ResolvedOAuth2Config = {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes?: string;
  usePkce: boolean;
  tokenDelivery: OAuth2TokenDelivery;
  queryParam: string;
};

type OAuth2DeliveryFields = Pick<
  ApiConnection,
  "oauth2UsePkce" | "oauth2TokenDelivery" | "oauth2QueryParam"
>;

export function resolveOAuth2UsePkce(connection: OAuth2DeliveryFields): boolean {
  return connection.oauth2UsePkce !== false;
}

export function resolveOAuth2TokenDelivery(
  connection: OAuth2DeliveryFields,
): OAuth2TokenDelivery {
  return connection.oauth2TokenDelivery ?? "authorizationHeader";
}

export function resolveOAuth2QueryParam(connection: OAuth2DeliveryFields): string {
  const trimmed = connection.oauth2QueryParam?.trim();
  return trimmed ? trimmed : DEFAULT_OAUTH2_QUERY_PARAM;
}

/** Validate the non-secret OAuth2 fields stored on a connection. */
export function resolveOAuth2Config(
  connection: ApiConnection,
): { ok: true; config: ResolvedOAuth2Config } | { ok: false; error: string } {
  if (connection.auth !== "oauth2") {
    return { ok: false, error: "Connection is not configured for OAuth2." };
  }
  const authorizationUrl = connection.oauth2AuthorizationUrl?.trim();
  const tokenUrl = connection.oauth2TokenUrl?.trim();
  const clientId = connection.oauth2ClientId?.trim();
  if (!authorizationUrl) {
    return { ok: false, error: "OAuth2 authorization URL is required." };
  }
  if (!tokenUrl) {
    return { ok: false, error: "OAuth2 token URL is required." };
  }
  if (!clientId) {
    return { ok: false, error: "OAuth2 client ID is required." };
  }
  try {
    new URL(authorizationUrl);
    new URL(tokenUrl);
  } catch {
    return { ok: false, error: "OAuth2 URLs must be valid absolute URLs." };
  }

  return {
    ok: true,
    config: {
      authorizationUrl,
      tokenUrl,
      clientId,
      scopes: connection.oauth2Scopes?.trim() || undefined,
      usePkce: resolveOAuth2UsePkce(connection),
      tokenDelivery: resolveOAuth2TokenDelivery(connection),
      queryParam: resolveOAuth2QueryParam(connection),
    },
  };
}
