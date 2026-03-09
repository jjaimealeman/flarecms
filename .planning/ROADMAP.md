# Roadmap: Flare CMS Documentation Site

## Overview

Transform the existing Astro 5 frontend into a full documentation website for Flare CMS, with all content managed through the CMS itself (100% dogfooding). The build progresses from CMS content foundation through layout, rendering, and site shell to documentation authoring and search — each phase delivering a coherent, verifiable capability that unblocks the next. The dependency chain is strict: collections must exist before layout can fetch data, layout must exist before content renders into it, and content must exist before search can index it.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: CMS Content Foundation** - Collections, schemas, and EasyMDE editor for code-heavy docs
- [x] **Phase 2: Docs Layout & Navigation** - API layer, 3-column layout shell, sidebar, breadcrumbs, prev/next
- [x] **Phase 3: Content Rendering & Route** - Catch-all route, Shiki highlighting, copy buttons, callouts, tabs
- [x] **Phase 4: Site Shell & Homepage** - Header, footer, homepage redesign, SEO, "Edit in CMS" links
- [ ] **Phase 5: Documentation Content** - Author and seed all 8 documentation sections via API script
- [ ] **Phase 6: Search & Deploy** - MiniSearch with Cmd+K and production deployment to Cloudflare Pages

## Phase Details

### Phase 1: CMS Content Foundation
**Goal**: Docs and docs-sections collections exist in the CMS with a validated EasyMDE editor workflow for code-heavy documentation content
**Depends on**: Nothing (first phase)
**Requirements**: CMS-01, CMS-02, CMS-03
**Success Criteria** (what must be TRUE):
  1. Admin user can create a docs-sections entry with name, slug, description, icon, and order fields in the CMS admin UI
  2. Admin user can create a docs entry with title, slug, content (markdown), section reference, order, and prev/next fields
  3. Admin user can write markdown with fenced code blocks in 5+ languages using EasyMDE — content round-trips correctly (create, save, reload, edit)
  4. Content with code examples, blockquote-based callouts, and tables renders correctly when fetched via the REST API
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Create docs-sections and docs collections, register in CMS, fix FieldType union
- [x] 01-02-PLAN.md — Enhance EasyMDE with code block button and R2 image upload, verify full workflow

### Phase 2: Docs Layout & Navigation
**Goal**: A visitor navigating to /docs sees a responsive 3-column layout with working sidebar navigation, breadcrumbs, and prev/next links — all generated from CMS data
**Depends on**: Phase 1
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. Visitor sees a 3-column layout (sidebar, content area, TOC placeholder) at desktop widths, 2-column at tablet, and single-column with hamburger menu on mobile
  2. Left sidebar shows navigation grouped by docs-sections with collapsible groups and active page highlighting, generated entirely from CMS API data
  3. Breadcrumbs display the path Docs > Section Name > Page Title on every docs page
  4. Prev/next navigation at the bottom of each docs page links to the correct adjacent pages based on section and order
  5. Mobile sidebar collapses to a hamburger toggle and content reflows to full width
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Data layer (API functions, nav tree builder) and layout/navigation components (DocsLayout, sidebar, breadcrumbs, prev/next)
- [x] 02-02-PLAN.md — Route wiring (docs landing page, catch-all route) and visual verification

### Phase 3: Content Rendering & Route
**Goal**: A visitor can read any docs page with properly highlighted code blocks, copy buttons, callout boxes, and tabbed code examples
**Depends on**: Phase 2
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04
**Success Criteria** (what must be TRUE):
  1. Code blocks render with Shiki syntax highlighting in a dark theme matching the site palette, with language labels visible
  2. Every code block has a copy button that copies the code content to clipboard on click
  3. Callout boxes (info, warning, tip, caution) render with distinct icons, colors, and styling when authored as blockquotes with a prefix convention
  4. Tabbed code examples (TypeScript/JavaScript) switch between variants on click and persist the user's language preference across pages
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Unified/rehype rendering pipeline (Shiki, callouts, heading anchors) + CSS styling + route wiring
- [x] 03-02-PLAN.md — Table of Contents component + client-side scripts (copy, tabs, scroll-spy, lightbox)
- [x] 03-03-PLAN.md — Visual verification of all rendering features

