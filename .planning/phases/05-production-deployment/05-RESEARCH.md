# Phase 5: Production Deployment - Research

**Researched:** 2026-03-02
**Domain:** Cloudflare Workers production deploy, Cloudflare Pages, D1 remote migrations, wrangler environments, Workers Logs structured observability
**Confidence:** HIGH

## Summary

Phase 5 deploys the SonicJS CMS backend to Cloudflare Workers production and the Astro frontend to Cloudflare Pages, establishes per-client provisioning via wrangler environment sections, and adds structured observability via Workers Logs. All decisions are locked from CONTEXT.md — research focused on verifying exact command syntax, known pitfalls, and implementation patterns.

The standard approach is entirely wrangler-CLI-driven: `wrangler deploy --env production` for the Workers CMS, `wrangler pages deploy ./dist` for the Astro frontend, `wrangler d1 migrations apply DB --remote --env production` for schema migrations before each deploy, and `wrangler secret put KEY --env production` for secrets. Observability is already partially wired (`observability.enabled = true` is in both wrangler configs) — the remaining work is building the structured logger utility and adding log calls to auth/mutation events.

The biggest risk in this phase is the accumulated migration debt: multiple migrations were applied locally in Phases 2-4 but never applied `--remote`. These must be applied before the production Worker is useful. A pre-deploy checklist covering this is critical.

**Primary recommendation:** Apply all pending remote migrations first, set production secrets (JWT_SECRET, WEBHOOK_SECRET) before deploying the Worker, then deploy CMS, then Pages frontend. Build the provisioning script before attempting any new client environments.

## Standard Stack

### Core Tools
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| wrangler CLI | 4.52.1 (project) | Deploy Workers, manage D1/R2/KV | The only way to deploy Cloudflare resources from CLI |
| wrangler pages | included | Deploy Cloudflare Pages | Built into wrangler since v3 |
| @astrojs/cloudflare | 12.6.12 (project) | Astro SSR adapter for Pages/Workers | Official adapter, already installed |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `wrangler d1 migrations apply` | wrangler 4.x | Apply SQL migrations to remote D1 | Before every production deploy that changes schema |
| `wrangler secret put` | wrangler 4.x | Set encrypted secrets per environment | JWT_SECRET, WEBHOOK_SECRET, any sensitive config |
| `wrangler rollback` | wrangler 4.x (beta) | Instant revert to prior Worker version | If deploy breaks production |
| `wrangler tail` | wrangler 4.x | Real-time log streaming from production | Debugging live issues |

### No Additional Dependencies Needed
- Workers Logs: enabled via wrangler.toml `[observability] enabled = true` — already set
- Structured logging: use `console.log({ key: value })` — no library needed
- Per-client env: wrangler.toml `[env.client-name]` sections — already the pattern in use

**Installation:** No new packages needed. All tools are available via existing wrangler 4.52.1 install.

## Architecture Patterns

### Recommended Project Structure for Per-Client Environments

```
my-astro-cms/
├── wrangler.toml            # Root config + [env.production] + [env.clientname]
├── src/
│   ├── index.ts             # Worker entry, fetch + scheduled handlers
│   ├── middleware/
│   │   └── validate-bindings.ts   # Already exists — checks DB, MEDIA_BUCKET, JWT_SECRET
│   └── lib/
│       └── logger.ts        # NEW: structured logger utility
├── scripts/
│   ├── seed-admin.ts        # Exists: creates admin user locally
│   └── provision-client.sh  # NEW: creates D1/R2/KV and prints wrangler.toml snippet
```

### Pattern 1: Wrangler Environment Sections for Per-Client Isolation

**What:** Each client gets a `[env.client-name]` section in wrangler.toml with its own D1/R2/KV bindings pointing to separate Cloudflare resources.

**When to use:** Every time a new client is onboarded. Bindings are non-inheritable — they MUST be fully specified in each env section; they do NOT inherit from the root.

