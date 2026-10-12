/**
 * Auth wiring shared by the proxy and the form/UI layer.
 *
 * Each resolver is the single source of truth for a default, so the server that signs the
 * request and the client that labels the field cannot drift apart.
 */

import type { AuthKind } from "./types";
import {
  DEFAULT_API_KEY_HEADER,
  DEFAULT_API_KEY_QUERY_PARAM,
} from "./types";

export { DEFAULT_API_KEY_HEADER, DEFAULT_API_KEY_QUERY_PARAM };

export function resolveApiKeyHeader(header?: string): string {
  const trimmed = header?.trim();
  return trimmed ? trimmed : DEFAULT_API_KEY_HEADER;
}

export function resolveApiKeyQueryParam(param?: string): string {
  const trimmed = param?.trim();
  return trimmed ? trimmed : DEFAULT_API_KEY_QUERY_PARAM;
}

/** Fields required before a scheme can be exercised. */
export function requiredSecretFields(auth: AuthKind): Array<
  "secret" | "basicUsername" | "basicPassword"
> {
  switch (auth) {
    case "basic":
      return ["basicUsername", "basicPassword"];
    case "apiKeyHeader":
    case "apiKeyQuery":
    case "bearer":
      return ["secret"];
    default:
      return [];
  }
}

/** Human-readable summary of a scheme, used in the connections list. */
export function describeAuth(connection: {
  auth: AuthKind;
  apiKeyHeader?: string;
  apiKeyQueryParam?: string;
}): string {
  switch (connection.auth) {
    case "none":
      return "No authentication";
    case "bearer":
      return "Bearer token";
    case "apiKeyHeader":
      return `API key in ${resolveApiKeyHeader(connection.apiKeyHeader)} header`;
    case "apiKeyQuery":
      return `API key in ?${resolveApiKeyQueryParam(connection.apiKeyQueryParam)} query parameter`;
    case "basic":
      return "Basic auth";
    default:
      return "No authentication";
  }
}
