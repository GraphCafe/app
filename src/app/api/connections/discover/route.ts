import { NextResponse } from "next/server";
import { connectionDiscoverSchema } from "@/lib/connections/schemas";
import { discoverEndpoint } from "@/lib/connections/discovery";

/**
 * POST /api/connections/discover
 *
 * Probes a URL and explains what it wants. The candidate credential is used for this one
 * request only; nothing is written to disk here.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = connectionDiscoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid discovery payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    url,
    auth,
    apiKeyHeader,
    apiKeyQueryParam,
    secret,
    basicUsername,
    basicPassword,
    baseUrl,
  } = parsed.data;

  try {
    const result = await discoverEndpoint({
      url,
      auth,
      baseUrl,
      credentials: {
        auth,
        apiKeyHeader,
        apiKeyQueryParam,
        secret,
        basicUsername,
        basicPassword,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Discovery failed before any request was made.",
      },
      { status: 502 },
    );
  }
}
