# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-08)

**Core value:** Prove that Flare CMS works by using it to power its own documentation
**Current focus:** Phase 5 — Documentation Content

## Current Position

Phase: 5 of 6 (Documentation Content)
Plan: 4 of 5 in current phase
Status: In progress — Plan 05-04 complete
Last activity: 2026-03-08 — Completed 05-04-PLAN.md

Progress: [███████████████████████████████████████░] 93%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: ~11 min
- Total execution time: ~160 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | ~48min | ~24min |
| 2 | 2 | ~11min | ~5.5min |
| 3 | 3 | ~54min | ~18min |
| 4 | 3 | ~10min | ~3.3min |
| 5 | 4 | ~32min | ~8min |

**Recent Trend:**
- Last 5 plans: 04-03 (2min), 05-01 (4min), 05-02 (9min), 05-03 (9min), 05-04 (10min)
- Trend: Content authoring plans ~9-10min due to extensive source reading

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
- [04-02]: navLinks trimmed to Docs and Blog only (removed News, Changelog, About)
- [04-02]: Search placeholder visual-only with Cmd+K badge (Phase 6 implements)
- [04-02]: site-mobile-* IDs for Layout mobile menu (distinct from docs-mobile-* in DocsLayout)
- [05-01]: Seed script uses URLSearchParams for auth (form-encoded, not JSON)
- [05-01]: Direct D1 mode uses getPlatformProxy() matching seed-admin.ts pattern
- [05-01]: _section.md convention for section metadata (frontmatter-only files)
- [05-02]: Actual FieldType union has 23 types (not 34 as originally estimated)
- [05-02]: All code examples sourced from actual source files, not invented
- [05-02]: Casual tone matching Supabase/Remix docs style
- [05-03]: API login is JSON (POST /auth/login), form login is POST /auth/login/form
- [05-03]: Filter bug documented with WARNING callout and client-side workaround
- [05-04]: All plugin docs reference actual HOOKS constant (27 hooks from types.ts)
- [05-04]: Security docs include implementation details (PBKDF2 params, HMAC token format)

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Broken API filters force client-side filtering — follow existing pattern, mitigate with KV caching
- [Phase 1]: Local wrangler dev uploads to local R2 — expected, works in production
- [Phase 1]: "New Content" collection picker page UX is poor (inherited SonicJS) — not blocking
- [Phase 2]: Header nav overflows at mobile widths — RESOLVED in 04-02 (mobile hamburger added)
- [Phase 2]: Blog post link goes to /blog/undefined — pre-existing slug bug
- [Phase 3]: Astro SSR dev server slow to reflect changes (~30s for Shiki singleton reinit) — dev experience only
- [Phase 3]: D1 audit trail error (missing changed_fields column) — pre-existing migration issue

## Session Continuity

Last session: 2026-03-08
Stopped at: Completed 05-04-PLAN.md
Resume file: None
