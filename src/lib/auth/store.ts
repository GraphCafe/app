import { readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import {
  ensureGraphCafeDataDir,
  storeFilePath,
} from "@/lib/connections/storage-paths";
import { hashPassword, verifyPassword } from "./password";
import type { PublicUser, UserRecord, UserSessionRecord } from "./types";
import { SESSION_TTL_DAYS } from "./session-cookie";

type UserStore = { items: UserRecord[] };
type SessionStore = { items: UserSessionRecord[] };

async function readUsers(): Promise<UserStore> {
  await ensureGraphCafeDataDir();
  try {
    const raw = await readFile(storeFilePath("users.json"), "utf8");
    return JSON.parse(raw) as UserStore;
  } catch {
    return { items: [] };
  }
}

async function writeUsers(store: UserStore): Promise<void> {
  await ensureGraphCafeDataDir();
  await writeFile(storeFilePath("users.json"), JSON.stringify(store, null, 2));
}

async function readSessions(): Promise<SessionStore> {
  await ensureGraphCafeDataDir();
  try {
    const raw = await readFile(storeFilePath("user-sessions.json"), "utf8");
    return JSON.parse(raw) as SessionStore;
  } catch {
    return { items: [] };
  }
}

async function writeSessions(store: SessionStore): Promise<void> {
  await ensureGraphCafeDataDir();
  await writeFile(
    storeFilePath("user-sessions.json"),
    JSON.stringify(store, null, 2),
  );
}

function toPublic(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email };
}

function pruneSessions(items: UserSessionRecord[]): UserSessionRecord[] {
  const now = Date.now();
  return items.filter((s) => Date.parse(s.expiresAt) > now);
}

export async function registerUser(input: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; user: PublicUser }
  | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const store = await readUsers();
  if (store.items.some((u) => u.email === email)) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const user: UserRecord = {
    id: randomUUID(),
    email,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  store.items.push(user);
  await writeUsers(store);
  return { ok: true, user: toPublic(user) };
}

export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; user: PublicUser }
  | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase();
  const store = await readUsers();
  const user = store.items.find((u) => u.email === email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }
  return { ok: true, user: toPublic(user) };
}

export async function createUserSession(userId: string): Promise<string> {
  const store = await readSessions();
  const pruned = pruneSessions(store.items);
  const id = randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  pruned.push({
    id,
    userId,
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  await writeSessions({ items: pruned });
  return id;
}

export async function deleteUserSession(sessionId: string): Promise<void> {
  const store = await readSessions();
  const next = pruneSessions(store.items).filter((s) => s.id !== sessionId);
  await writeSessions({ items: next });
}

export async function getRegisteredUserCount(): Promise<number> {
  const store = await readUsers();
  return store.items.length;
}

export async function getUserBySessionId(
  sessionId: string | undefined,
): Promise<PublicUser | null> {
  if (!sessionId?.trim()) return null;
  const sessions = await readSessions();
  const session = pruneSessions(sessions.items).find((s) => s.id === sessionId);
  if (!session) return null;
  const users = await readUsers();
  const user = users.items.find((u) => u.id === session.userId);
  return user ? toPublic(user) : null;
}
