export const SESSION_COOKIE_NAME = "graph-cafe-session";

/** Session lifetime in days. */
export const SESSION_TTL_DAYS = 30;

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
