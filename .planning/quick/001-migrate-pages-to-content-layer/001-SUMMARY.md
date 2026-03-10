---
phase: quick
plan: 001
subsystem: site-frontend
tags: [astro, content-layer, migration, cleanup]
dependency-graph:
  requires: [07-01, 07-02, 07-03]
  provides: [content-layer-only-pages, minimal-flare-ts]
  affects: []
tech-stack:
  added: []
  patterns: [astro-content-layer-getCollection, content-layer-only-data-access]
key-files:
  created: []
  modified:
    - packages/site/src/content.config.ts
    - packages/site/src/pages/blog/index.astro
    - packages/site/src/pages/blog/[slug].astro
    - packages/site/src/pages/news/index.astro
    - packages/site/src/pages/news/[slug].astro
    - packages/site/src/pages/docs/index.astro
    - packages/site/src/pages/docs/[...slug].astro
    - packages/site/src/pages/[slug].astro
    - packages/site/src/pages/sitemap.xml.ts
    - packages/site/src/pages/api/search-index.json.ts
    - packages/site/src/lib/flare.ts
    - packages/site/src/lib/docs-nav.ts
  deleted:
    - packages/site/src/data/blog-posts.ts
    - packages/site/src/data/news-articles.ts
decisions:
  - id: quick-001-01
    decision: "Content Layer entries accessed via entry.data.* (flareLoader flattens)"
    context: "flareLoader puts title/slug at data level, no double-nesting"
  - id: quick-001-02
    decision: "docs-nav.ts types inlined (DocsSectionEntry/DocsPageEntry) instead of importing from flare.ts"
    context: "flare.ts stripped to getDraftContent only, types would be removed"
  - id: quick-001-03
    decision: "Sort posts/articles client-side by date descending (loader doesn't guarantee order)"
    context: "Consistent display order across builds"
metrics:
  duration: ~6min
  completed: 2026-03-09
---

# Quick Task 001: Migrate Pages to Content Layer Summary

**All 10 page files migrated from direct lib/flare.ts API calls to Astro Content Layer (getCollection from astro:content). lib/flare.ts stripped to 34 lines (getDraftContent only). Static fallback data files deleted.**

## What Was Done

### Task 1: Migrate all pages to Content Layer (47a9748)

- Added `pages` collection to content.config.ts (now 5 collections total)
- Migrated blog/index.astro and blog/[slug].astro: replaced getBlogPosts/getBlogPostBySlug with getCollection('blogPosts')
- Migrated news/index.astro and news/[slug].astro: replaced getNewsArticles/getNewsArticleBySlug with getCollection('news')
- Migrated docs/index.astro and docs/[...slug].astro: replaced getDocsSections/getDocsPages with getCollection('docsSections'/'docs'), mapped entries for buildNavTree compatibility
- Migrated [slug].astro: replaced getPageBySlug with getCollection('pages')
- Migrated sitemap.xml.ts: replaced direct API calls with Content Layer
- Migrated api/search-index.json.ts: replaced all 4 flare.ts fetch calls with getCollection
- Removed all try/catch CMS fallback logic and static data fallback patterns

### Task 2: Clean up lib/flare.ts and delete static data (ef3bdd3)

- Stripped lib/flare.ts from ~300 lines to 34 lines (getDraftContent + DraftContent type only)
- Deleted packages/site/src/data/blog-posts.ts (225 lines of static fallback content)
- Deleted packages/site/src/data/news-articles.ts (93 lines of static fallback content)
- Inlined DocsSectionEntry/DocsPageEntry types in docs-nav.ts (replacing import from flare.ts)
- Removed `as any` casts from docs pages (types now match directly)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] docs-nav.ts type dependency on flare.ts**

- **Found during:** Task 2
- **Issue:** docs-nav.ts imports DocsSection/DocsPage types from ./flare, which would break when flare.ts is stripped
- **Fix:** Inlined minimal DocsSectionEntry/DocsPageEntry interfaces in docs-nav.ts
- **Files modified:** packages/site/src/lib/docs-nav.ts
- **Commit:** ef3bdd3

## Verification Results

1. `pnpm build:site` passes with zero errors
2. No pages (except preview) import from lib/flare.ts
3. lib/flare.ts exports only getDraftContent
4. No imports from data/blog-posts.ts or data/news-articles.ts exist anywhere
5. content.config.ts exports 5 collections: blogPosts, news, docs, docsSections, pages
