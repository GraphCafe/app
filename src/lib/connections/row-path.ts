/**
 * Point a dataset at the right part of a JSON response.
 *
 * `rowsPath` already existed but nothing helped fill it in. These helpers inspect a live
 * response and name the arrays that look like row collections, so a user connecting the EIA
 * API is told `response.data` rather than having to read the raw payload to find out.
 */

import { getByPath } from "./json-path";
import type { RowPathSuggestion } from "./types";

export type { RowPathSuggestion };

const MAX_DEPTH = 6;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * True when `value` is a scalar a table cell could hold, rather than a nested container.
 */
function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Decide whether an array is a collection of records.
 *
 * EIA's facet listings are arrays too — `{"facets": [{"id": ["AK", "AL"]}]}` — but every value
 * in them is itself an array, so treating them as rows produces a one-row table of nothing.
 * A record collection must contain objects with at least one scalar field.
 */
function looksLikeRows(value: unknown): value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.some(
    (item) =>
      isPlainObject(item) && Object.values(item).some((field) => isScalar(field)),
  );
}

function collectArrayPaths(
  node: unknown,
  prefix: string,
  depth: number,
  out: string[],
): void {
  if (depth > MAX_DEPTH) return;

  if (Array.isArray(node)) {
    if (looksLikeRows(node)) out.push(prefix);
    // Also look inside, so an array of objects can reveal a nested collection.
    for (const item of node.slice(0, 3)) {
      collectArrayPaths(item, prefix, depth + 1, out);
    }
    return;
  }

  if (!isPlainObject(node)) return;

  for (const [key, value] of Object.entries(node)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value) || isPlainObject(value)) {
      collectArrayPaths(value, next, depth + 1, out);
    }
  }
}

/**
 * Rank candidate `rowsPath` values, best first.
 *
 * Static preference handles the near-universal `data` / `items` / `results` convention;
 * observed row counts break ties so the genuinely flat collection wins over a nested one.
 */
export function findRowPathSuggestions(
  data: unknown,
  limit = 4,
): RowPathSuggestion[] {
  const paths: string[] = [];
  collectArrayPaths(data, "", 0, paths);

  const unique = Array.from(new Set(paths.filter(Boolean)));
  const scored = unique.map((path) => {
    const rows = getByPath(data, path);
    const list = Array.isArray(rows) ? rows : [];
    const first = list.find(isPlainObject) ?? {};
    return {
      path,
      rowCount: list.length,
      columns: Object.keys(first).slice(0, 20),
      score: staticRowPathScore(path) + Math.min(list.length, 1000) / 1000,
    };
  });

  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  // A lone unrecognised array is usually a metadata list, not the user's table. Offering
  // `response.facets` as a "rows" value would be worse than offering nothing.
  if (scored.length === 1 && staticRowPathScore(scored[0].path) <= 0) {
    return [];
  }

  return scored.slice(0, limit).map(({ path, rowCount, columns }) => ({
    path,
    rowCount,
    columns,
  }));
}

function staticRowPathScore(path: string): number {
  const leaf = path.split(".").pop() ?? "";
  const preferred: Record<string, number> = {
    data: 6,
    rows: 5,
    items: 5,
    results: 5,
    records: 5,
    series: 4,
    values: 3,
    observations: 4,
  };
  let score = preferred[leaf] ?? 0;
  if (leaf.endsWith("s")) score += 0.5;
  // Deeper paths are less likely to be the intended table.
  score -= path.split(".").length - 1;
  if (path.split(".").pop() === "data" && path.startsWith("response")) score += 3;
  return score;
}

/** Column names for the rows a candidate path resolves to. */
export function columnsAtPath(data: unknown, path?: string): string[] {
  const node = path ? getByPath(data, path) : data;
  const list = Array.isArray(node) ? node : isPlainObject(node) ? [node] : [];
  const first = list.find(isPlainObject);
  return first ? Object.keys(first).slice(0, 30) : [];
}

/**
 * Count rows the way dataset execution will, so the preview number matches the saved result.
 */
export function countRowsAtPath(data: unknown, path?: string): number {
  const node = path ? getByPath(data, path) : data;
  if (Array.isArray(node)) {
    return node.filter((r) => isPlainObject(r)).length;
  }
  if (isPlainObject(node)) return 1;
  return 0;
}

/**
 * If the response is not itself a row collection but contains exactly one, name it.
 * Returns `undefined` when the response is already usable as rows.
 */
export function inferRowsPath(data: unknown): string | undefined {
  if (Array.isArray(data)) return undefined;
  if (isPlainObject(data)) {
    const suggestions = findRowPathSuggestions(data, 1);
    if (suggestions.length > 0) return suggestions[0].path;
    return undefined;
  }
  return undefined;
}
