# Feature Landscape: FlareCMS Documentation Site

**Domain:** Developer documentation website (CMS-powered)
**Researched:** 2026-03-08
**Confidence:** HIGH -- based on direct analysis of 4 production documentation sites
**Reference sites analyzed:** docs.astro.build, tailwindcss.com/docs, hono.dev/docs, developers.cloudflare.com

---

## Context

This research covers features for a **documentation website** for FlareCMS, not the CMS product itself. The docs site will be built with Astro 5, served from Cloudflare Pages, and pull all content from the FlareCMS API (no static markdown files). Target audience: developers evaluating or using FlareCMS.

Design parameters already decided: dark theme, 3-column layout (sidebar, content, TOC), 8 doc sections.

---

## Table Stakes

Features users expect from any modern developer documentation site. Missing any of these and developers will bounce to alternatives or assume the project is immature.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Syntax-highlighted code blocks** | Every reference site has Shiki-powered highlighting. Devs read code constantly -- ugly blocks kill credibility. | Low | Shiki is built into Astro. Use Expressive Code for frames, labels, copy buttons as a single package. |
| **Copy button on code blocks** | All 4 reference sites have this. Devs copy-paste constantly. Missing = friction on every page. | Low | Expressive Code includes this out of the box. Zero custom work. |
| **Left sidebar navigation** | All 4 sites use collapsible sidebar nav with section grouping. Primary way devs orient themselves in docs. | Medium | Must support 8 doc sections with nested pages. Collapsible groups essential. Active page highlighting required. Auto-scroll to current page in sidebar (Tailwind does this well). |
| **Right-side table of contents (TOC)** | Astro, Tailwind, and Hono all show on-page TOC. Devs scan headings to find what they need fast. | Medium | Auto-generated from H2/H3 headings in content. Scroll-spy to highlight current section. Hides on mobile (3rd column disappears). |
| **Search** | All 4 sites have prominent search with Cmd/Ctrl+K shortcut. Devs search before they browse -- this is the #1 navigation method. | High | **Hardest table-stakes feature.** Cannot use Pagefind (requires static build index, but content is CMS-driven). Options: (1) D1 full-text search via CMS API, (2) build search index at content publish time and serve as static JSON, (3) Fuse.js client-side against fetched content. Recommend option 2: build a lightweight JSON search index during Astro build, use Fuse.js client-side. Keeps it zero-infrastructure. |
| **Mobile responsive layout** | All 4 sites are fully responsive. 3-column collapses to single column with hamburger nav. Non-negotiable in 2026. | Medium | Sidebar becomes slide-out drawer on mobile. TOC hides or becomes collapsible section above content. Tailwind's approach is the gold standard. |
| **Dark theme** | All 4 sites support dark mode. Design reference specifies dark theme. Developer tools skew heavily dark-preference. | Low | Ship dark-only for v1 (matches Stitch v2 design reference). Adding light mode later is a differentiator, not a launch blocker. |
| **Heading anchor links** | All 4 sites have clickable anchors on headings for deep linking. Devs share links to specific sections constantly in GitHub issues, Discord, Stack Overflow. | Low | Add `id` attributes to headings, show link icon on hover. Astro has rehype plugins for this. |
| **Prev/Next page navigation** | Astro and Hono have explicit prev/next links at page bottom. Guides devs through sequential reading of getting-started flows. | Low | Requires page ordering metadata from CMS (sort order field per doc page). Simple component at bottom of each page. |
| **Breadcrumbs** | Tailwind, Cloudflare, and Astro all use breadcrumbs. Shows position in doc hierarchy. Especially important with 8 sections. | Low | Generated from section > page path. e.g., "Docs > Core Concepts > Collections". |
| **Callout/admonition boxes** | Astro uses Note, Tip, Caution, Danger with distinct styling. Cloudflare uses warning/info callouts. Essential for highlighting gotchas, warnings, and best practices in technical docs. | Low | 4 types needed: Note (blue/info), Tip (green/success), Caution (yellow/warning), Danger (red/error). Styled boxes with icons. Content authors select callout type in CMS admin. |
| **Tabbed code examples** | All 4 sites use tabs -- package managers (npm/yarn/pnpm/bun) are the universal case. Astro and Tailwind also use tabs for framework variants. | Medium | Tab component that remembers user preference via localStorage (e.g., preferred package manager persists across pages). Must be authorable from CMS -- needs a "tabbed content" block type or similar. |
| **Code block file name labels** | Astro and Tailwind show file paths above code blocks (e.g., `src/pages/index.astro`). Gives essential context for where code goes in a project. | Low | Expressive Code "editor frames" handle this natively. CMS needs a filename/title field per code block. |
| **Responsive tables** | Cloudflare and Astro use tables extensively for API parameters, config options, comparison matrices. Must not break on mobile. | Low | Horizontal scroll wrapper on narrow viewports. Standard CSS solution. |