**Example:**
```toml
# Source: https://developers.cloudflare.com/workers/wrangler/environments/
# Root (development default)
name = "my-sonicjs-app"
[vars]
ENVIRONMENT = "development"
CORS_ORIGINS = "http://localhost:4321"

# Production (first instance)
[env.production]
name = "my-sonicjs-app-production"
vars = { ENVIRONMENT = "production", CORS_ORIGINS = "https://my-sonicjs-app-production.workers.dev" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db-production"
database_id = "PRODUCTION-UUID-HERE"

[[env.production.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media-production"

[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "PRODUCTION-KV-ID-HERE"

# Per-client (e.g., 915website)
[env.915website]
name = "my-sonicjs-app-915website"
vars = { ENVIRONMENT = "production", CORS_ORIGINS = "https://my-sonicjs-app-915website.workers.dev" }

[[env.915website.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db-915website"
database_id = "CLIENT-UUID-HERE"

[[env.915website.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media-915website"

[[env.915website.kv_namespaces]]
binding = "CACHE_KV"
id = "CLIENT-KV-ID-HERE"
```

**Deploy command:**
```bash
# Deploy to production
wrangler deploy --env production

# Deploy to specific client
wrangler deploy --env 915website
```

### Pattern 2: D1 Migrations — Remote Apply Before Deploy

**What:** All schema changes must be applied to the remote D1 database BEFORE deploying new Worker code that depends on those schema changes.

**When to use:** Every deploy that includes schema changes. Currently there are accumulated pending migrations from Phases 2-4.

**Commands:**
```bash
# Source: https://developers.cloudflare.com/d1/wrangler-commands/

# Apply all pending migrations to production remote D1
wrangler d1 migrations apply DB --remote --env production

# Apply to specific client environment
wrangler d1 migrations apply DB --remote --env 915website

# Verify which migrations are pending
wrangler d1 migrations list DB --remote --env production
```

**Critical note:** The D1 binding name `DB` refers to the environment-specific database (from the `[[env.production.d1_databases]]` section). D1 will not auto-rollback failed migrations in all cases — test on staging first.

### Pattern 3: Secrets Per Environment

**What:** Secrets (JWT_SECRET, WEBHOOK_SECRET) are set separately per environment and are non-inheritable.

**Commands:**
```bash
# Source: https://developers.cloudflare.com/workers/configuration/secrets/

# Set JWT_SECRET for production
wrangler secret put JWT_SECRET --env production
# (prompts for value interactively)

# Set for client environment
wrangler secret put JWT_SECRET --env 915website

# WEBHOOK_SECRET is optional but recommended
wrangler secret put WEBHOOK_SECRET --env production
```

**Important:** `wrangler secret put` creates a new Worker version and deploys it immediately. For production, prefer setting secrets BEFORE the initial deploy, not after — combine with the full deploy command.

### Pattern 4: Workers Logs Structured Logging

**What:** Pass plain objects to `console.log()` — Workers Logs automatically indexes the JSON fields for filtering and querying.

**Source:** https://developers.cloudflare.com/workers/observability/logs/workers-logs/

**Logger utility pattern (for `src/lib/logger.ts`):**
```typescript
// Lightweight structured logger — no dependencies, pure console calls
// Workers Logs indexes object fields automatically

type LogLevel = 'info' | 'warn' | 'error'

interface LogEvent {
  level: LogLevel
  event: string
  [key: string]: unknown
}

export const log = {
  info(event: string, fields: Record<string, unknown> = {}): void {
    console.log({ level: 'info', event, ...fields })
  },
  warn(event: string, fields: Record<string, unknown> = {}): void {
    console.warn({ level: 'warn', event, ...fields })
  },
  error(event: string, fields: Record<string, unknown> = {}): void {
    console.error({ level: 'error', event, ...fields })
  },
}

// Usage examples:
// log.info('auth.login', { userId, email, ip: c.req.header('CF-Connecting-IP') })
// log.warn('auth.login_failed', { email, reason: 'invalid_password' })
// log.error('content.publish_failed', { contentId, error: e.message })
```

**Auth events to instrument:**
- `auth.login` — successful login (userId, email)
- `auth.login_failed` — failed login attempt (email, reason)
- `auth.logout` — logout (userId)
- `auth.permission_denied` — access denied (userId, resource, action)
- `content.created` / `content.updated` / `content.deleted` / `content.published` — mutations (contentId, collectionId, userId)

### Pattern 5: Enhanced Health Check Response

**What:** `/api/health` returns structured status for each dependency (D1, R2, KV) for uptime monitoring.

**Format (JSON):**
```typescript
// Health check verifies each binding is reachable with a lightweight probe
// D1: SELECT 1 query; R2: list objects limit 1; KV: get a known key

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error'
  timestamp: number
  version: string
  services: {
    db: 'ok' | 'error'
    storage: 'ok' | 'error'
    cache: 'ok' | 'unavailable'  // KV is optional
  }
}
```

