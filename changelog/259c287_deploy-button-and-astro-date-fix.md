# Deploy Button + Astro Date Validation Fix

**Date:** 2026-03-10
**Commit:** 259c287
**Author:** Claude Opus 4.6

## What Changed

- File: `packages/core/src/routes/admin-deploy.ts` (NEW)
  - 5 API endpoints: pending changes, pending count, trigger deploy, get/save settings
  - Uses SettingsService with `deploy` category for hook URL and last deployed timestamp
  - Queries content table joined with collections for changes since last deploy
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Added Rocket icon deploy button in sidebar above Settings
  - Deploy review modal shows pending changes grouped by collection with edit links
  - Deploy hook setup modal for first-time URL configuration
  - Badge polls `/admin/deploy/api/pending-count` on page load
  - All modal JS uses DOM API (createElement/textContent) — no innerHTML
- File: `packages/core/src/templates/pages/admin-content-form.template.ts`
  - Removed "Save & Publish" / "Update & Publish" button — redundant with status dropdown
- File: `packages/core/src/app.ts`
  - Mounted deploy routes at `/admin/deploy`
- File: `packages/core/src/routes/index.ts`
  - Added `adminDeployRoutes` export
- File: `packages/core/src/templates/icons.ts`
  - Added Rocket icon import and export
- File: `packages/astro/src/schema.ts`
  - Date/datetime fields now use `safeDate()` — wraps z.coerce.date() with z.preprocess to handle empty strings/null/undefined
  - System fields (_createdAt, _updatedAt) also use safeDate()
- File: `packages/astro/src/loader.ts`
  - Sanitize invalid Date objects and empty strings in flatData before parseData
  - Fallback schema uses safeDate() for system date fields

## Why

- Deploy button solves the "edit in CMS but nothing changes on site" UX problem — Astro content layer caches at build time, so CMS edits require a Cloudflare Pages rebuild
- "Save & Publish" button was redundant since the status dropdown already handles draft→published
- Astro date fix resolves crash when docs entries have empty/invalid `lastUpdated` fields — z.coerce.date() turns "" into Invalid Date which fails Zod validation

## Testing Done

- Deploy modal tested live: shows pending changes count, groups by collection, triggers deploy hook, updates "last deployed" timestamp
- Astro dev server confirmed working after date fix

## Dependencies

No dependencies added

## Keywords

[FEAT] [UI] [BACKEND] [ASTRO] [BUG_FIX]

## Next Steps

- [ ] Merge feature/deploy-button → develop → main
- [ ] Verify deploy hook triggers Cloudflare Pages rebuild in production

---

**Branch:** feature/deploy-button
**Issue:** N/A
**Impact:** High — new deploy workflow + Astro build stability fix
