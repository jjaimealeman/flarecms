# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Prove that Flare CMS works by using it to power its own documentation
**Current focus:** Phase 4 in progress — Site Shell & Homepage

## Current Position

Phase: 4 of 6 (Site Shell & Homepage)
Plan: 3 of 3 in current phase (wave 2)
Status: In progress (04-02 may still be running in parallel)
Last activity: 2026-03-08 — Completed 04-03-PLAN.md

Progress: [██████████████████████████████████████░░] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: ~11 min
- Total execution time: ~123 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | ~48min | ~24min |
| 2 | 2 | ~11min | ~5.5min |
| 3 | 3 | ~54min | ~18min |
| 4 | 2 | ~5min | ~2.5min |

**Recent Trend:**
- Last 5 plans: 03-01 (5min), 03-02 (4min), 03-03 (45min), 04-01 (3min), 04-03 (2min)
- Trend: Human verification plans take longest due to interactive bug fixing

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Research]: EasyMDE for docs editor, not Quill — Quill cannot handle code-heavy content
- [Research]: MiniSearch for search, not Pagefind/Fuse.js — Pagefind incompatible with SSR
- [Research]: unified/rehype pipeline for HTML processing
- [Research]: No client-side framework — vanilla JS for interactive behaviors
- [01-01]: Added quill/tinymce to FieldType union
- [01-01]: Collection registration order matters: parent before child
- [01-02]: images.flarecms.dev custom domain for R2 media URLs
- [02-01]: Nav tree uses content ID matching
- [02-01]: Hardcoded slug-to-Lucide-icon map with book-open fallback
- [02-02]: Page title rendered as h1 from data, not from markdown content
- [03-01]: Shiki JS engine (not WASM) for Cloudflare Workers compatibility
- [03-01]: Dual themes catppuccin-mocha/latte with CSS variables
- [03-01]: rehype-callouts github theme with dark slate palette overrides
- [03-01]: Tab group plugin uses data-tab meta string with category inference
- [03-02]: All client interactivity via vanilla JS inline scripts
- [03-02]: Tab preferences stored as JSON in localStorage
- [03-03]: rehypeRaw must come AFTER rehypePrettyCode to preserve meta strings
- [03-03]: Shiki CSS targets [data-rehype-pretty-code-figure] spans, not .shiki class
- [03-03]: Inline code excluded from rehype-pretty-code processing
- [03-03]: CMS content \r\n normalized to \n before pipeline processing
- [03-03]: TOC active state uses toc-active CSS class with orange border-left + indent
- [04-01]: Custom SEO component (no astro-seo dependency)
- [04-01]: Custom SSR sitemap endpoint (not @astrojs/sitemap — incompatible with server mode)
- [04-01]: Default OG image is /logo.svg until custom OG image created
- [04-03]: Responsive comparison uses card layout on mobile instead of table
- [04-03]: Features reduced from 6 to 4 cards to match Stitch v2 mockup
- [04-03]: Stats and BlogPreview removed from homepage but files preserved

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Broken API filters force client-side filtering — follow existing pattern, mitigate with KV caching
- [Phase 1]: Local wrangler dev uploads to local R2 — expected, works in production
- [Phase 1]: "New Content" collection picker page UX is poor (inherited SonicJS) — not blocking
- [Phase 2]: Header nav overflows at mobile widths — Phase 4 will add mobile hamburger
- [Phase 2]: Blog post link goes to /blog/undefined — pre-existing slug bug
- [Phase 3]: Astro SSR dev server slow to reflect changes (~30s for Shiki singleton reinit) — dev experience only
- [Phase 3]: D1 audit trail error (missing changed_fields column) — pre-existing migration issue

## Session Continuity

Last session: 2026-03-08
Stopped at: Completed 04-03-PLAN.md
Resume file: None
