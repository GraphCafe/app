# User accounts (Graph.Cafe)

Graph.Cafe stores **connections, encrypted credentials, datasets, and reports per signed-in user** on the server. The browser never receives API keys or OAuth tokens in report documents.

## Sign up and sign in

- **Register:** `POST /api/auth/register` with `{ email, password }` (password ≥ 8 characters), or use **Create account** in the app (`/register`).
- **Login:** `POST /api/auth/login` with the same shape, or **Sign in** (`/login`).
- **Session:** HTTP-only cookie `graph-cafe-session` (30 days, `SameSite=Lax`).
- **Current user:** `GET /api/auth/me` → `{ user }` or `401`.
- **Logout:** `POST /api/auth/logout`.

All connection, dataset, report, discovery, execute, and OAuth routes require a valid session (`401` otherwise).

## Data on disk

| File | Purpose |
|------|---------|
| `users.json` | Account records (scrypt password hashes) |
| `user-sessions.json` | Session ids → user ids |
| `connections.json`, `secrets.json`, … | Same as before, now scoped by `userId` on each resource |

Default directory: `.data/graph-cafe/` locally, or `GRAPH_CAFE_DATA_DIR` (e.g. `/data` on Fly).

## Legacy data (before accounts)

If you created connections **before** accounts shipped, those JSON rows may have no `userId`. When **exactly one** user is registered, the first authenticated request **claims** orphan connections, datasets, and reports for that user so existing pours keep working.

With multiple users, orphans are not auto-assigned (avoid cross-tenant leaks).

## Production checklist

1. **Persistent volume** for `GRAPH_CAFE_DATA_DIR` — without it, every deploy wipes accounts and secrets ([Deploy on Fly](./DEPLOY-FLY.md)).
2. **Stable `GRAPH_CAFE_SECRET_KEY`** — rotating it without re-entering credentials leaves old `secrets.json` entries undecryptable (`tryDecryptSecret` treats them as missing).
3. **HTTPS** — session cookies use `Secure` in production.

## Security notes

This is a **single-tenant-friendly, multi-user** model: all accounts share one app instance and one data directory. Suitable for a team deployment or commercial hosted instance; not isolated multi-tenant SaaS without further hardening (rate limits, admin roles, etc.).
