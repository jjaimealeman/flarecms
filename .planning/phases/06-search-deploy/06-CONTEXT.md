# Phase 6: Search & Deploy - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Cmd/Ctrl+K search modal powered by MiniSearch indexing all CMS content, plus production deployment verification with seeded content. The site is already live at flarecms.dev with CI/CD via GitHub Actions — "deploy" means ensuring search works in production and content is seeded.

</domain>

<decisions>
## Implementation Decisions

### Search modal UX
- Dropdown from header (not centered overlay) — keeps page context visible
- Full-screen takeover on mobile
- Arrow keys + Enter for keyboard navigation, Escape to close

### Search results display
- Each result shows: page title, section badge, and content snippet with match highlighting
- Results grouped by section (Getting Started, API Reference, etc.)
- 8-10 results visible before scrolling
- Empty state: "No results" message + curated list of popular/top docs pages

### Index scope & freshness
- Index ALL CMS-managed content: docs, blog, and any future collections
- Full-depth indexing — prose, code blocks, headings, function names, everything
- Heading-level granularity: results can deep-link to h2/h3 anchors (e.g., /docs/api#authentication)
- No content excluded — users should find everything they need without leaving the site
- Index freshness: Claude's discretion (SSR architecture informs the approach)

### Deploy & verification
- Site already live at flarecms.dev, CMS at admin.flarecms.dev
- CI/CD already configured (push to main triggers deploy)
- Run seed script against production to populate docs content
- Seed script production safety: Claude's discretion on safest approach
- Post-deploy verification: automated URL/status checks + manual visual spot-check

### Claude's Discretion
- Search trigger method (Cmd/Ctrl+K + click placeholder — standard modern pattern)
- Index freshness strategy (server-side vs client-side, rebuild timing)
- Seed script production flag design
- Modal animations and transitions
- Search debounce timing and fuzzy match sensitivity

</decisions>

<specifics>
## Specific Ideas

- "Users should know they can find everything they need on our docs and reference pages and have all their solutions and answers, without having to ask ChatGPT or Gemini"
- SonicJS has no search system like this — this is a differentiator for Flare CMS
- Search should cover method names and code examples so developers can find API surface by searching function/method names

</specifics>

<deferred>
## Deferred Ideas

- **User roles & permissions (RBAC)** — Admin, editor, viewer roles with per-collection access control (e.g., John can only edit Blog, Mary can only edit News, Ralph can edit both). Significant core feature, its own phase.
- **Public demo site** — demo.flarecms.dev with demo credentials (demo@flarecms.dev / demo123), 24hr cron wipe/reseed so anyone can try the CMS without cloning. Own deployment + infrastructure phase.
- **Live editing showcase** — Dedicated page users can edit live to see how easy the CMS is. Depends on roles existing first.
- **Semantic/vector search** — Cloudflare Vectorize + Workers AI embeddings for "similar meaning" search and "did you mean" suggestions. Future enhancement phase.

</deferred>

---

*Phase: 06-search-deploy*
*Context gathered: 2026-03-08*
