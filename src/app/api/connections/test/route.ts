import { NextResponse } from "next/server";
import { connectionTestSchema } from "@/lib/connections/schemas";
import { executeProxyRequest } from "@/lib/connections/proxy";
import type { ApiConnection } from "@/lib/connections/types";
import {
  isAuthError,
  requireRequestUser,
} from "@/lib/auth/require-user";

export async function POST(request: Request) {
  const user = await requireRequestUser();
  if (isAuthError(user)) return user;
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
    path,
    method,
    query,
  } = parsed.data;

  const ephemeral: ApiConnection = {
    id: "test",
    userId: user.id,
    name: "test",
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
    createdAt: "",
    updatedAt: "",
  };

  const result = await executeProxyRequest({
    connection: ephemeral,
    credentials: {
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
