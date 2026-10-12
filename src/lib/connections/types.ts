/**
 * Graph.Cafe connection & report model (v1).
 * Server-side execution only — never embed secrets in report documents synced to the client.
 */

export const GRAPH_CAFE_REPORT_VERSION = "graphCafe.report.v1" as const;

export type ConnectionId = string;
export type UserId = string;
export type DatasetId = string;
export type ReportId = string;
export type WidgetId = string;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ColumnType = "string" | "number" | "boolean" | "date" | "unknown";

export type ColumnSchema = {
  id: string;
  name: string;
  type: ColumnType;
  nullable?: boolean;
};

/**
 * How a connection authenticates.
 *
 * `apiKeyQuery` covers APIs such as the U.S. EIA Open Data API that require the key as a
 * URL parameter (`?api_key=…`) instead of a header.
 */
export type AuthKind =
  | "none"
  | "apiKeyHeader"
  | "apiKeyQuery"
  | "bearer"
  | "basic"
  | "oauth2";

export const AUTH_KINDS: readonly AuthKind[] = [
  "none",
  "apiKeyHeader",
  "apiKeyQuery",
  "bearer",
  "basic",
  "oauth2",
] as const;

/** How an OAuth2 access token is attached to proxied API requests. */
export type OAuth2TokenDelivery = "authorizationHeader" | "queryParam";

export const DEFAULT_OAUTH2_QUERY_PARAM = "access_token";

export const DEFAULT_API_KEY_HEADER = "X-API-Key";
export const DEFAULT_API_KEY_QUERY_PARAM = "api_key";

/** Stored server-side; referenced by id from datasets. */
export type ApiConnection = {
  id: ConnectionId;
  /** Owner of this pour; credentials and datasets are scoped to the same user. */
  userId: UserId;
  name: string;
  baseUrl: string;
  auth: AuthKind;
  /** Header name when auth is apiKeyHeader (default: X-API-Key). */
  apiKeyHeader?: string;
  /** Query parameter name when auth is apiKeyQuery (default: api_key). */
  apiKeyQueryParam?: string;
  /** OAuth2 authorization endpoint (auth code + PKCE). */
  oauth2AuthorizationUrl?: string;
  /** OAuth2 token endpoint (code exchange + refresh). */
  oauth2TokenUrl?: string;
  /** Public OAuth2 client identifier registered with the provider. */
  oauth2ClientId?: string;
  /** Space-separated scopes requested during authorize. */
  oauth2Scopes?: string;
  /** Send PKCE (`S256`) on the authorize + token exchange (default true). */
  oauth2UsePkce?: boolean;
  /** Where the access token is placed on proxied requests (default: Authorization header). */
  oauth2TokenDelivery?: OAuth2TokenDelivery;
  /** Query parameter name when oauth2TokenDelivery is queryParam. */
  oauth2QueryParam?: string;
  createdAt: string;
  updatedAt: string;
};

/** OAuth2 token material stored encrypted with other connection credentials. */
export type OAuth2CredentialState = {
  oauth2ClientSecret?: string;
  oauth2AccessToken?: string;
  oauth2RefreshToken?: string;
  /** ISO timestamp when the access token expires (if the provider returns `expires_in`). */
  oauth2ExpiresAt?: string;
  oauth2TokenType?: string;
};

export type OAuth2ConnectionStatus = {
  configured: boolean;
  connected: boolean;
  expiresAt?: string;
  /** True when the access token expires within the refresh buffer. */
  expiresSoon?: boolean;
};

export type DatasetRequest = {
  method: HttpMethod;
  /** Path relative to connection baseUrl, e.g. /v1/orders */
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  /** Dot path to array root in JSON response, e.g. data.items */
  rowsPath?: string;
};

export type DatasetDefinition = {
  id: DatasetId;
  userId: UserId;
  connectionId: ConnectionId;
  name: string;
  request: DatasetRequest;
  /** Optional parameter placeholders for report-level filters (Phase B). */
  parameters?: string[];
};

export type DatasetResult = {
  columns: ColumnSchema[];
  rows: Record<string, unknown>[];
  fetchedAt: string;
  rowCount: number;
};

export type ChartKind = "line" | "bar" | "area" | "pie";

export type ChartEncoding = {
  kind: ChartKind;
  xColumnId: string;
  yColumnId: string;
  seriesColumnId?: string;
};

export type TableWidgetConfig = {
  columnIds?: string[];
  pageSize?: number;
};

export type WidgetBase = {
  id: WidgetId;
  title?: string;
  datasetId: DatasetId;
};

export type ChartWidget = WidgetBase & {
  type: "chart";
  chart: ChartEncoding;
};

export type TableWidget = WidgetBase & {
  type: "table";
  table: TableWidgetConfig;
};

export type KpiWidget = WidgetBase & {
  type: "kpi";
  columnId: string;
  aggregate: "sum" | "avg" | "count" | "min" | "max";
};

export type ReportWidget = ChartWidget | TableWidget | KpiWidget;

export type ReportLayout = {
  columns: number;
  /** Grid placement: widget id → { col, row, colSpan, rowSpan } */
  placement: Record<
    WidgetId,
    { col: number; row: number; colSpan: number; rowSpan: number }
  >;
};

export type ReportDefinition = {
  version: typeof GRAPH_CAFE_REPORT_VERSION;
  id: ReportId;
  userId: UserId;
  name: string;
  description?: string;
  datasets: DatasetDefinition[];
  widgets: ReportWidget[];
  layout: ReportLayout;
  /** Global filter bindings (Phase B). */
  globalFilters?: Record<string, string>;
  updatedAt: string;
};

/** Body for server proxy test / execute (secret sent separately, not stored in ReportDefinition). */
export type ProxyExecuteRequest = {
  connectionId: ConnectionId;
  request: DatasetRequest;
};

export type ProxyExecuteResponse =
  | { ok: true; status: number; data: unknown; dataset?: DatasetResult }
  | { ok: false; status?: number; error: string };

/**
 * Result of probing an endpoint before a connection is saved.
 *
 * `suggested` holds values the form can drop straight into its fields; `hints` explains why.
 */
export type DiscoveryResult = {
  /** The URL actually requested. */
  requestedUrl: string;
  suggested: {
    baseUrl: string;
    path: string;
    name?: string;
    auth: AuthKind;
    apiKeyHeader?: string;
    apiKeyQueryParam?: string;
    rowsPath?: string;
  };
  probe: {
    ok: boolean;
    status?: number;
    durationMs: number;
    contentType?: string;
    truncated: boolean;
    error?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  authHints: AuthHint[];
  /** Candidate `rowsPath` values, best first. */
  rowPaths: RowPathSuggestion[];
  /** Column names for the response, or for the first suggested row path. */
  columns: string[];
  /** Number of rows the suggested path yields. */
  rowCount: number;
  /** Trimmed JSON sample, for the preview pane. */
  sample?: unknown;
  /** True when the body looks like an error document rather than data. */
  isErrorDocument: boolean;
  warnings: string[];
};

export type AuthHint = {
  auth: AuthKind;
  confidence: "high" | "medium" | "low";
  fieldName?: string;
  location: "header" | "query" | "body" | "none";
  message: string;
};

export type RowPathSuggestion = {
  path: string;
  rowCount: number;
  columns: string[];
};
