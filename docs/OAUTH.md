# OAuth 2.0 connections (scaffolding)

Graph.Cafe can connect to APIs that use **OAuth 2.0 authorization code** flows, with **PKCE** enabled by default. Access and refresh tokens are stored encrypted with other connection credentials and are never sent to the browser bundle.

## What is implemented

| Piece | Location |
| ----- | -------- |
| Connection auth type `oauth2` | `src/lib/connections/types.ts` |
| Authorize + token URL, client ID, scopes, PKCE toggle, token delivery | Connection metadata on `ApiConnection` |
| Client secret + tokens | Encrypted `ConnectionCredentials` |
| Start flow | `POST /api/oauth/start` |
| Provider callback | `GET /api/oauth/callback` |
| UI status (no secrets) | `GET /api/oauth/status/[connectionId]` |
| Proxy attach + refresh | `src/lib/connections/proxy.ts`, `src/lib/connections/oauth/tokens.ts` |

## Operator setup (per provider)

1. Create an OAuth application in the provider’s developer console.
2. Set the **redirect URI** to your Graph.Cafe callback:
   - Local dev: `http://localhost:43127/api/oauth/callback`
   - Production: `{GRAPH_CAFE_PUBLIC_URL}/api/oauth/callback`
3. In Graph.Cafe → **Connections → New pour**:
   - Auth: **OAuth 2.0**
   - Fill **Authorization URL**, **Token URL**, **Client ID**, and **Client secret** (if required)
   - Save the connection
4. Copy the redirect URI from the **Connect with OAuth** panel (or `GET /api/oauth/status/...`) into the provider app.
5. Click **Connect with OAuth** and sign in at the provider.

## Environment variables

| Variable | Purpose |
| -------- | ------- |
| `GRAPH_CAFE_PUBLIC_URL` | Public origin used to build the OAuth redirect URI behind proxies (for example `https://app.example.com`) |
| `GRAPH_CAFE_SECRET_KEY` / `GRAPH_CAFE_ENCRYPTION_KEY` | Encrypt stored tokens (required in production) |

## Tabled for tomorrow (needs you / provider)

| Item | Why |
| ---- | --- |
| Provider-specific app registration | Each API (Google, GitHub, Salesforce, etc.) requires you to create the OAuth client and approve redirect URIs |
| Client ID + secret in env vs UI | Some teams prefer secrets only in deployment env; we currently accept client secret via the connection form |
| Client credentials grant | Machine-to-machine APIs without a browser login |
| Dynamic provider discovery (OIDC `.well-known`) | Auto-fill authorize/token URLs from an issuer |
| Multi-user identity | Today any visitor with server access shares the same stored tokens per connection |

## Manual smoke test (no real provider)

1. Save an OAuth2 connection with placeholder URLs.
2. `POST /api/oauth/start` with `{ "connectionId": "…" }` — should return an `authorizeUrl` pointing at your authorization endpoint with `state` and PKCE parameters.
3. After a real provider redirect to `/api/oauth/callback?code=…&state=…`, tokens should appear in encrypted storage and `/api/oauth/status/...` should report `connected: true`.
