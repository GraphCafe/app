import { NextResponse } from "next/server";
import { connectionTestSchema } from "@/lib/connections/schemas";
import { executeProxyRequest } from "@/lib/connections/proxy";
import type { ApiConnection } from "@/lib/connections/types";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = connectionTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid test payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    baseUrl,
    auth,
    apiKeyHeader,
    secret,
    basicUsername,
    basicPassword,
    path,
    method,
    query,
  } = parsed.data;

  const ephemeral: ApiConnection = {
    id: "test",
    name: "test",
    baseUrl,
    auth,
    apiKeyHeader,
    createdAt: "",
    updatedAt: "",
  };

  const result = await executeProxyRequest({
    connection: ephemeral,
    credentials: {
      auth,
      apiKeyHeader,
      secret,
      basicUsername,
      basicPassword,
    },
    request: { method, path, query },
    includeDataset: false,
  });

  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.status && result.status >= 400 ? result.status : 502,
    });
  }

  return NextResponse.json(result);
}
