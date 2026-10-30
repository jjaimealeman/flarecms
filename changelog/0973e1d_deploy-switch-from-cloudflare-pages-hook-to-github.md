# 2026-03-10 - fix(deploy): switch from Cloudflare Pages hook to GitHub Actions workflow_dispatch

**Keywords:** [fix] [auto-generated]
**Commit:** find with `git log --diff-filter=A -1 --format=%H -- changelog/0973e1d_deploy-switch-from-cloudflare-pages-hook-to-github.md`

## What Changed

 .github/workflows/deploy.yml                       |  1 +
 packages/core/src/db/migrations-bundle.ts          |  2 +-
 packages/core/src/routes/admin-deploy.ts           | 62 ++++++++++++++--------
 .../layouts/admin-layout-catalyst.template.ts      | 32 ++++++-----
 4 files changed, 60 insertions(+), 37 deletions(-)

## Files

- `.github/workflows/deploy.yml`
- `packages/core/src/db/migrations-bundle.ts`
- `packages/core/src/routes/admin-deploy.ts`
- `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`

---

**Branch:** develop
**Impact:** MEDIUM
**Source:** gsd-changelog-hook (auto-generated)
