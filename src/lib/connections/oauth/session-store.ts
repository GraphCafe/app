import { readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import {
  ensureGraphCafeDataDir,
  storeFilePath,
} from "../storage-paths";

const SESSION_TTL_MS = 15 * 60 * 1000;

export type OAuthPendingSession = {
  /** OAuth2 `state` parameter. */
  id: string;
  connectionId: string;
  codeVerifier: string;
  usePkce: boolean;
  redirectUri: string;
  returnTo: string;
  createdAt: string;
};

type StoreFile = { items: OAuthPendingSession[] };

async function readStore(): Promise<StoreFile> {
  await ensureGraphCafeDataDir();
  try {
    const raw = await readFile(storeFilePath("oauth-sessions.json"), "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await ensureGraphCafeDataDir();
  await writeFile(
    storeFilePath("oauth-sessions.json"),
    JSON.stringify(store, null, 2),
  );
}

function prune(store: StoreFile): OAuthPendingSession[] {
  const cutoff = Date.now() - SESSION_TTL_MS;
  return store.items.filter((s) => {
    const created = Date.parse(s.createdAt);
    return Number.isFinite(created) && created >= cutoff;
  });
}

export async function createOAuthSession(input: {
  connectionId: string;
  codeVerifier: string;
  usePkce: boolean;
  redirectUri: string;
  returnTo: string;
}): Promise<OAuthPendingSession> {
  const store = await readStore();
  const session: OAuthPendingSession = {
    id: randomUUID(),
    connectionId: input.connectionId,
    codeVerifier: input.codeVerifier,
    usePkce: input.usePkce,
    redirectUri: input.redirectUri,
    returnTo: input.returnTo,
    createdAt: new Date().toISOString(),
  };
  store.items = [...prune(store), session];
  await writeStore(store);
  return session;
}

export async function consumeOAuthSession(
  state: string,
): Promise<OAuthPendingSession | undefined> {
  const store = await readStore();
  const pruned = prune(store);
  const idx = pruned.findIndex((s) => s.id === state);
  if (idx < 0) {
    await writeStore({ items: pruned });
    return undefined;
  }
  const [session] = pruned.splice(idx, 1);
  await writeStore({ items: pruned });
  return session;
}
