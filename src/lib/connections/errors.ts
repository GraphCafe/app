export function friendlyHttpError(status: number, bodyText?: string): string {
  if (status === 401) {
    return "Unauthorized (401) — check your API key or bearer token.";
  }
  if (status === 403) {
    return "Forbidden (403) — credentials were accepted but access was denied.";
  }
  if (status === 429) {
    return "Rate limited (429) — slow down and try again in a moment.";
  }
  if (status >= 500) {
    return `Upstream server error (${status}).`;
  }
  if (status >= 400) {
    const snippet = bodyText?.slice(0, 120);
    return snippet
      ? `Request failed (${status}): ${snippet}`
      : `Request failed (${status}).`;
  }
  return `Unexpected response (${status}).`;
}
