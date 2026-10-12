import { NextResponse } from "next/server";
import { connectionDiscoverSchema } from "@/lib/connections/schemas";
import { discoverEndpoint } from "@/lib/connections/discovery";
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

  let auth = requestedAuth;
  let credentials: ConnectionCredentials = {
    auth,
    apiKeyHeader,
    apiKeyQueryParam,
    secret,
    basicUsername,
    basicPassword,
  };

  if (connectionId) {
    const connection = await getConnection(connectionId);
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }
    const stored = await getConnectionCredentials(connectionId);
    auth = connection.auth;
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
      auth,
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
