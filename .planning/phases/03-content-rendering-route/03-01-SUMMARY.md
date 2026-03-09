---
phase: 03-content-rendering-route
plan: 01
subsystem: ui
tags: [unified, rehype, shiki, markdown, syntax-highlighting, callouts]

requires:
  - phase: 02-docs-layout-navigation
    provides: DocsLayout, catch-all route with marked.parse()
provides:
  - unified/rehype rendering pipeline with Shiki JS engine
  - code-blocks.css with dual theme, language labels, tab group styles
  - callouts.css with GitHub-style dark-palette overrides
  - prose.css with heading anchors, external link icons, inline code
  - extractHeadings helper for TOC data
  - headings prop passed to DocsLayout
affects: [03-02, 03-03, content-rendering, documentation-pages]

tech-stack:
  added: [unified, remark-parse, remark-rehype, rehype-pretty-code, shiki, rehype-callouts, rehype-slug, rehype-autolink-headings, rehype-stringify, rehype-raw, rehype-external-links]
  patterns: [module-level unified processor singleton, Shiki JS engine for Cloudflare, dual-theme CSS variables]

key-files:
  created:
    - packages/site/src/lib/markdown.ts
    - packages/site/src/styles/code-blocks.css
    - packages/site/src/styles/callouts.css
    - packages/site/src/styles/prose.css
  modified:
    - packages/site/package.json
    - packages/site/src/pages/docs/[...slug].astro
    - packages/site/src/layouts/DocsLayout.astro

key-decisions:
  - "Shiki JS engine (not WASM Oniguruma) for Cloudflare Workers compatibility"
  - "Dual themes catppuccin-mocha/latte with CSS variables and prefers-color-scheme"
  - "rehype-callouts github theme with dark slate palette overrides"
  - "Tab group plugin uses data-tab meta string with category inference"

patterns-established:
  - "Module-level unified processor singleton -- reused across requests"
  - "renderMarkdown returns { html, headings } for TOC integration"
  - "CSS imports in page frontmatter for per-route styles"

duration: 5min
completed: 2026-03-08
---

# Phase 3 Plan 1: Markdown Rendering Pipeline Summary

**Unified/rehype pipeline with Shiki JS engine replacing marked.parse(), producing syntax-highlighted code blocks, callout boxes, heading anchors, and external link handling at SSR time**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T21:13:04Z
- **Completed:** 2026-03-08T21:18:31Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced marked with full unified/rehype rendering pipeline using 11 plugins
- Shiki syntax highlighting with JS RegExp engine (no WASM, Cloudflare-compatible)
- GitHub-style callout boxes (NOTE, WARNING, TIP, CAUTION, IMPORTANT) with dark palette
- Heading anchors with # links on hover, external links open in new tab with icon
- Custom rehypeTabGroups plugin ready for tabbed code block support
- Headings extracted and passed to DocsLayout for future TOC integration

## Task Commits

1. **Task 1: Install unified pipeline dependencies and remove marked** - `b972d02` (chore)
2. **Task 2: Create rendering pipeline, CSS, and wire into catch-all route** - `b1b17f1` (feat)

## Files Created/Modified
- `packages/site/src/lib/markdown.ts` - Unified pipeline with Shiki, callouts, slug, autolink, external links, tab groups
- `packages/site/src/styles/code-blocks.css` - Shiki dual-theme CSS, language labels, line highlighting, copy button base, tab group styles
- `packages/site/src/styles/callouts.css` - GitHub callout theme with dark slate palette overrides
- `packages/site/src/styles/prose.css` - Heading anchors, external link icons, inline code, scroll-margin
- `packages/site/package.json` - 11 new deps added, marked removed
- `packages/site/src/pages/docs/[...slug].astro` - renderMarkdown replaces marked.parse, CSS imports, headings prop
- `packages/site/src/layouts/DocsLayout.astro` - headings prop added to interface

## Decisions Made
- Used Shiki JS RegExp engine (not WASM Oniguruma) for Cloudflare Workers compatibility
- Dual themes: catppuccin-mocha (dark) + catppuccin-latte (light) with CSS variable switching
- rehype-callouts github theme as base with CSS overrides for dark palette
- Tab group rehype plugin uses meta string `tab="Label"` with category inference from known label mappings
- filterMetaString strips tab metadata before rehype-pretty-code processes it
- Dark theme is default (matches site), light theme via prefers-color-scheme media query

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Vite warning about shiki being both statically and dynamically imported (rehype-pretty-code imports it statically, our getHighlighter imports it dynamically). This is cosmetic only -- build succeeds and runtime works correctly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rendering pipeline complete and building successfully
- Plan 02 can add copy buttons, tab JS, scroll-spy, TOC component, and lightbox
- Plan 03 can add search functionality
- headings data already flows to DocsLayout, ready for TOC wiring

---
*Phase: 03-content-rendering-route*
*Completed: 2026-03-08*
