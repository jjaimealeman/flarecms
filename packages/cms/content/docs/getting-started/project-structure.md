---
title: Project Structure
slug: project-structure
excerpt: Understand the Flare CMS monorepo layout, package responsibilities, and build order.
section: getting-started
order: 3
status: published
---

## Monorepo layout

Flare CMS is a **pnpm workspace** monorepo with three packages:

```
flarecms/
├── packages/
│   ├── core/          # @flare-cms/core — engine
│   ├── cms/           # @flare-cms/cms — backend worker
│   └── site/          # @flare-cms/site — Astro frontend
├── .planning/         # GSD planning artifacts
├── package.json       # Root workspace config
└── pnpm-workspace.yaml
```

## packages/core

**Package:** `@flare-cms/core`
**Tech:** TypeScript, tsup, Drizzle ORM, Hono, Vitest

The core package is the engine. It provides everything the CMS needs to run: database schema, services, middleware, routes, templates, plugins, and type definitions.

```
packages/core/
├── src/
│   ├── app.ts              # createFlareApp() factory
│   ├── index.ts            # Main exports
│   ├── db/
│   │   ├── schema.ts       # Drizzle ORM table definitions
│   │   └── migrations/     # SQL migration files
│   ├── middleware/
│   │   ├── auth.ts         # JWT authentication
│   │   ├── bootstrap.ts    # Auto-migration + collection sync
│   │   ├── csrf.ts         # CSRF protection
│   │   ├── rate-limit.ts   # KV-based rate limiting
│   │   └── security-headers.ts
│   ├── routes/             # API + admin route handlers
│   ├── services/
│   │   ├── content-state-machine.ts  # Status transitions
│   │   ├── cache.ts                  # Three-tier caching
│   │   └── ...
│   ├── plugins/            # Plugin system + core plugins
│   ├── templates/          # HTML form/table renderers
│   ├── types/
│   │   ├── collection-config.ts  # FieldType, CollectionConfig
│   │   └── plugin.ts             # Plugin system types
│   └── utils/              # Sanitization, query filters
├── migrations/             # Bundled SQL migrations (shipped with package)
├── dist/                   # Compiled output (8 entry points)
├── tsup.config.ts
└── package.json
```

### Build output

tsup compiles 8 entry points, each available as ESM (`.js`) and CJS (`.cjs`):

| Entry | Import Path | Contains |
|---|---|---|
| `index` | `@flare-cms/core` | Main API: `createFlareApp`, types, DB schema |
| `services` | `@flare-cms/core/services` | Collection sync, auth, caching, logging |
| `middleware` | `@flare-cms/core/middleware` | Auth, CSRF, rate limiting, security |
| `routes` | `@flare-cms/core/routes` | API and admin route handlers |
| `templates` | `@flare-cms/core/templates` | HTML rendering for admin UI |
| `plugins` | `@flare-cms/core/plugins` | Hook system, plugin registry |
| `utils` | `@flare-cms/core/utils` | Sanitization, query filters, metrics |
| `types` | `@flare-cms/core/types` | TypeScript type definitions |

## packages/cms

**Package:** `@flare-cms/cms`
**Tech:** Cloudflare Workers, Wrangler, Hono, D1 (SQLite), R2, KV

The CMS package is the deployed backend. It imports `@flare-cms/core`, registers collections, and exports a Workers-compatible module.

```
packages/cms/
├── src/
│   ├── index.ts            # App entry — createFlareApp() + Workers export
│   ├── collections/        # Collection config files
│   │   ├── blog-posts.collection.ts
│   │   ├── docs.collection.ts
│   │   └── docs-sections.collection.ts
│   └── middleware/
│       └── validate-bindings.ts  # Checks DB, R2, JWT_SECRET
├── content/
│   └── docs/               # Documentation content (markdown)
├── scripts/
│   ├── seed-admin.ts       # Create initial admin user
│   └── seed-docs.ts        # Seed documentation content
├── migrations/             # D1 migration files
├── wrangler.toml           # Cloudflare bindings config
└── package.json
```

### Key file: `src/index.ts`

This is where everything comes together. It registers collections, configures the app, and exports the Workers handler:

```typescript
import { createFlareApp, registerCollections } from '@flare-cms/core'
import type { FlareConfig } from '@flare-cms/core'
import blogPostsCollection from './collections/blog-posts.collection'

registerCollections([blogPostsCollection])

const config: FlareConfig = {
  collections: { autoSync: true },
  plugins: { directory: './src/plugins', autoLoad: false },
}

const app = createFlareApp(config)

export default {
  fetch: app.fetch.bind(app),
}
```

## packages/site

**Package:** `@flare-cms/site`
**Tech:** Astro 5, Cloudflare Pages, Tailwind CSS v4, unified/rehype

The site package is the public-facing frontend. It fetches content from the CMS API and renders it with Astro.

```
packages/site/
├── src/
│   ├── components/
│   │   ├── docs/           # Documentation components
│   │   │   ├── DocsSidebar.astro
│   │   │   ├── TableOfContents.astro
│   │   │   ├── Breadcrumbs.astro
│   │   │   └── PrevNext.astro
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   └── SEO.astro
│   ├── layouts/
│   │   ├── Layout.astro    # Base layout (header, footer, nav)
│   │   └── DocsLayout.astro # Docs layout (sidebar, TOC)
│   ├── lib/
│   │   ├── flare.ts        # CMS API client
│   │   ├── docs-nav.ts     # Navigation tree builder
│   │   └── markdown.ts     # unified/rehype pipeline
│   ├── pages/
│   │   ├── index.astro     # Homepage
│   │   ├── docs/           # Documentation pages
│   │   └── blog/           # Blog pages
│   └── styles/             # Tailwind CSS
├── public/                 # Static assets
└── package.json
```

## Package dependencies

The packages have a clear dependency chain:

```
@flare-cms/core  (no internal deps)
       ↓
@flare-cms/cms   (imports core)
       ↓
@flare-cms/site  (calls CMS API over HTTP)
```

- **core** has zero internal dependencies — it's a standalone npm package
- **cms** imports core as a workspace dependency (`"@flare-cms/core": "workspace:*"`)
- **site** doesn't import core or cms directly — it communicates via the REST API

## Build order

Because of this dependency chain, you need to build in order:

1. **Build core first** — `pnpm build` (from root)
2. **CMS doesn't need a build** — Wrangler compiles TypeScript on the fly
3. **Site builds separately** — `pnpm build:site` (for production deploy)

> [!NOTE]
> During local development, you only need to rebuild core when you change files in `packages/core/`. Wrangler's dev server (`wrangler dev`) picks up CMS changes automatically, and Astro's dev server (`pnpm dev`) handles site changes with hot reload.

## Configuration files

| File | Package | Purpose |
|---|---|---|
| `wrangler.toml` | cms | Cloudflare bindings (D1, R2, KV), env vars |
| `tsup.config.ts` | core | Build configuration for 8 entry points |
| `astro.config.mjs` | site | Astro + Cloudflare adapter config |
| `tsconfig.json` | all | TypeScript configuration |
| `package.json` | all | Dependencies and scripts |
