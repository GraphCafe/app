import { codeChallengeS256 } from "./pkce";
import type { ResolvedOAuth2Config } from "./config";

export function buildAuthorizationUrl(input: {
  config: ResolvedOAuth2Config;
  state: string;
  redirectUri: string;
  codeVerifier?: string;
}): string {
  const url = new URL(input.config.authorizationUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  if (input.config.scopes) {
    url.searchParams.set("scope", input.config.scopes);
  }
  if (input.config.usePkce && input.codeVerifier) {
    url.searchParams.set("code_challenge", codeChallengeS256(input.codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}
