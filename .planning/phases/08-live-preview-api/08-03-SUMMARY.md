---
phase: 08-live-preview-api
plan: 03
subsystem: frontend-preview
tags: [astro, ssr, preview, draft, postMessage]
dependency-graph:
  requires: [08-01]
  provides: [astro-preview-route, getDraftContent-helper]
  affects: [08-02]
tech-stack:
  added: []
  patterns: [dynamic-route-params, draft-token-auth, postMessage-listener]
key-files:
  created:
    - packages/site/src/pages/preview/[collection]/[slug].astro
  modified:
    - packages/site/src/lib/flare.ts
decisions:
  - Generic preview template for all collections (not per-collection templates)
  - 401 for missing token, 410 for expired/not-found (clear HTTP semantics)
  - postMessage listener included as future optimization foundation
metrics:
  duration: ~3min
  completed: 2026-03-09
---

# Phase 8 Plan 3: Astro Preview Route Summary

SSR preview route at /preview/[collection]/[slug] that fetches draft content via token from CMS Draft API and renders through real Astro Layout with Tailwind typography.

## What Was Done

### Task 1: Add getDraftContent to flare.ts
- Added `DraftContent` interface for typed draft data
- Added `getDraftContent(token)` function that fetches from `/api/preview/draft/:token`
- Follows existing graceful failure pattern (returns null on error)
- Uses `API_URL` constant already defined in file

### Task 2: Create Astro preview route
- Created dynamic SSR route at `packages/site/src/pages/preview/[collection]/[slug].astro`
- Extracts collection/slug from URL params and token from query string
- Returns 401 if token missing, 410 if draft expired or not found
- Normalizes draft data into generic post object (title, content, excerpt, author, date, featuredImage)
- Renders through real Astro Layout with full Tailwind prose typography classes (matching blog template)
- Shows amber PREVIEW MODE banner (fixed top, z-50)
- Added `pt-16` padding to account for preview banner height
- Includes postMessage listener for `flare-preview-update` messages (future optimization path)
- 115 lines (exceeds 50-line minimum)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Generic preview template for all collections | Per-collection templates would be over-engineering; generic template with Layout/Tailwind covers primary blog use case well |
| 401 for missing token, 410 for expired | Clear HTTP semantics: 401 = no credentials provided, 410 = resource gone (expired draft) |
| postMessage listener as future optimization | Plan 08-02 uses iframe.src for updates; listener enables future partial update optimization without changing Astro route |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 09a4068 | feat(08-03): add getDraftContent helper to flare.ts |
| 46eda1c | feat(08-03): create Astro SSR preview route |

## Verification

- [x] `pnpm build` succeeds (both core and site packages)
- [x] Preview route file exists at correct path (115 lines)
- [x] `getDraftContent` exported from flare.ts
- [x] Route handles missing token (401) and expired token (410)
- [x] Content renders through real Astro Layout with Tailwind typography
- [x] postMessage listener injected for `flare-preview-update` events
- [x] Preview banner clearly indicates draft mode
- [x] `api/preview/draft` pattern found in flare.ts (key link verified)
- [x] `addEventListener.*message` pattern found in preview route (key link verified)

## Next Phase Readiness

Plan 08-03 is complete. Plan 08-02 (Editor Preview Pane) can now use this route as the iframe target. The preview route is ready to receive draft tokens and render content through real Astro templates.
