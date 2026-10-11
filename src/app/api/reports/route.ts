import { NextResponse } from "next/server";
import { ensureDemoSeed, listReports } from "@/lib/connections/persistence";

export async function GET() {
  await ensureDemoSeed();
  const reports = await listReports();
  return NextResponse.json({ reports });
}
