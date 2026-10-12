import { NextResponse } from "next/server";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import {
  getConnection,
  getConnectionCredentials,
  getDataset,
} from "@/lib/connections/persistence";
import { executeProxyRequest } from "@/lib/connections/proxy";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const dataset = await getDataset(id, auth.id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
  }
  const connection = await getConnection(dataset.connectionId, auth.id);
  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  const credentials = await getConnectionCredentials(connection.id);
  if (!credentials) {
    return NextResponse.json(
      { error: "Connection credentials missing on server." },
      { status: 500 },
    );
  }

  const result = await executeProxyRequest({
    connection,
    credentials,
    request: dataset.request,
    includeDataset: true,
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.status && result.status >= 400 ? result.status : 502,
    });
  }

  return NextResponse.json(result);
}
