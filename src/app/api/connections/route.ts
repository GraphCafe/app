import { NextResponse } from "next/server";
import { connectionCreateSchema } from "@/lib/connections/schemas";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";
import {
  claimLegacyOrphansForUser,
  createConnection,
  ensureDemoSeed,
  listConnections,
} from "@/lib/connections/persistence";

export async function GET() {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;
  await claimLegacyOrphansForUser(auth.id);
  await ensureDemoSeed(auth.id);
  const items = await listConnections(auth.id);
  return NextResponse.json({ connections: items });
}

export async function POST(request: Request) {
  const auth = await requireRequestUser();
  if (isAuthError(auth)) return auth;

  const body = await request.json();
  const parsed = connectionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const {
    name,
    baseUrl,
    auth: authKind,
    apiKeyHeader,
    apiKeyQueryParam,
    oauth2AuthorizationUrl,
    oauth2TokenUrl,
    oauth2ClientId,
    oauth2Scopes,
    oauth2UsePkce,
    oauth2TokenDelivery,
    oauth2QueryParam,
    secret,
    basicUsername,
    basicPassword,
    oauth2ClientSecret,
    oauth2AccessToken,
    oauth2RefreshToken,
    oauth2ExpiresAt,
    oauth2TokenType,
  } = parsed.data;

  const connection = await createConnection(
    {
      userId: auth.id,
      name,
      baseUrl,
      auth: authKind,
      apiKeyHeader,
      apiKeyQueryParam,
      oauth2AuthorizationUrl,
      oauth2TokenUrl,
      oauth2ClientId,
      oauth2Scopes,
      oauth2UsePkce,
      oauth2TokenDelivery,
      oauth2QueryParam,
    },
    {
      auth: authKind,
      apiKeyHeader,
      apiKeyQueryParam,
      secret,
      basicUsername,
      basicPassword,
      oauth2ClientSecret,
      oauth2AccessToken,
      oauth2RefreshToken,
      oauth2ExpiresAt,
      oauth2TokenType,
    },
  );

  return NextResponse.json({ connection }, { status: 201 });
}
