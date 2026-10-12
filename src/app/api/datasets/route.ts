import { NextResponse } from "next/server";
import { datasetCreateSchema } from "@/lib/connections/schemas";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import {
  createDataset,
  getConnection,
  listDatasets,
} from "@/lib/connections/persistence";

export async function GET() {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;
  const datasets = await listDatasets(auth.id);
  return NextResponse.json({ datasets });
}

export async function POST(request: Request) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const parsed = datasetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const connection = await getConnection(parsed.data.connectionId, auth.id);
  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  const dataset = await createDataset({
    ...parsed.data,
    userId: auth.id,
  });
  return NextResponse.json({ dataset }, { status: 201 });
}
