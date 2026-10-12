import type { AuthKind } from "./types";

/** User-facing names for each scheme, shared by the form and the discovery panel. */
export const AUTH_LABELS: Record<AuthKind, string> = {
  none: "None",
  bearer: "Bearer token",
  apiKeyHeader: "API key in a header",
  apiKeyQuery: "API key in the query string",
  basic: "Basic auth",
  oauth2: "OAuth 2.0",
};

/** Short explanation shown under the auth selector. */
export const AUTH_HELP: Record<AuthKind, string> = {
  none: "No credential is sent.",
  bearer: "Sends Authorization: Bearer <token>.",
  apiKeyHeader: "Sends the key as a request header.",
  apiKeyQuery:
    "Appends the key to the URL, for example ?api_key=… — used by the U.S. EIA Open Data API.",
  basic: "Sends a base64-encoded username and password.",
  oauth2:
    "Authorize once in the browser; access (and refresh) tokens stay encrypted on the server.",
};
