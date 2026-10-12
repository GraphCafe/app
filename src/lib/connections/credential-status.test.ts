import { describe, expect, it } from "vitest";
import { connectionHasStoredCredential } from "./credential-status";
import type { ApiConnection } from "./types";

const base: ApiConnection = {
  id: "c1",
  name: "Test",
  baseUrl: "https://api.example.com",
  auth: "apiKeyQuery",
  createdAt: "",
  updatedAt: "",
};

describe("connectionHasStoredCredential", () => {
  it("is true for auth none without credentials", () => {
    expect(
      connectionHasStoredCredential(
        { ...base, auth: "none" },
        undefined,
      ),
    ).toBe(true);
  });

  it("requires a secret for API key auth", () => {
    expect(connectionHasStoredCredential(base, undefined)).toBe(false);
    expect(connectionHasStoredCredential(base, { auth: "apiKeyQuery" })).toBe(
      false,
    );
    expect(
      connectionHasStoredCredential(base, {
        auth: "apiKeyQuery",
        secret: "key",
      }),
    ).toBe(true);
  });
});
