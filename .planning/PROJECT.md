# Flare CMS

## What This Is

A headless CMS built for Cloudflare Workers with a full documentation website at flarecms.dev, powered entirely by the CMS itself (100% dogfooding). Monorepo with the core engine (`@flare-cms/core`), CMS backend (`@flare-cms/cms`), Astro frontend (`@flare-cms/site`), and Astro integration (`@flare-cms/astro`).

## Core Value

Prove that Flare CMS works by using it to power its own documentation — every page, every code example, every section managed through the admin at admin.flarecms.dev.

## Requirements

### Validated (v1 — Complete)

- ✓ CMS backend with D1, R2, KV on Cloudflare Workers — v1
- ✓ Admin UI with collection management (HTMX-based) — v1
- ✓ Content CRUD with Quill editor — v1
- ✓ Plugin system with 22 lifecycle hooks — v1
- ✓ Three-tier caching (memory -> KV -> D1) — v1
- ✓ PBKDF2 auth with JWT, rate limiting, CSRF, CORS — v1
- ✓ Content workflow (publish/unpublish/schedule) — v1
- ✓ Collection-level RBAC — v1
- ✓ R2 media uploads with streaming — v1
- ✓ Hook system with outgoing webhooks — v1
- ✓ Astro 5 SSR frontend on Cloudflare Pages — v1
- ✓ CI/CD via GitHub Actions — v1
- ✓ SonicJS -> Flare CMS rebrand complete — v1.2.0

### Validated (v2 — Complete)

- ✓ Docs + docs-sections collections with EasyMDE editor — v2
- ✓ 3-column responsive docs layout with sidebar, breadcrumbs, prev/next — v2
- ✓ Shiki syntax highlighting, copy buttons, callout boxes, tabbed code examples — v2
- ✓ Homepage redesign with hero, feature cards, comparison table, CTA — v2
- ✓ Client-side search with MiniSearch and Cmd+K — v2
- ✓ SEO (sitemap, meta tags, Open Graph), "Edit in CMS" links — v2
- ✓ 8 documentation sections seeded via reproducible API script — v2
- ✓ `@flare-cms/astro` Content Layer Loader with type safety — v2
- ✓ Live Preview API with split-screen draft preview — v2
- ✓ Schema Migrations UI with field CRUD, history, rollback — v2
- ✓ Workflow Engine with approval workflows (Draft -> Review -> Approved -> Published) — v2
- ✓ Deployed to Cloudflare Pages with all routes live — v2

### Active (v2.1 — Live Demo)

- [ ] Public demo page at flarecms.dev/demo with minimal email gate
- [ ] OTP email login for demo visitors via Resend
- [ ] Auto-assigned `demo` role with read-only + sandbox CRUD
- [ ] `demo-sandbox` collection for visitors to experiment with
- [ ] 30-minute session expiry for demo users
- [ ] Cron trigger to reset sandbox data every 6 hours
- [ ] `demo_signups` table for email capture
- [ ] Rate limiting (50 ops per demo session)

### Out of Scope

- Blog section — separate milestone after docs site is live
- Community/contributors pages — add when community exists
- npm package publishing — separate concern
- Pricing page — no paid tier exists yet
- Showcase page — no showcase projects yet

## Current State (v2.0 shipped 2026-03-15)

**Codebase:** ~201K LOC TypeScript/Astro across 4 packages
**Stack:** Cloudflare Workers + D1 + R2 + KV, Hono, Astro 5 SSR, Drizzle ORM
**Production:** admin.flarecms.dev (CMS), flarecms.dev (site)

**Known tech debt (remaining):**
- `workflowPlugin` dead code deferred (routes work via direct wiring)
- Phase 6 missing VERIFICATION.md

## Context

**Origin:** SonicJS built their docs in Next.js — a project claiming to be for Cloudflare/Astro doesn't use its own product. FlareCMS dogfoods: the docs site IS the proof the product works.

**Design reference:** Stitch v2 mockups — dark navy theme with cyan/orange accents.

**Solo developer:** Jaime is the only maintainer — favor clean, maintainable code.

**Future goals:** Claude for OSS program application, npm package publishing, flarecms.dev as the primary project identity.

## Constraints

- **Stack**: Astro 5 + Cloudflare Pages frontend, FlareCMS backend — no other frameworks
- **Content**: 100% CMS-managed — no static markdown
- **Solo developer**: Favor clean, maintainable templates
- **Budget**: Cloudflare free/Workers Paid tier — no paid external services
- **License**: MIT — all docs content is open source

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 100% CMS content, no static markdown | Dogfooding is the core value | ✓ Good — 40+ pages served from CMS |
| Dark theme only (no light mode toggle) | Simpler, developer audience prefers dark | ✓ Good |
| Two new collections (docs + docs-sections) | Structured nav + content separation | ✓ Good — flexible ordering works well |
| Evolve existing packages/site, not rebuild | Leverage existing Astro setup | ✓ Good — incremental, no disruption |
| Stitch v2 mockups as design reference | Professional, tested design | ✓ Good |
| Seed docs via API, not manual entry | Reproducible, version-controlled | ✓ Good — idempotent re-seeding |
| Content Layer Loader (`@flare-cms/astro`) | First-class Astro DX, type safety | ✓ Good — `getCollection()` just works |
| Live Preview via KV draft storage | Same-edge-network latency (<50ms) | ✓ Good — unique edge advantage |
| Direct route wiring for workflow (not plugin system) | Plugin activation incomplete, direct wiring reliable | ✓ Good — dead code cleaned up in v2.0.1 |
| Schema migrations in DB (not code) | Non-technical users can modify fields | ✓ Good — migration bundle fixed in v2.0.1 |
| Minimal gate for demo (not polished landing) | Get people into admin fast, polish later | — Pending |
| Demo as plugin (not core) | Not every install needs a public demo | — Pending |

---
*Last updated: 2026-03-16 after v2.1 milestone start*
