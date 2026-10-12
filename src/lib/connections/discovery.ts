/**
 * Guided connection setup.
 *
 * Given whatever the user pasted — a bare origin, a full endpoint URL, or a base URL plus a
 * path — probe it once and report the credential scheme plus the JSON shape. The caller
 * decides what to persist; this module never writes anything and never returns the secret.
 */

import { buildAuthQuery } from "./proxy";
import { probeUrl, predictBaseAndPath } from "./probe";
import { detectAuthHints, looksLikeApiErrorDocument } from "./auth-hints";
import { countRowsAtPath, findRowPathSuggestions } from "./row-path";
import { friendlyHttpError } from "./errors";
import { resolveApiKeyHeader, resolveApiKeyQueryParam } from "./auth-config";
import type { ConnectionCredentials } from "./schemas";
import type {
  ApiConnection,
  AuthHint,
  AuthKind,
  DiscoveryResult,
  RowPathSuggestion,
} from "./types";

export type DiscoverOptions = {
  /** URL to probe. May include a query string. */
  url: string;
  auth?: AuthKind;
  credentials?: ConnectionCredentials;
  /** Overrides the split derived from `url`. */
  baseUrl?: string;
  /** Row path to count rows for, when the caller already has a preference. */
  rowsPath?: string;
  timeoutMs?: number;
};

const SAMPLE_KEYS = 40;
const MAX_SAMPLE_ARRAY = 3;

/** Build the headers/query the probe should carry for a candidate scheme. */
function probeAuth(
  auth: AuthKind,
  credentials: ConnectionCredentials,
): { headers: Record<string, string>; authQuery: Record<string, string> } {
  const connection: Pick<ApiConnection, "auth" | "apiKeyQueryParam"> = {
    auth,
    apiKeyQueryParam: credentials.apiKeyQueryParam,
  };
  const authQuery = buildAuthQuery(connection, credentials);
  const headers: Record<string, string> = {};

  if (auth === "bearer" && credentials.secret) {
    headers.Authorization = `Bearer ${credentials.secret}`;
  } else if (auth === "apiKeyHeader" && credentials.secret) {
    headers[resolveApiKeyHeader(credentials.apiKeyHeader)] = credentials.secret;
  } else if (
    auth === "basic" &&
    credentials.basicUsername &&
    credentials.basicPassword
  ) {
    headers.Authorization = `Basic ${Buffer.from(
      `${credentials.basicUsername}:${credentials.basicPassword}`,
    ).toString("base64")}`;
  }

  return { headers, authQuery };
}

/** Keep the preview small but faithful to the real response shape. */
function buildSample(data: unknown): unknown {
  if (Array.isArray(data)) return data.slice(0, MAX_SAMPLE_ARRAY);
  if (data === null || typeof data !== "object") return data;
  const root = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(root).slice(0, SAMPLE_KEYS)) {
    out[key] =
      Array.isArray(value) && value.length > MAX_SAMPLE_ARRAY
        ? value.slice(0, MAX_SAMPLE_ARRAY)
        : value;
  }
  return out;
}

/** Turn a hostname into something that reads well as a connection name. */
export function suggestConnectionName(baseUrl: string, path: string): string | undefined {
  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return undefined;
  }
  const bare = host.replace(/^www\./, "").replace(/^api\./, "");
  const label = bare.split(".")[0];
  if (!label) return undefined;
  const pretty = label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const lastPathSegment = path.split("?")[0].split("/").filter(Boolean).pop();
  return lastPathSegment ? `${pretty} — ${lastPathSegment}` : pretty;
}