### Table Stakes Dependency Chain

```
Expressive Code (code blocks) -- no dependencies, integrate first
  +-- Copy button (included with Expressive Code)
  +-- File name labels (included with Expressive Code)
  +-- Tabbed code examples (depends on tab UI component + code blocks)

CMS Doc Collections + Content Model -- foundational, design first
  +-- Sidebar navigation (needs page list + ordering from CMS)
  +-- Breadcrumbs (needs section hierarchy from CMS)
  +-- Prev/Next (needs page ordering from CMS)
  +-- Search index (needs content to index)

TOC generation -- depends on rendered content with heading IDs
Callout boxes -- standalone component, needs CMS field type for callout variant
Heading anchors -- rehype plugin, applied during content rendering
```

---

## Differentiators

Features that set FlareCMS docs apart from other open-source CMS documentation. Not expected on day one, but signal quality and maturity when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"Edit in CMS" link** | Instead of "Edit on GitHub" (Astro, Hono, Cloudflare all have this), link directly to the CMS admin page for the doc. **Dogfoods FlareCMS and proves it works.** This is the single most on-brand differentiator. | Low | Link to `https://flare-cms.jjaimealeman.workers.dev/admin/content/{collection}/{id}/edit`. Trivial to implement, unique selling point. |
| **Light/dark/system theme toggle** | Astro and Tailwind offer 3-way toggle (light/dark/system). Goes beyond dark-only to serve all preferences. | Low | localStorage persistence + `prefers-color-scheme` media query. Low effort for high polish perception. Defer to post-launch only if design system work is needed. |
| **Cmd/Ctrl+K keyboard shortcut for search** | Tailwind and Astro both support this. Power-user feature that signals a polished product. Standard expectation from devs who use VS Code. | Low | Event listener that focuses search input or opens search modal. Small JS addition once search exists. |
| **Code line highlighting** | Astro uses this to draw attention to specific lines (e.g., "notice line 5 where we configure the adapter"). Massively helpful for tutorial-style content. | Low | Expressive Code supports text/line markers out of the box. CMS needs a way to specify highlighted lines per code block (e.g., a `highlight` field: `{3-5, 8}`). |
| **Code diffs (added/removed lines)** | Show what changed between steps in a tutorial. Expressive Code supports diff syntax natively. Astro docs use this effectively in migration guides. | Low | Author marks lines with `+`/`-` prefix in CMS content. Expressive Code renders green/red backgrounds. |
| **Collapsible sections** | Cloudflare uses expandable `<details>` for optional detail ("What files did C3 create?"). Reduces page length for scanners while keeping detail accessible. | Low | HTML `<details>/<summary>` or custom component. CMS needs a "collapsible" content block type. |
| **"Was this helpful?" feedback** | Cloudflare has thumbs up/down per page. Gives signal on which docs need improvement. Actionable data for a small team. | Medium | Needs a simple API endpoint (could be a FlareCMS collection storing feedback). D1 storage. A dashboard in CMS admin to review feedback would complete the loop. |
| **Last updated date** | Shows content freshness. Builds trust that docs are actively maintained -- critical for an early-stage open-source project. | Low | CMS already tracks `updatedAt` on every content item. Just render it. |
| **Reading time estimate** | Common on guides and tutorials. Less relevant on short reference pages but nice on longer walkthroughs. | Low | Word count / 200 WPM. Calculate from content length at render time. Display conditionally (only on pages over ~500 words). |
| **Copy page as markdown** | Cloudflare has "Copy page" -- useful for feeding docs into LLMs, pasting into GitHub issues, or sharing in chat. Increasingly important in the AI era. | Medium | Needs markdown serialization of the rendered page. Non-trivial if content has complex components (tabs, callouts). Could start with plain text copy and improve later. |
| **API reference linked to live Scalar docs** | FlareCMS already has Scalar API docs at `/docs` on the CMS worker. Linking API Reference doc pages to the live interactive Scalar endpoint is zero-effort and high value. | Low | Add "Try it in API Explorer" links that point to existing Scalar UI at `https://flare-cms.jjaimealeman.workers.dev/docs`. No new infrastructure needed. |

