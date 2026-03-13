# 2026-03-12 - Add CSP and Additional Security Headers

**Keywords:** [SECURITY] [BACKEND] [ENHANCEMENT]
**Session:** Afternoon, Duration (~10 minutes)
**Commit:** d333c28

## What Changed

- File: `packages/core/src/middleware/security-headers.ts`
  - Added `Content-Security-Policy` header with scoped directives for scripts, styles, fonts, images, forms, and frames
  - Added `X-XSS-Protection: 1; mode=block` for legacy browser XSS filter
  - Added `Cross-Origin-Opener-Policy: same-origin` to prevent window.opener attacks

## Why

The existing security headers middleware had the basics (X-Frame-Options, nosniff, HSTS, Referrer-Policy, Permissions-Policy) but was missing CSP — the most impactful header for preventing XSS attacks. CSP tells the browser exactly which sources are allowed to load scripts, styles, images, and fonts. This is the #1 defense against injected scripts.

Also confirmed during audit: password salt auto-upgrade (item 6) was already implemented in both login paths (API + form). No code changes needed.

## Issues Encountered

No major issues encountered. CSP directives were carefully scoped to allow admin UI inline scripts/styles (required for server-rendered templates) while blocking external sources.

## Dependencies

No dependencies added.

## Testing Notes

- What was tested: Build passes clean
- What wasn't tested: Live browser testing to verify CSP doesn't break admin UI features (Quill editor, image uploads, font loading)
- Edge cases: `unsafe-inline` and `unsafe-eval` are necessary for the current template architecture

## Next Steps

- [ ] Test on production that CSP doesn't break Quill editor or media uploads
- [ ] Consider nonce-based CSP when migrating away from inline scripts
- [ ] Item 8: Soft delete cascade

---

**Branch:** feature/security-headers-and-salt-fix
**Issue:** N/A
**Impact:** HIGH - CSP is the primary defense against XSS attacks
