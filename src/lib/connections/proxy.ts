import { assertSafeOutboundUrl } from "./ssrf";
import { formatUpstreamError } from "./errors";
import { extractRows } from "./json-path";
import { resolveApiKeyHeader, resolveApiKeyQueryParam } from "./auth-config";
import {
  inferColumnsFromRows,
  normalizeRows,
} from "./infer-columns";
import type {
  ApiConnection,
  DatasetRequest,
  DatasetResult,
  ProxyExecuteResponse,
} from "./types";
import type { ConnectionCredentials } from "./schemas";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;

export type ExecuteOptions = {
  connection: ApiConnection;
  credentials: ConnectionCredentials;
  request: DatasetRequest;
  includeDataset?: boolean;
};

/**
 * Apply credentials to request headers.
 *
 * `apiKeyQuery` is handled by `buildAuthQuery` instead, because those APIs reject the key in
 * a header — the EIA Open Data API answers `API_KEY_MISSING` when no `api_key` parameter is
 * present, no matter what headers are sent.
 */
function buildAuthHeaders(
  connection: ApiConnection,
  credentials: ConnectionCredentials,
): Record<string, string> {
  const headers: Record<string, string> = {};
  switch (connection.auth) {
    case "bearer":
      if (credentials.secret) {
        headers.Authorization = `Bearer ${credentials.secret}`;
      }
      break;
    case "apiKeyHeader":
      if (credentials.secret) {
        headers[resolveApiKeyHeader(connection.apiKeyHeader)] = credentials.secret;
      }
      break;
    case "basic":
      if (credentials.basicUsername && credentials.basicPassword) {
        const token = Buffer.from(
          `${credentials.basicUsername}:${credentials.basicPassword}`,
        ).toString("base64");
        headers.Authorization = `Basic ${token}`;
      }
      break;
    default:
      break;
  }
  return headers;
}

/** Apply credentials that travel in the query string. */
export function buildAuthQuery(
  connection: Pick<ApiConnection, "auth" | "apiKeyQueryParam">,
  credentials: ConnectionCredentials,
): Record<string, string> {
  if (connection.auth !== "apiKeyQuery" || !credentials.secret) return {};
  return { [resolveApiKeyQueryParam(connection.apiKeyQueryParam)]: credentials.secret };
}

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

export async function executeProxyRequest(
  options: ExecuteOptions,
): Promise<ProxyExecuteResponse> {
  const { connection, credentials, request, includeDataset } = options;

  let target: URL;
  try {
    target = new URL(joinUrl(connection.baseUrl, request.path));
  } catch {
    return { ok: false, error: "Invalid base URL or path." };
  }

  if (request.query) {
    for (const [k, v] of Object.entries(request.query)) {
      target.searchParams.set(k, v);
    }
  }

  const ssrf = await assertSafeOutboundUrl(target.toString());
  if (!ssrf.ok) {
    return { ok: false, error: ssrf.error };
  }

  // Applied last so the stored credential always wins over a stale copy in the saved request.
  for (const [k, v] of Object.entries(buildAuthQuery(connection, credentials))) {
    target.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...buildAuthHeaders(connection, credentials),
    ...(request.headers ?? {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const init: RequestInit = {
      method: request.method,
      headers,
      signal: controller.signal,
    };
    if (request.body !== undefined && request.method !== "GET") {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(request.body);
    }

    const res = await fetch(target.toString(), init);
    const text = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: formatUpstreamError(res.status, text),
      };
    }

    if (text.length > MAX_BODY_BYTES) {
      return { ok: false, error: "Response body is too large to preview." };
    }

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, error: "Response is not valid JSON." };
    }

    if (!includeDataset) {
      return { ok: true, status: res.status, data };
    }

    const rawRows = extractRows(data, request.rowsPath);
    const rows = normalizeRows(rawRows);
    const columns = inferColumnsFromRows(rows);
    const dataset: DatasetResult = {
      columns,
      rows,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    };

    return { ok: true, status: res.status, data, dataset };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Request timed out after 30 seconds." };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}
