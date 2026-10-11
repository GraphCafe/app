# Graph.Cafe

Bring your own HTTP API—connect on the server, explore JSON as tables, and save a small report with charts. Café branding optional; keeping secrets out of the browser bundle is not.

## Repository

Canonical source: **[github.com/GraphCafe/app](https://github.com/GraphCafe/app)**.

Cloud Agent pushes use a GitHub PAT in **`GITHUB_TOKEN`** (preferred) or **`GH_TOKEN`**, with `repo` scope. If pushes fail from a Project worker, add the same secret under **Project → Environment secrets** (account-level secrets are not always injected on worker VMs).

## Phase A (shipped)

- **BYO connection proxy** — encrypted server-side credential storage, SSRF guards on outbound requests
- **Connections UI** — new pour (name, base URL, bearer / API key header / basic auth), test GET with status + JSON preview
- **Datasets + Explore** — named GET templates, `rowsPath` for tabular inference, raw JSON + table preview
- **Report Studio** — sample report with table + Recharts chart (`graphCafe.report.v1`)
- **Idea graph** — original React Flow canvas at `/graph`

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
| `GET` / `POST` | `/api/datasets` | List / create datasets |
| `GET` / `PATCH` | `/api/datasets/[id]` | Dataset read / update |
| `POST` | `/api/datasets/[id]/execute` | Proxy execute + inferred table |
| `GET` | `/api/reports` | List reports (seeds demo) |
| `GET` | `/api/reports/[id]` | Report definition |

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Dev server on port **43127** |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
