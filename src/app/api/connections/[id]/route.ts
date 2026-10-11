import { NextResponse } from "next/server";
import { connectionUpdateSchema } from "@/lib/connections/schemas";
import {
  deleteConnection,
  getConnection,
  updateConnection,
} from "@/lib/connections/persistence";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const connection = await getConnection(id);
  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  return NextResponse.json({ connection });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = connectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const {
    name,
    baseUrl,
    auth,
    apiKeyHeader,
    secret,
    basicUsername,
    basicPassword,
  } = parsed.data;

  const existing = await getConnection(id);
  if (!existing) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  const credentials =
    secret !== undefined ||
    basicUsername !== undefined ||
    basicPassword !== undefined ||
    auth !== undefined
      ? {
          auth: auth ?? existing.auth,
          apiKeyHeader: apiKeyHeader ?? existing.apiKeyHeader,
          secret,
          basicUsername,
          basicPassword,
        }
      : undefined;

  const connection = await updateConnection(
    id,
    {
      ...(name !== undefined ? { name } : {}),
      ...(baseUrl !== undefined ? { baseUrl } : {}),
      ...(auth !== undefined ? { auth } : {}),
      ...(apiKeyHeader !== undefined ? { apiKeyHeader } : {}),
    },
    credentials,
  );

  return NextResponse.json({ connection });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const ok = await deleteConnection(id);
  if (!ok) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
