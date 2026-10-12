import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  SESSION_TTL_DAYS,
} from "@/lib/auth/session-cookie";
import { authenticateUser, createUserSession } from "@/lib/auth/store";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }

  const result = await authenticateUser(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const sessionId = await createUserSession(result.user.id);
  const jar = await cookies();
  jar.set(
    SESSION_COOKIE_NAME,
    sessionId,
    sessionCookieOptions(SESSION_TTL_DAYS * 24 * 60 * 60),
  );

  return NextResponse.json({ user: result.user });
}