export async function discoverEndpoint(
  options: DiscoverOptions,
): Promise<DiscoveryResult> {
  const { url, auth = "none", credentials, rowsPath, timeoutMs } = options;
  const creds: ConnectionCredentials = credentials ?? { auth };

  const predicted = predictBaseAndPath(url);
  const baseUrl = options.baseUrl?.trim() || predicted.baseUrl;
  const path = options.baseUrl?.trim()
    ? pathFromFullUrl(url, options.baseUrl)
    : predicted.path;

  const warnings: string[] = [];

  // Decide which URL to probe: honour an explicit base+path split, since that is what the
  // saved connection will actually request.
  let probeTarget = url;
  if (options.baseUrl?.trim()) {
    const joined = joinForProbe(baseUrl, path);
    if (joined) {
      probeTarget = joined;
    }
  }

  let authUsed = auth;
  let credsUsed: ConnectionCredentials = creds;

  const runProbePass = async (
    targetUrl: string,
    passAuth: AuthKind,
    passCreds: ConnectionCredentials,
  ) => {
    let target = targetUrl;
    const { headers, authQuery } = probeAuth(passAuth, passCreds);
    const withAuth = appendQuery(target, authQuery);
    if (withAuth) target = withAuth;
    const probe = await probeUrl(target, { headers, timeoutMs });
    const authHints = detectAuthHints({
      ok: probe.ok,
      status: probe.status,
      wwwAuthenticate: probe.wwwAuthenticate,
      errorCode: probe.errorCode,
      errorMessage: probe.errorMessage,
      data: probe.data,
      contentType: probe.contentType,
      text: probe.text,
    });
    return { probe, authHints, requestedUrl: target };
  };

  let { probe, authHints, requestedUrl: probedUrl } = await runProbePass(
    probeTarget,
    authUsed,
    credsUsed,
  );

  const retryAuth = pickCredentialRetryAuth(authUsed, credsUsed, authHints, probe.ok);
  if (retryAuth) {
    credsUsed = enrichCredentialsForAuth(retryAuth, credsUsed, authHints);
    authUsed = retryAuth;
    const retried = await runProbePass(probeTarget, authUsed, credsUsed);
    probe = retried.probe;
    authHints = retried.authHints;
    probedUrl = retried.requestedUrl;
    warnings.push(
      describeCredentialRetry(retryAuth, authHints),
    );
  }

  const rowPaths: RowPathSuggestion[] = probe.data
    ? findRowPathSuggestions(probe.data)
    : [];

  // Prefer a caller-supplied path, then the best detected one.
  const chosenRowsPath =
    (rowsPath && rowsPath.trim()) || rowPaths[0]?.path || undefined;

  const columns = chosenRowsPath
    ? rowPaths.find((r) => r.path === chosenRowsPath)?.columns ?? []
    : columnNamesOf(probe.data);
  const rowCount = probe.data ? countRowsAtPath(probe.data, chosenRowsPath) : 0;

  const isErrorDocument =
    probe.ok === true && looksLikeApiErrorDocument(probe.data);

  if (probe.ok && rowPaths.length === 0 && probe.data !== undefined) {
    if (Array.isArray(probe.data)) {
      // Top-level arrays need no rowsPath; say so rather than leaving the field ambiguous.
      warnings.push(
        "This endpoint returns a top-level JSON array, so rowsPath can stay empty.",
      );
    } else if (!isErrorDocument) {
      warnings.push(
        "No array of records was found. rowsPath may need to point at a nested collection.",
      );
    }
  }
  if (isErrorDocument) {
    warnings.push(
      "The response looks like an error document rather than data, so the base URL or path may need adjusting.",
    );
  }
  if (probe.truncated) {
    warnings.push(
      "Only the beginning of the response was read for discovery; the saved dataset will fetch the full body.",
    );
  }

  // Nudge toward the scheme the API asked for when the chosen one clearly failed.
  const suggestedAuth: AuthKind = probe.ok
    ? authUsed
    : authHints[0]?.auth ?? authUsed;

  const suggestedApiKeyHeader = fieldNameFor(authHints, "apiKeyHeader");
  const suggestedApiKeyQueryParam = fieldNameFor(authHints, "apiKeyQuery");

  if (!probe.ok && probe.error && !probe.status) {
    warnings.push(probe.error);
  }

  return {
    requestedUrl: redactSecret(probedUrl, credsUsed.secret),
    suggested: {
      baseUrl,
      path,
      name: suggestConnectionName(baseUrl, path),
      auth: suggestedAuth,
      apiKeyHeader: suggestedApiKeyHeader,
      apiKeyQueryParam: suggestedApiKeyQueryParam,
      rowsPath: chosenRowsPath,
    },
    probe: {
      ok: probe.ok,
      status: probe.status,
      durationMs: probe.durationMs,
      contentType: probe.contentType,
      truncated: probe.truncated,
      error: probe.status
        ? undefined
        : probe.error,
      // Present an HTTP failure the same way a saved dataset execution would.
      errorCode: probe.errorCode,
      errorMessage:
        probe.errorMessage ??
        (probe.status && !probe.ok && !probe.errorCode
          ? friendlyHttpError(probe.status, probe.text)
          : undefined),
    },
    authHints,
    rowPaths,
    columns,
    rowCount,
    sample: probe.data !== undefined ? buildSample(probe.data) : undefined,
    isErrorDocument,
    warnings,
  };
}

