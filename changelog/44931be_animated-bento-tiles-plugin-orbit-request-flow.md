# 2026-03-12 - Animated Bento Tiles: Plugin Scroll, Orbit Stack, Request Flow

**Keywords:** [ANIMATION] [CSS] [HOMEPAGE] [BENTO] [UX]
**Session:** Late night, Duration (~3 hours)
**Commit:** 44931be

## What Changed

- File: `packages/site/src/components/Features.astro`
  - Replaced static "330+ edge locations" stat tile with scrolling Plugin Ecosystem showcase (6 plugin cards, infinite CSS scroll, fade masks, theme-aware)
  - Replaced static "0 Cold starts" stat tile with Edge Infrastructure orbit animation (D1/R2/KV icons orbiting central Workers lightning bolt, elliptical path, depth effect, cycling definition labels)
  - Replaced static "Plugin Architecture" tile with animated Request Flow diagram showing Browser → Website → CMS → Content(D1/R2/KV) round-trip with traveling dot, node glow effects, and crossfading "request →" / "← response" labels
  - Added video hover pause/play for admin UI demo tile
  - All animations: pure CSS/HTML/JS, zero external dependencies, theme-aware (dark/light), no video files needed

## Why

Static stat tiles with big numbers didn't communicate what FlareCMS actually does. The animated replacements visually demonstrate the plugin ecosystem, Cloudflare edge infrastructure stack, and how requests flow through the system — teaching users about the architecture while looking impressive.

## Issues Encountered

- Orbiting icons rotated instead of staying upright — required per-item counter-rotation keyframes offset by starting angle
- Elliptical orbit needed CSS `scale: 1 0.5` trick with `scaleY(2)` baked into every counter-spin keyframe to prevent icon squishing
- Depth effect initially applied to wrong side of orbit — recalculated keyframe percentages for correct top-of-ellipse mapping
- Flow diagram SVG lines didn't align with nodes — rebuilt using CSS absolute positioning in same coordinate system
- Animation desync on hover — removed hover pause from flow diagram entirely, unified all animations on same 8s CSS clock
- Double browser glow pulse — fixed by merging glow across loop boundary (92% through 0% to 8%)

## Dependencies

No dependencies added

## Testing Notes

- Manual testing: verified all 3 animations render correctly in dark and light mode
- Verified plugin scroll pauses on hover, orbit pauses on hover, flow diagram runs continuously
- Verified video hover pause works on admin UI demo tile
- Edge case: animation sync maintained across theme toggles

## Next Steps

- [ ] Hero dashboard screenshot could become a video
- [ ] Consider more animated tiles in bento grid
- [ ] Roles & Permissions system (prerequisite for live demo)

---

**Branch:** feature/homepage-polish
**Issue:** N/A
**Impact:** MEDIUM - visual enhancement to homepage bento grid, no functional changes
