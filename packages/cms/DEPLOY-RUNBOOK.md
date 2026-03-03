# CMS Production Deploy Runbook

This document covers deploying the SonicJS CMS backend (`my-astro-cms`) to Cloudflare Workers production.

Worker name: `my-sonicjs-app-production`
Expected URL: `https://my-sonicjs-app-production.workers.dev`

---

## Pre-Deploy Checklist

Before any deploy (first-time or subsequent), verify:

- [ ] All code changes committed and the working tree is clean
- [ ] Fork rebuilt if sonicjs-fork was modified: `cd /home/jaime/www/_github/sonicjs/sonicjs-fork && PATH="$(pwd)/node_modules/.bin:$PATH" pnpm build`
- [ ] CMS dependency refreshed: `cd /home/jaime/www/_github/sonicjs/my-astro-cms && pnpm install`
- [ ] `CORS_ORIGINS` in `[env.production]` of `wrangler.toml` is set to the actual Pages URL (not placeholder)

---

## First-Time Deploy

Run these steps **in order** from the `my-astro-cms/` directory unless noted.

### Step 1 — Create the Astro Pages project (to get CORS URL)

```bash
cd /home/jaime/www/_github/sonicjs/my-astro-site
wrangler pages project create my-astro-site
```
Note the `*.pages.dev` URL assigned (e.g. `my-astro-site-abc.pages.dev`).

### Step 2 — Update CORS_ORIGINS with real Pages URL

If the Pages URL differs from `my-astro-site.pages.dev`, edit `my-astro-cms/wrangler.toml`:

```toml
[env.production]
vars = { ENVIRONMENT = "production", CORS_ORIGINS = "https://YOUR-PAGES-URL.pages.dev", WEBHOOK_URLS = "", WEBHOOK_SECRET = "" }
```

### Step 3 — Apply D1 migrations to production

```bash
cd /home/jaime/www/_github/sonicjs/my-astro-cms
wrangler d1 migrations apply DB --remote --env production
```

This runs all pending migrations from `./node_modules/@sonicjs-cms/core/migrations` against the production D1 database (`my-astro-cms-db`, ID: `a2fe8bde-3cb8-4c0b-8a66-a996c482e5a3`).

### Step 4 — Set JWT_SECRET production secret

```bash
wrangler secret put JWT_SECRET --env production
```

When prompted, enter a strong random value. **Do NOT use the dev default** (`sonicjs!`). Generate one with:

```bash
openssl rand -base64 32
```

### Step 5 — (Optional) Set WEBHOOK_SECRET

Only needed if you plan to use signed webhooks in production:

```bash
wrangler secret put WEBHOOK_SECRET --env production
```

### Step 6 — Build and deploy CMS

From `my-astro-cms/`:

```bash
WRONG COMMAND:
PATH="$(pwd)/../sonicjs-fork/node_modules/.bin:$PATH" pnpm build && wrangler deploy --env production

RIGHT COMMAND:
wrangler deploy --env production
```

Note: The PATH prefix ensures `tsup` is found during the pnpm build step. The fork's `node_modules/.bin` must be on PATH.

### Step 7 — Verify health check

```bash
curl https://my-sonicjs-app-production.workers.dev/api/system/health
```

Expected response: `{"status":"healthy",...}` — look for `"status":"healthy"` in the JSON.

If the response shows `"status":"degraded"`, check the individual service statuses in the JSON body.

### Step 8 — Verify admin UI

Visit in browser: `https://my-sonicjs-app-production.workers.dev/admin`

The SonicJS admin dashboard should load. Default login: admin / sonicjs!
**Change the admin password immediately after first login.**

### Step 9 — (Optional) Seed admin user via D1

If the admin user was not seeded by migrations:

```bash
wrangler d1 execute DB --remote --env production --command "INSERT INTO users (id, email, password, role, created_at, updated_at) VALUES ('admin-prod-001', 'admin@yourdomain.com', '\$2a\$10\$HASHED_PASSWORD', 'admin', unixepoch('now') * 1000, unixepoch('now') * 1000);"
```

Use bcrypt to hash the password before inserting.

---

## Subsequent Deploys

For routine code updates (no schema changes):

```bash
cd /home/jaime/www/_github/sonicjs

# 1. Rebuild fork if changed (skip if only my-astro-cms changed)
cd sonicjs-fork && PATH="$(pwd)/node_modules/.bin:$PATH" pnpm build && cd ..

# 2. Refresh CMS dependency
cd my-astro-cms && pnpm install

# 3. Check for pending migrations
wrangler d1 migrations list DB --remote --env production

# 4. Apply if any pending
wrangler d1 migrations apply DB --remote --env production

# 5. Build and deploy
PATH="$(pwd)/../sonicjs-fork/node_modules/.bin:$PATH" pnpm build && wrangler deploy --env production

# 6. Verify health
curl https://my-sonicjs-app-production.workers.dev/api/system/health
```

---

## Rollback

### Code rollback (Workers only)

Reverts the Worker code to the previous deployment. Does NOT affect D1 schema.

```bash
cd /home/jaime/www/_github/sonicjs/my-astro-cms
wrangler rollback --env production
```

### Schema rollback

Wrangler D1 does not support automatic schema rollback. If a migration caused the issue:

1. Identify the offending migration file in `./node_modules/@sonicjs-cms/core/migrations/`
2. Write a compensating SQL statement (e.g., `DROP COLUMN`, `DROP TABLE`, `ALTER TABLE`)
3. Execute it manually:
   ```bash
   wrangler d1 execute DB --remote --env production --command "YOUR COMPENSATING SQL HERE"
   ```

Always test compensating SQL against staging first.

---

## Secrets Reference

| Secret | Required | Purpose | How to set |
|--------|----------|---------|-----------|
| `JWT_SECRET` | Yes | Signs JWT auth tokens | `wrangler secret put JWT_SECRET --env production` |
| `WEBHOOK_SECRET` | No | HMAC-SHA256 signatures on outgoing webhooks | `wrangler secret put WEBHOOK_SECRET --env production` |

Secrets are encrypted at rest in Cloudflare and never appear in `wrangler.toml` or logs.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 500 errors on content endpoints after deploy | Migrations not applied | `wrangler d1 migrations apply DB --remote --env production` |
| CORS errors in browser console | `CORS_ORIGINS` in `[env.production]` doesn't match frontend URL | Update `wrangler.toml` and redeploy |
| `tsup: command not found` during build | PATH missing sonicjs-fork node_modules | Prefix command with `PATH="$(pwd)/../sonicjs-fork/node_modules/.bin:$PATH"` |
| Health check returns `"status":"degraded"` | Specific service failing | Check service statuses in health check JSON response |
| Admin login rejected | JWT_SECRET mismatch between deploys | Re-set `JWT_SECRET` secret: `wrangler secret put JWT_SECRET --env production` |
| Worker not found after deploy | Wrong `--env` flag | Ensure `--env production` is passed to all wrangler commands |
| `Error: Missing script: build` | Wrong directory | Must run from `my-astro-cms/`, not the repo root |

---

## Useful Wrangler Commands

```bash
# List all deployments
wrangler deployments list --env production

# View recent logs
wrangler tail --env production

# Check which secrets are set (values not shown)
wrangler secret list --env production

# Query production D1 directly
wrangler d1 execute DB --remote --env production --command "SELECT id, email, role FROM users;"

# List pending migrations
wrangler d1 migrations list DB --remote --env production
```
