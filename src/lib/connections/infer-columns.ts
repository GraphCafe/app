import type { ColumnSchema, ColumnType } from "./types";

function inferType(value: unknown): ColumnType {
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    return "string";
  }
  return "unknown";
}

function mergeTypes(a: ColumnType, b: ColumnType): ColumnType {
  if (a === b) return a;
  if (a === "unknown") return b;
  if (b === "unknown") return a;
  return "string";
}

export function inferColumnsFromRows(
  rows: Record<string, unknown>[],
  sampleSize = 50,
): ColumnSchema[] {
  const sample = rows.slice(0, sampleSize);
  const types = new Map<string, ColumnType>();
  const nullable = new Map<string, boolean>();

  for (const row of sample) {
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        nullable.set(key, true);
        continue;
      }
      const t = inferType(value);
      types.set(key, mergeTypes(types.get(key) ?? "unknown", t));
    }
  }

  return Array.from(types.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, type]) => ({
      id: name,
      name,
      type,
      nullable: nullable.get(name) ?? false,
    }));
}

export function normalizeRows(raw: unknown[]): Record<string, unknown>[] {
  return raw
    .filter((r) => r !== null && typeof r === "object" && !Array.isArray(r))
    .map((r) => r as Record<string, unknown>);
}
