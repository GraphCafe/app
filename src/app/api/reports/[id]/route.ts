import { NextResponse } from "next/server";
import { ensureDemoSeed, getReport } from "@/lib/connections/persistence";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  await ensureDemoSeed();
  const { id } = await params;
  const report = await getReport(id);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  return NextResponse.json({ report });
}
