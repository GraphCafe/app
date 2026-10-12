import { NextResponse } from "next/server";
import { connectionUpdateSchema } from "@/lib/connections/schemas";
import { connectionHasStoredCredential } from "@/lib/connections/credential-status";
import {
  deleteConnection,
  getConnection,
  getConnectionCredentials,
  mergeConnectionCredentials,
  updateConnection,
} from "@/lib/connections/persistence";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const connection = await getConnection(id);
  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  const credentials = await getConnectionCredentials(id);
  return NextResponse.json({
    connection,
    credentialStatus: {
      hasCredential: connectionHasStoredCredential(connection, credentials),
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = connectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await getConnection(id);
  if (!existing) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  const credentialPatch = {
    secret: data.secret,
    basicUsername: data.basicUsername,
    basicPassword: data.basicPassword,
    oauth2ClientSecret: data.oauth2ClientSecret,
    oauth2AccessToken: data.oauth2AccessToken,
    oauth2RefreshToken: data.oauth2RefreshToken,
    oauth2ExpiresAt: data.oauth2ExpiresAt,
    oauth2TokenType: data.oauth2TokenType,
  };
  const hasCredentialPatch = Object.values(credentialPatch).some(
    (value) => value !== undefined,
  );

  if (hasCredentialPatch) {
    await mergeConnectionCredentials(id, {
      auth: data.auth ?? existing.auth,
      apiKeyHeader: data.apiKeyHeader ?? existing.apiKeyHeader,
      apiKeyQueryParam: data.apiKeyQueryParam ?? existing.apiKeyQueryParam,
      ...credentialPatch,
    });
  }

  const connection = await updateConnection(id, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.baseUrl !== undefined ? { baseUrl: data.baseUrl } : {}),
    ...(data.auth !== undefined ? { auth: data.auth } : {}),
    ...(data.apiKeyHeader !== undefined ? { apiKeyHeader: data.apiKeyHeader } : {}),
    ...(data.apiKeyQueryParam !== undefined
      ? { apiKeyQueryParam: data.apiKeyQueryParam }
      : {}),
    ...(data.oauth2AuthorizationUrl !== undefined
      ? { oauth2AuthorizationUrl: data.oauth2AuthorizationUrl }
      : {}),
    ...(data.oauth2TokenUrl !== undefined ? { oauth2TokenUrl: data.oauth2TokenUrl } : {}),
    ...(data.oauth2ClientId !== undefined ? { oauth2ClientId: data.oauth2ClientId } : {}),
    ...(data.oauth2Scopes !== undefined ? { oauth2Scopes: data.oauth2Scopes } : {}),
    ...(data.oauth2UsePkce !== undefined ? { oauth2UsePkce: data.oauth2UsePkce } : {}),
    ...(data.oauth2TokenDelivery !== undefined
      ? { oauth2TokenDelivery: data.oauth2TokenDelivery }
      : {}),
    ...(data.oauth2QueryParam !== undefined
      ? { oauth2QueryParam: data.oauth2QueryParam }
      : {}),
  });

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
