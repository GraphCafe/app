import path from "path";

const STORE_ROOT = path.join(process.cwd(), ".data", "graph-cafe");

export type StoreFileName =
  | "connections.json"
  | "secrets.json"
  | "datasets.json"
  | "reports.json"
  | "oauth-sessions.json";

/** Fixed paths under `.data/graph-cafe/` (Turbopack-safe; no dynamic join segments). */
const STATIC_STORE_PATHS: Record<StoreFileName, string> = {
  "connections.json": path.join(STORE_ROOT, "connections.json"),
  "secrets.json": path.join(STORE_ROOT, "secrets.json"),
  "datasets.json": path.join(STORE_ROOT, "datasets.json"),
  "reports.json": path.join(STORE_ROOT, "reports.json"),
  "oauth-sessions.json": path.join(STORE_ROOT, "oauth-sessions.json"),
};

export function graphCafeDataDir(): string {
  const override = process.env.GRAPH_CAFE_DATA_DIR?.trim();
  if (override) return path.resolve(override);
  return STORE_ROOT;
}

/** Resolve the on-disk path for a known store file. */
export function storeFilePath(name: StoreFileName): string {
  const override = process.env.GRAPH_CAFE_DATA_DIR?.trim();
  if (!override) return STATIC_STORE_PATHS[name];
  return path.join(
    /* turbopackIgnore: true */ path.resolve(override),
    name,
  );
}

export async function ensureGraphCafeDataDir(): Promise<void> {
  const { mkdir } = await import("fs/promises");
  const override = process.env.GRAPH_CAFE_DATA_DIR?.trim();
  if (!override) {
    await mkdir(STORE_ROOT, { recursive: true });
    return;
  }
  await mkdir(/* turbopackIgnore: true */ path.resolve(override), {
    recursive: true,
  });
}
