# Graph.Cafe

Bring your own HTTP API—connect on the server, explore JSON as tables, and save a small report with charts. Café branding optional; keeping secrets out of the browser bundle is not.

## Repository

Canonical source: **[github.com/GraphCafe/app](https://github.com/GraphCafe/app)**.

Cloud Agent pushes use a GitHub PAT in **`GITHUB_TOKEN`** (preferred) or **`GH_TOKEN`**, with `repo` scope. If pushes fail from a Project worker, add the same secret under **Project → Environment secrets** (account-level secrets are not always injected on worker VMs).

## Phase A (shipped)

- **BYO connection proxy** — encrypted server-side credential storage, SSRF guards on outbound requests
- **Connections UI** — new pour (name, base URL, bearer / API key header / API key query / basic auth), test GET with status + JSON preview
- **Guided setup** — paste any endpoint and the app probes it, names the credential scheme the API wants, and suggests the base URL, path, and `rowsPath`
- **Datasets + Explore** — named GET templates, `rowsPath` for tabular inference, raw JSON + table preview
- **Report Studio** — sample report with table + Recharts chart (`graphCafe.report.v1`)
- **Idea graph** — original React Flow canvas at `/graph`

## Auth types

| Type | Where the key goes | Typical APIs |
| ---- | ------------------ | ------------ |
| None | — | Open endpoints, JSONPlaceholder |
| Bearer token | `Authorization: Bearer …` | Most SaaS APIs |
| API key in a header | A named header, default `X-API-Key` | Stripe-style and custom header APIs |
| API key in the query string | `?<param>=…`, default `api_key` | **U.S. EIA Open Data**, many government APIs |
| Basic auth | `Authorization: Basic …` | Legacy/internal APIs |

Fields not relevant to the selected type are ignored, so switching types never sends a stale credential.

## Connecting the U.S. EIA Open Data API

The EIA API requires its key as a **query parameter**, not a header, which is why it will not
connect through a header-based API-key setup.

1. Register for a free key at [eia.gov/opendata/register.php](https://www.eia.gov/opendata/register.php).
2. Go to **Connections → New pour**.
3. Paste an endpoint into **Start from an endpoint**, for example
   `https://api.eia.gov/v2/electricity/retail-sales/data/?length=5`, and press
   **Analyse endpoint**. Without a key the EIA API answers `403 API_KEY_MISSING`, and the panel
   will say so and suggest *API key in the query string*.
4. Paste the key into the panel's **API key or bearer token** field and press **Re-analyse with
   credential** (or **Analyse endpoint** again). Discovery automatically retries once with the
   scheme the API asked for, so you can confirm the authenticated response and see the detected
   `rowsPath`.
5. Press **Use these settings**, name the pour, then **Save connection**.

Resulting values:

| Field | Value |
| ----- | ----- |
| Base URL | `https://api.eia.gov/v2` |
| Auth | API key in the query string |
| Query parameter name | `api_key` |
| Example path | `/electricity/retail-sales/data/?length=5` |
| `rowsPath` | `response.data` |

Other useful EIA routes, all relative to the same base URL:

| Route | What it returns |
| ----- | --------------- |
| `/electricity/retail-sales/data/?length=5` | Monthly retail sales rows |
| `/electricity/retail-sales/` | Series metadata and available facets |
| `/electricity/retail-sales/facet/stateid/` | Valid `stateid` values |
| `/seriesid/ELEC.SALES.CO-RES.A` | A single legacy v1 series |

EIA caps JSON responses at 5,000 rows per request and returns a `warnings` entry when a query
exceeds that; constrain requests with `start`, `end`, `length`, or `offset`.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- Recharts, Zod
- `@xyflow/react` for the idea graph mode

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

Demo data: a **JSONPlaceholder** connection, dataset, and sample report are seeded on first API access.

## Cloud Agent environment

Cursor Cloud Agents can bootstrap from [`.cursor/environment.json`](.cursor/environment.json) in this repo:

| Phase | Command |
| ----- | ------- |
| **install** | `npm ci` |
| **start** | `bash .cursor/start-dev.sh` (runs `npm run dev` on port **43127**, waits until HTTP responds) |

After linking a new Project or environment to **GraphCafe/app**, trigger an environment build so `install` is baked into the snapshot; each agent boot runs `start` and serves the app at [http://127.0.0.1:43127](http://127.0.0.1:43127).

**Secrets** (add under Cloud Agents → Environment → Secrets, not in committed config):

| Secret | Required | Purpose |
| ------ | -------- | ------- |
| `GRAPH_CAFE_SECRET_KEY` or `GRAPH_CAFE_ENCRYPTION_KEY` | Recommended | Encrypt stored API credentials (dev default if unset) |
| `GITHUB_TOKEN` | Optional | PAT with `repo` scope so agents can push branches and open PRs |

## Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `GRAPH_CAFE_SECRET_KEY` | Recommended in production | AES key material for encrypting stored API credentials (falls back to a dev default) |
| `GRAPH_CAFE_ENCRYPTION_KEY` | Alias | Same as `GRAPH_CAFE_SECRET_KEY` |
| `GH_TOKEN` or `GITHUB_TOKEN` | For CI / agent pushes | GitHub PAT with `repo` scope to push and open PRs |
| `GITHUB_REPOSITORY` | Optional | `owner/repo` target when not inferred from git remote |

Local connection data lives under `.data/graph-cafe/` (gitignored).

## API (server)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` / `POST` | `/api/connections` | List / create connections |
| `GET` / `PATCH` / `DELETE` | `/api/connections/[id]` | Connection CRUD |
| `POST` | `/api/connections/test` | Ephemeral test (no save) |
| `POST` | `/api/connections/discover` | Probe a URL and suggest auth, base URL, path, `rowsPath` |
| `GET` / `POST` | `/api/datasets` | List / create datasets |
| `GET` / `PATCH` | `/api/datasets/[id]` | Dataset read / update |
| `POST` | `/api/datasets/[id]/execute` | Proxy execute + inferred table |
| `GET` | `/api/reports` | List reports (seeds demo) |
| `GET` | `/api/reports/[id]` | Report definition |

`POST /api/connections/discover` body:

```jsonc
{
  "url": "https://api.eia.gov/v2/electricity/retail-sales/data/?length=5",
  "auth": "apiKeyQuery",     // optional; omit to let the probe discover it
  "apiKeyQueryParam": "api_key",
  "secret": "…",             // used for this probe only, never persisted or echoed back
  "baseUrl": "https://api.eia.gov/v2"  // optional, when base and path are already known
}
```

It responds with `suggested` (ready-to-use connection values), `authHints` (ranked schemes with
a reason), `rowPaths` (candidate `rowsPath` values), `columns`, `rowCount`, `sample`, and
`warnings`. Credentials in the probed URL are redacted as `YOUR_API_KEY`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Dev server on port **43127** |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
