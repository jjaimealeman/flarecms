# Flare CMS Monorepo

## CRITICAL: Branch Rules

**NEVER commit directly to `main`.** Main is production — pushes trigger CI/CD deploy.

- Work on `develop` branch (default working branch)
- Feature work goes on `feature/*` branches off develop
- User merges develop → main via lazygit when ready to deploy
- If you find yourself on main, stop and `git checkout develop` before doing anything

---

## Active Initiative — Cleanup & Revival (June 25, 2026)

**See `TASKS.md` for full task breakdown.**

FlareCMS is NOT abandoned — it's production-ready v2.0.0, 102k LOC, 1200+ tests,
last committed April 2026. The goal is to make it 100% 915website's own and
actually deploy it for real clients. It was forked from SonicJS March 1, 2026.

**Target clients:** dthelifecoach.com (first), 915website.com (dogfood), upcoming clients.

### What to kill first
**SonicJS legacy (actual inherited cruft):**
- `demo-login`, `seed-data` plugins — SonicJS demo artifacts, delete them
- TinyMCE editor — redundant (we have Quill), remove
- EasyMDE duplicate — two versions in plugin UI, consolidate to one
- Magic Link Auth — OTP Login covers same use case, remove magic-link
- Database Tools plugin — dangerous in client sites (has truncate), gate or remove

**FlareCMS demo system (ours, built v2.1 March 2026 — not SonicJS):**
- `demo-sandbox` plugin — built for flarecms.dev marketing demo (OTP auth, sandbox collection, reset cron). Not needed for client deploys. Remove plugin, migration 038, demo routes from app.ts, /demo page from site, cron trigger from wrangler.toml.

**DO NOT remove `email-plugin`** — it powers OTP Login via Resend. Load-bearing.

### What to fix
- Sidebar nav: duplicated URLs, broken editor
- Workflow Engine: two versions showing (beta1 vs beta.1), consolidate
- Collections in sidebar default to SonicJS demo types — make dynamic

### What to activate
- AI Search plugin (already built, just Inactive) — key differentiator
  Wire up Workers AI binding, integrate CF similarity cache freshness (June 24 2026 feature)

### Context: where this fits
FlareCMS is the CMS layer. Agente is a future concept (brainstormed June 2026) — an AI agent
layer that would sit alongside FlareCMS to generate/draft/monitor content. No code exists yet.
"Page-as-DO" (every page = Durable Object) is the long-term FlareCMS differentiator — parking lot for now.

---

## Project Overview

**Flare CMS** is a headless CMS built for Cloudflare Workers, forked from [SonicJS](https://github.com/Sonicjs-Org/sonicjs). This monorepo contains the core engine, CMS backend, and Astro frontend.

**Monorepo layout** (pnpm workspaces):
- `packages/core/` — `@flare-cms/core` (engine, tsup build)
- `packages/cms/` — `@flare-cms/cms` (Cloudflare Worker backend)
- `packages/site/` — `@flare-cms/site` (Astro frontend on Cloudflare Pages)
- `packages/astro/` — `@flare-cms/astro` (Content Layer Loader for Astro)
- `.planning/` — GSD planning files

---

## Tech Stack

### Core (`packages/core/`)
- **Build**: tsup (8 entry points: index, services, middleware, routes, templates, plugins, utils, types)
- **Database**: Drizzle ORM schema + migrations (bundled in package)
- **Tests**: Vitest (1200+ tests)

### CMS Backend (`packages/cms/`)
- **Runtime**: Cloudflare Workers (Hono web framework)
- **Database**: D1 (SQLite) via Drizzle ORM
- **Media**: R2 bucket (`my-astro-cms-media`)
- **Cache**: KV namespace
- **Admin UI**: Built-in at `localhost:8787/admin`
- **API docs**: Scalar UI at `localhost:8787/docs`

### Frontend (`packages/site/`)
- **Framework**: Astro 5 (SSR mode)
- **Adapter**: `@astrojs/cloudflare`
- **Styling**: Tailwind CSS v4 + `@tailwindcss/typography`
- **API Client**: `src/lib/flare.ts`

---

## Package Manager

**Always use `pnpm`** — never npm or yarn.

---

## Cloudflare Bindings (wrangler.toml)

| Binding | Type | Name |
|---------|------|------|
| `DB` | D1 | `my-astro-cms-db` |
| `MEDIA_BUCKET` | R2 | `my-astro-cms-media` |
| `CACHE_KV` | KV | rate limiting cache |

Database ID: `a2fe8bde-3cb8-4c0b-8a66-a996c482e5a3`

---

## Key Commands

```bash
# Install all workspace deps
pnpm install

# Build core (required before CMS/site can work)
pnpm build

# Deploy CMS to Cloudflare Workers (production)
pnpm deploy:cms

# Build + deploy Astro site to Cloudflare Pages
pnpm deploy:site

# Run core tests
pnpm test
```

---

## Dev Servers

**DO NOT** run `pnpm dev` or `wrangler dev` — user runs these in dedicated tmux panes.

- CMS: `http://localhost:8787` (run `wrangler dev` in `packages/cms/`)
- Site: `http://localhost:4321` (run `pnpm dev` in `packages/site/`)

---

## Production URLs

- CMS Admin: `https://admin.flarecms.dev`
- Site: `https://flarecms.dev`

---

## Core API (renamed from SonicJS)

| New Name | Old Name (deprecated) |
|----------|----------------------|
| `createFlareApp` | `createSonicJSApp` |
| `FlareConfig` | `SonicJSConfig` |
| `FlareApp` | `SonicJSApp` |
| `FLARE_VERSION` | `SONICJS_VERSION` |

Old names still work as deprecated aliases.

---

## Collection Schema Format

Uses plain object exports with `satisfies CollectionConfig`:

```typescript
import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'my-collection',
  displayName: 'My Collection',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Title', required: true },
      content: { type: 'quill', title: 'Content' },
    },
    required: ['title']
  },
  listFields: ['title', 'status'],
  searchFields: ['title'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc'
} satisfies CollectionConfig
```

---

## D1 Database Rules

- **Use SQL `NULL`** for nullable FK columns — NEVER string `'null'`
- FK delete order: content_versions → workflow_history → content → collections
- Admin user ID: `admin-1770148233567-90a7ju7xz`

---

## Known Bugs (inherited from SonicJS v2.8.0)

1. **API filters BROKEN** — must filter client-side
2. **Select field `default` ignored**

---

## CI/CD

GitHub Actions deploys on push to `main`:
1. Build core → upload artifact
2. Deploy CMS Worker (parallel)
3. Build + deploy Astro Pages (parallel)

Required GitHub secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`

---

## Coding Standards

- **Collection names**: kebab-case (`blog-posts`)
- **Schema fields**: camelCase (`featuredImage`)
- **Database columns**: snake_case (Drizzle maps automatically)
- **Files**: kebab-case (`blog-posts.collection.ts`)
- **Formatting**: No semicolons, single quotes, 2-space indent, trailing commas (ES5)
