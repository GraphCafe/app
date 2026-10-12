import { NextResponse } from "next/server";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import {
  claimLegacyOrphansForUser,
  ensureDemoSeed,
  listReports,
} from "@/lib/connections/persistence";

export async function GET() {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;
  await claimLegacyOrphansForUser(auth.id);
  await ensureDemoSeed(auth.id);
  const reports = await listReports(auth.id);
  return NextResponse.json({ reports });
}