### Pattern 6: Cloudflare Pages Deploy for Astro SSR

**What:** Build Astro with `astro build`, then deploy `./dist` to Cloudflare Pages.

**Source:** https://docs.astro.build/en/guides/deploy/cloudflare/

**Commands (run from `my-astro-site/`):**
```bash
# First-time only: create Pages project
wrangler pages project create my-astro-site
# (prompts: project name, production branch name)

# Build and deploy
npm run build && wrangler pages deploy ./dist

# Deploy to preview
wrangler pages deploy ./dist --branch=preview
```

**wrangler.jsonc already configured** with `"pages_build_output_dir": "./dist"` — the `wrangler.jsonc` in `my-astro-site/` is already set up correctly. The `assets` binding and `observability.enabled = true` are already in place.

### Pattern 7: Provisioning Script for New Clients

**What:** Shell or Node script that creates D1/R2/KV resources and outputs the wrangler.toml snippet to paste in.

**Language decision:** Bash — simpler, no dependencies, runs with wrangler in PATH.

**Script flow:**
```bash
#!/bin/bash
# provision-client.sh <client-name>
# Creates: D1 database, R2 bucket, KV namespace
# Outputs: wrangler.toml [env.client-name] snippet to paste in

CLIENT_NAME="$1"
DB_NAME="my-astro-cms-db-${CLIENT_NAME}"
BUCKET_NAME="my-astro-cms-media-${CLIENT_NAME}"
KV_TITLE="my-astro-cms-cache-${CLIENT_NAME}"

echo "Creating D1 database: $DB_NAME"
DB_OUTPUT=$(wrangler d1 create "$DB_NAME" 2>&1)
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id\s*=\s*"\K[^"]+')

echo "Creating R2 bucket: $BUCKET_NAME"
wrangler r2 bucket create "$BUCKET_NAME"

echo "Creating KV namespace: $KV_TITLE"
KV_OUTPUT=$(wrangler kv namespace create "$KV_TITLE" 2>&1)
KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id\s*=\s*"\K[^"]+')

echo ""
echo "=== Add this to wrangler.toml ==="
cat << EOF
[env.${CLIENT_NAME}]
name = "my-sonicjs-app-${CLIENT_NAME}"
vars = { ENVIRONMENT = "production", CORS_ORIGINS = "https://my-sonicjs-app-${CLIENT_NAME}.workers.dev", WEBHOOK_URLS = "", WEBHOOK_SECRET = "" }

[[env.${CLIENT_NAME}.d1_databases]]
binding = "DB"
database_name = "${DB_NAME}"
database_id = "${DB_ID}"

[[env.${CLIENT_NAME}.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "${BUCKET_NAME}"

[[env.${CLIENT_NAME}.kv_namespaces]]
binding = "CACHE_KV"
id = "${KV_ID}"
EOF

echo ""
echo "=== Next steps ==="
echo "1. Paste above config into wrangler.toml"
echo "2. wrangler d1 migrations apply DB --remote --env ${CLIENT_NAME}"
echo "3. wrangler secret put JWT_SECRET --env ${CLIENT_NAME}"
echo "4. wrangler deploy --env ${CLIENT_NAME}"
```

### Anti-Patterns to Avoid

- **Deploying before migrations:** Never run `wrangler deploy` before `wrangler d1 migrations apply --remote`. The Worker expects schema columns that won't exist yet.
- **Assuming vars inherit:** `[vars]` at the root level do NOT inherit into `[env.X]` sections. Every env section needs its own `vars = { ... }` block.
- **Setting JWT_SECRET as a var:** Never put secrets in `wrangler.toml` vars — use `wrangler secret put`. Vars appear in plaintext in wrangler.toml.
- **Using string 'null' in FK columns:** Production D1 inserts must use SQL NULL not the string `'null'` — existing CLAUDE.md warning applies to production too.
- **Skipping the cron handler in deploy:** The Worker uses `fetch` + `scheduled` exports. `wrangler deploy` handles both — no special flags needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log storage/aggregation | Custom log forwarder | Workers Logs built-in | Already enabled, zero config, 7-day retention |
| Rollback mechanism | Git-based re-deploy | `wrangler rollback` | Instant, no rebuild required, reverts to previous upload |
| Secret rotation | Manual env var updates | `wrangler secret put` | Atomic, encrypted, per-environment, no redeploy needed for secrets |
| Health check HTTP client | curl polling from cron | `/api/health` endpoint | Self-reporting is more accurate than external polling |
| Provisioning UI | Admin dashboard | Bash script + wrangler CLI | Simple, auditable, no dependencies |

