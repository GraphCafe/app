import { createHash, randomBytes } from "crypto";

const PKCE_VERIFIER_BYTES = 32;

/** RFC 7636 code_verifier (43–128 unreserved characters). */
export function createCodeVerifier(): string {
  return randomBytes(PKCE_VERIFIER_BYTES)
    .toString("base64url")
    .replace(/=/g, "")
    .slice(0, 96);
}

/** RFC 7636 S256 code_challenge from a code_verifier. */
export function codeChallengeS256(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url").replace(/=/g, "");
}
