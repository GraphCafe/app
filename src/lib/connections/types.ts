/**
 * Graph.Cafe connection & report model (v1).
 * Server-side execution only — never embed secrets in report documents synced to the client.
 */

export const GRAPH_CAFE_REPORT_VERSION = "graphCafe.report.v1" as const;

export type ConnectionId = string;
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

export type AuthKind = "none" | "apiKeyHeader" | "bearer" | "basic";

/** Stored server-side; referenced by id from datasets. */
export type ApiConnection = {
  id: ConnectionId;
  name: string;
  baseUrl: string;
  auth: AuthKind;
  /** Header name when auth is apiKeyHeader (default: X-API-Key). */
  apiKeyHeader?: string;
  createdAt: string;
  updatedAt: string;
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
