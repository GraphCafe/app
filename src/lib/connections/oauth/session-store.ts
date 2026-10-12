import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { graphCafeDataDir } from "../persistence";

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

function sessionsPath(): string {
  return path.join(graphCafeDataDir(), "oauth-sessions.json");
}

async function readStore(): Promise<StoreFile> {
  await mkdir(graphCafeDataDir(), { recursive: true });
  try {
    const raw = await readFile(sessionsPath(), "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await mkdir(graphCafeDataDir(), { recursive: true });
  await writeFile(sessionsPath(), JSON.stringify(store, null, 2));
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