/**
 * Show which URL was probed without echoing the candidate credential back to the browser.
 *
 * When the key travels as a query parameter it is part of the URL we fetched, so the literal
 * value — raw and URL-encoded — is replaced with a placeholder.
 */
export function redactSecret(value: string, secret?: string): string {
  if (!secret) return value;
  const encoded = encodeURIComponent(secret);
  let out = value;
  for (const variant of new Set([secret, encoded])) {
    if (variant) out = out.split(variant).join("YOUR_API_KEY");
  }
  return out;
}

function hasProbeCredentials(creds: ConnectionCredentials): boolean {
  if (creds.secret?.trim()) return true;
  return Boolean(creds.basicUsername?.trim() && creds.basicPassword);
}

/** One follow-up probe when the caller supplied credentials under the wrong scheme. */
export function pickCredentialRetryAuth(
  authUsed: AuthKind,
  creds: ConnectionCredentials,
  hints: AuthHint[],
  probeOk: boolean,
): AuthKind | undefined {
  if (probeOk || !hasProbeCredentials(creds)) return undefined;
  const top = hints.find((h) => h.auth !== "none");
  if (!top || top.auth === authUsed) return undefined;
  if (top.auth === "basic") {
    if (!creds.basicUsername?.trim() || !creds.basicPassword) return undefined;
    return "basic";
  }
  if (!creds.secret?.trim()) return undefined;
  return top.auth;
}

function enrichCredentialsForAuth(
  auth: AuthKind,
  creds: ConnectionCredentials,
  hints: AuthHint[],
): ConnectionCredentials {
  const next: ConnectionCredentials = { ...creds, auth };
  const hintField = hints.find((h) => h.auth === auth && h.fieldName)?.fieldName;
  if (auth === "apiKeyHeader" && hintField) {
    next.apiKeyHeader = resolveApiKeyHeader(hintField);
  }
  if (auth === "apiKeyQuery" && hintField) {
    next.apiKeyQueryParam = resolveApiKeyQueryParam(hintField);
  }
  return next;
}

function describeCredentialRetry(auth: AuthKind, hints: AuthHint[]): string {
  const hint = hints.find((h) => h.auth === auth);
  const label =
    auth === "bearer"
      ? "Bearer token"
      : auth === "apiKeyHeader"
        ? "API key in a header"
        : auth === "apiKeyQuery"
          ? "API key in the query string"
          : auth === "basic"
            ? "Basic auth"
            : "no auth";
  return hint
    ? `Re-probed using ${label} because you supplied a credential — ${hint.message}`
    : `Re-probed using ${label} based on how the API refused the first request.`;
}

function fieldNameFor(
  hints: DiscoveryResult["authHints"],
  auth: AuthKind,
): string | undefined {
  const match = hints.find((h) => h.auth === auth && h.fieldName);
  if (!match?.fieldName) return undefined;
  if (auth === "apiKeyQuery") return resolveApiKeyQueryParam(match.fieldName);
  return resolveApiKeyHeader(match.fieldName);
}

function columnNamesOf(data: unknown): string[] {
  if (Array.isArray(data)) {
    const first = data.find(
      (r) => r !== null && typeof r === "object" && !Array.isArray(r),
    );
    return first ? Object.keys(first as object).slice(0, 30) : [];
  }
  if (data !== null && typeof data === "object") {
    return Object.keys(data as object).slice(0, 30);
  }
  return [];
}

/** Path portion of `url` relative to `baseUrl`, when they share an origin. */
function pathFromFullUrl(url: string, baseUrl: string): string {
  try {
    const full = new URL(url);
    const base = new URL(baseUrl);
    if (full.origin !== base.origin) return predictBaseAndPath(url).path;
    const basePath = base.pathname.replace(/\/$/, "");
    const rest = full.pathname.startsWith(basePath)
      ? full.pathname.slice(basePath.length)
      : full.pathname;
    return `${rest.startsWith("/") ? rest : `/${rest}`}${full.search}` || "/";
  } catch {
    return predictBaseAndPath(url).path;
  }
}

function joinForProbe(baseUrl: string, path: string): string | undefined {
  try {
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const rel = path.startsWith("/") ? path : `/${path}`;
    return new URL(`${base}${rel}`).toString();
  } catch {
    return undefined;
  }
}

function appendQuery(url: string, query: Record<string, string>): string | undefined {
  const entries = Object.entries(query);
  if (entries.length === 0) return undefined;
  try {
    const parsed = new URL(url);
    for (const [k, v] of entries) parsed.searchParams.set(k, v);
    return parsed.toString();
  } catch {
    return undefined;
  }
}
