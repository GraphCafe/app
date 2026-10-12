import { mkdtemp, readFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GRAPH_CAFE_REPORT_VERSION } from "./types";

let dataDir: string;

async function loadPersistence() {
  return import("./persistence");
}

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "graph-cafe-"));
  process.env.GRAPH_CAFE_DATA_DIR = dataDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.GRAPH_CAFE_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
  vi.resetModules();
});

describe("deleteConnection", () => {
  it("removes the connection, credentials, datasets, and report widgets tied to it", async () => {
    const {
      createConnection,
      createDataset,
      deleteConnection,
      getConnection,
      getConnectionCredentials,
      getDataset,
      listConnections,
      saveReport,
      getReport,
    } = await loadPersistence();

    const connection = await createConnection(
      {
        name: "Test API",
        baseUrl: "https://api.example.com",
        auth: "none",
      },
      { auth: "none" },
    );
    const dataset = await createDataset({
      connectionId: connection.id,
      name: "Orders",
      request: { method: "GET", path: "/orders" },
    });

    const widgetId = "11111111-1111-4111-8111-111111111111";
    await saveReport({
      version: GRAPH_CAFE_REPORT_VERSION,
      id: "22222222-2222-4222-8222-222222222222",
      name: "Board",
      datasets: [dataset],
      widgets: [
        {
          id: widgetId,
          type: "table",
          title: "Orders",
          datasetId: dataset.id,
          table: { pageSize: 10 },
        },
      ],
      layout: {
        columns: 1,
        placement: {
          [widgetId]: { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
        },
      },
      updatedAt: new Date().toISOString(),
    });

    const ok = await deleteConnection(connection.id);
    expect(ok).toBe(true);
    expect(await listConnections()).toHaveLength(0);
    expect(await getConnection(connection.id)).toBeUndefined();
    expect(await getConnectionCredentials(connection.id)).toBeUndefined();
    expect(await getDataset(dataset.id)).toBeUndefined();

    const report = await getReport("22222222-2222-4222-8222-222222222222");
    expect(report?.datasets).toHaveLength(0);
    expect(report?.widgets).toHaveLength(0);
    expect(report?.layout.placement).toEqual({});

    const secretsRaw = await readFile(
      join(dataDir, "secrets.json"),
      "utf8",
    );
    expect(secretsRaw).not.toContain(connection.id);
  });

  it("returns false when the connection id is unknown", async () => {
    const { deleteConnection } = await loadPersistence();
    expect(await deleteConnection("missing-id")).toBe(false);
  });
});
