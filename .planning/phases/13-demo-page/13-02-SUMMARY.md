---
phase: 13-demo-page
plan: 02
subsystem: ui
tags: [astro, otp, demo, toggle, plausible, cross-origin]

# Dependency graph
requires:
  - phase: 13-demo-page plan 01
    provides: CORS middleware, token field in /verify response, GET /demo/auth/exchange endpoint

provides:
  - /demo landing page with audience toggle (Developer / Client)
  - Email + OTP flow wired to CMS /demo/auth/request and /demo/auth/verify
  - Post-verify redirect to admin.flarecms.dev/demo/auth/exchange?token=JWT
  - Demo links in desktop nav, mobile nav, footer, hero, and features page CTA

affects:
  - 14-polish (any nav or CTA changes should respect /demo as front door)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline Astro script with define:vars for passing env vars to client JS
    - DOM-swap pattern (hidden class) for multi-step form flows (email → OTP → success)
    - Audience toggle using data-audience attributes and pill button UI

key-files:
  created:
    - packages/site/src/pages/demo.astro
  modified:
    - packages/site/src/data/homepage.ts
    - packages/site/src/layouts/Layout.astro
    - packages/site/src/components/Hero.astro
    - packages/site/src/pages/features.astro

key-decisions:
  - "All JS inline via <script is:inline> with define:vars to avoid hydration issues"
  - "credentials: include on all fetch calls to preserve cookie session continuity"
  - "features.astro CTA updated to /demo alongside nav changes (minor scope addition, correct behavior)"

patterns-established:
  - "Demo page is the canonical front door to the live admin — all CTAs point here"
  - "Plausible events on all demo CTAs: Demo: Email Submit, Demo: OTP Verified, CTA: Try Demo with location prop"

# Metrics
duration: ~10min
completed: 2026-03-16
---

# Phase 13 Plan 02: Demo Page Frontend Summary

**Astro /demo page with audience toggle, 6-digit OTP flow, and site-wide navigation links wiring flarecms.dev visitors into the live admin sandbox**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-16T21:38:00Z
- **Completed:** 2026-03-16T21:48:00Z
- **Tasks:** 2 (+ 1 checkpoint approved)
- **Files modified:** 5 (1 created, 4 updated)

## Accomplishments

- Built self-contained `demo.astro` page (504 lines) with all interactivity inlined — audience toggle, email form, 6-digit OTP entry with auto-advance/paste/auto-submit, success redirect state
- Wired full OTP auth flow: POST `/demo/auth/request` → show OTP boxes → POST `/demo/auth/verify` → read token from body → `window.location` redirect to exchange endpoint
- Uncommented and updated Demo CTAs in desktop nav, mobile nav, footer, hero, and features page — no TODO comments about /demo remain

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the /demo landing page** - `7d6b533` (feat)
2. **Task 2: Add Demo navigation links across site** - `8c813e3` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `packages/site/src/pages/demo.astro` - Complete demo landing page with toggle, email form, OTP entry, success state, and redirect logic
- `packages/site/src/data/homepage.ts` - Added `{ label: 'Demo', href: '/demo' }` to navLinks array
- `packages/site/src/layouts/Layout.astro` - Desktop nav orange "Try Demo" button, mobile nav full-width button, footer "Try Demo" link
- `packages/site/src/components/Hero.astro` - Uncommented "Try the Demo" outline button
- `packages/site/src/pages/features.astro` - Updated CTA from hardcoded admin URL to `/demo` with updated link text

## Decisions Made

- **All JS inline via `<script is:inline>` with `define:vars`:** Passes `PUBLIC_FLARE_API_URL` from Astro env to client JS without hydration complexity. Clean pattern for pages with significant interactivity.
- **`credentials: include` on all fetch calls:** Required for cross-origin cookie session continuity. Without it, cookies set during the exchange step would not be sent back on subsequent requests.
- **Disclaimer callout visible above email form:** Session limits (30 min, 50 ops, 6h reset) visible before the user enters their email — sets expectations upfront.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] features.astro CTA updated to /demo**

- **Found during:** Task 2 (Add Demo navigation links across site)
- **Issue:** The plan explicitly called for updating `features.astro` CTA from the hardcoded admin URL to `/demo`. This was included in the task action but not listed in the `<files>` attribute or the plan frontmatter `files_modified` list — minor spec gap.
- **Fix:** Updated features.astro CTA link and text as described in task action. Correct behavior — the features page should send visitors to /demo as the front door, not directly to the admin.
- **Files modified:** `packages/site/src/pages/features.astro`
- **Verification:** Build passed; grep for `/demo` in features.astro returns match
- **Committed in:** `8c813e3` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 minor scope addition, called for in task action but missing from plan frontmatter)
**Impact on plan:** No scope creep — features.astro update was described in the task action. Frontmatter `files_modified` list was incomplete.

## Issues Encountered

None - build passed on first attempt. All 6 must-have truths verified at checkpoint before approval.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/demo` is live at flarecms.dev/demo (pending site deploy)
- Full auth flow verified: email → OTP → exchange → admin
- Phase 13 (Demo Page) is complete
- Phase 14 (Polish) can proceed — /demo is the stable front door for all demo CTAs

---
*Phase: 13-demo-page*
*Completed: 2026-03-16*
