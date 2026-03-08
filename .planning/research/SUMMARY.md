# Project Research Summary

**Project:** Flare CMS -- Documentation Site
**Domain:** CMS-driven developer documentation website
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

This project adds a documentation website to the existing Astro 5 frontend (`packages/site/`), with all content managed through FlareCMS itself (100% dogfooding). The research confirms that the standard docs-site toolchain (Starlight, Content Collections, Pagefind) is architecturally incompatible with CMS-driven SSR content -- all of these are build-time constructs. Instead, the docs site should be built as standard Astro pages fetching from the FlareCMS REST API, with a unified/rehype pipeline for HTML processing, Shiki for syntax highlighting, and MiniSearch for client-side search. Two new CMS collections (`docs` and `docs-sections`) provide all content and navigation structure.

The recommended approach is a 3-column layout (sidebar, content, TOC) rendered entirely server-side with zero client-side framework dependencies. The existing `flare.ts` API client pattern extends naturally to docs, and the proven blog prose styling transfers directly. The architecture is straightforward -- the real complexity is in content authoring, not rendering.

The biggest risk is the Quill editor. Quill cannot specify code block languages, has no callout/admonition support, and has known bugs with code block formatting. For a documentation site that is 60%+ code examples, this is a blocker. The decision on editor strategy (Quill with custom blots, EasyMDE markdown, or a hybrid approach) must happen before any content is written. Secondary risks are SSR performance without caching (every page request fetches all docs from the API) and the broken API filters that force client-side filtering -- both solvable with KV caching.

## Key Findings

### Recommended Stack

The existing Astro 5 + Tailwind v4 + Cloudflare Pages stack is unchanged. New dependencies are limited to HTML processing and search. No docs framework (Starlight) or content system (Content Collections) is used -- both are build-time only and incompatible with SSR + CMS content.

**Core technologies:**
- **unified/rehype pipeline** (7 packages): HTML sanitization, heading IDs, anchor links, external link safety, code highlighting -- all in one pass. Pure JS, runs on Cloudflare Workers.
- **Shiki** (built into Astro): Syntax highlighting via `codeToHtml()` programmatic API. No install needed. Use `github-dark` theme.
- **MiniSearch** (~7KB): Client-side full-text search with fuzzy matching and relevance ranking. Pagefind is incompatible with SSR; Fuse.js has poor ranking on docs content.
- **@astrojs/sitemap**: Standard SEO integration for dynamic page URLs.
- **No navigation library**: Sidebar, breadcrumbs, prev/next are all CMS-driven data rendered as pure Astro components.

