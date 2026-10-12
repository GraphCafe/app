# Deploy Graph.Cafe on Fly.io

The app runs as a Next.js **standalone** Node server in Docker, with JSON persistence on a Fly **volume** at `/data` (`GRAPH_CAFE_DATA_DIR`).

## What you do (one-time)

Install the CLI if needed: [fly.io/docs/flyctl/install](https://fly.io/docs/flyctl/install/)

1. **Log in** (you already have an account):

   ```bash
   fly auth login
   ```

2. **From the repo root**, create the app (skip if it already exists):

   ```bash
   fly apps create graph-cafe
   ```

   If `graph-cafe` is taken, pick another name and set the same value for `app` in `fly.toml`.

3. **Create a volume** in the same region as `primary_region` in `fly.toml` (default `iad`):

   ```bash
   fly volumes create graph_cafe_data --region iad --size 1
   ```

   Fly may warn about creating two volumes for HA. For this app (single JSON data directory), **one volume is correct** — answer `y` to continue.

4. **Set the encryption secret** (required in production; do not reuse the dev default):

   ```bash
   fly secrets set GRAPH_CAFE_SECRET_KEY="paste-a-long-random-string"
   ```

   On macOS/Linux you can generate one with `openssl rand -base64 32`.

5. **Deploy**:

   ```bash
   fly deploy
   ```

6. **Smoke test** the default hostname:

   ```bash
   fly open
   ```

7. **Custom domain** (`graph.cafe`):

   ```bash
   fly certs add graph.cafe
   fly certs add www.graph.cafe
   ```

   In **Cloudflare DNS** for `graph.cafe`:

   | Type  | Name | Target              | Proxy        |
   |-------|------|---------------------|--------------|
   | CNAME | `@`  | `graph-cafe.fly.dev` | DNS only (*) |
   | CNAME | `www`| `graph-cafe.fly.dev` | DNS only (*) |

   Replace `graph-cafe.fly.dev` with your app’s `.fly.dev` host if you renamed the app.

   (\*) For the first certificate issuance, use **DNS only** (grey cloud) until `fly certs check graph.cafe` shows ready. Then you can turn the orange-cloud proxy back on with SSL mode **Full (strict)**.

## What stays in the repo

- `Dockerfile` — multi-stage build, standalone output
- `fly.toml` — HTTP on 3000, health check on `/`, volume mount
- `GRAPH_CAFE_DATA_DIR=/data` — connections, datasets, and reports persist on the volume

## Operations

| Task | Command |
|------|---------|
| Logs | `fly logs` |
| SSH | `fly ssh console` |
| Secrets | `fly secrets list` |
| Redeploy after git push | `fly deploy` |

**Scaling:** keep **one machine** while using the file store. A Fly volume attaches to a single instance.

**Backups:** copy `.data` from the volume occasionally, e.g. `fly ssh sftp get /data -r ./backup-graph-cafe-data`.

## Troubleshooting

**`failed to spawn command: /docker-entrypoint.sh: No such file or directory`**

Usually Windows **CRLF** line endings in a shell entrypoint script. The Dockerfile now starts the server via an inline `CMD` instead. Redeploy from an up-to-date repo:

```bash
fly deploy
```

If the machine is still crash-looping on an old image, `fly deploy` replaces it once the build succeeds.

## Local Docker check (optional)

```bash
docker build -t graph-cafe .
docker run --rm -p 3000:3000 -e GRAPH_CAFE_SECRET_KEY=test -e GRAPH_CAFE_DATA_DIR=/tmp/data graph-cafe
```

Open http://localhost:3000
