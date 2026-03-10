# 2026-03-10 - Fix 4 UX Quick Wins from Chrome Extension Review

**Keywords:** [UI] [BUG_FIX] [FRONTEND] [ENHANCEMENT]
**Session:** Late night, Duration (~30 minutes)
**Commit:** ccf9068

## What Changed

- File: `packages/core/src/templates/pages/admin-content-form.template.ts`
  - Added `'status'` to contentFields exclusion filter — removes duplicate Status dropdown from form body (canonical Status lives in Publishing sidebar)
  - Moved Author field from read-only display to editable input, pre-filled with logged-in user's email
  - Author field now renders on both new and edit content forms (was edit-only)
  - Author value stored as `author_display` in content data JSON
- File: `packages/core/src/routes/admin-content.ts`
  - POST handler reads `author_display` from form data, stores in content data JSON
  - PUT handler reads `author_display` from form data, stores in content data JSON
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Renamed sidebar nav label from "Schema" to "Collections" for consistency with page heading and URL
- File: `packages/core/src/db/migrations-bundle.ts`
  - Updated demo-login plugin description from `admin@sonicjs.com/sonicjs!` to `admin@flarecms.dev/flarecms!`
  - Updated demo-login plugin author from `SonicJS` to `Flare CMS`
- File: `packages/core/src/__tests__/templates/admin-layout-catalyst.test.ts`
  - Updated test assertion from `'Schema'` to `'Collections'` to match sidebar rename

## Why

Addresses 4 specific UX issues identified during a Chrome extension review of the admin UI:

1. **#4 Duplicate Status field** — Two Status dropdowns (form body + Publishing sidebar) confused users about which one applies. Removed the form body one.
2. **#5 Author auto-populate** — Author was blank on new content, requiring manual entry. Now pre-fills with logged-in user's email and remains editable.
3. **#7 Schema→Collections label mismatch** — Sidebar said "Schema" but page heading said "Collections". Unified to "Collections" everywhere.
4. **#10 Demo Login SonicJS branding** — Plugin description showed upstream `admin@sonicjs.com/sonicjs!` credentials. Updated to Flare CMS branding.

## Issues Encountered

No major issues encountered. The test suite had one pre-existing failure in `dynamic-field-extended.test.ts` unrelated to these changes.

## Dependencies

No dependencies added.

## Testing Notes

- Build passes cleanly (`pnpm build`)
- 1285 tests pass, 1 pre-existing failure (not from our changes)
- Updated catalyst layout test to expect "Collections" instead of "Schema"

## Next Steps

- [ ] Remaining UX items: #6 (editor dark theme), #12 (API JSON button), #13 (pagination)
- [ ] #14 (back button filter state), #15 (media phantom overlay)
- [ ] Settings overhaul GSD milestone (PRD at `.planning/future/admin-settings-overhaul-PRD.md`)

---

**Branch:** feature/admin-ui-overhaul
**Issue:** N/A
**Impact:** MEDIUM - 4 user-facing UX improvements across admin content forms and navigation
