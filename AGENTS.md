<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Run `npm ci`, then `npm run dev`. The app listens on port **43127**. Open **http://localhost:43127**. Next.js 16 blocks dev assets and the hot-reload socket when the browser uses `127.0.0.1` instead of `localhost`.
- `npm run build` succeeds. `npx tsc --noEmit` needs the types that build generates (`next-env.d.ts`, gitignored). `npm run lint` currently reports existing `react-hooks/set-state-in-effect` errors in the graph and report studios. There is no automated test suite.
- The JSONPlaceholder demo connection, dataset, and report are created on the first `GET /api/reports`. Stored data is under `.data/graph-cafe/` (gitignored). The demo needs no API secret; `GRAPH_CAFE_SECRET_KEY` is optional and falls back to a dev key.
