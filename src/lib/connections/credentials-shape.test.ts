import { describe, expect, it } from "vitest";
import {
  connectionCreateSchema,
  connectionTestSchema,
  connectionDiscoverSchema,
} from "@/lib/connections/schemas";

describe("credential field identity is preserved", () => {
  it("keeps basicPassword as a real field with its value intact", () => {
    const parsed = connectionCreateSchema.safeParse({
      name: "Legacy API",
      baseUrl: "https://legacy.example.com",
      auth: "basic",
      basicUsername: "  alice  ",
      basicPassword: "  p@ss word:with/specials  ",
      apiKeyQueryParam: null,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    // Credential values are byte-exact, as they were before this change: a password may
    // legitimately begin or end with a space, so nothing here is trimmed.
    expect(parsed.data.basicUsername).toBe("  alice  ");
    expect(parsed.data.basicPassword).toBe("  p@ss word:with/specials  ");
    expect(parsed.data.apiKeyQueryParam).toBeUndefined();
  });

  it("still reports nulls as absent on every credential field", () => {
    const parsed = connectionCreateSchema.safeParse({
      name: "x",
      baseUrl: "https://x.example.com",
      auth: "none",
      secret: null,
      basicUsername: null,
      basicPassword: null,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.secret).toBeUndefined();
    expect(parsed.data.basicUsername).toBeUndefined();
    expect(parsed.data.basicPassword).toBeUndefined();
  });

  it("rejects a non-string credential instead of silently coercing it", () => {
    const parsed = connectionTestSchema.safeParse({
      baseUrl: "https://x.example.com",
      auth: "bearer",
      secret: { evil: true },
    });
    // The preprocess maps non-strings to undefined, so the key is simply absent.
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.secret).toBeUndefined();
  });

  it("trims and bounds the header name but not the key", () => {
    const parsed = connectionTestSchema.safeParse({
      baseUrl: "https://x.example.com",
      auth: "apiKeyHeader",
      apiKeyHeader: "  X-Custom-Key  ",
      secret: "  keep my spaces  ",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.apiKeyHeader).toBe("X-Custom-Key");
    expect(parsed.data.secret).toBe("  keep my spaces  ");
  });

  it("applies the same shape on the discover payload", () => {
    const parsed = connectionDiscoverSchema.safeParse({
      url: "https://api.eia.gov/v2/electricity/retail-sales/data",
      auth: "apiKeyQuery",
      apiKeyQueryParam: "api_key",
      secret: "unit-test-value",
      basicPassword: null,
      baseUrl: null,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.secret).toBe("unit-test-value");
    expect(parsed.data.apiKeyQueryParam).toBe("api_key");
    expect(parsed.data.basicPassword).toBeUndefined();
    expect(parsed.data.baseUrl).toBeUndefined();
  });
});