---

## Anti-Features

Features to deliberately NOT build for v1. Common mistakes that waste time on documentation site projects.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Doc versioning system** | FlareCMS is pre-2.0. Versioning adds massive complexity: content duplication per version, version-aware routing, version switcher UI, maintaining old versions. Zero users need v0.x docs alongside v1.x docs today. | Add a simple "This doc is for FlareCMS v1.x" badge in the header. Build versioning only when a breaking major version ships and users need to reference the old version. |
| **Full-text search engine (Algolia, Meilisearch, Typesense)** | External search services add infrastructure cost, API keys, index sync pipelines, and vendor lock-in. Overkill for a docs site with ~50-100 pages. | Start with client-side search using Fuse.js against a JSON index built at Astro build time. Upgrade to external search only if the docs grow past ~500 pages and search quality suffers. |
| **Comments / discussion per page** | Devs don't expect inline comments on docs. Adds moderation burden, spam risk, and splits conversation away from GitHub Issues/Discussions where it naturally belongs. | Add "Ask a question" link pointing to GitHub Discussions. Keep discussion centralized. |
| **i18n / multilingual docs** | Astro docs support 20+ languages because they have hundreds of community translators. FlareCMS has a solo maintainer. Translation is ongoing maintenance with no current international user demand. | English only. Add i18n routing infrastructure later if community grows internationally and volunteers offer to translate. |
| **AI chatbot / "Ask AI" widget** | Trendy but unreliable. Hallucinated answers about CMS configuration erode trust. Requires embedding pipeline, vector database, prompt engineering, and ongoing tuning. A wrong answer is worse than no answer. | Good search + well-structured docs beats a chatbot. Revisit when LLM-powered doc search is commoditized (likely 2027+). |
| **Interactive code sandbox (embedded StackBlitz/CodeSandbox)** | Heavy iframes, slow to load, and FlareCMS runs on Cloudflare Workers -- can't easily sandbox the Workers runtime in-browser. Embed size kills page performance. | Link to a GitHub template repository. Provide `npx create-flare-app` CLI experience instead. A "getting started" template repo is more useful than an in-browser sandbox. |
| **User accounts / saved preferences beyond localStorage** | Login for docs is hostile UX. Devs want instant access without creating accounts. Auth adds complexity for zero benefit on a docs site. | Use localStorage for theme preference and package manager tab selection. That's all the personalization needed. |
| **PDF / offline export** | Rarely used, complex to generate from CMS-driven dynamic content, creates a maintenance burden for formatting edge cases. | The website works on mobile. If someone needs offline docs, browser "Save as PDF" or a future CLI `flare docs` command can serve that niche. |
| **Changelog integrated into doc navigation** | Mixing reference docs (stable, topical) with temporal content (releases, changelogs) creates navigation confusion and different content lifecycles. | Keep changelog as a standalone page or link to GitHub Releases. Don't weave it into the 8-section doc hierarchy. |
| **Custom search UI with facets/filters** | Over-engineering search for a docs site. Faceted search (filter by section, version, content type) adds complexity with minimal benefit when the total page count is under 100. | Simple search input with instant results list. Section grouping in results is nice but not required for v1. |

