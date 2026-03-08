---
phase: 03-content-rendering-route
plan: 02
subsystem: ui
tags: [table-of-contents, scroll-spy, copy-button, lightbox, tabs, vanilla-js, intersection-observer]

# Dependency graph
requires:
  - phase: 03-content-rendering-route/01
    provides: "rehype HTML pipeline with data attributes, headings extraction"
  - phase: 02-docs-layout-navigation
    provides: "DocsLayout with TOC slot, docs route structure"
provides:
  - "TableOfContents component with scroll-spy active heading"
  - "Copy button on all code blocks"
  - "Tab group switching with localStorage persistence"
  - "Image lightbox overlay"
affects: [03-content-rendering-route/03, 04-site-shell]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vanilla JS inline scripts for client interactivity (no framework)"
    - "IntersectionObserver for scroll-spy"
    - "localStorage JSON for tab preference persistence"

key-files:
  created:
    - packages/site/src/components/docs/TableOfContents.astro
  modified:
    - packages/site/src/layouts/DocsLayout.astro
    - packages/site/src/pages/docs/[...slug].astro

key-decisions:
  - "All interactivity via vanilla JS inline scripts (is:inline for per-page execution)"
  - "TOC active state uses text-flare-400 font-medium classes toggled by scroll-spy"
  - "Tab preferences stored as JSON object in localStorage under tabPreferences key"

patterns-established:
  - "Inline script IIFE pattern: ;(function(){ ... })()"
  - "data-toc-link attribute for TOC-heading linkage"
  - "Copy button injected into pre elements with relative positioning"

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 3 Plan 02: Client Interactivity & TOC Summary

**TableOfContents with scroll-spy, code copy buttons, tab groups with localStorage persistence, and image lightbox -- all vanilla JS**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T21:21:43Z
- **Completed:** 2026-03-08T21:26:03Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TableOfContents component renders h2/h3 headings with proper indentation in right sidebar
- Copy button appears on all code blocks (rehype-pretty-code figures), copies plain text
- Tab group switching with category-based localStorage persistence and cross-group sync
- Scroll-spy via IntersectionObserver highlights active heading in TOC
- Image lightbox overlay with click-to-close and Escape key support

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TableOfContents component and wire into layout** - `18db9cd` (feat)
2. **Task 2: Add client-side scripts (copy, tabs, scroll-spy, lightbox)** - `4ce9d24` (feat)

## Files Created/Modified
- `packages/site/src/components/docs/TableOfContents.astro` - TOC component with h2/h3 heading links and data-toc-link attributes
- `packages/site/src/layouts/DocsLayout.astro` - Added 4 inline script blocks for copy, tabs, scroll-spy, lightbox
- `packages/site/src/pages/docs/[...slug].astro` - Imported and slotted TableOfContents into DocsLayout

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All client interactivity in place for docs pages
- Plan 03-03 (search) can build on the complete rendering pipeline
- CSS for copy-btn styling was already added in 03-01 (code-blocks.css)

---
*Phase: 03-content-rendering-route*
*Completed: 2026-03-08*
