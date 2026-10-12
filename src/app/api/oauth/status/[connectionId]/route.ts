import { NextResponse } from "next/server";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import {
  getConnection,
  getConnectionCredentials,
} from "@/lib/connections/persistence";
import { oauth2ConnectionStatus } from "@/lib/connections/oauth/status";
import { oauthRedirectUri } from "@/lib/connections/oauth/public-url";

type Params = { params: Promise<{ connectionId: string }> };

/**
 * GET /api/oauth/status/[connectionId]
 *
 * Non-secret OAuth connection state for the UI (never returns tokens).
 */
export async function GET(request: Request, { params }: Params) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;

  const { connectionId } = await params;
  const connection = await getConnection(connectionId, auth.id);
  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  const credentials = await getConnectionCredentials(connectionId);
  const status = oauth2ConnectionStatus(connection, credentials);
  return NextResponse.json({
    status,
    redirectUri: oauthRedirectUri(request),
  });
}
