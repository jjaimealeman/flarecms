---
title: Wrangler Configuration
slug: wrangler-config
excerpt: Complete reference for the wrangler.toml file -- bindings, environments, secrets, and cron triggers.
section: deployment
order: 4
status: published
---

## Overview

The `wrangler.toml` file in `packages/cms/` configures the Cloudflare Worker deployment. It defines bindings (D1, R2, KV), environment variables, environments (development, staging, production), and scheduled triggers.

## Full Configuration Reference

Here is the complete annotated `wrangler.toml` used by Flare CMS:

```toml
# Worker identity
name = "flare-cms-dev"          # Worker name (development)
main = "src/index.ts"           # Entry point
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]  # Enable Node.js API compatibility

# Enable workers.dev subdomain
workers_dev = true

# ─── D1 Database ─────────────────────────────────────
[[d1_databases]]
binding = "DB"                                  # Access via c.env.DB
database_name = "my-astro-cms-db"
database_id = "your-database-id"
migrations_dir = "./node_modules/@flare-cms/core/migrations"

# ─── R2 Bucket ───────────────────────────────────────
[[r2_buckets]]
binding = "MEDIA_BUCKET"                        # Access via c.env.MEDIA_BUCKET
bucket_name = "my-astro-cms-media"

# ─── KV Namespace ────────────────────────────────────
[[kv_namespaces]]
binding = "CACHE_KV"                            # Access via c.env.CACHE_KV
id = "your-kv-namespace-id"

# ─── Environment Variables ───────────────────────────
[vars]
ENVIRONMENT = "development"
CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"
MEDIA_DOMAIN = "images.flarecms.dev"
WEBHOOK_URLS = ""                               # Comma-separated webhook URLs
WEBHOOK_SECRET = ""                             # HMAC-SHA256 signing secret

# ─── Cron Triggers ───────────────────────────────────
[triggers]
crons = ["* * * * *"]                           # Every minute (scheduled publishing)

# ─── Observability ───────────────────────────────────
[observability]
enabled = true
```

## Bindings

Bindings connect your Worker to Cloudflare services. Each binding creates a property on `c.env`:

| Binding | Type | Property | Purpose |
|---------|------|----------|---------|
| `DB` | D1 Database | `c.env.DB` | Content, users, collections, versions |
| `MEDIA_BUCKET` | R2 Bucket | `c.env.MEDIA_BUCKET` | Media file storage |
| `CACHE_KV` | KV Namespace | `c.env.CACHE_KV` | Rate limiting, auth token cache |

### Creating Bindings

```bash
# D1 Database
npx wrangler d1 create my-astro-cms-db

# R2 Bucket
npx wrangler r2 bucket create my-astro-cms-media

# KV Namespace
npx wrangler kv namespace create CACHE_KV
```

Each command returns an ID to put in `wrangler.toml`.

## Environment Variables

### Public Variables (`[vars]`)

Set in `wrangler.toml` and visible in your Worker code:

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | Current environment name | `development`, `staging`, `production` |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | `https://flare-site.pages.dev` |
| `MEDIA_DOMAIN` | Custom domain for R2 media URLs | `images.flarecms.dev` |
| `WEBHOOK_URLS` | Comma-separated webhook notification URLs | `https://example.com/webhook` |
| `WEBHOOK_SECRET` | HMAC-SHA256 secret for signing webhook payloads | (generate a random string) |

### Secrets

Sensitive values are stored as secrets (encrypted, not in source control):

```bash
npx wrangler secret put JWT_SECRET
```

| Secret | Description |
|--------|-------------|
| `JWT_SECRET` | HMAC-SHA256 key for signing JWT tokens and CSRF tokens |

Access secrets in code the same way as variables: `c.env.JWT_SECRET`.

## Environments

Flare CMS configures three environments:

### Default (Development)

Used by `wrangler dev` for local development:

```toml
name = "flare-cms-dev"
[vars]
ENVIRONMENT = "development"
CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"
```

### Production

Used by `wrangler deploy --env production`:

```toml
[env.production]
name = "flare-cms"
vars = {
  ENVIRONMENT = "production",
  CORS_ORIGINS = "https://flare-site.pages.dev"
}
```

Production has its own D1, R2, and KV bindings (can reuse the same resources or use separate ones):

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db"
database_id = "your-production-db-id"

[[env.production.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"

[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "your-production-kv-id"
```

### Staging

Used by `wrangler deploy --env staging` for testing migrations and changes:

```toml
[env.staging]
name = "flare-cms-staging"
vars = {
  ENVIRONMENT = "staging",
  CORS_ORIGINS = "http://localhost:4321,http://localhost:8787"
}

[[env.staging.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db-staging"
database_id = "your-staging-db-id"
```

## Cron Triggers

The `[triggers]` section configures scheduled execution:

```toml
[triggers]
crons = ["* * * * *"]
```

This runs the Worker's `scheduled` event handler every minute. Flare CMS uses this for the **scheduled content publishing** feature -- the workflow plugin checks for content entries with a future publish date that has passed and publishes them.

### Cron Syntax

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-6, Sunday = 0)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

## Compatibility Flags

```toml
compatibility_flags = ["nodejs_compat"]
```

The `nodejs_compat` flag enables Node.js API compatibility in the Worker runtime. This is required for:

- `crypto.subtle` (used by JWT signing, CSRF tokens, password hashing)
- Buffer operations
- Other Node.js APIs used by dependencies

## Observability

```toml
[observability]
enabled = true
```

Enables Cloudflare's built-in observability features, including Workers Logs and Metrics in the dashboard.

## Common Tasks

### Deploy to production

```bash
cd packages/cms
npx wrangler deploy --env production
```

### Set a secret for production

```bash
npx wrangler secret put JWT_SECRET --env production
```

### Run migrations on production

```bash
npx wrangler d1 migrations apply my-astro-cms-db --env production
```

### Tail production logs

```bash
npx wrangler tail --env production
```

## Next Steps

- See [Cloudflare Workers](/docs/deployment/cloudflare-workers) for the deployment walkthrough
- See [D1 Database](/docs/deployment/d1-database) for database management
- See [R2 Storage](/docs/deployment/r2-storage) for media storage
- See [CI/CD](/docs/deployment/ci-cd) for automated deployments
