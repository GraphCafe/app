import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizationUrl } from "./authorize-url";
import { resolveOAuth2Config } from "./config";
import { codeChallengeS256, createCodeVerifier } from "./pkce";
import { oauth2ConnectionStatus } from "./status";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
  tokensFromResponse,
} from "./token-client";
import type { ApiConnection } from "../types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OAuth2 PKCE", () => {
  it("derives a stable S256 challenge from a verifier", () => {
    const verifier = "test-verifier-value";
    expect(codeChallengeS256(verifier)).toBe(
      codeChallengeS256(verifier),
    );
    expect(createCodeVerifier().length).toBeGreaterThan(40);
  });
});

describe("OAuth2 authorize URL", () => {
  it("includes PKCE parameters when enabled", () => {
    const verifier = "verifier-1234567890123456789012345678901234567890123";
    const url = buildAuthorizationUrl({
      config: {
        authorizationUrl: "https://auth.example.com/authorize",
        tokenUrl: "https://auth.example.com/token",
        clientId: "client-id",
        scopes: "read",
        usePkce: true,
        tokenDelivery: "authorizationHeader",
        queryParam: "access_token",
      },
      state: "state-uuid",
      redirectUri: "http://localhost:43127/api/oauth/callback",
      codeVerifier: verifier,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("client_id")).toBe("client-id");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("code_challenge")).toBe(codeChallengeS256(verifier));
    expect(parsed.searchParams.get("scope")).toBe("read");
  });
});

describe("OAuth2 connection config", () => {
  const base: ApiConnection = {
    id: "c1",
    userId: "user-1",
    name: "OAuth test",
    baseUrl: "https://api.example.com",
    auth: "oauth2",
    oauth2AuthorizationUrl: "https://auth.example.com/authorize",
    oauth2TokenUrl: "https://auth.example.com/token",
    oauth2ClientId: "client-id",
    createdAt: "",
    updatedAt: "",
  };

  it("accepts a complete configuration", () => {
    expect(resolveOAuth2Config(base).ok).toBe(true);
  });

  it("reports missing fields", () => {
    const result = resolveOAuth2Config({ ...base, oauth2ClientId: "" });
    expect(result.ok).toBe(false);
  });
});

describe("OAuth2 status", () => {
  it("marks connected when an access token is stored", () => {
    const connection: ApiConnection = {
      id: "c1",
      userId: "user-1",
      name: "OAuth",
      baseUrl: "https://api.example.com",
      auth: "oauth2",
      oauth2AuthorizationUrl: "https://auth.example.com/authorize",
      oauth2TokenUrl: "https://auth.example.com/token",
      oauth2ClientId: "client-id",
      createdAt: "",
      updatedAt: "",
    };
    expect(
      oauth2ConnectionStatus(connection, {
        auth: "oauth2",
        oauth2AccessToken: "access-token",
      }).connected,
    ).toBe(true);
  });
});

describe("OAuth2 token client", () => {
  it("parses token responses into stored credential fields", () => {
    const patch = tokensFromResponse({
      access_token: "new-access",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "refresh",
    });
    expect(patch.oauth2AccessToken).toBe("new-access");
    expect(patch.oauth2RefreshToken).toBe("refresh");
    expect(patch.oauth2ExpiresAt).toBeDefined();
  });

  it("exchanges an authorization code at the token endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          access_token: "access-from-code",
          token_type: "Bearer",
          expires_in: 60,
        }),
      ),
    );

    const tokens = await exchangeAuthorizationCode({
      tokenUrl: "https://auth.example.com/token",
      clientId: "client-id",
      clientSecret: "client-secret",
      code: "auth-code",
      redirectUri: "http://localhost:43127/api/oauth/callback",
      codeVerifier: "verifier",
    });

    expect(tokens.oauth2AccessToken).toBe("access-from-code");
  });

  it("refreshes an access token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          access_token: "rotated-access",
          token_type: "Bearer",
          expires_in: 120,
        }),
      ),
    );

    const tokens = await refreshAccessToken({
      tokenUrl: "https://auth.example.com/token",
      clientId: "client-id",
      refreshToken: "refresh-token",
      previous: { oauth2RefreshToken: "refresh-token" },
    });

    expect(tokens.oauth2AccessToken).toBe("rotated-access");
    expect(tokens.oauth2RefreshToken).toBe("refresh-token");
  });
});
