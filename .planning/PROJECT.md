# SonicJS Fork — Production Edge CMS

## What This Is

A soft fork of SonicJS v2.8.0 to build a production-ready headless CMS for Jaime's personal sites and 915website.com client projects. Runs entirely on Cloudflare Workers with D1 (database), R2 (media), KV (caching), and Durable Objects (real-time/sessions). Fixes critical security flaws, wires up broken features, and maintains plugin extensibility for future growth.

## Core Value

A secure, reliable CMS that Jaime can deploy per-client and trust in production — no hardcoded secrets, no broken APIs, no manual workarounds.

## Requirements

### Validated

- ✓ Blog posts collection with CRUD + Quill editor — existing
- ✓ News collection with CRUD + category field — existing
- ✓ Pages collection (About, Contact, Uses) — existing
- ✓ Astro 5 SSR frontend consuming CMS API — existing (v0.2.0)
- ✓ Admin UI with collection management — existing (HTMX-based)
- ✓ D1 database with Drizzle ORM — existing
- ✓ Plugin system with 22 lifecycle hooks — existing
- ✓ Two-tier caching (memory + KV) — existing (KV not yet wired)
- ✓ Scalar API docs at /docs — existing

### Active

- [ ] Fix hardcoded JWT secret — move to environment variable
- [ ] Replace SHA-256 password hashing with PBKDF2 + per-user salt
- [ ] Wire up API query filtering (QueryFilterBuilder exists, not connected)
- [ ] Fix R2 media binding (BUCKET → MEDIA_BUCKET)
- [ ] Wire up KV caching (CACHE_KV binding)
- [ ] CORS with explicit allowed origins
- [ ] Rate limiting on auth endpoints
- [ ] Security headers middleware
- [ ] CSRF token protection
- [ ] SQL injection sanitization
- [ ] XSS prevention on form submissions
- [ ] Content status lifecycle (publish/unpublish/archive)
- [ ] Soft-delete cascade for FK children
- [ ] Deploy CMS backend to Cloudflare Workers (production)
- [ ] Deploy Astro frontend to Cloudflare Pages (production)
- [ ] CLI scaffolding for new client instances
- [ ] Per-client deployment template (wrangler.toml + D1 + R2)

### Out of Scope

- Multi-tenancy (single DB, multiple tenants) — too complex for v1, revisit in v2+
- Custom admin UI rebuild — HTMX admin works, improve incrementally
- TinyMCE integration — requires API key, Quill is sufficient
- Upstream PR contributions — watch upstream, but don't block on merging
- Mobile app / native clients — API-first already enables this later
- Real-time collaboration (Durable Objects) — v2+ feature
- Automated CI/CD pipeline — manual deploy via wrangler for now

## Context

**Origin:** SonicJS is the only headless CMS built natively for Cloudflare Workers. v2.8.0 is functional but has critical security issues and broken features. Upstream maintainer (Lane Campbell) hasn't merged PRs in 2+ months. Community contributor @mmcintosh submitted 10+ security PRs that remain unmerged.

**Prior work:** Jaime has built two client sites (BabsBoutique with Astro+Nuxt, AutoPlusElPaso with Nuxt) each with custom backends. The goal is to stop rebuilding backends and have one CMS that works across clients.

**Current state:**
- `my-astro-cms/` — Working CMS instance with 3 collections, running locally
- `my-astro-site/` — Astro frontend at v0.2.0 with blog, news, pages
- `sonicjs-fork/` — Fork of upstream for core engine modifications

**Payload CMS comparison:** Evaluated Payload's D1 template. Good patterns to cherry-pick (PBKDF2, login lockout, range requests, ETag caching) but Payload itself has CF Workers incompatibilities (Node.js streams, sharp dependency, memory usage).

## Constraints

- **Runtime**: Cloudflare Workers only — no Node.js APIs, 128MB memory, 30s CPU time
- **Database**: D1 (SQLite) — no JOINs across databases, 10GB max per DB
- **Stack lock**: Must maintain SonicJS plugin system compatibility (22 hooks)
- **Solo developer**: Jaime is the only maintainer — favor simplicity over features
- **Budget**: Cloudflare free/Workers Paid tier — no expensive external services
- **Security**: Must pass basic security audit before any client deployment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Soft fork (not hard fork) | Watch upstream for useful changes, diverge where needed | — Pending |
| Single-tenant per client | Simpler, more secure, easier to reason about | — Pending |
| Cherry-pick @mmcintosh PRs | Battle-tested security fixes, well-structured | — Pending |
| Static images in Astro public/ | R2 binding broken, static is simpler for blog/page images | ✓ Good |
| Quill over TinyMCE | No API key needed, built-in support | ✓ Good |
| Skip codebase mapping | Deep context already gathered through manual exploration | ✓ Good |

---
*Last updated: 2026-03-01 after initialization*
