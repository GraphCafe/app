import { readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { encryptSecret, tryDecryptSecret } from "./crypto";
import {
  ensureGraphCafeDataDir,
  graphCafeDataDir,
  storeFilePath,
  type StoreFileName,
} from "./storage-paths";
import type {
  ApiConnection,
  DatasetDefinition,
  ReportDefinition,
} from "./types";
import { GRAPH_CAFE_REPORT_VERSION } from "./types";
import type { ConnectionCredentials } from "./schemas";
import { getRegisteredUserCount } from "@/lib/auth/store";

export { graphCafeDataDir };

type WithOptionalUserId = { userId?: string };

function isMissingUserId(item: WithOptionalUserId): boolean {
  return !item.userId?.trim();
}

/**
 * Pre-account JSON stores had no owner. When exactly one user exists, attach orphans to them
 * so existing pours and secrets keep working after sign-up.
 */
export async function claimLegacyOrphansForUser(userId: string): Promise<void> {
  if ((await getRegisteredUserCount()) !== 1) return;

  const connStore = await readJson<StoreFile<ApiConnection>>("connections.json", {
    items: [],
  });
  let connDirty = false;
  for (const c of connStore.items) {
    if (isMissingUserId(c)) {
      c.userId = userId;
      connDirty = true;
    }
  }
  if (connDirty) await writeJson("connections.json", connStore);

  const dsStore = await readJson<StoreFile<DatasetDefinition>>("datasets.json", {
    items: [],
  });
  let dsDirty = false;
  for (const d of dsStore.items) {
    if (isMissingUserId(d)) {
      d.userId = userId;
      dsDirty = true;
    }
  }
  if (dsDirty) await writeJson("datasets.json", dsStore);

  const repStore = await readJson<StoreFile<ReportDefinition>>("reports.json", {
    items: [],
  });
  let repDirty = false;
  for (const r of repStore.items) {
    if (isMissingUserId(r)) {
      r.userId = userId;
      repDirty = true;
    }
  }
  if (repDirty) await writeJson("reports.json", repStore);
}

type StoreFile<T> = { items: T[] };

type SecretRecord = {
  connectionId: string;
  payload: string;
};

async function readJson<T>(file: StoreFileName, fallback: T): Promise<T> {
  await ensureGraphCafeDataDir();
  try {
    const raw = await readFile(storeFilePath(file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: StoreFileName, data: T): Promise<void> {
  await ensureGraphCafeDataDir();
  await writeFile(storeFilePath(file), JSON.stringify(data, null, 2));
}

function credentialsToPlain(creds: ConnectionCredentials): string {
  return JSON.stringify(creds);
}

function plainToCredentials(plain: string): ConnectionCredentials {
  return JSON.parse(plain) as ConnectionCredentials;
}

async function readAllConnections(): Promise<ApiConnection[]> {
  const store = await readJson<StoreFile<ApiConnection>>("connections.json", {
    items: [],
  });
  return store.items;
}

export async function listConnections(userId: string): Promise<ApiConnection[]> {
  return (await readAllConnections()).filter((c) => c.userId === userId);
}

/** Server-only lookup (callers must enforce ownership). */
export async function getConnectionById(
  id: string,
): Promise<ApiConnection | undefined> {
  return (await readAllConnections()).find((c) => c.id === id);
}

export async function getConnection(
  id: string,
  userId: string,
): Promise<ApiConnection | undefined> {
  const connection = await getConnectionById(id);
  if (!connection || connection.userId !== userId) return undefined;
  return connection;
}

export async function createConnection(
  input: Omit<ApiConnection, "id" | "createdAt" | "updatedAt">,
  credentials: ConnectionCredentials,
): Promise<ApiConnection> {
  const now = new Date().toISOString();
  const connection: ApiConnection = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const store = await readJson<StoreFile<ApiConnection>>("connections.json", {
    items: [],
  });
  store.items.push(connection);
  await writeJson("connections.json", store);
  await saveConnectionCredentials(connection.id, credentials);
  return connection;
}

export async function updateConnection(
  id: string,
  patch: Partial<ApiConnection>,
  credentials?: ConnectionCredentials,
): Promise<ApiConnection | undefined> {
  const store = await readJson<StoreFile<ApiConnection>>("connections.json", {
    items: [],
  });
  const idx = store.items.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const updated: ApiConnection = {
    ...store.items[idx],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  store.items[idx] = updated;
  await writeJson("connections.json", store);
  if (credentials) {
    await saveConnectionCredentials(id, credentials);
  }
  return updated;
}

export async function deleteConnection(id: string): Promise<boolean> {
  const store = await readJson<StoreFile<ApiConnection>>("connections.json", {
    items: [],
  });
  const next = store.items.filter((c) => c.id !== id);
  if (next.length === store.items.length) return false;
  await writeJson("connections.json", { items: next });
  const secrets = await readJson<StoreFile<SecretRecord>>("secrets.json", {
    items: [],
  });
  secrets.items = secrets.items.filter((s) => s.connectionId !== id);
  await writeJson("secrets.json", secrets);
  return true;
}

async function saveConnectionCredentials(
  connectionId: string,
  credentials: ConnectionCredentials,
): Promise<void> {
  const secrets = await readJson<StoreFile<SecretRecord>>("secrets.json", {
    items: [],
  });
  const payload = encryptSecret(credentialsToPlain(credentials));
  const existing = secrets.items.findIndex(
    (s) => s.connectionId === connectionId,
  );
  const record: SecretRecord = { connectionId, payload };
  if (existing >= 0) secrets.items[existing] = record;
  else secrets.items.push(record);
  await writeJson("secrets.json", secrets);
}

export async function getConnectionCredentials(
  connectionId: string,
): Promise<ConnectionCredentials | undefined> {
  const secrets = await readJson<StoreFile<SecretRecord>>("secrets.json", {
    items: [],
  });
  const rec = secrets.items.find((s) => s.connectionId === connectionId);
  if (!rec) return undefined;
  const plain = tryDecryptSecret(rec.payload);
  if (!plain) return undefined;
  return plainToCredentials(plain);
}

function syncCredentialMetadata(
  connection: ApiConnection,
  credentials: ConnectionCredentials,
): ConnectionCredentials {
  return {
    ...credentials,
    auth: connection.auth,
    apiKeyHeader: connection.apiKeyHeader ?? credentials.apiKeyHeader,
    apiKeyQueryParam:
      connection.apiKeyQueryParam ?? credentials.apiKeyQueryParam,
  };
}

/** Merge credential fields without wiping unspecified values. */
export async function mergeConnectionCredentials(
  connectionId: string,
  patch: Partial<ConnectionCredentials>,
): Promise<ConnectionCredentials | undefined> {
  const connection = await getConnectionById(connectionId);
  if (!connection) return undefined;

  const existing =
    (await getConnectionCredentials(connectionId)) ??
    ({ auth: connection.auth } satisfies ConnectionCredentials);

  const next = syncCredentialMetadata(connection, {
    ...existing,
    ...patch,
    auth: connection.auth,
  });
  await saveConnectionCredentials(connectionId, next);
  return next;
}

export async function listDatasets(userId: string): Promise<DatasetDefinition[]> {
  const store = await readJson<StoreFile<DatasetDefinition>>("datasets.json", {
    items: [],
  });
  return store.items.filter((d) => d.userId === userId);
}

export async function getDataset(
  id: string,
  userId: string,
): Promise<DatasetDefinition | undefined> {
  const dataset = (await listDatasets(userId)).find((d) => d.id === id);
  return dataset;
}

export async function createDataset(
  input: Omit<DatasetDefinition, "id">,
): Promise<DatasetDefinition> {
  const dataset: DatasetDefinition = { ...input, id: randomUUID() };
  const store = await readJson<StoreFile<DatasetDefinition>>("datasets.json", {
    items: [],
  });
  store.items.push(dataset);
  await writeJson("datasets.json", store);
  return dataset;
}

export async function updateDataset(
  id: string,
  patch: Pick<DatasetDefinition, "name" | "request">,
): Promise<DatasetDefinition | undefined> {
  const store = await readJson<StoreFile<DatasetDefinition>>("datasets.json", {
    items: [],
  });
  const idx = store.items.findIndex((d) => d.id === id);
  if (idx < 0) return undefined;
  const updated: DatasetDefinition = {
    ...store.items[idx],
    ...patch,
    id,
  };
  store.items[idx] = updated;
  await writeJson("datasets.json", store);
  return updated;
}

export async function listReports(userId: string): Promise<ReportDefinition[]> {
  const store = await readJson<StoreFile<ReportDefinition>>("reports.json", {
    items: [],
  });
  return store.items.filter((r) => r.userId === userId);
}

export async function getReport(
  id: string,
  userId: string,
): Promise<ReportDefinition | undefined> {
  return (await listReports(userId)).find((r) => r.id === id);
}

export async function saveReport(report: ReportDefinition): Promise<void> {
  const store = await readJson<StoreFile<ReportDefinition>>("reports.json", {
    items: [],
  });
  const idx = store.items.findIndex((r) => r.id === report.id);
  if (idx >= 0) store.items[idx] = report;
  else store.items.push(report);
  await writeJson("reports.json", store);
}

export async function ensureDemoSeed(userId: string): Promise<{
  connectionId: string;
  datasetId: string;
  reportId: string;
} | null> {
  const connections = await listConnections(userId);
  const existing = connections.find((c) => c.name === "Demo — JSONPlaceholder");
  if (existing) {
    const datasets = await listDatasets(userId);
    const ds = datasets.find((d) => d.connectionId === existing.id);
    const reports = await listReports(userId);
    const report = reports[0];
    if (ds && report) {
      return {
        connectionId: existing.id,
        datasetId: ds.id,
        reportId: report.id,
      };
    }
  }

  // Two near-simultaneous first requests both saw an empty store and each seeded a copy, so
  // never seed a second demo alongside connections the user already has.
  if (connections.length > 0) return null;

  const connection = await createConnection(
    {
      userId,
      name: "Demo — JSONPlaceholder",
      baseUrl: "https://jsonplaceholder.typicode.com",
      auth: "none",
    },
    { auth: "none" },
  );

  const dataset = await createDataset({
    userId,
    connectionId: connection.id,
    name: "Posts roast",
    request: {
      method: "GET",
      path: "/posts",
      rowsPath: "",
    },
  });

  const tableWidgetId = randomUUID();
  const chartWidgetId = randomUUID();
  const report: ReportDefinition = {
    version: GRAPH_CAFE_REPORT_VERSION,
    id: randomUUID(),
    userId,
    name: "Morning tasting plate",
    description: "Sample table + chart from the demo API.",
    datasets: [dataset],
    widgets: [
      {
        id: tableWidgetId,
        type: "table",
        title: "Posts",
        datasetId: dataset.id,
        table: { pageSize: 10 },
      },
      {
        id: chartWidgetId,
        type: "chart",
        title: "Post id by user",
        datasetId: dataset.id,
        chart: {
          kind: "bar",
          xColumnId: "userId",
          yColumnId: "id",
        },
      },
    ],
    layout: {
      columns: 2,
      placement: {
        [tableWidgetId]: { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
        [chartWidgetId]: { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      },
    },
    updatedAt: new Date().toISOString(),
  };
  await saveReport(report);

  return {
    connectionId: connection.id,
    datasetId: dataset.id,
    reportId: report.id,
  };
}
