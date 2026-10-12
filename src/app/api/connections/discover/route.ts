import { NextResponse } from "next/server";
import { connectionDiscoverSchema } from "@/lib/connections/schemas";
import { discoverEndpoint } from "@/lib/connections/discovery";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import {
  getConnection,
  getConnectionCredentials,
} from "@/lib/connections/persistence";
import type { ConnectionCredentials } from "@/lib/connections/schemas";

/**
 * POST /api/connections/discover
 *
 * Probes a URL and explains what it wants. The candidate credential is used for this one
 * request only unless `connectionId` is set, in which case stored credentials are merged in.
 */
export async function POST(request: Request) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = connectionDiscoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid discovery payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    url,
    connectionId,
    auth: requestedAuth,
    apiKeyHeader,
    apiKeyQueryParam,
    secret,
    basicUsername,
    basicPassword,
    baseUrl,
  } = parsed.data;

  let authKind = requestedAuth;
  let credentials: ConnectionCredentials = {
    auth: authKind,
    apiKeyHeader,
    apiKeyQueryParam,
    secret,
    basicUsername,
    basicPassword,
  };

  if (connectionId) {
    const connection = await getConnection(connectionId, auth.id);
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }
    const stored = await getConnectionCredentials(connectionId);
    authKind = connection.auth;
    credentials = {
      auth: connection.auth,
      apiKeyHeader: connection.apiKeyHeader ?? stored?.apiKeyHeader,
      apiKeyQueryParam: connection.apiKeyQueryParam ?? stored?.apiKeyQueryParam,
      secret: secret ?? stored?.secret,
      basicUsername: basicUsername ?? stored?.basicUsername,
      basicPassword: basicPassword ?? stored?.basicPassword,
      oauth2ClientSecret: stored?.oauth2ClientSecret,
      oauth2AccessToken: stored?.oauth2AccessToken,
      oauth2RefreshToken: stored?.oauth2RefreshToken,
      oauth2ExpiresAt: stored?.oauth2ExpiresAt,
      oauth2TokenType: stored?.oauth2TokenType,
    };
  }

  try {
    const result = await discoverEndpoint({
      url,
      auth: authKind,
      baseUrl,
      credentials,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Discovery failed before any request was made.",
      },
      { status: 502 },
    );
  }
}
