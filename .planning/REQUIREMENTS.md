# Requirements: Flare CMS — Documentation Site

**Defined:** 2026-03-08
**Core Value:** Prove that Flare CMS works by using it to power its own documentation

## v1 Requirements

### Content Model

- [ ] **CMS-01**: `docs` collection created with fields: title, slug, content (markdown), section, order, prev/next
- [ ] **CMS-02**: `docs-sections` collection created with fields: name, slug, description, icon, order
- [ ] **CMS-03**: EasyMDE (markdown) editor configured for docs collection instead of Quill
- [ ] **CMS-04**: All documentation content seeded via reproducible API script

### Layout & Navigation

- [ ] **NAV-01**: 3-column responsive layout (sidebar, content, TOC) per Stitch v2 mockups
- [ ] **NAV-02**: Left sidebar navigation generated from CMS docs-sections data with collapsible sections and active state
- [ ] **NAV-03**: Breadcrumbs showing Docs > Section > Page path
- [ ] **NAV-04**: Prev/next navigation at bottom of each docs page
- [ ] **NAV-05**: Mobile responsive — sidebar collapses to hamburger menu, content reflows, TOC hidden/expandable on small screens

### Content Rendering

- [ ] **RENDER-01**: Syntax highlighting via Shiki with dark theme matching site palette
- [ ] **RENDER-02**: Code copy button on all code blocks
- [ ] **RENDER-03**: Callout boxes (info, warning, tip, caution) with distinct icons and styling
- [ ] **RENDER-04**: Tabbed code examples (TypeScript/JavaScript) per Stitch v2 mockups

### Site

- [ ] **SITE-01**: Homepage redesign with hero, feature cards, comparison table, CTA per Stitch v2 mockup
- [ ] **SITE-02**: Client-side search with MiniSearch and Cmd+K keyboard shortcut
- [ ] **SITE-03**: "Edit in CMS" link on every docs page linking to admin edit URL
- [ ] **SITE-04**: SEO — auto-generated sitemap, proper meta tags, Open Graph tags per page
- [ ] **SITE-05**: Header with logo, nav links (Docs, API, Plugins, GitHub), search bar
- [ ] **SITE-06**: Footer with GitHub, Discord, MIT License badge, "Built with Flare CMS" badge

### Documentation Content

- [ ] **DOCS-01**: Getting Started docs (quickstart, installation, project structure)
- [ ] **DOCS-02**: Core Concepts docs (architecture, collections, content workflow, media)
- [ ] **DOCS-03**: API Reference docs (REST endpoints, filtering, authentication, API tokens)
- [ ] **DOCS-04**: Admin docs (dashboard, content management, collection builder, plugins)
- [ ] **DOCS-05**: Security docs (auth system, rate limiting, CSRF, CORS, security headers)
- [ ] **DOCS-06**: Plugins docs (plugin system, core plugins, building custom plugins)
- [ ] **DOCS-07**: Deployment docs (Cloudflare Workers, D1, R2, wrangler config, CI/CD)
- [ ] **DOCS-08**: Configuration docs (environment variables, bindings, settings)

### Deployment

- [ ] **DEPLOY-01**: Deploy updated site to Cloudflare Pages with docs routes live

## v2 Requirements

### Blog

- **BLOG-01**: Blog collection and listing/detail pages
- **BLOG-02**: Blog categories and tag filtering
- **BLOG-03**: RSS feed

### Community

- **COMM-01**: Contributors page
- **COMM-02**: Discord integration widget
- **COMM-03**: Changelog page (auto-generated from git)

### Advanced Docs

- **ADV-01**: Version selector (docs per CMS version)
- **ADV-02**: Interactive API playground / try-it-out
- **ADV-03**: Dark/light mode toggle

### Distribution

- **DIST-01**: npm package publishing guide
- **DIST-02**: `npx create-flare-app` CLI scaffolding tool

## Out of Scope

| Feature | Reason |
|---------|--------|
| Starlight integration | Incompatible — requires build-time markdown, not runtime CMS content |
| Astro Content Collections | Build-time only — we need SSR fetching from CMS API |
| Pagefind search | Requires build-time HTML crawling — incompatible with CMS-driven content |
| i18n / localization | No international audience yet — add when demand exists |
| AI chatbot for docs | High complexity, low value at current scale |
| Pricing page | No paid tier exists |
| Showcase page | No showcase projects exist yet |
| Static markdown fallback | Defeats dogfooding purpose — 100% CMS or nothing |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CMS-01 | TBD | Pending |
| CMS-02 | TBD | Pending |
| CMS-03 | TBD | Pending |
| CMS-04 | TBD | Pending |
| NAV-01 | TBD | Pending |
| NAV-02 | TBD | Pending |
| NAV-03 | TBD | Pending |
| NAV-04 | TBD | Pending |
| NAV-05 | TBD | Pending |
| RENDER-01 | TBD | Pending |
| RENDER-02 | TBD | Pending |
| RENDER-03 | TBD | Pending |
| RENDER-04 | TBD | Pending |
| SITE-01 | TBD | Pending |
| SITE-02 | TBD | Pending |
| SITE-03 | TBD | Pending |
| SITE-04 | TBD | Pending |
| SITE-05 | TBD | Pending |
| SITE-06 | TBD | Pending |
| DOCS-01 | TBD | Pending |
| DOCS-02 | TBD | Pending |
| DOCS-03 | TBD | Pending |
| DOCS-04 | TBD | Pending |
| DOCS-05 | TBD | Pending |
| DOCS-06 | TBD | Pending |
| DOCS-07 | TBD | Pending |
| DOCS-08 | TBD | Pending |
| DEPLOY-01 | TBD | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 28

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after initial definition*
