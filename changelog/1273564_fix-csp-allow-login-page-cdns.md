# 2026-03-12 - Fix CSP Blocking Login Page CDNs

**Keywords:** [SECURITY] [BUG_FIX] [CONFIG]
**Session:** Night, Duration (~5 minutes)
**Commit:** 1273564

## What Changed

- File: `packages/core/src/middleware/security-headers.ts`
  - Added `https://cdn.tailwindcss.com` and `https://unpkg.com` to `script-src` CSP directive
  - Added `https://fonts.googleapis.com` to `style-src` CSP directive
  - Added `https://fonts.gstatic.com` to `font-src` CSP directive

## Why

The login page renders as unstyled HTML because the CSP headers added in v1.11.0 security hardening blocked the three CDNs used by the auth templates: Tailwind CSS CDN (styling), unpkg (HTMX), and Google Fonts (Outfit font). The CSP only allowed `cdn.jsdelivr.net` which is used by the admin layout but not the standalone login/register pages.

## Issues Encountered

No major issues encountered. Straightforward CSP allowlist update.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Build passes after CSP change
- What wasn't tested: Visual confirmation pending dev server restart
- Edge cases: Register page uses same CDNs, will also be fixed

## Next Steps

- [ ] Restart wrangler dev and verify login page renders with full styling
- [ ] Consider migrating login/register pages away from CDN Tailwind to bundled CSS

---

**Branch:** develop
**Issue:** N/A
**Impact:** HIGH — login page was completely broken (unstyled) for all users
