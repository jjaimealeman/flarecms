# Flare CMS — Documentation Site

## What This Is

A full documentation website for Flare CMS at flarecms.dev, built with Astro 5 on Cloudflare Pages and powered entirely by the FlareCMS backend (100% dogfooding). Replaces the current landing page with comprehensive technical documentation covering every feature of the CMS — from quickstart to deployment. All content is managed through the CMS admin UI, not static markdown files.

## Core Value

Prove that Flare CMS works by using it to power its own documentation — every page, every code example, every section managed through the admin at admin.flarecms.dev.

## Requirements

### Validated (v1 Milestone — Complete)

- ✓ CMS backend with D1, R2, KV on Cloudflare Workers — v1
- ✓ Admin UI with collection management (HTMX-based) — v1
- ✓ Content CRUD with Quill editor — v1
- ✓ Plugin system with 22 lifecycle hooks — v1
- ✓ Three-tier caching (memory → KV → D1) — v1
- ✓ PBKDF2 auth with JWT, rate limiting, CSRF, CORS — v1
- ✓ Content workflow (publish/unpublish/schedule) — v1
- ✓ Collection-level RBAC — v1
- ✓ R2 media uploads with streaming — v1
- ✓ Hook system with outgoing webhooks — v1
- ✓ Astro 5 SSR frontend on Cloudflare Pages — v1
- ✓ CI/CD via GitHub Actions — v1
- ✓ SonicJS → Flare CMS rebrand complete — v1.2.0

### Active (Docs Site Milestone)

- [ ] New `docs` collection with fields: title, slug, content (rich text), section, order, prev/next
- [ ] New `docs-sections` collection for navigation grouping (name, slug, description, icon, order)
- [ ] Homepage redesign: hero, feature cards, comparison table, CTA (per Stitch v2 mockup)
- [ ] Docs layout: left sidebar nav, breadcrumbs, "On this page" TOC, prev/next navigation
- [ ] Docs detail template: rich content rendering (headings, code blocks with tabs, callout boxes, tables)
- [ ] Search functionality across documentation content
- [ ] Dark theme with brand colors (navy #0F172A, cyan #29BDD9, orange #F5A623)
- [ ] Code block syntax highlighting with copy button
- [ ] Responsive design (mobile sidebar collapse)
- [ ] Getting Started docs (quickstart, installation, project structure)
- [ ] Core Concepts docs (architecture, collections, content workflow, media)
- [ ] API Reference docs (REST endpoints, filtering, authentication, API tokens)
- [ ] Admin docs (dashboard, content management, collection builder, plugins)
- [ ] Security docs (auth system, rate limiting, CSRF, CORS, headers)
- [ ] Plugins docs (plugin system, core plugins, building plugins)
- [ ] Deployment docs (Cloudflare Workers, D1, R2, wrangler config, CI/CD)
- [ ] Configuration docs (environment variables, bindings, settings)
- [ ] Header: logo + nav links (Docs, API, Plugins, GitHub) + search
- [ ] Footer: GitHub, Discord, MIT License, "Built with Flare CMS" badge
- [ ] Seed all documentation content through CMS admin API
- [ ] Deploy updated site to Cloudflare Pages

### Out of Scope

- Blog section — separate milestone after docs site is live
- Community/contributors pages — add when community exists
- npm package publishing — separate concern, not docs site work
- Logo finalization — Jaime's Inkscape SVG, independent of this milestone
- Stitch MCP integration — interesting but not needed for the build
- Pricing page — no paid tier exists yet
- Showcase page — no showcase projects yet
- Dark/light mode toggle — dark mode only for v1 docs

## Context

**Origin:** SonicJS built their docs in Next.js — a project claiming to be for Cloudflare/Astro doesn't use its own product. FlareCMS should dogfood: the docs site IS the proof the product works.

**Design reference:** Stitch v2 mockups at `/stitch-mockups-v2/` — 3 screens: homepage, docs page, docs detail. Dark navy theme with cyan/orange accents. Layout inspired by Astro docs and Tailwind docs.

**Existing site:** `packages/site/` is an Astro 5 SSR frontend with blog, news, pages routes. This milestone evolves it into a docs site while keeping existing functionality.

**Content strategy:** All docs content managed through FlareCMS admin. New collections (`docs`, `docs-sections`) provide structured content. Astro fetches from CMS API and renders with the docs layout.

**Placeholder logo:** SVG at `packages/site/public/logo.svg` — cyan F with orange flare star. Final logo coming from Jaime's Inkscape work.

**Future goals:** Claude for OSS program application (needs polished docs site), npm package publishing, flarecms.dev as the primary project identity.

## Constraints

- **Stack**: Astro 5 + Cloudflare Pages frontend, FlareCMS backend — no other frameworks
- **Content**: 100% CMS-managed — no Astro content collections or static markdown
- **Dogfooding**: Every page must be served from CMS API data — this is the point
- **Solo developer**: Jaime is the only maintainer — favor clean, maintainable templates
- **Budget**: Cloudflare free/Workers Paid tier — no paid external services
- **Design**: Follow Stitch v2 mockups as closely as possible
- **License**: MIT — all docs content is open source

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 100% CMS content, no static markdown | Dogfooding is the core value — proves the product works | — Pending |
| Dark theme only (no light mode toggle) | Simpler, matches brand, developer audience prefers dark | — Pending |
| Two new collections (docs + docs-sections) | Structured nav + content separation, flexible ordering | — Pending |
| Evolve existing packages/site, not rebuild | Leverage existing Astro setup, Cloudflare Pages deploy | — Pending |
| Stitch v2 mockups as design reference | Professional, tested design — saves design iteration time | — Pending |
| Seed docs via API, not manual entry | Reproducible, version-controlled content seeding | — Pending |

---
*Last updated: 2026-03-08 after initialization*
