# 2026-03-09 - refactor(quick-001): strip lib/flare.ts to getDraftContent only, delete static data

**Keywords:** [refactor] [auto-generated]
**Commit:** aa1909a

## What Changed

 packages/site/src/data/blog-posts.ts         | 233 -----------------------
 packages/site/src/data/news-articles.ts      |  92 ---------
 packages/site/src/lib/docs-nav.ts            |  33 +++-
 packages/site/src/lib/flare.ts               | 272 +--------------------------
 packages/site/src/pages/docs/[...slug].astro |   2 +-
 packages/site/src/pages/docs/index.astro     |   2 +-
 6 files changed, 35 insertions(+), 599 deletions(-)

## Files

- `packages/site/src/data/blog-posts.ts`
- `packages/site/src/data/news-articles.ts`
- `packages/site/src/lib/docs-nav.ts`
- `packages/site/src/lib/flare.ts`
- `packages/site/src/pages/docs/[...slug].astro`
- `packages/site/src/pages/docs/index.astro`

---

**Branch:** develop
**Impact:** MEDIUM
**Source:** gsd-changelog-hook (auto-generated)