**Key insight:** The entire Cloudflare ecosystem is managed via wrangler CLI. Don't add complexity (CI/CD, deployment scripts, custom tooling) when the CLI covers all v1 requirements.

## Common Pitfalls

### Pitfall 1: Migration Debt Will Block the Production Worker

**What goes wrong:** The production D1 database is a fresh database from Phase 0. Phases 2-4 added local migrations that were never applied `--remote`. The production Worker will crash immediately because columns like `action_type`, `changed_fields` (workflow_history), `token_hash` (api_tokens), and permission columns don't exist.

**Why it happens:** Local wrangler dev uses a local SQLite copy — remote D1 is never touched by `wrangler dev`. Migrations applied with `--local` or without any flag only affect the local copy.

**How to avoid:**
1. Run `wrangler d1 migrations list DB --remote --env production` to see exactly which are pending
2. Apply ALL pending before deploying: `wrangler d1 migrations apply DB --remote --env production`
3. Verify with a count check: `wrangler d1 execute DB --remote --env production --command "SELECT COUNT(*) FROM workflow_history"`

**Warning signs:** Worker returns 500 on any content endpoint immediately after deploy.

### Pitfall 2: CORS_ORIGINS Placeholder Blocks the Frontend

**What goes wrong:** `wrangler.toml` has `CORS_ORIGINS = "https://your-production-domain.com"` in `[env.production]`. If deployed as-is, the Astro frontend (on `*.pages.dev`) will get CORS errors on every API call.

**Why it happens:** This was explicitly flagged in STATE.md as a pending TODO. The value is a placeholder that was never updated.

**How to avoid:** Before deploying, determine the actual Pages URL (`my-astro-site.pages.dev`) and update `[env.production]` vars with it. For initial deploy with defaults (`*.workers.dev` + `*.pages.dev`), use:
```toml
[env.production]
vars = { ENVIRONMENT = "production", CORS_ORIGINS = "https://my-astro-site.pages.dev" }
```

**Warning signs:** Browser console shows CORS errors; network tab shows OPTIONS requests returning 403 or missing Access-Control-Allow-Origin headers.

### Pitfall 3: pnpm Build PATH Issue

**What goes wrong:** `pnpm build` in `my-astro-cms/` fails because `tsup` is not in PATH — it's installed in `sonicjs-fork/node_modules/.bin/`.

**Why it happens:** The CMS package's `dependencies` points to `file:../sonicjs-fork/packages/core` — tsup is a devDependency of the fork, not the CMS app itself.

**How to avoid:** The build command needs to resolve tsup from the fork's node_modules:
```bash
PATH="$(pwd)/../sonicjs-fork/node_modules/.bin:$PATH" pnpm build
```
Or add this to `package.json` scripts. This was documented in STATE.md from Phase 2.

**Warning signs:** `sh: tsup: command not found` during build.

### Pitfall 4: `wrangler secret put` Triggers an Immediate Deploy

**What goes wrong:** Running `wrangler secret put JWT_SECRET --env production` after the initial deploy creates a new deployment. If run before migrations are applied, this could deploy a broken version.

**Why it happens:** Wrangler creates a new Worker version whenever secrets change.

