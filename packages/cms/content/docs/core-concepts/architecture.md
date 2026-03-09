---
title: Architecture
slug: architecture
excerpt: How Flare CMS works — edge-first design, Hono routing, D1 storage, and the request lifecycle.
section: core-concepts
order: 1
status: published
---

## Edge-first design

Flare CMS runs entirely on **Cloudflare Workers**. There's no Node.js server, no container, no VM. Every request is handled at the edge — in the Cloudflare data center closest to the user.

This means:

- **Cold starts in milliseconds**, not seconds
- **Global distribution** without any extra config
- **No servers to manage** — Cloudflare handles scaling
- **Built-in DDoS protection** from Cloudflare's network

The tradeoff is that Workers have constraints: no filesystem access, no long-running processes, limited CPU time per request. Flare CMS is designed around these constraints from the ground up.

## The stack

| Layer | Technology | Binding | Purpose |
|---|---|---|---|
| Web framework | [Hono](https://hono.dev) | — | Routing, middleware, request/response handling |
| Database | [D1](https://developers.cloudflare.com/d1/) (SQLite) | `DB` | Content storage, user accounts, collections |
| Media storage | [R2](https://developers.cloudflare.com/r2/) | `MEDIA_BUCKET` | Images, files, uploads |
| Caching | [KV](https://developers.cloudflare.com/kv/) | `CACHE_KV` | Rate limiting, response caching |
| ORM | [Drizzle](https://orm.drizzle.team/) | — | Type-safe database queries |

## Application factory

Flare CMS uses a factory pattern. You create an app by calling `createFlareApp()` with a configuration object:

```typescript
import { createFlareApp, registerCollections } from '@flare-cms/core'
import type { FlareConfig } from '@flare-cms/core'
import blogPostsCollection from './collections/blog-posts.collection'

// Register collections BEFORE creating the app
registerCollections([blogPostsCollection])

const config: FlareConfig = {
  collections: {
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: false
  },
  middleware: {
    beforeAuth: [validateBindingsMiddleware()]
  }
}

const app = createFlareApp(config)

export default {
  fetch: app.fetch.bind(app),
}
```

The `createFlareApp()` function returns a Hono app with all core middleware and routes pre-configured. You export it as a Workers module.

## Request lifecycle

When a request hits your Worker, it flows through this middleware chain:

```
Request
  ↓
1. Metrics middleware     — tracks request count and timing
  ↓
2. Bootstrap middleware   — runs migrations, syncs collections, loads plugins
  ↓
3. Plugin middleware      — installs user-registered plugin instances
  ↓
4. Custom beforeAuth      — your custom middleware (e.g., validate-bindings)
  ↓
5. Security headers       — sets CORS, X-Frame-Options, etc.
  ↓
6. CSRF protection        — validates CSRF tokens on mutations
  ↓
7. Custom afterAuth       — your custom middleware (runs after auth is available)
  ↓
8. KV initialization      — wires Cache KV into the three-tier cache
  ↓
9. Route handler          — matches path and executes the handler
  ↓
Response
```

### Bootstrap middleware

The bootstrap middleware is special — it runs on the **first request** after a cold start and handles:

1. **Database migrations** — applies any pending SQL migrations automatically
2. **Collection sync** — syncs file-based collection configs to the database
3. **Plugin initialization** — loads and activates core plugins

After the first request, bootstrap becomes a no-op for subsequent requests in the same Worker isolate.

## Hono routing

Flare CMS registers routes in groups. Here are the main route prefixes:

| Prefix | Purpose | Auth Required |
|---|---|---|
| `/api/content` | CRUD API for content | API key or JWT |
| `/api/media` | Media upload and listing | API key or JWT |
| `/api/system` | Health, version, metrics | No |
| `/admin/*` | Admin UI pages (HTML) | JWT (browser session) |
| `/auth/*` | Login, logout, register | No |
| `/files/*` | Serve R2 media files | No |
| `/health` | Health check endpoint | No |

### API routes

The REST API follows predictable patterns:

```
GET    /api/content/{collection}       # List entries
GET    /api/content/{collection}/{id}  # Get single entry
POST   /api/content/{collection}       # Create entry
PUT    /api/content/{collection}/{id}  # Update entry
DELETE /api/content/{collection}/{id}  # Soft-delete entry
```

## Drizzle ORM

Database access is handled through [Drizzle ORM](https://orm.drizzle.team/), which provides:

- **Type-safe queries** — TypeScript knows your column types
- **SQL-like syntax** — reads like SQL, not an abstraction
- **Zero overhead** — compiles to raw SQL strings

Here's how it's used internally:

```typescript
import { createDb, content } from '@flare-cms/core'
import { eq } from 'drizzle-orm'

const db = createDb(env.DB)

// Fetch published content
const posts = await db
  .select()
  .from(content)
  .where(eq(content.status, 'published'))
  .all()
```

The database schema is defined in `packages/core/src/db/schema.ts` with tables for users, collections, content, media, plugins, and system logs.

## Three-tier caching

Flare CMS uses a three-tier caching strategy:

1. **In-memory** — module-level variables in the Worker isolate (fastest, lost on cold start)
2. **KV** — Cloudflare KV namespace for cross-request caching (persistent, global)
3. **Cache API** — Cloudflare's edge cache for HTTP responses (transparent, per-POP)

The cache is mainly used for:
- Rate limiting (KV)
- Media file responses (Cache API)
- Bootstrap state (in-memory)

## Workers module export

The final export follows the [Cloudflare Workers module syntax](https://developers.cloudflare.com/workers/runtime-apis/handlers/):

```typescript
export default {
  fetch: app.fetch.bind(app),
  async scheduled(controller, env, ctx) {
    const scheduler = new SchedulerService(env.DB, env, ctx)
    ctx.waitUntil(scheduler.processScheduledContent())
  },
}
```

The `scheduled` handler runs every minute (configured via `crons` in `wrangler.toml`) to process content with scheduled publish/unpublish dates.
