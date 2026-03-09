# 2026-03-09 - Revise Phase 08 Plans Based on Checker Feedback

**Keywords:** [PLANNING] [API] [BACKEND]
**Session:** Retroactive backfill
**Commit:** 8db0212

## What Changed

- File: `.planning/phases/08-live-preview-api/08-01-PLAN.md`
  - Fixed auth truth contradiction: POST requires auth, GET /draft/:token is unauthenticated (token-based access for cross-origin Astro iframe)
  - Clarified implementation approach for selective requireAuth

- File: `.planning/phases/08-live-preview-api/08-02-PLAN.md`
  - Consolidated route architecture to single Hono router with definition-order matching
  - Clarified iframe.src as update mechanism (not postMessage)
  - Deferred scroll sync explicitly in objective and success criteria
  - Mount single router at both `/api/preview` and `/admin/preview`

- File: `.planning/phases/08-live-preview-api/08-03-PLAN.md`
  - Aligned postMessage docs with 08-02's iframe.src approach

## Why

Plan checker identified contradictions between sub-plans. The auth model was inconsistent (GET endpoint marked as requiring auth, but cross-origin Astro iframes can't send CMS JWT cookies). Route architecture was over-complicated with multiple router instances when Hono's definition-order matching handles it cleanly.

## Issues Encountered

No major issues encountered. Plan revisions only — no code changes.

## Dependencies

No dependencies added.

## Testing Notes

Retroactive — not tested at generation time. Planning files only.

## Next Steps

- [ ] Execute Phase 08 plans

---

**Branch:** develop
**Issue:** N/A
**Impact:** LOW - planning file revisions only
