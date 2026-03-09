---
title: Installation
slug: installation
excerpt: Detailed setup guide for local development and production deployment of Flare CMS.
section: getting-started
order: 2
status: published
---

## Prerequisites

| Requirement | Minimum Version | Check Command |
|---|---|---|
| Node.js | 18.0.0 | `node -v` |
| pnpm | 10.x | `pnpm -v` |
| Wrangler CLI | 4.x | `wrangler -v` |
| Cloudflare account | Free tier works | `wrangler whoami` |

### Install pnpm

If you don't have pnpm yet:

```bash tab="pnpm"
npm install -g pnpm
```

```bash tab="corepack"
corepack enable
corepack prepare pnpm@latest --activate
```

### Install Wrangler

```bash
npm install -g wrangler
```

## Clone and install

```bash
git clone https://github.com/jjaimealeman/flarecms.git
cd flarecms
pnpm install
```

This is a **pnpm workspace** monorepo with three packages:

| Package | Path | Description |
|---|---|---|
| `@flare-cms/core` | `packages/core/` | Engine — schema, services, routes, middleware |
| `@flare-cms/cms` | `packages/cms/` | Backend — Cloudflare Worker application |
| `@flare-cms/site` | `packages/site/` | Frontend — Astro site on Cloudflare Pages |

## Build the core package

The CMS imports `@flare-cms/core` as a workspace dependency. You must build it before running the CMS:

```bash
pnpm build
```

> [!NOTE]
> You only need to rebuild core when you change files in `packages/core/`. The CMS and site packages don't need a separate build step for local dev.

## Cloudflare account setup

### Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser window to authorize Wrangler with your Cloudflare account. After authorizing, verify with:

```bash
wrangler whoami
```

### Create a D1 database

```bash
wrangler d1 create my-astro-cms-db
```

This outputs a `database_id`. Update `packages/cms/wrangler.toml` with it:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db"
database_id = "your-database-id-here"
```

### Create an R2 bucket

```bash
wrangler r2 bucket create my-astro-cms-media
```

The bucket name in `wrangler.toml` should match:

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

### KV namespace (optional)

KV is used for rate limiting. Create one if you want rate limiting enabled:

```bash
wrangler kv namespace create CACHE_KV
```

Update the `id` in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

> [!TIP]
> KV is optional for local development. If it's not configured, rate limiting is simply disabled and you'll see a warning in the console.

## Local development setup

### Run database migrations

```bash
cd packages/cms
pnpm run db:migrate:local
```

This applies all SQL migrations from `packages/core/migrations/` to your local D1 database.

### Seed the admin user

```bash
pnpm run seed
```

This creates the initial admin user using the `scripts/seed-admin.ts` script.

### Set the JWT secret

Create a `.dev.vars` file in `packages/cms/` for local environment secrets:

```
JWT_SECRET=my-local-dev-secret-change-in-production
```

> [!WARNING]
> The CMS will refuse to start if `JWT_SECRET` is not set or is using the hardcoded default. This is a security check, not a bug.

### Start the CMS dev server

```bash
cd packages/cms
wrangler dev
```

The CMS is now running at [http://localhost:8787](http://localhost:8787):

- **Admin UI**: [http://localhost:8787/admin](http://localhost:8787/admin)
- **API**: [http://localhost:8787/api/content/{collection}](http://localhost:8787/api/content)
- **Health check**: [http://localhost:8787/health](http://localhost:8787/health)

### Start the Astro site (optional)

If you're working on the frontend too:

```bash
cd packages/site
pnpm dev
```

The site runs at [http://localhost:4321](http://localhost:4321) and fetches content from the CMS API.

## Production setup

### Set secrets

Production secrets are stored securely with Wrangler — they're never checked into version control:

```bash
cd packages/cms
wrangler secret put JWT_SECRET --env production
```

### Deploy the CMS

Deployment is handled by CI/CD — push to `main` and GitHub Actions deploys automatically. The workflow:

1. Builds `@flare-cms/core`
2. Deploys the CMS Worker (`wrangler deploy --env production`)
3. Builds and deploys the Astro site to Cloudflare Pages

### Run remote migrations

```bash
cd packages/cms
wrangler d1 migrations apply DB --env production
```

## Environment variables

See the [Environment Variables](/docs/configuration/environment-variables) reference for all configurable values.

## Troubleshooting

### "JWT_SECRET must be configured"

The CMS blocks all requests if `JWT_SECRET` is missing or using the default. Create a `.dev.vars` file in `packages/cms/` with your secret.

### "Missing required bindings: DB"

Your `wrangler.toml` D1 binding is misconfigured. Make sure `database_id` matches the output from `wrangler d1 create`.

### Build errors in `packages/cms`

Make sure you ran `pnpm build` from the root first. The CMS depends on the compiled `@flare-cms/core` package.

### Migration errors

If migrations fail locally, you can reset and start fresh:

```bash
cd packages/cms
pnpm run db:reset
pnpm run db:migrate:local
pnpm run seed
```

### Port 8787 already in use

Another Wrangler process is running. Kill it or use a different port:

```bash
wrangler dev --port 8788
```
