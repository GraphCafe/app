/**
 * A single lightweight GET used to learn how an API behaves before anything is saved.
 *
 * This is deliberately weaker than the dataset proxy: short timeout, small read cap, and no
 * dataset shaping. It exists only to answer "what does this endpoint want from me?".
 */

import { assertSafeOutboundUrl } from "./ssrf";
import { extractUpstreamError } from "./errors";

const PROBE_TIMEOUT_MS = 10_000;
/** Enough for an auth error, a metadata document, or a trim of a data page. */
const MAX_PROBE_BYTES = 64 * 1024;

export type ProbeResult = {
  ok: boolean;
  status?: number;
  /** Parsed JSON body when the response was JSON. */
  data?: unknown;
  /** Truncated raw body, used when the response was not JSON. */
  text?: string;
  contentType?: string;
  /** Parsed `WWW-Authenticate` challenge, e.g. `Bearer realm="api"`. */
  wwwAuthenticate?: string;
  errorCode?: string;
  errorMessage?: string;
  /** Transport, SSRF, or decoding failure. */
  error?: string;
  truncated: boolean;
  durationMs: number;
  headers: Record<string, string>;
};

export type ProbeOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

/** Read at most `limit` bytes so a hostile or huge endpoint cannot exhaust memory. */
async function readCapped(
  res: Response,
  limit: number,
): Promise<{ text: string; truncated: boolean }> {
  const body = res.body;
  if (!body) {
    const text = await res.text();
    return {
      text: text.slice(0, limit),
      truncated: text.length > limit,
    };
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  let bytes = 0;
  let truncated = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytes += value.byteLength;
      out += decoder.decode(value, { stream: true });
      if (bytes >= limit) {
        truncated = true;
        break;
      }
    }
  } finally {
    // Cancel the remainder; we already have what we need.
    await reader.cancel().catch(() => {});
  }

  out += decoder.decode();
  return { text: out.slice(0, limit), truncated };
}

export async function probeUrl(
  rawUrl: string,
  options: ProbeOptions = {},
): Promise<ProbeResult> {
  const started = Date.now();
  const base: ProbeResult = {
    ok: false,
    truncated: false,
    durationMs: 0,
    headers: {},
  };

  const ssrf = await assertSafeOutboundUrl(rawUrl);
  if (!ssrf.ok) {
    return { ...base, error: ssrf.error, durationMs: Date.now() - started };
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? PROBE_TIMEOUT_MS,
  );

  try {
    const res = await fetch(rawUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        "User-Agent": "GraphCafe/0.1 (connection discovery)",
        ...(options.headers ?? {}),
      },
    });

    const { text, truncated } = await readCapped(res, MAX_PROBE_BYTES);
    const contentType = res.headers.get("content-type") ?? undefined;
    const wwwAuthenticate = res.headers.get("www-authenticate") ?? undefined;
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const common: ProbeResult = {
      ...base,
      ok: res.ok,
      status: res.status,
      contentType,
      wwwAuthenticate,
      truncated,
      durationMs: Date.now() - started,
      headers,
    };

    if (!res.ok) {
      const extracted = extractUpstreamError(text);
      return {
        ...common,
        text: text.slice(0, 500),
        errorCode: extracted?.code,
        errorMessage: extracted?.message,
      };
    }

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return { ...common, text: text.slice(0, 2000) };
    }

    return { ...common, data };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ...base,
        error: `No response within ${Math.round((options.timeoutMs ?? PROBE_TIMEOUT_MS) / 1000)}s.`,
        durationMs: Date.now() - started,
      };
    }
    return {
      ...base,
      error: err instanceof Error ? err.message : "Request failed.",
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Name of the trailing segment when it reads as "the leaves of a tree" rather than "a
 * resource". Choosing one of these as the base URL would strand the connection one level too
 * deep, unable to reach sibling routes.
 */
const COLLECTION_SEGMENTS = new Set([
  "data",
  "values",
  "observations",
  "rows",
  "records",
  "items",
  "results",
  "series",
  "points",
  "list",
  "query",
  "search",
]);

/**
 * Guess the base URL / path split the connection should store.
 *
 * APIs rarely look like JSONPlaceholder's bare origin. EIA's data lives at
 * `https://api.eia.gov/v2/electricity/retail-sales/data`, but the connection base must be
 * `https://api.eia.gov/v2` so later requests can point at other `.../v2/...` routes.
 */
export function predictBaseAndPath(rawUrl: string): { baseUrl: string; path: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { baseUrl: rawUrl, path: "/" };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const search = url.search;
  const hasTrailingSlash = url.pathname.endsWith("/");

  // Nothing to split: the origin itself is the API root.
  if (segments.length === 0) {
    return { baseUrl: `${url.origin}/`, path: `/${search}` };
  }

  // A version segment is the most reliable anchor for an API root, because it is where the
  // path stops describing *this* endpoint and starts describing the API as a whole.
  const versionIndex = segments.findIndex((s) => /^v\d+(\.\d+)*$/i.test(s));
  const anchored = versionIndex >= 0;
  const lastSegment = segments[segments.length - 1].replace(/\/$/, "").toLowerCase();
  const looksLikeCollection = COLLECTION_SEGMENTS.has(lastSegment);

  // The URL is already the API root: either it stops at the version, or the trailing name is
  // plainly a collection rather than one resource.
  if (
    (anchored && versionIndex === segments.length - 1) ||
    (!anchored && looksLikeCollection && segments.length === 1)
  ) {
    return {
      baseUrl: `${url.origin}/${segments.join("/")}`,
      // Preserve a trailing slash: it is how these APIs address the collection itself.
      path: `${hasTrailingSlash ? "/" : ""}${search}` || "/",
    };
  }

  // Otherwise drop the final segment, which names the resource being fetched.
  const baseSegments = anchored
    ? segments.slice(0, versionIndex + 1)
    : segments.slice(0, -1);
  const resourceSegments = anchored
    ? segments.slice(versionIndex + 1)
    : [segments[segments.length - 1]];
  const basePath = baseSegments.join("/").replace(/\/$/, "");

  return {
    // No trailing slash on the base: the proxy joins it to the path itself.
    baseUrl: basePath ? `${url.origin}/${basePath}` : url.origin,
    path: `/${resourceSegments.join("/")}${hasTrailingSlash ? "/" : ""}${search}`,
  };
}
