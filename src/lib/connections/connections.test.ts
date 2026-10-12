import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthQuery } from "@/lib/connections/proxy";
import {
  extractUpstreamError,
  formatUpstreamError,
  isAuthFailureCode,
} from "@/lib/connections/errors";
import { predictBaseAndPath } from "@/lib/connections/probe";
import {
  countRowsAtPath,
  findRowPathSuggestions,
  inferRowsPath,
} from "@/lib/connections/row-path";
import { detectAuthHints, looksLikeApiErrorDocument } from "@/lib/connections/auth-hints";
import { discoverEndpoint, suggestConnectionName } from "@/lib/connections/discovery";
import { describeAuth, resolveApiKeyQueryParam } from "@/lib/connections/auth-config";
import {
  connectionCreateSchema,
  connectionTestSchema,
} from "@/lib/connections/schemas";

/** Trimmed to the shape the real EIA endpoint returns. */
const EIA_DATA_RESPONSE = {
  warnings: [
    {
      warning: "incomplete return",
      description: "The API can only return 5000 rows in JSON format. …",
    },
  ],
  response: {
    total: "114204",
    dateFormat: "YYYY-MM",
    frequency: "monthly",
    data: [
      {
        period: "2026-07",
        stateid: "AK",
        stateDescription: "Alaska",
        sectorid: "ALL",
        sectorName: "all sectors",
      },
      {
        period: "2026-07",
        stateid: "AK",
        stateDescription: "Alaska",
        sectorid: "COM",
        sectorName: "commercial",
      },
    ],
    description: "Electricity sales to ultimate customer by state and sector …",
  },
  request: {
    command: "/v2/electricity/retail-sales/data/",
    params: { length: "2" },
  },
  apiVersion: "2.1.14",
};

const EIA_METADATA_RESPONSE = {
  response: {
    id: "retail-sales",
    name: "Electricity retail sales",
    description: "…",
    facets: [
      { facet: "stateid", description: "State / Region" },
      { facet: "sectorid", description: "Sector" },
    ],
    data: {
      revenue: { units: "dollars" },
      sales: { units: "kilowatthours" },
      price: { units: "dollars per kilowatthour" },
    },
  },
  apiVersion: "2.1.14",
};

const EIA_KEY_MISSING = {
  error: {
    code: "API_KEY_MISSING",
    message:
      "No api_key was supplied. Please register for one at https://www.eia.gov/opendata/register.php",
  },
};