**Critical "not" decisions:**
- NOT Starlight (build-time markdown, not CMS content)
- NOT Astro Content Collections (build-time only)
- NOT Pagefind (requires static HTML to crawl)
- NOT Expressive Code for v1 (Shiki's programmatic API is simpler for CMS HTML)
- NOT any client-side UI framework (vanilla JS for 3 interactive behaviors)

### Expected Features

**Must have (table stakes):**
- Syntax-highlighted code blocks with copy button and file labels
- Left sidebar navigation with collapsible sections, active page highlighting
- Right-side TOC with scroll-spy
- Mobile responsive 3-column layout
- Dark theme (dark-only for v1)
- Heading anchor links for deep linking
- Prev/next page navigation
- Breadcrumbs
- Callout boxes (Note, Tip, Caution, Danger)
- Search with Cmd/Ctrl+K shortcut
- Tabbed code examples with localStorage persistence
- Responsive tables

**Should have (differentiators):**
- "Edit in CMS" link (unique -- dogfoods the product, replaces "Edit on GitHub")
- Last updated date (CMS already tracks `updatedAt`)
- "Try in API Explorer" links (points to existing Scalar docs, zero infrastructure)
- Reading time estimate
- Collapsible sections
- Code line highlighting and diffs

**Defer (v2+):**
- Light/dark/system theme toggle
- "Was this helpful?" feedback widget
- Copy page as markdown
- Doc versioning (not needed until FlareCMS v2)
- i18n / multilingual
- AI chatbot
- Interactive code sandbox
- User accounts

### Architecture Approach

A catch-all route (`docs/[...slug].astro`) handles all doc URLs, fetching sections and docs from the CMS API, building the nav tree, extracting TOC from headings, and rendering into a `DocsLayout.astro` 3-column grid. All components are `.astro` files with no client-side framework. The data layer splits cleanly: `flare.ts` for API calls, `docs-utils.ts` for pure transformation functions (nav tree, TOC extraction, heading IDs, prev/next resolution).

**Major components:**
1. **CMS Collections** (`docs`, `docs-sections`) -- content and navigation structure, with `sortOrder` fields for explicit ordering
2. **API Client** (`flare.ts` extensions) -- `getDocSections()`, `getDocs()`, `getDocBySlug()` following existing patterns (fetch all, filter client-side)
3. **Data Utilities** (`docs-utils.ts`) -- `buildNavTree()`, `extractTOC()`, `addHeadingIds()`, `resolveAdjacentDocs()`
4. **Layout** (`DocsLayout.astro`) -- 3-column grid with responsive breakpoints (3-col at 1280px+, 2-col at 768px+, 1-col below)
5. **Page Route** (`docs/[...slug].astro`) -- orchestrates data fetching, processing, and rendering
6. **UI Components** -- DocsSidebar, DocsTOC, DocsContent, DocsPrevNext, DocsBreadcrumb, DocsMobileNav

### Critical Pitfalls

1. **Quill cannot handle code-heavy documentation** -- No language specification for code blocks, known formatting bugs, no callout support. Decide on editor strategy (EasyMDE markdown or custom Quill blots) before writing any content. This is a Phase 1 blocker.
2. **SSR without caching kills performance** -- Every page request fetches all docs from the API. Implement KV caching or hybrid rendering before public launch. The broken API filters compound this (full collection fetched every time).
3. **No callout/admonition primitives** -- Neither Quill nor EasyMDE has built-in callout support. Define a convention (e.g., blockquote with `**Warning:**` prefix) and implement a render-side transform. Decide in Phase 1.
4. **Navigation ordering requires explicit schema design** -- CMS content has no inherent order. The `sortOrder` string field with gap numbering (10, 20, 30) is designed into the architecture but must be enforced from day 1.
5. **Expectation gap with static docs frameworks** -- Docusaurus and VitePress provide search, tabs, callouts, and TOC for free. A CMS-driven site builds every feature from scratch. Scope aggressively and ship iteratively.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: CMS Content Foundation
**Rationale:** Every frontend feature depends on CMS collections existing with seed data. The editor strategy decision (Quill vs EasyMDE) is a blocker that must be resolved before any content authoring.
**Delivers:** `docs` and `docs-sections` collections, seed content (2 sections, 3-5 pages), validated editor workflow for code-heavy docs.
**Addresses:** Content model, navigation ordering, editor strategy
**Avoids:** Pitfall 1 (Quill code blocks), Pitfall 2 (no callouts), Pitfall 4 (nav ordering)

### Phase 2: API Layer and Data Utilities
**Rationale:** All UI components consume these functions. Getting the data layer right before building UI prevents rework.
**Delivers:** Doc types in `flare.ts`, API functions (`getDocSections`, `getDocs`, `getDocBySlug`), utility functions (`buildNavTree`, `extractTOC`, `addHeadingIds`, `resolveAdjacentDocs`)
**Uses:** Existing `flare.ts` patterns, unified/rehype pipeline
**Avoids:** Pitfall 9 (broken filters -- follow existing client-side filtering pattern)

### Phase 3: Layout and Navigation Shell
**Rationale:** The 3-column layout must exist before the route can render into it. Sidebar and TOC components need the types from Phase 2.
**Delivers:** `DocsLayout.astro`, `DocsSidebar.astro`, `DocsTOC.astro`, `DocsBreadcrumb.astro`, responsive grid, mobile nav toggle
**Implements:** 3-column architecture with responsive breakpoints

### Phase 4: Route and Content Rendering
**Rationale:** Integration point -- orchestrates all previous phases. Cannot build until layout, utilities, and CMS content all exist.
**Delivers:** `docs/[...slug].astro` catch-all route, `DocsContent.astro` with prose styling, `DocsPrevNext.astro`, delete old `docs.astro`
**Uses:** Shiki for syntax highlighting, rehype pipeline for HTML processing

### Phase 5: Search, Polish, and Performance
**Rationale:** Enhancement layer on top of working docs site. Search is the highest-complexity table-stakes feature but is not a blocker for initial content viewing.
**Delivers:** MiniSearch integration, Cmd/K shortcut, "Edit in CMS" links, last updated date, reading time, KV caching for API responses, callout styling, code copy buttons, TOC scroll-spy
**Avoids:** Pitfall 3 (no caching), Pitfall 6 (no search)

### Phase Ordering Rationale

- CMS collections first because nothing can be tested without content to fetch
- Data layer before UI because all components consume the same utility functions
- Layout before route because the route renders into the layout
- Search and caching last because they are enhancements to an already-functional docs site
- This order matches the architecture's dependency chain exactly (verified in ARCHITECTURE.md build order)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Editor strategy needs hands-on testing. Create test docs with code in 5 languages, verify round-trip fidelity. If Quill fails, pivot to EasyMDE -- this changes content processing in Phase 4.
- **Phase 5 (Search):** MiniSearch integration with SSR needs validation. The search index endpoint (build-time JSON vs runtime API) needs a concrete implementation plan.
- **Phase 5 (Caching):** KV caching strategy needs specifics -- TTL, cache invalidation on content publish, stale-while-revalidate pattern.

Phases with standard patterns (skip research-phase):
- **Phase 2:** API client extensions follow the exact existing `flare.ts` pattern. Well-documented in codebase.
- **Phase 3:** 3-column CSS grid layout is standard Tailwind. Responsive breakpoints are well-established patterns.
- **Phase 4:** Catch-all route with SSR rendering follows existing blog page patterns in the codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against Astro docs, Cloudflare Workers compatibility confirmed, all packages are pure JS |
| Features | HIGH | Based on direct analysis of 4 production docs sites (Astro, Tailwind, Hono, Cloudflare) |
| Architecture | HIGH | Based on existing codebase patterns -- extends proven blog/pages architecture |
| Pitfalls | HIGH | Critical pitfalls verified against source code and GitHub issues; Quill limitations confirmed |

**Overall confidence:** HIGH

### Gaps to Address

- **Editor strategy validation:** The Quill vs EasyMDE decision cannot be made from research alone. Requires hands-on testing with code-heavy docs content during Phase 1. Build a test doc with 5 code blocks in different languages, a callout, and a table -- see which editor workflow is acceptable.
- **Search index freshness:** MiniSearch with a build-time JSON index means search is stale until the next build. Need to decide: (a) accept staleness with periodic rebuilds, (b) add a CMS webhook to trigger rebuilds on publish, or (c) build a runtime search endpoint.
- **Caching implementation details:** KV caching is recommended but specifics (TTL, invalidation, cache key strategy) need to be defined during Phase 5 planning.
- **Quill XSS vulnerability (CVE-2025-15056):** rehype-sanitize handles this on the render side, but the CMS admin itself may be vulnerable. Not a docs-site concern but worth noting.
- **FEATURES.md vs STACK.md search library disagreement:** FEATURES.md recommends Fuse.js, STACK.md recommends MiniSearch. Go with MiniSearch -- it has better full-text ranking for documentation content. Fuse.js is fuzzy-match only and produces poor results on docs.

## Sources

### Primary (HIGH confidence)
- Astro Syntax Highlighting Docs -- Shiki built-in, `<Code />` component
- Astro Content Loader Reference -- confirmed build-time only behavior
- FlareCMS source code (`flare.ts`, `blog-posts.collection.ts`, `Layout.astro`, `global.css`, `quill-editor/index.ts`) -- existing patterns
- CLAUDE.md known bugs -- API filters, one-way status, soft-delete cascade
- rehype-sanitize, rehype-slug GitHub repos -- HTML processing capabilities
- Quill GitHub issues #4300, #4448, #2772 -- code block bugs and language selection limitations
- Astro Docs, Tailwind Docs, Hono Docs, Cloudflare Dev Docs -- feature landscape analysis

### Secondary (MEDIUM confidence)
- MiniSearch GitHub -- zero-dep search library
- npm-compare: fuse.js vs flexsearch vs minisearch -- feature comparison
- Starlight CMS Discussion #1790 -- community confirms CMS content source limitations
- Cloudflare Pages SSR caching community discussion
- LaunchFa.st ISR with Cloudflare KV pattern
- Expressive Code documentation -- deferred to post-v1

### Tertiary (LOW confidence)
- Search library comparison requires hands-on validation during Phase 5 planning

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
