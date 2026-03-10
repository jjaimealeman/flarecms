# 2026-03-09 - feat(quick-001): migrate all pages from lib/flare to Astro Content Layer

**Keywords:** [feat] [auto-generated]
**Commit:** 538608c

## What Changed

 packages/site/src/content.config.ts              | 12 +++++-
 packages/site/src/pages/[slug].astro             | 14 +++----
 packages/site/src/pages/api/search-index.json.ts | 21 ++++-------
 packages/site/src/pages/blog/[slug].astro        | 47 ++++++++---------------
 packages/site/src/pages/blog/index.astro         | 48 +++++++-----------------
 packages/site/src/pages/docs/[...slug].astro     | 33 ++++++++++++----
 packages/site/src/pages/docs/index.astro         | 32 +++++++++++++---
 packages/site/src/pages/news/[slug].astro        | 37 ++++++------------
 packages/site/src/pages/news/index.astro         | 38 ++++++-------------
 packages/site/src/pages/sitemap.xml.ts           | 38 ++++++++-----------
 10 files changed, 143 insertions(+), 177 deletions(-)

## Files

- `packages/site/src/content.config.ts`
- `packages/site/src/pages/[slug].astro`
- `packages/site/src/pages/api/search-index.json.ts`
- `packages/site/src/pages/blog/[slug].astro`
- `packages/site/src/pages/blog/index.astro`
- `packages/site/src/pages/docs/[...slug].astro`
- `packages/site/src/pages/docs/index.astro`
- `packages/site/src/pages/news/[slug].astro`
- `packages/site/src/pages/news/index.astro`
- `packages/site/src/pages/sitemap.xml.ts`

---

**Branch:** develop
**Impact:** MEDIUM
**Source:** gsd-changelog-hook (auto-generated)
