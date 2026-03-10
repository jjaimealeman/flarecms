# 2026-03-09 - Update branding assets with new FlareCMS logo and favicon

**Keywords:** [UI] [COMPONENTS] [FRONTEND] [BACKEND]
**Session:** Evening, Duration (~1 hour)
**Commit:** aecb9a0

## What Changed

- File: `packages/core/src/assets/favicon.ts`
  - Replaced old SonicJS shield favicon with new FlareCMS F+spark mark
  - Added prefers-color-scheme support (dark mark on light, white on dark)
- File: `packages/core/src/templates/components/logo.template.ts`
  - Replaced old SonicJS wordmark SVG with new FlareCMS wordmark
  - Uses proper viewBox and variant color mapping (textColor + sparkColor)
- File: `packages/core/src/templates/pages/auth-login.template.ts`
  - Updated login page logo SVG to new FlareCMS wordmark
- File: `packages/core/src/db/migrations-bundle.ts`
  - Regenerated timestamp after rebuild
- File: `packages/site/public/favicon.svg`
  - Replaced Astro default favicon with FlareCMS F+spark mark
- File: `packages/site/src/layouts/Layout.astro`
  - Footer: swapped text logo for favicon.svg image (brand recognition)
  - Nav: removed text logo (handled elsewhere)
- File: `flarecms-logo.svg`
  - Added master logo SVG file to repo root
- File: `packages/site/public/logo.svg`
  - Added horizontal wordmark SVG for site frontend

## Why

Completing the FlareCMS rebrand by replacing all remaining SonicJS-era logo assets with the new FlareCMS identity. The favicon uses the F+spark mark for browser tab recognition, while the wordmark is used on homepage and admin pages.

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Visual verification of favicon in browser tab, logo on homepage and admin login
- What wasn't tested: Light mode favicon color switching
- Edge cases: Old cached favicons may persist in browsers

## Next Steps

- [ ] Verify favicon renders correctly in all browsers
- [ ] Test admin login page logo rendering
- [ ] Clean up root favicon.svg and logo.svg duplicates

---

**Branch:** develop
**Issue:** N/A
**Impact:** MEDIUM - branding asset updates across core and site packages