---

## Feature Dependencies

```
Phase 1 -- Content Foundation:
  CMS Doc Collections + Content Model
    +-- defines schema for all doc content types
    +-- required by every rendering and navigation feature
    +-- includes: doc pages, code blocks, callouts, tabs metadata

Phase 2 -- Layout & Navigation:
  3-column layout (sidebar, content, TOC)
    +-- Sidebar navigation (needs CMS page list + sort order)
    +-- Breadcrumbs (needs section > page hierarchy)
    +-- Prev/Next links (needs page ordering from CMS)
    +-- Mobile responsive collapse (needs layout structure first)

Phase 3 -- Content Rendering:
  Expressive Code integration
    +-- Syntax highlighting, copy button, file labels (all included)
    +-- Line highlighting and diffs (included, needs CMS metadata)
  Callout boxes (standalone styled component)
  Tabbed code examples (tab UI component + localStorage persistence)
  Collapsible sections (standalone component)
  Tables with responsive wrapper (CSS only)
  Heading anchor links (rehype plugin)

Phase 4 -- Discovery & Polish:
  Search (build JSON index at build time, Fuse.js client-side)
    +-- Cmd/K shortcut (needs search to exist first)
  TOC with scroll-spy (needs rendered headings with IDs)
  "Edit in CMS" link (needs content ID passed from CMS API)
  Last updated date (needs CMS updatedAt field)
  Reading time estimate (calculate from content)
  Theme toggle (standalone, if adding light mode)
```

---

## MVP Recommendation

For the documentation site MVP, ship all table stakes plus high-value low-effort differentiators.

### Must Ship (Table Stakes)

1. **Syntax-highlighted code blocks** with copy button and file name labels (Expressive Code)
2. **Left sidebar** with collapsible section groups and active page highlighting
3. **Right-side TOC** with scroll-spy highlighting current section
4. **Mobile responsive** 3-column layout that collapses gracefully
5. **Dark theme** (dark-only is fine for v1)
6. **Heading anchor links** for deep linking
7. **Prev/Next page navigation** at bottom of each page
8. **Breadcrumbs** showing section > page path
9. **Callout boxes** -- Note, Tip, Caution, Danger with distinct styling
10. **Tabbed code examples** with localStorage preference persistence
11. **Search** -- at minimum, client-side Fuse.js against build-time JSON index
12. **Responsive tables** with horizontal scroll on mobile

### Ship If Time Allows (High-Value, Low-Effort)

1. **"Edit in CMS" link** -- unique to FlareCMS, trivial to build, proves the product
2. **Last updated date** -- CMS already has the data, just render it
3. **Cmd/Ctrl+K search shortcut** -- tiny JS addition, big polish signal
4. **Code line highlighting and diffs** -- Expressive Code already supports it, just needs CMS metadata
5. **Collapsible sections** -- `<details>` element, minimal effort
6. **Reading time estimate** -- simple calculation, nice touch on longer guides
7. **"Try in API Explorer" links** -- point to existing Scalar docs, zero infrastructure

### Defer to Post-MVP

- Light/dark/system theme toggle (dark-only is acceptable for dev docs v1)
- "Was this helpful?" feedback widget (needs API endpoint + admin dashboard)
- Copy page as markdown (non-trivial serialization)
- Doc versioning (not needed until FlareCMS v2 ships)
- API playground beyond linking to Scalar

---

## Competitive Feature Matrix (Documentation Sites)

How the target feature set compares to the reference sites analyzed.

