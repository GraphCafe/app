import { NextResponse } from "next/server";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import { ensureDemoSeed, getReport } from "@/lib/connections/persistence";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;
  await ensureDemoSeed(auth.id);
  const { id } = await params;
  const report = await getReport(id, auth.id);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  return NextResponse.json({ report });
}
