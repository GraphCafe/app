/**
 * Turn an upstream HTTP failure into something a person can act on.
 *
 * Many APIs wrap the real reason in a JSON envelope — the EIA Open Data API answers 403 with
 * `{"error":{"code":"API_KEY_MISSING","message":"…"}}` — so prefer that over the raw body.
 */

type ExtractedError = { code?: string; message?: string };

/** Pull a code/message pair out of the common error envelopes. */
export function extractUpstreamError(bodyText?: string): ExtractedError | undefined {
  if (!bodyText) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return undefined;
  }
  if (parsed === null || typeof parsed !== "object") return undefined;
  const root = parsed as Record<string, unknown>;

  // { error: { code, message } } — EIA, Google, many others
  const nested = root.error;
  if (nested !== null && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    const code = asString(n.code) ?? asString(n.status);
    const message = asString(n.message) ?? asString(n.detail) ?? asString(n.description);
    if (code || message) return { code, message };
  }

  // { error: "message", code: 400 } — also documented by EIA for syntax errors
  const flatMessage =
    asString(root.error) ??
    asString(root.message) ??
    asString(root.detail) ??
    asString(root.description);
  const flatCode = asString(root.code) ?? asString(root.status);
  if (flatCode || flatMessage) return { code: flatCode, message: flatMessage };

  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

const AUTH_FAILURE_CODES = new Set([
  "API_KEY_MISSING",
  "API_KEY_INVALID",
  "API_KEY_EXPIRED",
  "MISSING_API_KEY",
  "INVALID_API_KEY",
  "UNAUTHORIZED",
  "UNAUTHENTICATED",
]);

/** True when the upstream body describes a credential problem. */
export function isAuthFailureCode(code?: string): boolean {
  if (!code) return false;
  return AUTH_FAILURE_CODES.has(code.toUpperCase());
}

/**
 * Short hint appended to a credentials failure so the next attempt is informed.
 */
export function authFailureHint(status?: number, code?: string): string {
  if (code && isAuthFailureCode(code)) {
    if (code.toUpperCase().includes("MISSING")) {
      return "The API says no credential was sent. If this API expects a query parameter (for example ?api_key=…), choose \"API key in query\" as the auth type.";
    }
    return "The API rejected the credential it received. Check the key itself, then the auth type and field name.";
  }
  if (status === 401) {
    return "Check that the key is current and sent the way this API expects it.";
  }
  if (status === 403) {
    return "Credentials were read but access was denied. This often means the key is sent in the wrong place — a header instead of a query parameter, or the reverse.";
  }
  return "";
}

export function formatUpstreamError(status: number, bodyText?: string): string {
  const extracted = extractUpstreamError(bodyText);
  const detail = extracted?.message;
  const code = extracted?.code;

  let base: string;
  if (detail) {
    const label = code ? `${code}: ` : "";
    base = code
      ? `${label}${detail}`
      : `Request failed (${status}) — ${detail}`;
  } else {
    base = friendlyHttpError(status, bodyText);
  }

  const hint = authFailureHint(status, code);
  return hint ? `${base} ${hint}` : base;
}

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
