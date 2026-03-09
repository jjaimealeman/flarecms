---
title: Cloudflare Workers
slug: cloudflare-workers
excerpt: What Workers are, why Flare CMS uses them, and how to deploy your first instance.
section: deployment
order: 1
status: published
---

## What Are Cloudflare Workers?

Cloudflare Workers are serverless functions that run on Cloudflare's global edge network. Your code executes in the data center closest to your users, with no cold starts and no server management. Flare CMS runs entirely on Workers, using D1 for the database, R2 for media storage, and KV for caching.

### Why Workers for a CMS?

| Benefit | Details |
|---------|---------|
| **Global edge deployment** | Content is served from 300+ data centers worldwide |
| **No server management** | No VMs, containers, or OS patches to maintain |
| **Built-in scaling** | Handles traffic spikes automatically |
| **Integrated storage** | D1 (SQLite), R2 (S3-compatible), and KV are first-class bindings |
| **Cost effective** | Generous free tier; pay-per-request pricing beyond that |

## Prerequisites

Before deploying, you need:

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Node.js 20 or later
3. pnpm package manager
4. The Wrangler CLI (installed automatically as a project dependency)

## First Deployment Walkthrough

### 1. Clone and install

```bash
git clone https://github.com/jjaimealeman/flarecms.git
cd flarecms
pnpm install
```

### 2. Build the core package

The CMS backend depends on `@flare-cms/core`, which must be built first:

```bash
pnpm build
```

### 3. Create Cloudflare resources

Create the D1 database and R2 bucket:

```bash
# Create the D1 database
npx wrangler d1 create my-astro-cms-db

# Create the R2 media bucket
npx wrangler r2 bucket create my-astro-cms-media

# Create the KV namespace for caching
npx wrangler kv namespace create CACHE_KV
```

Each command outputs an ID. Update these IDs in `packages/cms/wrangler.toml` (see [Wrangler Configuration](/docs/deployment/wrangler-config) for the full reference).

### 4. Set secrets

```bash
cd packages/cms

# JWT signing secret (generate a strong random string)
npx wrangler secret put JWT_SECRET
```

### 5. Run database migrations

Apply the Drizzle migrations to your D1 database:

```bash
npx wrangler d1 migrations apply my-astro-cms-db
```

See [D1 Database](/docs/deployment/d1-database) for details on local vs. remote migrations.

### 6. Deploy

```bash
npx wrangler deploy --env production
```

This deploys the CMS Worker to `https://flare-cms.your-subdomain.workers.dev`. The `--env production` flag uses the production environment settings from `wrangler.toml`.

### 7. Seed the admin user

After the first deploy, create the initial admin account by POSTing to the seed endpoint:

```bash
curl -X POST https://flare-cms.your-subdomain.workers.dev/auth/seed-admin \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@example.com&password=your-secure-password"
```

### 8. Verify

Open the admin UI at `https://flare-cms.your-subdomain.workers.dev/admin` and log in with the credentials you just created.

## Local Development

For local development, Wrangler provides a local development server that emulates Workers, D1, R2, and KV:

```bash
cd packages/cms
npx wrangler dev
```

This starts the CMS at `http://localhost:8787` with:

- A local SQLite file for D1
- A local directory for R2
- In-memory KV

Local data is stored in `.wrangler/` and persists between restarts.

## Production URLs

The default deployment creates these URLs:

| Service | URL |
|---------|-----|
| CMS Worker | `https://flare-cms.your-subdomain.workers.dev` |
| Admin UI | `https://flare-cms.your-subdomain.workers.dev/admin` |
| API | `https://flare-cms.your-subdomain.workers.dev/api/*` |
| API Docs | `https://flare-cms.your-subdomain.workers.dev/docs` |

## Custom Domains

To use a custom domain instead of `*.workers.dev`:

1. Add a custom domain in the Cloudflare dashboard under Workers & Pages > your Worker > Settings > Domains & Routes
2. Or add a route in `wrangler.toml`:

```toml
routes = [
  { pattern = "cms.yourdomain.com", custom_domain = true }
]
```

## Environment-Specific Configuration

Flare CMS supports multiple environments through `wrangler.toml`:

- **Default (development):** Used by `wrangler dev`
- **Production:** Used by `wrangler deploy --env production`
- **Staging:** Used by `wrangler deploy --env staging`

Each environment can have its own database, KV namespace, and environment variables. See [Wrangler Configuration](/docs/deployment/wrangler-config) for the full reference.

## Next Steps

- See [D1 Database](/docs/deployment/d1-database) for database setup and migrations
- See [R2 Storage](/docs/deployment/r2-storage) for media storage configuration
- See [Wrangler Configuration](/docs/deployment/wrangler-config) for the complete `wrangler.toml` reference
- See [CI/CD](/docs/deployment/ci-cd) for automated deployments with GitHub Actions