### Phase 4: Site Shell & Homepage
**Goal**: The site has a polished header, footer, redesigned homepage per Stitch v2 mockups, proper SEO metadata, and "Edit in CMS" links on every docs page
**Depends on**: Phase 1 (homepage uses CMS data), Phase 3 (docs pages must exist for "Edit in CMS")
**Requirements**: SITE-01, SITE-03, SITE-04, SITE-05, SITE-06
**Success Criteria** (what must be TRUE):
  1. Header displays logo, navigation links (Docs, Blog, GitHub), search placeholder, and CTA buttons across all pages
  2. Footer displays GitHub link, MIT License badge, "Built with Flare CMS" badge, and legal page links across all pages
  3. Homepage shows hero section, feature cards, comparison table, and CTA per Stitch v2 mockup with dark navy/cyan/orange theme
  4. Every docs page has an "Edit in CMS" link that opens the correct admin edit URL for that content item
  5. Every page has proper meta tags and Open Graph tags, and the site generates an auto-updated sitemap
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — SEO component, Edit-in-CMS component, sitemap endpoint, astro.config site property
- [x] 04-02-PLAN.md — Layout.astro header/footer redesign with mobile nav, SEO integration, legal pages
- [x] 04-03-PLAN.md — Homepage redesign: Hero, Features, ComparisonTable, CTA per Stitch v2 mockups

### Phase 5: Documentation Content
**Goal**: All 8 documentation sections are authored with substantive technical content and seeded via a reproducible API script
**Depends on**: Phase 3 (rendering pipeline must work), Phase 4 (site shell for full visual context)
**Requirements**: CMS-04, DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08
**Success Criteria** (what must be TRUE):
  1. A reproducible seed script populates all documentation content via the CMS API and can be re-run to reset content to a known state
  2. Getting Started section has quickstart, installation, and project structure pages that a new developer can follow from zero to a running FlareCMS instance
  3. All 8 documentation sections (Getting Started, Core Concepts, API Reference, Admin, Security, Plugins, Deployment, Configuration) are navigable from the sidebar and contain substantive, accurate technical content
  4. Code examples in docs are accurate and reflect the current FlareCMS API surface
**Plans**: 5 plans

Plans:
- [ ] 05-01-PLAN.md — Seed script, prompt generator, content directory structure with 8 section metadata files
- [ ] 05-02-PLAN.md — Author Getting Started (3 pages), Core Concepts (4 pages), Configuration (3 pages)
- [ ] 05-03-PLAN.md — Author Admin (5 pages), API Reference (4 pages)
- [ ] 05-04-PLAN.md — Author Plugins (3 pages), Security (4 pages), Deployment (5 pages)
- [ ] 05-05-PLAN.md — Run seed script, verify all content renders, confirm idempotency

### Phase 6: Search & Deploy
**Goal**: Visitors can search all documentation content via keyboard shortcut and the complete docs site is live on Cloudflare Pages
**Depends on**: Phase 5 (search needs content to index, deploy needs everything complete)
**Requirements**: SITE-02, DEPLOY-01
**Success Criteria** (what must be TRUE):
  1. Visitor can press Cmd/Ctrl+K to open a search modal and find docs pages by title or content with fuzzy matching
  2. Search results show relevant page titles with section context and link directly to the correct docs page
  3. The complete docs site is deployed to Cloudflare Pages with all routes functional — homepage, all docs pages, and search working in production
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CMS Content Foundation | 2/2 | Complete | 2026-03-08 |
| 2. Docs Layout & Navigation | 2/2 | Complete | 2026-03-08 |
| 3. Content Rendering & Route | 3/3 | Complete | 2026-03-08 |
| 4. Site Shell & Homepage | 3/3 | Complete | 2026-03-08 |
| 5. Documentation Content | 0/5 | Not started | - |
| 6. Search & Deploy | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-08*
*Coverage: 28/28 v1 requirements mapped*
