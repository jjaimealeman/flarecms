# 2026-03-12 - Restyle Login and Register Pages to Match Homepage Design

**Keywords:** [UI] [STYLING] [FRONTEND]
**Session:** Afternoon, Duration (~30 minutes)
**Commit:** 71c7911

## What Changed

- File: `packages/core/src/templates/pages/auth-login.template.ts`
  - Added dot grid background pattern (matching homepage Hero)
  - Orange gradient Sign In button (from-flare-500 to-flare-400)
  - Card glow effect with orange-to-cyan gradient blur
  - Login card uses subtle diagonal gradient background
  - Orange focus rings on inputs (replacing white)
  - Swapped Inter font for Outfit Variable (matching frontend)
  - Fixed double-v version badge bug (`v${version}` → `${version}`)
  - Version badge restyled with flare-500 orange accent
  - Registration link uses flare-400 orange when visible
  - Added autofocus to email input
  - Added flare color tokens to Tailwind config
- File: `packages/core/src/templates/pages/auth-register.template.ts`
  - Same design system updates: dot grid, orange button, card glow, Outfit font
  - Replaced generic bolt icon with full FlareCMS logo SVG
  - Input styling matches login page (bg-zinc-900/80, orange focus)
  - Link to login uses flare-400 accent
- File: `packages/core/src/db/migrations-bundle.ts`
  - Auto-generated timestamp update from core rebuild

## Why

The login and register pages were inherited from SonicJS with a generic dark theme (white button, Inter font, no branding). This restyle brings them in line with the FlareCMS homepage design system — dot grid background, Outfit font, orange accent colors, and the gradient card glow effect. Creates a cohesive brand experience from first login to marketing site.

## Issues Encountered

No major issues encountered.

## Dependencies

No dependencies added.

## Testing Notes

- Verified login page renders with new styling via curl and browser
- Font swap from Inter to Outfit confirmed via browser DevTools
- Version badge no longer shows double-v prefix

## Next Steps

- [ ] Swap Inter → Outfit in remaining 10 admin templates
- [ ] Consider shared auth layout partial to DRY login/register markup

---

**Branch:** feature/login-restyle
**Issue:** N/A
**Impact:** MEDIUM - visual-only change to auth pages
