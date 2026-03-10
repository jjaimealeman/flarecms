# 2026-03-10 - Features Page, Nav Cleanup, Hero CTA Overhaul

**Keywords:** [FRONTEND] [FEATURE] [UI] [ROUTING]
**Session:** Morning, Duration (~1 hour)
**Commit:** 06539fd

## What Changed

- File: `packages/site/src/pages/features.astro`
  - New dedicated features page with 7 sections: differentiators, core features grid, AI search spotlight, analytics comparison table, plugin ecosystem, roadmap, bottom CTA
  - Status badges (Stable/Beta/Coming Soon) for honest feature maturity signaling
- File: `packages/site/src/data/features.ts`
  - New data file with differentiators, 12 core features, AI search details, analytics comparison (vs GA/Plausible/Umami), analytics tracking list, roadmap items
  - Corrected email provider to Resend (was incorrectly referencing SendGrid)
- File: `packages/site/src/layouts/Layout.astro`
  - Added logo wordmark to header with scroll-shrink effect
  - Added mobile logo
  - Removed "Get Started" button from desktop and mobile nav
  - Fixed nav active state for Home link (exact match vs startsWith)
- File: `packages/site/src/components/Hero.astro`
  - Replaced hero "Get Started" + "Documentation" CTAs with "Quick Start" → /docs/getting-started/quickstart and "See Features" → /features
  - Swapped CLI snippet from `npx create-flare-app` to `git clone` with "npx coming soon" note
  - Updated clipboard copy text to match
- File: `packages/site/src/data/homepage.ts`
  - Added "Home" and "Features" to navLinks array
  - Nav order: Home, Docs, Features, Comparison, Blog

## Why

The homepage had 4 redundant links all pointing to /docs (header Get Started, hero Get Started, hero Documentation, nav Docs). This commit differentiates each CTA with a clear purpose and adds a dedicated features page to properly showcase what Flare CMS offers — especially vs the SonicJS roadmap which claims features at 0% that Flare has already shipped.

## Issues Encountered

No major issues encountered. Discovered that the active email plugin uses Resend (not SendGrid as initially written) — corrected before commit.

## Dependencies

No dependencies added.

## Testing Notes

- Visual testing via localhost:4321 dev server
- Features page data verified against actual codebase audit
- Analytics pricing verified: Plausible $9/mo confirmed, Umami free hobby tier + $9/mo+

## Next Steps

- [ ] Test email/Resend plugin integration with 915website.com API key
- [ ] Test forms engine submission workflow
- [ ] Test Turnstile CAPTCHA integration
- [ ] Verify RBAC with multiple test accounts
- [ ] Build `create-flare-app` CLI with @clack/prompts (future)

---

**Branch:** develop
**Issue:** N/A
**Impact:** MEDIUM - new page + nav restructure across all site pages
