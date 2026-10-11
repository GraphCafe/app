import { NextResponse } from "next/server";
import { datasetCreateSchema } from "@/lib/connections/schemas";
import {
  createDataset,
  getConnection,
  listDatasets,
} from "@/lib/connections/persistence";

export async function GET() {
  const datasets = await listDatasets();
  return NextResponse.json({ datasets });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = datasetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const connection = await getConnection(parsed.data.connectionId);
  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  const dataset = await createDataset(parsed.data);
  return NextResponse.json({ dataset }, { status: 201 });
}
