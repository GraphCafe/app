import { NextResponse } from "next/server";
import { completeOAuth2Callback } from "@/lib/connections/oauth/flow";
import { resolvePublicOrigin } from "@/lib/connections/oauth/public-url";

/**
 * GET /api/oauth/callback
 *
 * Provider redirect target. Exchanges the authorization code and stores tokens server-side.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await completeOAuth2Callback({
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
    error: url.searchParams.get("error"),
    errorDescription: url.searchParams.get("error_description"),
  });

  const origin = resolvePublicOrigin(request);

  if (!result.ok) {
    const redirect = new URL("/connections", origin);
    redirect.searchParams.set("oauth", "error");
    redirect.searchParams.set("message", result.error.slice(0, 240));
    return NextResponse.redirect(redirect.toString(), { status: 302 });
  }

  const redirect = new URL(result.returnTo, origin);
  redirect.searchParams.set("oauth", "connected");
  redirect.searchParams.set("connectionId", result.connectionId);
  return NextResponse.redirect(redirect.toString(), { status: 302 });
}
