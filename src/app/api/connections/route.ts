import { NextResponse } from "next/server";
import {
  connectionCreateSchema,
} from "@/lib/connections/schemas";
import {
  createConnection,
  ensureDemoSeed,
  listConnections,
} from "@/lib/connections/persistence";

export async function GET() {
  await ensureDemoSeed();
  const items = await listConnections();
  return NextResponse.json({ connections: items });
}

export async function POST(request: Request) {
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
    auth,
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
      name,
      baseUrl,
      auth,
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
      auth,
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