const EIA_KEY_INVALID = {
  error: {
    code: "API_KEY_INVALID",
    message: "An invalid api_key was supplied. Get one at https://api.eia.gov:443",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API key as a query parameter (the EIA auth model)", () => {
  it("puts the stored key in the query parameter the connection names", () => {
    const query = buildAuthQuery(
      { auth: "apiKeyQuery" },
      { auth: "apiKeyQuery", secret: "unit-test-value" },
    );
    expect(query).toEqual({ api_key: "unit-test-value" });
  });

  it("honours a custom query parameter name", () => {
    const query = buildAuthQuery(
      { auth: "apiKeyQuery", apiKeyQueryParam: "subscription-key" },
      { auth: "apiKeyQuery", secret: "unit-test-value" },
    );
    expect(query).toEqual({ "subscription-key": "unit-test-value" });
  });

  it("defaults to api_key when the stored name is blank or whitespace", () => {
    expect(resolveApiKeyQueryParam("")).toBe("api_key");
    expect(resolveApiKeyQueryParam("   ")).toBe("api_key");
    expect(resolveApiKeyQueryParam(undefined)).toBe("api_key");
  });

  it("does not send the key in the query string for header-based auth", () => {
    expect(
      buildAuthQuery({ auth: "apiKeyHeader" }, { auth: "apiKeyHeader", secret: "unit-test-value" }),
    ).toEqual({});
    expect(buildAuthQuery({ auth: "bearer" }, { auth: "bearer", secret: "unit-test-value" })).toEqual(
      {},
    );
  });

  it("sends nothing when there is no key yet", () => {
    expect(buildAuthQuery({ auth: "apiKeyQuery" }, { auth: "apiKeyQuery" })).toEqual({});
  });

  it("accepts apiKeyQuery through the connection create payload", () => {
    const parsed = connectionCreateSchema.safeParse({
      name: "EIA",
      baseUrl: "https://api.eia.gov/v2",
      auth: "apiKeyQuery",
      apiKeyQueryParam: "api_key",
      secret: "unit-test-value",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.apiKeyQueryParam).toBe("api_key");
  });

  it("rejects an unknown auth kind", () => {
    const parsed = connectionCreateSchema.safeParse({
      name: "EIA",
      baseUrl: "https://api.eia.gov/v2",
      auth: "apiKeyInCookie",
    });
    expect(parsed.success).toBe(false);
  });

  it("tolerates the nulls a browser sends for fields the form left empty", () => {
    // JSON.stringify turns `undefined` values into null, so the credentials form transmits
    // every scheme's field on every save.
    const parsed = connectionCreateSchema.safeParse({
      name: "EIA",
      baseUrl: "https://api.eia.gov/v2",
      auth: "apiKeyQuery",
      apiKeyHeader: null,
      apiKeyQueryParam: "api_key",
      secret: "unit-test-value",
      basicUsername: null,
      basicPassword: null,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.apiKeyHeader).toBeUndefined();
    expect(parsed.success && parsed.data.basicUsername).toBeUndefined();
  });

  it("tolerates null credentials and stale query entries on the test payload", () => {
    const parsed = connectionTestSchema.safeParse({
      baseUrl: "https://api.eia.gov/v2",
      auth: "apiKeyQuery",
      apiKeyHeader: null,
      secret: "unit-test-value",
      path: "/electricity/retail-sales/data/",
      query: { length: "3", stale: null },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.query).toEqual({ length: "3" });
  });

  it("describes query auth in the connections list", () => {
    expect(describeAuth({ auth: "apiKeyQuery" })).toContain("?api_key");
    expect(describeAuth({ auth: "apiKeyHeader" })).toContain("X-API-Key");
  });
});

describe("upstream error reporting", () => {
  it("reads EIA's nested error envelope", () => {
    expect(extractUpstreamError(JSON.stringify(EIA_KEY_MISSING))).toEqual({
      code: "API_KEY_MISSING",
      message:
        "No api_key was supplied. Please register for one at https://www.eia.gov/opendata/register.php",
    });
  });

  it("reads EIA's flat error envelope used for syntax errors", () => {
    const body = JSON.stringify({
      error: "Invalid frequency 'millenially' provided.",
      code: 400,
    });
    expect(extractUpstreamError(body)).toEqual({
      code: "400",
      message: "Invalid frequency 'millenially' provided.",
    });
  });

  it("surfaces the API's own message instead of a generic one", () => {
    const message = formatUpstreamError(403, JSON.stringify(EIA_KEY_MISSING));
    expect(message).toContain("API_KEY_MISSING");
    expect(message).toContain("No api_key was supplied");
  });

  it("points a missing-credential failure at the query-parameter auth type", () => {
    const message = formatUpstreamError(403, JSON.stringify(EIA_KEY_MISSING));
    expect(message).toMatch(/query parameter/i);
  });

  it("does not claim the credential was missing when it was rejected", () => {
    const message = formatUpstreamError(403, JSON.stringify(EIA_KEY_INVALID));
    expect(message).toContain("API_KEY_INVALID");
    expect(message).not.toMatch(/no credential was sent/i);
    expect(message).toMatch(/rejected the credential/i);
  });

  it("still explains plain HTTP failures", () => {
    expect(formatUpstreamError(429, "")).toMatch(/Rate limited/);
    expect(formatUpstreamError(500, "<html>oops</html>")).toMatch(/server error/i);
  });

  it("recognises which codes mean a credential problem", () => {
    expect(isAuthFailureCode("API_KEY_MISSING")).toBe(true);
    expect(isAuthFailureCode("api_key_invalid")).toBe(true);
    expect(isAuthFailureCode("ROUTE_NOT_FOUND")).toBe(false);
    expect(isAuthFailureCode(undefined)).toBe(false);
  });
});

describe("splitting a pasted URL into base URL and path", () => {
  it("anchors on the API version segment", () => {
    expect(predictBaseAndPath("https://api.eia.gov/v2/electricity/retail-sales/data")).toEqual({
      baseUrl: "https://api.eia.gov/v2",
      path: "/electricity/retail-sales/data",
    });
  });

  it("keeps a trailing slash and the query string on the path", () => {
    const split = predictBaseAndPath(
      "https://api.eia.gov/v2/electricity/retail-sales/data/?api_key=abc&length=2",
    );
    expect(split.baseUrl).toBe("https://api.eia.gov/v2");
    expect(split.path).toBe("/electricity/retail-sales/data/?api_key=abc&length=2");
  });

  it("treats the version root as the base URL itself", () => {
    expect(predictBaseAndPath("https://api.eia.gov/v2")).toEqual({
      baseUrl: "https://api.eia.gov/v2",
      path: "/",
    });
  });

  it("drops the resource name for an unversioned API", () => {
    expect(predictBaseAndPath("https://jsonplaceholder.typicode.com/posts")).toEqual({
      baseUrl: "https://jsonplaceholder.typicode.com",
      path: "/posts",
    });
  });

  it("keeps a named API root whole when the URL ends in a slash", () => {
    expect(predictBaseAndPath("https://api.eia.gov/v2/electricity/retail-sales/")).toEqual({
      baseUrl: "https://api.eia.gov/v2",
      path: "/electricity/retail-sales/",
    });
  });

  it("handles a bare origin", () => {
    expect(predictBaseAndPath("https://jsonplaceholder.typicode.com")).toEqual({
      baseUrl: "https://jsonplaceholder.typicode.com/",
      path: "/",
    });
  });

  it("turns a hostname into a readable connection name", () => {
    expect(suggestConnectionName("https://api.eia.gov/v2", "/electricity/retail-sales/data")).toBe(
      "Eia — data",
    );
    expect(suggestConnectionName("https://jsonplaceholder.typicode.com", "/posts")).toBe(
      "Jsonplaceholder — posts",
    );
  });
});

describe("finding the rows inside a response", () => {
  it("names response.data for the EIA data endpoint", () => {
    const suggestions = findRowPathSuggestions(EIA_DATA_RESPONSE);
    expect(suggestions[0].path).toBe("response.data");
    expect(suggestions[0].rowCount).toBe(2);
    expect(suggestions[0].columns).toContain("period");
    expect(suggestions[0].columns).toContain("stateid");
  });

  it("does not mistake EIA's facet id array for a row collection", () => {
    const payload = {
      response: { facets: [{ id: ["AK", "AL", "AR"] }] },
    };
    expect(findRowPathSuggestions(payload)).toEqual([]);
  });

  it("finds no rows in a metadata document", () => {
    expect(findRowPathSuggestions(EIA_METADATA_RESPONSE)).toEqual([]);
    expect(inferRowsPath(EIA_METADATA_RESPONSE)).toBeUndefined();
  });

  it("prefers a conventional collection name", () => {
    const payload = {
      meta: { nested: { rows: [{ a: 1 }, { a: 2 }] } },
      items: [{ b: 1 }, { b: 2 }, { b: 3 }],
    };
    expect(findRowPathSuggestions(payload)[0].path).toBe("items");
  });

  it("needs no rowsPath for a top-level array", () => {
    expect(inferRowsPath([{ id: 1 }, { id: 2 }])).toBeUndefined();
    expect(countRowsAtPath([{ id: 1 }, { id: 2 }])).toBe(2);
  });

  it("counts rows the way dataset execution will", () => {
    expect(countRowsAtPath(EIA_DATA_RESPONSE, "response.data")).toBe(2);
    // Non-object entries are dropped by normalizeRows, so they are not rows here either.
    expect(countRowsAtPath({ data: ["a", "b", "c"] }, "data")).toBe(0);
    expect(countRowsAtPath(EIA_DATA_RESPONSE, "response")).toBe(1);
  });

  it("counts nothing for a path that does not exist", () => {
    expect(countRowsAtPath(EIA_DATA_RESPONSE, "response.nope")).toBe(0);
  });
});

describe("reading what an API wants for authentication", () => {
  it("recognises EIA's missing-key code and points at the query string", () => {
    const hints = detectAuthHints({
      ok: false,
      status: 403,
      errorCode: "API_KEY_MISSING",
      errorMessage: EIA_KEY_MISSING.error.message,
      data: EIA_KEY_MISSING,
    });
    expect(hints[0].auth).toBe("apiKeyQuery");
    expect(hints[0].confidence).toBe("high");
    expect(hints[0].fieldName).toBe("api_key");
    expect(hints[0].message).toMatch(/query string/i);
  });

  it("does not claim the key was absent when EIA says it was invalid", () => {
    const hints = detectAuthHints({
      ok: false,
      status: 403,
      errorCode: "API_KEY_INVALID",
      errorMessage: EIA_KEY_INVALID.error.message,
      data: EIA_KEY_INVALID,
    });
    expect(hints[0].auth).toBe("apiKeyQuery");
    expect(hints[0].confidence).toBe("medium");
    expect(hints[0].message).toMatch(/rejected the credential/i);
  });

  it("reads a Bearer challenge header", () => {
    const hints = detectAuthHints({
      ok: false,
      status: 401,
      wwwAuthenticate: 'Bearer realm="api"',
    });
    expect(hints[0]).toMatchObject({ auth: "bearer", confidence: "high" });
  });

  it("reads a Basic challenge header", () => {
    const hints = detectAuthHints({ ok: false, status: 401, wwwAuthenticate: "Basic" });
    expect(hints[0]).toMatchObject({ auth: "basic", confidence: "high" });
  });

  it("reads a parameterised ApiKey challenge", () => {
    const hints = detectAuthHints({
      ok: false,
      status: 401,
      wwwAuthenticate: 'ApiKey param="api_key"',
    });
    expect(hints[0]).toMatchObject({
      auth: "apiKeyQuery",
      fieldName: "api_key",
      confidence: "high",
    });
  });

  it("falls back to a Bearer guess on a bare 401", () => {
    const hints = detectAuthHints({ ok: false, status: 401 });
    expect(hints[0].auth).toBe("bearer");
    expect(hints[0].confidence).toBe("low");
  });

  it("reports that no auth is needed when the endpoint answers openly", () => {
    const hints = detectAuthHints({ ok: true, status: 200, data: [{ id: 1 }] });
    expect(hints).toEqual([
      expect.objectContaining({ auth: "none", confidence: "high" }),
    ]);
  });

  it("produces no hints for a successful authenticated call", () => {
    expect(
      detectAuthHints({ ok: true, status: 200, data: EIA_DATA_RESPONSE }),
    ).toEqual([expect.objectContaining({ auth: "none" })]);
  });

  it("flags an error document returned with a 200", () => {
    expect(looksLikeApiErrorDocument({ error: { code: "ROUTE_NOT_FOUND" } })).toBe(true);
    expect(looksLikeApiErrorDocument({ code: 404, message: "not found" })).toBe(true);
    expect(looksLikeApiErrorDocument(EIA_DATA_RESPONSE)).toBe(false);
    expect(looksLikeApiErrorDocument([{ id: 1 }])).toBe(false);
  });
});

describe("guided discovery", () => {
  it("turns a 403 into a filled-in query-auth setup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(EIA_KEY_MISSING), { status: 403 })),
    );

    const result = await discoverEndpoint({
      url: "https://api.eia.gov/v2/electricity/retail-sales/data",
    });

    expect(result.probe.ok).toBe(false);
    expect(result.probe.status).toBe(403);
    expect(result.probe.errorCode).toBe("API_KEY_MISSING");
    expect(result.suggested.baseUrl).toBe("https://api.eia.gov/v2");
    expect(result.suggested.path).toBe("/electricity/retail-sales/data");
    expect(result.suggested.auth).toBe("apiKeyQuery");
    expect(result.suggested.apiKeyQueryParam).toBe("api_key");
    expect(result.suggested.name).toBe("Eia — data");
  });

  it("reports the row path and columns once the key works", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(EIA_DATA_RESPONSE), { status: 200 })),
    );

    const result = await discoverEndpoint({
      url: "https://api.eia.gov/v2/electricity/retail-sales/data",
      auth: "apiKeyQuery",
      credentials: { auth: "apiKeyQuery", secret: "unit-test-value" },
    });

    expect(result.probe.ok).toBe(true);
    expect(result.suggested.rowsPath).toBe("response.data");
    expect(result.rowCount).toBe(2);
    expect(result.columns).toContain("stateid");
    expect(result.suggested.auth).toBe("apiKeyQuery");
  });

  it("adds the candidate key to the probe query string, not a header", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(EIA_DATA_RESPONSE), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await discoverEndpoint({
      url: "https://api.eia.gov/v2/electricity/retail-sales/data",
      auth: "apiKeyQuery",
      credentials: { auth: "apiKeyQuery", secret: "unit-test-value" },
    });

    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toContain("api_key=unit-test-value");
    expect(init.headers).not.toHaveProperty("api_key");
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("warns when the response is an error document delivered with a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: "ROUTE_NOT_FOUND" } }), {
            status: 200,
          }),
      ),
    );

    const result = await discoverEndpoint({ url: "https://api.eia.gov/v2/nope" });
    expect(result.isErrorDocument).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/error document/i);
  });

  it("explains that a top-level array needs no rowsPath", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 }),
      ),
    );

    const result = await discoverEndpoint({
      url: "https://jsonplaceholder.typicode.com/posts",
    });
    expect(result.suggested.rowsPath).toBeUndefined();
    expect(result.rowCount).toBe(2);
    expect(result.warnings.join(" ")).toMatch(/top-level JSON array/i);
  });

  it("probes the explicit base URL plus path the connection will store", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(EIA_DATA_RESPONSE), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await discoverEndpoint({
      url: "https://api.eia.gov/v2/electricity/retail-sales/data/?length=2",
      baseUrl: "https://api.eia.gov/v2",
    });

    const [calledUrl] = fetchMock.mock.calls[0] as unknown as [string];
    expect(calledUrl).toBe(
      "https://api.eia.gov/v2/electricity/retail-sales/data/?length=2",
    );
  });

  it("never echoes the candidate secret back to the caller", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(EIA_DATA_RESPONSE), { status: 200 })),
    );

    const result = await discoverEndpoint({
      url: "https://api.eia.gov/v2/electricity/retail-sales/data",
      auth: "apiKeyQuery",
      credentials: { auth: "apiKeyQuery", secret: "unit-test-value" },
    });

    // The key travels in the query string, so it is part of the URL that was fetched.
    expect(JSON.stringify(result)).not.toContain("unit-test-value");
    expect(result.requestedUrl).toContain("api_key=YOUR_API_KEY");
  });
});
