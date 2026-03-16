# 2026-03-13 - Content Staging: UX Fixes, Diff View, Reject Modal

**Keywords:** [STAGING] [UI] [UX] [MODAL] [DIFF]
**Session:** Afternoon, Duration (~30 min)
**Commit:** 52f99b2

## What Changed

- File: `packages/core/src/services/revisions.ts`
  - Added `normalizeValue()` helper to treat undefined/null/"" as equal — fixes false positive diffs
  - Added deduplication: `createPendingRevision()` now deletes existing pending revision for same content before creating new one (one pending per item)
- File: `packages/core/src/routes/admin-content.ts`
  - Import `getLatestPendingRevision` from revisions service
  - Edit form (GET /:id/edit) now loads pending revision data instead of live data when a pending revision exists — subsequent edits build on previous changes
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Replaced "Changed: field1, field2" text with expandable diff toggle
  - Click "N fields changed" to see per-field old (red strikethrough) → new (green) values
  - Added `truncateValue()` helper for long field values (80 char limit)
  - Replaced native `confirm()` dialog with styled Reject Revision modal (red icon, card UI, Cancel/Reject buttons)
  - Added reject confirmation modal HTML with z-[60] to overlay Sync modal
  - Refactored reject flow: `showRejectConfirm()` → modal → `confirmReject()` → API call
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated timestamp

## Why

User testing revealed three issues: (1) false positive diffs showing "icon, color, author_display" as changed when only description was edited, (2) multiple edits to same item created duplicate pending revisions that didn't stack, and (3) native browser confirm() dialog looked out of place. The expandable diff view gives reviewers (e.g., manager John reviewing editor Mark's changes) clear visibility into exactly what changed.

## Issues Encountered

- Initial pending revisions from before the edit-form fix had stale data — needed to be rejected before the fix could be verified

## Dependencies

No dependencies added

## Testing Notes

- What was tested: Full staging flow — edit published content, view diff in Sync modal, reject via styled modal, verify diff accuracy matches actual changes
- What wasn't tested: Multi-user flow (editor submits, admin reviews) — needs organizedfellow account
- Edge cases: Empty → value transitions, long text truncation, multiple edits to same item

## Next Steps

- [ ] Test multi-user workflow with organizedfellow account
- [ ] Test Go Live (approve) flow end-to-end
- [ ] Fix Quill editor overflow (separate branch — see chat.md)

---

**Branch:** feature/workflow-staging
**Issue:** N/A
**Impact:** MEDIUM - UX polish on staging feature, critical dedup fix
