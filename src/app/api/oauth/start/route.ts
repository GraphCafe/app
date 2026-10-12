import { NextResponse } from "next/server";
import { oauthStartSchema } from "@/lib/connections/schemas";
import { startOAuth2Authorization } from "@/lib/connections/oauth/flow";
import { oauthRedirectUri } from "@/lib/connections/oauth/public-url";

/**
 * POST /api/oauth/start
 *
 * Begin the OAuth2 authorization-code (+ PKCE) flow for a saved connection.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = oauthStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid OAuth start payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await startOAuth2Authorization({
    connectionId: parsed.data.connectionId,
    request,
    returnTo: parsed.data.returnTo,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json({
    authorizeUrl: result.authorizeUrl,
    state: result.state,
    redirectUri: oauthRedirectUri(request),
  });
}
