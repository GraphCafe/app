export function getByPath(root: unknown, path?: string): unknown {
  if (!path || path.trim() === "") {
    return root;
  }
  const segments = path.split(".").filter(Boolean);
  let current: unknown = root;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    if (Array.isArray(current)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx)) return undefined;
      current = current[idx];
      continue;
    }
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

export function extractRows(data: unknown, rowsPath?: string): unknown[] {
  const node = rowsPath ? getByPath(data, rowsPath) : data;
  if (Array.isArray(node)) return node;
  if (node !== null && typeof node === "object") {
    return [node as Record<string, unknown>];
  }
  return [];
}
