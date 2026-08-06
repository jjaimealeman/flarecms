# 2026-06-25 - chore: remove demo-sandbox plugin and all references

**Keywords:** [chore] [auto-generated]
**Commit:** find with `git log --diff-filter=A -1 --format=%H -- changelog/ab944e7_remove-demo-sandbox-plugin-and-all-references.md`

## What Changed

 TASKS.md                                        | 108 ++++++++++++++++++++++++
 packages/cms/src/index.ts                       |  13 +--
 packages/cms/wrangler.toml                      |   2 +-
 packages/core/src/app.ts                        |  23 +----
 packages/core/src/index.ts                      |   2 -
 packages/core/src/plugins/core-plugins/index.ts |   2 -
 packages/core/src/routes/api-media.ts           |   4 +-
 packages/core/src/services/index.ts             |   4 -
 packages/site/src/components/Hero.astro         |   7 --
 packages/site/src/data/homepage.ts              |   1 -
 packages/site/src/layouts/Layout.astro          |   9 --
 11 files changed, 115 insertions(+), 60 deletions(-)

## Files

- `TASKS.md`
- `packages/cms/src/index.ts`
- `packages/cms/wrangler.toml`
- `packages/core/src/app.ts`
- `packages/core/src/index.ts`
- `packages/core/src/plugins/core-plugins/index.ts`
- `packages/core/src/routes/api-media.ts`
- `packages/core/src/services/index.ts`
- `packages/site/src/components/Hero.astro`
- `packages/site/src/data/homepage.ts`
- `packages/site/src/layouts/Layout.astro`

---

**Branch:** feature/live-demo
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
