import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserBySessionId } from "./store";
import { SESSION_COOKIE_NAME } from "./session-cookie";
import type { PublicUser } from "./types";

export function authRequiredResponse(): NextResponse {
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

export async function getRequestUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE_NAME)?.value;
  return getUserBySessionId(sessionId);
}

/** Returns the signed-in user or a 401 JSON response. */
export async function requireRequestUser(): Promise<PublicUser | NextResponse> {
  const user = await getRequestUser();
  if (!user) return authRequiredResponse();
  return user;
}

export function isAuthError(
  value: PublicUser | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
