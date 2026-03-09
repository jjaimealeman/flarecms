---
title: Cloudflare Bindings
slug: bindings
excerpt: Configure D1 database, R2 storage, and KV namespace bindings for your Flare CMS Worker.
section: configuration
order: 2
status: published
---

## What are bindings?

Bindings connect your Cloudflare Worker to other Cloudflare services — databases, storage buckets, KV namespaces, and more. They're configured in `wrangler.toml` and available in your code as `c.env.BINDING_NAME`.

Flare CMS uses three bindings:

| Binding | Type | Service | Purpose |
|---|---|---|---|
| `DB` | D1 | SQLite database | Content, users, collections, plugins |
| `MEDIA_BUCKET` | R2 | Object storage | Images, files, uploads |
| `CACHE_KV` | KV | Key-value store | Rate limiting cache |

## D1 Database (`DB`)

D1 is Cloudflare's serverless SQLite database. It's where all your CMS data lives — content entries, user accounts, collection definitions, plugin state, and system logs.

### Configuration

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db"
database_id = "a2fe8bde-3cb8-4c0b-8a66-a996c482e5a3"
migrations_dir = "./node_modules/@flare-cms/core/migrations"
```

| Field | Description |
|---|---|
| `binding` | The variable name in your code (`c.env.DB`) |
| `database_name` | Human-readable name for the database |
| `database_id` | UUID from `wrangler d1 create` — unique to your account |
| `migrations_dir` | Path to SQL migration files |

### Creating a D1 database

```bash
wrangler d1 create my-astro-cms-db
```

Copy the `database_id` from the output into your `wrangler.toml`.

### Migrations

Migrations are SQL files in `packages/core/migrations/` and are shipped with the `@flare-cms/core` package. Apply them with:

```bash
# Local development
wrangler d1 migrations apply DB --local

# Production
wrangler d1 migrations apply DB --env production
```

> [!NOTE]
> The bootstrap middleware also runs pending migrations automatically on the first request. You typically only need to run migrations manually when setting up a new environment.

### Local vs production

In local development, `wrangler dev` creates a local SQLite database in `.wrangler/state/`. This is completely separate from your production D1 database.

To interact with the production database directly:

```bash
wrangler d1 execute DB --env production --command "SELECT count(*) FROM content"
```

## R2 Bucket (`MEDIA_BUCKET`)

R2 is Cloudflare's object storage (S3-compatible). Flare CMS uses it for all media uploads — images, documents, and other files.

### Configuration

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

| Field | Description |
|---|---|
| `binding` | The variable name in your code (`c.env.MEDIA_BUCKET`) |
| `bucket_name` | The R2 bucket name in your Cloudflare account |

### Creating an R2 bucket

```bash
wrangler r2 bucket create my-astro-cms-media
```

### Local vs production

Like D1, `wrangler dev` emulates R2 locally. Files uploaded during local development are stored in `.wrangler/state/` and don't appear in your production bucket.

> [!TIP]
> R2 has **zero egress fees**. You pay only for storage and operations (PUT/GET requests), making it much cheaper than S3 for media-heavy sites.

## KV Namespace (`CACHE_KV`)

KV is Cloudflare's global key-value store. Flare CMS uses it for rate limiting — tracking request counts per IP to prevent abuse.

### Configuration

```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "7dacbabdf6aa4896b0c9b0bc7b9125fe"
```

| Field | Description |
|---|---|
| `binding` | The variable name in your code (`c.env.CACHE_KV`) |
| `id` | UUID from `wrangler kv namespace create` |

### Creating a KV namespace

```bash
wrangler kv namespace create CACHE_KV
```

Copy the `id` from the output into your `wrangler.toml`.

### Optional binding

KV is the only **optional** binding. If it's not configured:
- Rate limiting is disabled
- A warning is logged: `"CACHE_KV binding not configured — rate limiting disabled"`
- Everything else works normally

> [!NOTE]
> For local development, you can skip KV setup entirely. It only matters in production if you want rate limiting.

## Required vs optional bindings

The `validate-bindings` middleware checks bindings on every request:

| Binding | Required | Behavior if missing |
|---|---|---|
| `DB` | Yes | Returns 500: "Service unavailable: infrastructure misconfiguration" |
| `MEDIA_BUCKET` | Yes | Returns 500: "Service unavailable: infrastructure misconfiguration" |
| `CACHE_KV` | No | Logs warning, rate limiting disabled |
| `JWT_SECRET` | Yes (env var) | Returns 500: "JWT_SECRET must be configured" |

## Per-environment bindings

Each environment needs its own bindings. Production and staging typically use different databases and KV namespaces:

```toml
# Default (local development)
[[d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db"
database_id = "abc-123"

# Production
[[env.production.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db"
database_id = "abc-123"

[[env.production.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"

[[env.production.kv_namespaces]]
binding = "CACHE_KV"
id = "your-production-kv-id"

# Staging
[[env.staging.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db-staging"
database_id = "def-456"
```

## TypeScript types

The `Bindings` interface in `packages/core/src/app.ts` provides type safety for all bindings:

```typescript
export interface Bindings {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  ENVIRONMENT?: string
  JWT_SECRET?: string
  CORS_ORIGINS?: string
  MEDIA_DOMAIN?: string
  // ...and more
}
```

When you access `c.env.DB` in a route handler, TypeScript knows it's a `D1Database` instance.
