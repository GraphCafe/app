import type { ApiConnection } from "./types";
import type { ConnectionCredentials } from "./schemas";

/** Whether the server has enough credential material to call this connection's API. */
export function connectionHasStoredCredential(
  connection: ApiConnection,
  credentials?: ConnectionCredentials,
): boolean {
  if (connection.auth === "none") return true;
  if (!credentials) return false;
  switch (connection.auth) {
    case "basic":
      return Boolean(
        credentials.basicUsername?.trim() && credentials.basicPassword,
      );
    case "oauth2":
      return Boolean(credentials.oauth2AccessToken?.trim());
    default:
      return Boolean(credentials.secret?.trim());
  }
}
