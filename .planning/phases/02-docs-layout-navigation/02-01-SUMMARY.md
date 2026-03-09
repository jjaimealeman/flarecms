---
phase: 02-docs-layout-navigation
plan: 01
subsystem: frontend-docs
tags: [astro, layout, navigation, api, components]

dependency-graph:
  requires: [01-01, 01-02]
  provides: [docs-data-layer, docs-layout-components, docs-nav-utilities]
  affects: [02-02]

tech-stack:
  added: []
  patterns: [nav-tree-builder, client-side-api-filtering, responsive-3-column-grid, mobile-overlay-nav]

key-files:
  created:
    - packages/site/src/lib/docs-nav.ts
    - packages/site/src/layouts/DocsLayout.astro
    - packages/site/src/components/docs/DocsSidebar.astro
    - packages/site/src/components/docs/Breadcrumbs.astro
    - packages/site/src/components/docs/PrevNext.astro
  modified:
    - packages/site/src/lib/flare.ts

decisions:
  - id: nav-tree-pattern
    choice: "Section-based nav tree built from flat API data using content ID matching"
    reason: "doc.data.section is a content ID string, not a nested object"
  - id: icon-mapping
    choice: "Hardcoded slug-to-icon map with fallback to book-open"
    reason: "Keeps icons deterministic without requiring CMS icon field to be set"

metrics:
  duration: ~3min
  completed: 2026-03-08
---

# Phase 02 Plan 01: Data Layer and Components Summary

**One-liner:** Docs API functions, nav tree builder, 3-column responsive DocsLayout with sidebar/breadcrumbs/prev-next components

## What Was Done

### Task 1: Data Layer (flare.ts + docs-nav.ts)
- Added `DocsSection` and `DocsPage` interfaces to flare.ts
- Added `getDocsSections()` and `getDocsPages()` functions following existing fetch/filter/sort pattern
- Created `docs-nav.ts` with `buildNavTree()` (groups pages under sections by content ID) and `flattenForPrevNext()` (flattens for linear navigation)
- Exported `NavSection` and `NavPage` types for component consumption

### Task 2: Layout and Navigation Components
- **DocsLayout.astro**: 3-column responsive CSS Grid (mobile: 1-col, md: sidebar+content, xl: sidebar+content+TOC). Wraps Layout.astro. Includes mobile floating menu button and slide-in overlay with backdrop.
- **DocsSidebar.astro**: Section groups with Lucide icons (slug-based mapping), active page pill highlighting via `class:list` conditional
- **Breadcrumbs.astro**: Accessible `<nav>` with `<ol>`, chevron separators, last item as plain text
- **PrevNext.astro**: 2-column grid cards with direction arrows, hover effects (border + background + text color transitions), group-hover for title color

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Nav tree pattern**: Section-based grouping using `doc.data.section === section.id` content ID matching
2. **Icon mapping**: Hardcoded slug-to-Lucide-icon map with `book-open` fallback for unknown section slugs
3. **Sidebar sticky**: Made sidebar `sticky top-[65px]` to stay in view while scrolling content

## Verification

- TypeScript compilation passes (`npx tsc --noEmit` - no errors)
- All files created with correct imports and proper line counts
- DocsLayout imports Layout, DocsSidebar, Breadcrumbs, PrevNext
- DocsSidebar imports NavSection type from docs-nav

## Next Plan Readiness

Plan 02-02 (routing) can now compose these components:
- Import `getDocsSections`, `getDocsPages` from flare.ts
- Import `buildNavTree`, `flattenForPrevNext` from docs-nav.ts
- Use `DocsLayout` as the page wrapper
- All component props are typed and documented
