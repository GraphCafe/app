/**
 * Work out how an API wants to be authenticated, from what it tells us.
 *
 * Sources, in order of confidence:
 *   1. a `WWW-Authenticate` challenge header (a literal statement of the scheme);
 *   2. a structured error code such as EIA's `API_KEY_MISSING` / `API_KEY_INVALID`;
 *   3. the shape of the response body (`data`, `error`, `message`, …);
 *   4. status codes, as a last resort.
 *
 * Nothing here guesses a credential — it only names the scheme so the form can ask for the
 * right field.
 */

import { isAuthFailureCode } from "./errors";
import type { AuthHint, AuthKind } from "./types";

export type { AuthHint };

export type AuthConfidence = AuthHint["confidence"];

export type AuthHintInput = {
  status?: number;
  ok?: boolean;
  wwwAuthenticate?: string;
  errorCode?: string;
  errorMessage?: string;
  /** Parsed JSON body, when there was one. */
  data?: unknown;
  contentType?: string;
  /** Raw body trim, used when the response was not JSON. */
  text?: string;
};

/** Parameter names that strongly imply the key travels in the query string. */
const QUERY_KEY_NAMES = new Set([
  "api_key",
  "apikey",
  "api-key",
  "key",
  "app_key",
  "appkey",
  "access_key",
  "accesskey",
  "subscription-key",
  "token",
  "auth_token",
]);

const HEADER_KEY_NAMES = new Set([
  "x-api-key",
  "api-key",
  "apikey",
  "x-apikey",
  "x-auth-token",
  "x-access-token",
  "ocp-apim-subscription-key",
]);

/**
 * Collect a small set of identifier-looking strings from an error body, then classify each as
 * a header name or a query parameter name.
 */
function harvestFieldNames(input: AuthHintInput): string[] {
  const found: string[] = [];
  const push = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 60) return;
    if (!/^[A-Za-z][A-Za-z0-9_.\-]*$/.test(trimmed)) return;
    found.push(trimmed);
  };

  const scan = (node: unknown, depth = 0): void => {
    if (depth > 4 || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node.slice(0, 20)) scan(item, depth + 1);
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        lower === "parameter" ||
        lower === "param" ||
        lower === "field" ||
        lower === "name" ||
        lower === "header" ||
        lower === "required" ||
        lower === "missing" ||
        lower === "keys"
      ) {
        push(value);
      }
      scan(value, depth + 1);
    }
  };

  if (input.data) scan(input.data);

  // Also mine the human-readable strings for quoted parameter names, e.g.
  // "No api_key was supplied." or `Header 'X-API-Key' is required`.
  const prose = [input.errorMessage, input.text].filter(Boolean).join(" ");
  const quoted = prose.match(/["'`]([A-Za-z][A-Za-z0-9_.\-]{1,40})["'`]/g) ?? [];
  for (const token of quoted) push(token.slice(1, -1));
  const bare = prose.match(/\b(api[_-]?key|apikey|access[_-]?token|auth[_-]?token)\b/gi) ?? [];
  for (const token of bare) push(token);

  return found;
}

function classifyFieldName(
  name: string,
): { auth: AuthKind; fieldName: string; location: "header" | "query" } | undefined {
  const lower = name.toLowerCase();
  if (HEADER_KEY_NAMES.has(lower)) {
    return { auth: "apiKeyHeader", fieldName: name, location: "header" };
  }
  if (QUERY_KEY_NAMES.has(lower)) {
    return { auth: "apiKeyQuery", fieldName: name, location: "query" };
  }
  return undefined;
}

/** Describe a `WWW-Authenticate` challenge header. */
function fromChallenge(header: string): AuthHint | undefined {
  const scheme = header.trim().split(/[\s,]/)[0]?.toLowerCase();
  if (!scheme) return undefined;
  if (scheme === "bearer") {
    return {
      auth: "bearer",
      confidence: "high",
      location: "header",
      message: `This API answered with a Bearer challenge (${header.trim()}). Paste the token it expects.`,
    };
  }
  if (scheme === "basic") {
    return {
      auth: "basic",
      confidence: "high",
      location: "header",
      message: "This API answered with a Basic challenge. Supply a username and password.",
    };
  }
  if (scheme === "apikey" || scheme === "api-key") {
    const param = /(?:param|header)="?([^",]+)"?/i.exec(header)?.[1];
    if (param) {
      const classified = classifyFieldName(param);
      if (classified) {
        return {
          auth: classified.auth,
          confidence: "high",
          fieldName: classified.fieldName,
          location: classified.location,
          message: `This API asked for an API key in ${classified.location === "query" ? `the ?${classified.fieldName} query parameter` : `the ${classified.fieldName} header`}.`,
        };
      }
    }
    return {
      auth: "apiKeyHeader",
      confidence: "medium",
      location: "header",
      message: `This API answered with an API-key challenge (${header.trim()}).`,
    };
  }
  return undefined;
}

