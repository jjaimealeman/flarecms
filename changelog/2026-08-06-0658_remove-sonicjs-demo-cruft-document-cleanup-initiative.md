# 2026-08-06 - chore(plugins): remove SonicJS/demo cruft, document cleanup initiative

**Keywords:** [REFACTOR] [PLUGINS] [CLEANUP] [DOCUMENTATION]
**Session:** Morning
**Commit:** find with `git log --diff-filter=A -1 --format=%H -- changelog/2026-08-06-0658_remove-sonicjs-demo-cruft-document-cleanup-initiative.md`

## What Changed

- File: `CLAUDE.md`
  - Added "Active Initiative — Cleanup & Revival (June 25, 2026)" section documenting the plan to make FlareCMS fully 915website's own and deploy it for real clients (dthelifecoach.com first)
  - Lists what to kill (SonicJS legacy cruft vs. FlareCMS's own demo system), what to fix, what to activate (AI Search plugin)
- File: `packages/core/migrations/038_demo_sandbox.sql`
  - Removed — migration for the flarecms.dev marketing demo sandbox, not needed for client deploys
- File: `packages/core/src/plugins/available/magic-link-auth/*` (README.md, index.ts, manifest.json, migration.sql)
  - Removed — OTP Login plugin already covers this use case
- File: `packages/core/src/plugins/available/tinymce-plugin/*` (index.ts, manifest.json)
  - Removed — redundant with the existing Quill editor
- File: `packages/core/src/plugins/core-plugins/demo-login/*` (index.ts, manifest.json)
  - Removed — SonicJS demo artifact
- File: `packages/core/src/plugins/core-plugins/demo-sandbox/*` (demo-service.ts, email-templates.ts, index.ts, manifest.json, middleware.ts, reset-service.ts)
  - Removed — flarecms.dev marketing demo sandbox (OTP auth, sandbox collection, reset cron), not needed for client deploys
- File: `packages/core/src/plugins/core-plugins/seed-data-plugin/*` (admin-routes.ts, index.ts, manifest.json, services/seed-data-service.ts)
  - Removed — SonicJS demo data seeding, not needed
- File: `packages/site/src/pages/demo.astro`
  - Removed — the marketing demo page tied to the removed demo-sandbox plugin
- File: `EMDASH-RESEARCH.md`
  - Added — research notes (dated April 2, 2026) on Cloudflare's EmDash CMS (Astro 6 + Workers, MIT) as competitive/architectural context for FlareCMS

## Why

Continuing the cleanup/revival initiative to strip inherited SonicJS demo artifacts and FlareCMS's own flarecms.dev marketing-demo system, ahead of deploying FlareCMS for real clients starting with dthelifecoach.com. Follows the same pattern as prior cleanup commits in this repo (magic-link-auth removal, database-tools gating, Workflow Engine dedup).

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Not run as part of this commit — deletions only, no new logic introduced.
- What wasn't tested: Full test suite re-run after plugin removal; should confirm no remaining references to removed plugins (app.ts registrations, wrangler.toml cron trigger for demo-sandbox reset) before next deploy.
- Edge cases: N/A

## Next Steps

- [ ] Confirm no dangling references to removed plugins in `app.ts` or `wrangler.toml`
- [ ] Continue "What to fix" list from CLAUDE.md: sidebar nav duplicate URLs, Workflow Engine beta1/beta.1 dedup, dynamic collections in sidebar
- [ ] Wire up AI Search plugin (Workers AI binding + CF similarity cache freshness)

---

**Branch:** feature/live-demo
**Issue:** N/A
**Impact:** MEDIUM
