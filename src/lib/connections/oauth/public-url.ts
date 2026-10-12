/**
 * Public origin used to build the OAuth redirect URI registered with providers.
 *
 * In production, set `GRAPH_CAFE_PUBLIC_URL` to the user-facing origin (for example
 * `https://app.graph.cafe`). Behind a reverse proxy, forwarded headers are used as a fallback.
 */

export function resolvePublicOrigin(request?: Request): string {
  const fromEnv = process.env.GRAPH_CAFE_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (request) {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host")?.trim();
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "http";
    if (host) return `${proto}://${host}`;
  }

  const port = process.env.PORT?.trim() || "43127";
  return `http://localhost:${port}`;
}

export function oauthCallbackPath(): string {
  return "/api/oauth/callback";
}

export function oauthRedirectUri(request?: Request): string {
  return `${resolvePublicOrigin(request)}${oauthCallbackPath()}`;
}