| Feature | Astro Docs | Tailwind Docs | Hono Docs | CF Dev Docs | FlareCMS Docs (Target) |
|---------|-----------|---------------|-----------|-------------|----------------------|
| Sidebar nav | Yes (collapsible) | Yes (collapsible) | Yes (collapsible) | Yes | Yes |
| TOC (right side) | Yes (scroll-spy) | Yes | Yes | Selective | Yes (scroll-spy) |
| Search | Yes (Cmd+K) | Yes (Cmd+K) | Yes | Yes | Yes (Fuse.js + Cmd+K) |
| Code highlighting | Shiki | Shiki | Shiki | Yes | Expressive Code (Shiki) |
| Copy button | Yes | Yes | Yes | Yes | Yes (Expressive Code) |
| File labels | Yes | Yes | No | Yes | Yes (Expressive Code) |
| Line highlighting | Yes | No | No | No | Yes (Expressive Code) |
| Tabs | Yes | Yes | Yes (pkg mgrs) | Yes (pkg mgrs) | Yes |
| Callouts | Yes (4 types) | Limited | No | Yes | Yes (4 types) |
| Prev/Next | Yes | Sidebar-driven | Yes | No | Yes |
| Breadcrumbs | Yes | Yes | No | Yes | Yes |
| Edit link | GitHub | No | GitHub | GitHub | **CMS Admin** (unique) |
| Dark mode | Toggle | Toggle | Toggle | No toggle | Dark-only (v1) |
| Feedback widget | No | No | No | Yes (thumbs) | Post-MVP |
| Versioning | No | Version badge | No | No | Not needed yet |
| i18n | 20+ languages | No | No | No | No (intentional) |
| Mobile responsive | Yes | Yes | Yes | Yes | Yes |

**Key insight:** The target feature set matches or exceeds Hono's docs (the most minimal reference) and is competitive with Astro and Tailwind docs on all table-stakes features. The "Edit in CMS" link is a unique differentiator that none of the reference sites can offer -- it directly demonstrates FlareCMS's value proposition.

---

## Search Implementation Deep Dive

Search deserves extra attention because it's the highest-complexity table-stakes feature, and the CMS-driven content model rules out the most common solution (Pagefind).

### Why Pagefind Won't Work

Pagefind indexes static HTML files after build. But FlareCMS docs content comes from the CMS API at build time -- the content exists as API responses, not markdown files. While Astro does render HTML, the Pagefind indexing step adds build complexity and may not play well with SSR mode on Cloudflare Pages.

### Recommended Approach: Build-Time JSON Index + Fuse.js

1. During Astro build, fetch all doc pages from CMS API
2. Extract title, headings, plain text content, section, URL for each page
3. Write a `search-index.json` file to the build output
4. Client-side: load `search-index.json` on first search interaction (lazy load)
5. Use Fuse.js for fuzzy matching with weighted fields (title > headings > body)
6. Display results in a modal with section grouping

**Advantages:** Zero infrastructure, works on Cloudflare Pages, fast for <100 pages, no API calls at search time.

**Limitations:** Index is stale until next build. For a docs site that changes infrequently, this is acceptable. Add a webhook from CMS to trigger Pages rebuild on content publish.

### Alternative: CMS API Search Endpoint

If real-time search is needed later, FlareCMS could expose a search endpoint using D1's FTS5 (full-text search) extension. This would be a CMS product feature, not a docs site feature -- and would benefit all FlareCMS users, not just the docs site.

---

## Sources

- [Astro Documentation](https://docs.astro.build) -- analyzed navigation, code blocks, callouts, TOC, i18n, prev/next, theme toggle
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) -- analyzed search UX, tabbed content, step-by-step guides, version display, sidebar auto-scroll
- [Hono Documentation](https://hono.dev/docs) -- analyzed minimal effective docs pattern, edit on GitHub, prev/next, sidebar structure
- [Cloudflare Developer Docs](https://developers.cloudflare.com) -- analyzed breadcrumbs, feedback widget, collapsible sections, callouts, API parameter tables, "copy page" feature
- [Expressive Code](https://expressive-code.com/key-features/syntax-highlighting/) -- Shiki-powered code block toolkit with editor frames, copy buttons, text/line markers, diff rendering
- [Pagefind](https://pagefind.app/) -- client-side static search (not suitable for CMS-driven content but informed UX expectations)
- [Docusaurus Versioning](https://docusaurus.io/docs/versioning) -- rationale for why doc versioning is premature for early-stage projects
- [Fuse.js](https://www.fusejs.io/) -- lightweight client-side fuzzy search library (implicit recommendation based on ecosystem knowledge, MEDIUM confidence)