**How to avoid:** Set all secrets BEFORE the first `wrangler deploy`. If secrets need to change post-deploy, ensure migrations are already applied (they aren't affected by the secret deploy).

**Warning signs:** Production Worker was working, then breaks after `wrangler secret put`.

### Pitfall 5: wrangler rollback Doesn't Revert D1 Schema

**What goes wrong:** Rolling back the Worker via `wrangler rollback` reverts code but NOT D1 schema. If a migration was already applied, the old Worker code may fail because it doesn't know about new columns or vice versa.

**Why it happens:** D1 is an independent resource — rollback only reverts the Worker bundle.

**How to avoid:** Keep migrations backward-compatible where possible. Document which Worker version requires which migration level. For emergency rollback, the old code should still work with the new schema (additive migrations only).

**Warning signs:** Worker rollback completes but endpoints still return errors.

### Pitfall 6: KV namespace create vs namespace title

**What goes wrong:** `wrangler kv namespace create MY_KV` — the argument is treated as a **binding name** suffix, not the namespace title. The actual namespace title becomes `<worker-name>-MY_KV`.

**Why it happens:** Wrangler uses the Worker name + your argument as the title. The ID output is what goes in wrangler.toml.

**How to avoid:** Always capture the ID from `wrangler kv namespace create` output and paste it into wrangler.toml. Don't assume the namespace name matches what you typed.

### Pitfall 7: Astro Pages Project Must Exist Before First Deploy

**What goes wrong:** `wrangler pages deploy ./dist` fails with "project not found" on first run.

**Why it happens:** The Pages project (the container that holds deployments) doesn't auto-create.

**How to avoid:** Run `wrangler pages project create my-astro-site` once before the first deploy. This is interactive (prompts for project name and production branch). Subsequent deploys with `wrangler pages deploy ./dist` work without this step.

## Code Examples

Verified patterns from official sources:

### Deploy CMS to Production
```bash
# Source: https://developers.cloudflare.com/workers/wrangler/environments/

# 1. Apply pending remote migrations first
wrangler d1 migrations apply DB --remote --env production

# 2. Set secrets (interactive prompt for value)
wrangler secret put JWT_SECRET --env production

# 3. Deploy Worker
wrangler deploy --env production

# 4. Verify health
curl https://my-sonicjs-app-production.workers.dev/api/health
```

### Deploy Astro Frontend to Cloudflare Pages
```bash
# Source: https://docs.astro.build/en/guides/deploy/cloudflare/
# Run from my-astro-site/

# First time only
wrangler pages project create my-astro-site

# Every deploy
npm run build && wrangler pages deploy ./dist
```

### Apply Migrations to Per-Client Remote D1
```bash
# Source: https://developers.cloudflare.com/d1/wrangler-commands/

wrangler d1 migrations apply DB --remote --env 915website
wrangler secret put JWT_SECRET --env 915website
wrangler deploy --env 915website
```

### Provision New Client Resources
```bash
# Create D1 database for client
wrangler d1 create my-astro-cms-db-clientname

# Create R2 bucket
wrangler r2 bucket create my-astro-cms-media-clientname

# Create KV namespace (title becomes "my-sonicjs-app-CACHE_KV_clientname")
wrangler kv namespace create CACHE_KV_clientname

# Then: paste output IDs into wrangler.toml [env.clientname] section
```

### Structured Logger Usage (after building logger.ts)
```typescript
// Source: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
// Workers Logs indexes object fields automatically for filtering

import { log } from '../lib/logger'

// In auth route handler:
log.info('auth.login', {
  userId: user.id,
  email: user.email,
  ip: c.req.header('CF-Connecting-IP'),
})

log.warn('auth.login_failed', {
  email: body.email,
  reason: 'invalid_password',
  ip: c.req.header('CF-Connecting-IP'),
})

// In content mutation handlers:
log.info('content.published', {
  contentId: content.id,
  collectionId: content.collection_id,
  userId: user.id,
  title: content.title,
})
```

### Rollback Production Worker
```bash
# Source: https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/

# Roll back to immediately prior version (interactive confirmation)
wrangler rollback --env production

# Roll back to specific version by ID
wrangler rollback <DEPLOYMENT_ID> --env production
```

### Real-Time Log Tail
```bash
# Stream logs from production Worker
wrangler tail --env production

# Filter to errors only
wrangler tail --env production --format pretty
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `wrangler kv:namespace create` | `wrangler kv namespace create` | Wrangler 3.60.0 | Use new syntax — old colon syntax deprecated |
| Separate `wrangler publish` command | `wrangler deploy` | Wrangler v3 | `publish` is an alias for `deploy` now |
| Pages deploy via dashboard only | `wrangler pages deploy` | Wrangler v3 | CLI deploy now first-class |
| Log via external services | Workers Logs built-in | 2024 GA | No third-party needed for basic observability |

**Deprecated/outdated:**
- `wrangler publish`: Works as alias but use `wrangler deploy` per current docs
- `wrangler kv:namespace`: Colon syntax deprecated in 3.60.0, use space syntax

## Open Questions

1. **SonicJS admin user seeding for production/new clients**
   - What we know: `scripts/seed-admin.ts` uses `getPlatformProxy()` which runs locally against local D1, not remote. There's no remote seeding mechanism.
   - What's unclear: How to create the first admin user in a fresh production D1. SonicJS may auto-create admin on first login or via a specific route.
   - Recommendation: Check if SonicJS has a `/auth/register` route or admin setup wizard. If not, the provisioning runbook needs a step for seeding admin via `wrangler d1 execute DB --remote --env production --command "INSERT INTO users..."`

2. **CORS_ORIGINS for Pages before Pages project exists**
   - What we know: The production CORS_ORIGINS must be set to the Pages URL before deploying the CMS Worker, but the Pages URL isn't known until the Pages project is created.
   - What's unclear: Chicken-and-egg — which do you deploy first?
   - Recommendation: Create the Pages project first (just `wrangler pages project create`) to get the `*.pages.dev` URL, then set CORS_ORIGINS in wrangler.toml, then deploy the CMS Worker, then deploy the Pages site.

3. **Migration migrations_dir for custom migrations**
   - What we know: `wrangler.toml` has `migrations_dir = "./node_modules/@sonicjs-cms/core/migrations"` — pointing at the fork's migrations. The project also has `./migrations/` locally.
   - What's unclear: Are the local migrations in `./migrations/` tracked by wrangler's migration system, or just the fork's migrations directory? The wrangler.toml only lists one `migrations_dir`.
   - Recommendation: Check if any of the pending remote migrations are in `./migrations/` (not the core package) before applying. If they're standalone SQL, they may need to be applied via `wrangler d1 execute --remote --file=migrations/xxx.sql`.

4. **TypeScript error in blog-posts.collection.ts**
   - What we know: Pre-existing TS error (`quill` type not in FieldType union) — runtime works, type check fails. Documented since Phase 1.
   - What's unclear: Does `wrangler deploy` fail if `tsc --noEmit` has errors? Or does it bypass type checking?
   - Recommendation: wrangler deploy uses esbuild (via tsup in the fork) — it does NOT run tsc type checking by default. The deploy will succeed. The TS error can be resolved by updating the fork's FieldType union (a deferred upstream contribution).

## Sources

### Primary (HIGH confidence)
- https://developers.cloudflare.com/workers/wrangler/environments/ — Environment configuration, bindings non-inheritable, `--env` deploy flag
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/ — Workers Logs observability, JSON structured logging
- https://developers.cloudflare.com/workers/configuration/secrets/ — `wrangler secret put`, per-env secrets, access in Worker code
- https://developers.cloudflare.com/d1/wrangler-commands/ — D1 migrations apply `--remote`, `wrangler d1 create`
- https://developers.cloudflare.com/r2/buckets/create-buckets/ — `wrangler r2 bucket create` command and naming rules
- https://docs.astro.build/en/guides/deploy/cloudflare/ — Astro Cloudflare Pages deploy, build command, output directory
- https://developers.cloudflare.com/pages/get-started/direct-upload/ — `wrangler pages project create` and `wrangler pages deploy`
- https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/ — `wrangler rollback`, limitations, what is/isn't reverted

### Secondary (MEDIUM confidence)
- https://developers.cloudflare.com/kv/reference/kv-commands/ — KV namespace create syntax (verified wrangler 3.60.0+ uses space not colon)
- Project `wrangler.toml` and `wrangler.jsonc` inspected directly — both already have `[observability] enabled = true` and correct adapter config

### Tertiary (LOW confidence)
- WebSearch findings on provisioning script patterns — shell script approach for client onboarding; not from official docs, common community pattern
- WebSearch: `wrangler secret put` triggers immediate deploy — observed behavior reported in community, official docs confirm new version is created but timing details unverified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are the official Cloudflare toolchain, versions confirmed from project package.json
- Architecture (wrangler environments): HIGH — official docs confirmed, non-inheritable bindings verified
- D1 migrations --remote: HIGH — official D1 wrangler commands doc confirmed flag and behavior
- Workers Logs: HIGH — official docs confirmed console.log JSON pattern
- Astro Pages deploy: HIGH — official Astro docs confirmed build output and wrangler pages deploy command
- Provisioning script: MEDIUM — pattern is sound but exact bash parsing of wrangler output is fragile (IDs should be copy-pasted, not grep'd)
- Pitfalls: HIGH for migration debt and CORS issues (confirmed from STATE.md and docs); MEDIUM for others

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (Cloudflare infra is stable; wrangler commands change infrequently)
