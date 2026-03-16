# Flare CMS

Edge-native headless CMS built for Cloudflare Workers. Zero cold starts, D1 database, R2 media — all at the edge.

Forked from [SonicJS](https://github.com/Sonicjs-Org/sonicjs) with security hardening, content workflows, media pipeline improvements, and full rebranding.

**Live:** [flarecms.dev](https://flarecms.dev) | **Admin:** [admin.flarecms.dev](https://admin.flarecms.dev) | **v2.0.0**

https://github.com/user-attachments/assets/9453cd39-e784-47d0-b1f3-3b56b66364c6

> *Content management with dark/light mode toggle — [see it live](https://flarecms.dev)*

## Features

- **Built-in Admin UI** — Content management, media library, user management, rich text editor
- **Workflow Engine** — Approval workflows with Draft → Review → Approved → Published lifecycle
- **Content Staging** — Save drafts, diff view, reject with comments, sync to production
- **Schema Migrations UI** — Add/remove/rename fields from the admin panel with history and rollback
- **Live Preview** — Split-screen draft preview API for content editors
- **Audit Logging** — Full-stack activity log for content CRUD, auth events, and admin actions
- **Role-Based Access** — Admin, Editor, Viewer roles with per-collection permissions
- **Built-in Analytics** — Privacy-first page views, exit links, device stats (no cookies, no PII)
- **Dark/Light Mode** — Full dual-mode design system (Supernova Dark + Edge Light)
- **Plugin Architecture** — FAQ, Forms, OTP Login, Testimonials, Code Examples
- **Deploy Button** — One-click deploy via GitHub Actions from the admin panel
- **Astro Snippet Generator** — Auto-generates typed Astro components for any collection
- **Type-safe Collections** — Define schemas in TypeScript, API generated automatically
- **Edge Performance** — 330+ Cloudflare locations, sub-50ms latency globally

## Built for Astro

Flare CMS is designed as an Astro-first headless CMS. What sets it apart from SonicJS:

**`@flare-cms/astro` Content Loader** — Drop-in Astro content collections integration. Define your collections once in the CMS, then query them with full type safety in Astro using `getCollection()` and `getEntry()`. Handles date sanitization, schema validation, and build-time caching automatically.

```typescript
// src/content.config.ts
import { flareLoader } from '@flare-cms/astro'

const blog = defineCollection({
  loader: flareLoader({ collection: 'blog-posts' }),
})
```

**`<FlareAnalytics />` Component** — One line in your Astro layout gives you privacy-first analytics. Uses `navigator.sendBeacon` with `text/plain` content type to avoid CORS preflight. No cookies, no PII, IP hashed daily with SHA-256. Tracks page views, exit link clicks, devices, and referrers — all viewable in the admin dashboard.

```astro
---
import FlareAnalytics from '../components/FlareAnalytics.astro'
---
<FlareAnalytics />
```

**Content Modeling** — Collections are TypeScript objects with typed fields (`string`, `number`, `quill`, `image`, `select`, `boolean`, `date`). The REST API, admin UI forms, validation, and Astro types are all generated from a single schema definition. No config drift between CMS and frontend.

**Astro Snippet Generator** — Click any collection in the admin panel and get copy-paste Astro code: content config, listing page, detail page, and API client — all pre-wired with your collection's actual fields.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers (Hono) |
| Database | D1 (SQLite) via Drizzle ORM |
| Media | R2 bucket |
| Cache | KV namespace |
| Frontend | Astro 5 + Tailwind CSS v4 |
| Fonts | Outfit Variable + Geist Mono (self-hosted) |
| CI/CD | GitHub Actions → Workers + Pages |

## Monorepo Structure

```
packages/
  core/   — @flare-cms/core (engine, admin UI, API)
  cms/    — CMS backend (Cloudflare Worker)
  site/   — Astro frontend (Cloudflare Pages)
  astro/  — @flare-cms/astro (content loader integration)
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build core (required before CMS/site)
pnpm build

# Start CMS (in separate terminal)
cd packages/cms && wrangler dev

# Start site (in separate terminal)
cd packages/site && pnpm dev
```

- CMS: `http://localhost:8787` (admin at `/admin`)
- Site: `http://localhost:4321`

## Deploy

Push to `main` triggers GitHub Actions:

1. Build core + astro packages
2. Deploy CMS Worker to Cloudflare Workers
3. Build + deploy Astro site to Cloudflare Pages

```bash
pnpm deploy:cms   # Manual: deploy CMS Worker
pnpm deploy:site  # Manual: build + deploy Astro site
```

## Lighthouse Scores

| | Mobile | Desktop |
|---|---|---|
| Performance | 97 | 100 |
| Accessibility | 93 | 94 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

## Credits

Built on [SonicJS](https://sonicjs.com) by the SonicJS Team. Licensed under MIT.

## License

[MIT](LICENSE)