/** Look for `error` / `message` / `detail` text in a non-JSON body. */
function looksLikeAuthProse(text?: string): boolean {
  if (!text) return false;
  return /api[_ -]?key|unauthor|forbidden|authenticat|access[_ -]?token|credential/i.test(
    text,
  );
}

export function detectAuthHints(input: AuthHintInput): AuthHint[] {
  const hints: AuthHint[] = [];
  const add = (hint: AuthHint | undefined) => {
    if (!hint) return;
    if (hints.some((h) => h.auth === hint.auth && h.fieldName === hint.fieldName)) return;
    hints.push(hint);
  };

  if (input.wwwAuthenticate) {
    add(fromChallenge(input.wwwAuthenticate));
  }

  const failed =
    input.ok === false || (input.status !== undefined && input.status >= 400);

  // Codes such as EIA's API_KEY_MISSING are the strongest signal after a challenge header.
  if (input.errorCode) {
    const upper = input.errorCode.toUpperCase();
    const genericApiKey = /API_?KEY|APIKEY/.test(upper);
    if (isAuthFailureCode(upper) || genericApiKey) {
      const missing = /MISSING|REQUIRED|NOT_SUPPLIED|NO_/.test(upper);
      // A code that says the key was *absent* while a header name was never mentioned points
      // at the query string, which is how EIA and many government APIs work.
      add({
        auth: "apiKeyQuery",
        confidence: missing ? "high" : "medium",
        fieldName: "api_key",
        location: "query",
        message: missing
          ? `The API reports no credential was supplied (${input.errorCode}). It likely expects a key in the query string, for example ?api_key=…`
          : `The API rejected the credential it received (${input.errorCode}). Check the value, then confirm whether this API wants the key in a header or a query parameter.`,
      });
      add({
        auth: "apiKeyHeader",
        confidence: "low",
        fieldName: "X-API-Key",
        location: "header",
        message: `If the key does belong in a header, this API may expect X-API-Key.`,
      });
    }
  }

  // Explicit parameter names found anywhere in the error body or message.
  for (const name of harvestFieldNames(input)) {
    const classified = classifyFieldName(name);
    if (!classified) continue;
    add({
      auth: classified.auth,
      confidence: "high",
      fieldName: classified.fieldName,
      location: classified.location,
      message:
        classified.location === "query"
          ? `The API's own error text names "${classified.fieldName}" — supply it as the ?${classified.fieldName} query parameter.`
          : `The API's own error text names "${classified.fieldName}" — supply it as that request header.`,
    });
  }

  if (failed) {
    if (input.status === 401 && !input.wwwAuthenticate && hints.length === 0) {
      add({
        auth: "bearer",
        confidence: "low",
        location: "header",
        message: "HTTP 401 means a credential is required. A Bearer token is the most common scheme.",
      });
    }
    if (
      (input.status === 403 || input.status === 401) &&
      hints.length === 0 &&
      looksLikeAuthProse(input.errorMessage ?? input.text)
    ) {
      add({
        auth: "apiKeyQuery",
        confidence: "low",
        fieldName: "api_key",
        location: "query",
        message: "This API refused the request for credential reasons. Try an API key, then adjust where it is sent.",
      });
    }
  }

  // A successful, JSON-shaped response is positive evidence that auth is unnecessary.
  if (input.ok && input.data !== undefined && hints.length === 0) {
    add({
      auth: "none",
      confidence: "high",
      location: "none",
      message: "This endpoint answered without credentials, so no auth is needed.",
    });
  }

  const rank: Record<AuthConfidence, number> = { high: 0, medium: 1, low: 2 };
  hints.sort((a, b) => rank[a.confidence] - rank[b.confidence]);
  return hints;
}

/**
 * Content that is an error document rather than data, as the EIA API returns for its
 * 404 "route not found" payloads. Used to warn before a bad base URL is saved.
 */
export function looksLikeApiErrorDocument(data: unknown): boolean {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
  const root = data as Record<string, unknown>;
  const keys = Object.keys(root).map((k) => k.toLowerCase());
  if (keys.includes("error")) return true;
  return (
    keys.includes("code") &&
    (keys.includes("message") || keys.includes("description"))
  );
}
