# 2026-03-10 - Built-in Analytics: Privacy-First Visitor Tracking

**Keywords:** [FEATURE] [DATABASE] [MIGRATION] [API] [BACKEND] [FRONTEND] [UI]
**Session:** Late night, Duration (~3 hours)
**Commit:** 6a7eac6

## What Changed

- File: `packages/core/migrations/032_built_in_analytics.sql`
  - Created `page_views` table with path, referrer, country, device, visitor_hash, UTM params, session tracking
  - Added indexes on path, created_at, visitor_hash, country
- File: `packages/core/migrations/033_analytics_events.sql`
  - Added event_type, event_data, device_name columns to page_views
  - Added event_type index for filtering pageviews vs exit clicks
- File: `packages/core/src/db/migrations-bundle.ts`
  - Bundled migrations 032 + 033 for Cloudflare Workers runtime
- File: `packages/core/src/routes/api-analytics.ts`
  - `POST /api/track` — public beacon endpoint (CSRF exempt, text/plain content type)
  - `GET /api/analytics/*` — admin-only endpoints for stats, chart data, top pages, referrers, countries, devices, exit links
  - IP hashed with daily SHA-256 salt (never stored raw)
- File: `packages/core/src/routes/admin-analytics.ts`
  - Admin HTML route for `/admin/analytics` with period selector (7d/30d/90d)
- File: `packages/core/src/templates/pages/admin-analytics.template.ts`
  - Full dashboard: overview stats, visitors chart (Chart.js), top pages, referrers, countries, devices, exit links
- File: `packages/site/src/components/FlareAnalytics.astro`
  - Beacon component using `navigator.sendBeacon` with text/plain (no CORS preflight)
  - Tracks page views + exit link clicks on external `<a>` tags
  - Opt-out via `localStorage.flare_ignore = true`
- File: `packages/core/src/middleware/csrf.ts`
  - Exempted `/api/track` from CSRF (beacon POST from external sites)
- File: `packages/core/src/app.ts`
  - Mounted analytics admin + API routes
- File: `packages/core/src/routes/index.ts`
  - Exported new route modules
- File: `packages/core/src/index.ts`
  - Exported analytics routes from core package
- File: `packages/core/src/templates/icons.ts`
  - Added BarChart3 icon from lucide-static
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Added Analytics sidebar link (between content and system sections)
- File: `packages/core/src/templates/layouts/admin-layout-v2.template.ts`
  - Added Analytics sidebar link with bar chart SVG icon
- File: `packages/site/src/layouts/Layout.astro`
  - Included `<FlareAnalytics />` component in base layout
- File: `packages/site/src/pages/features.astro`
  - Changed analytics badge from "Coming Soon" to "Built In"

## Why

Flare CMS needed built-in analytics to eliminate dependency on third-party services like Google Analytics or Plausible. This implementation is privacy-first by design: no cookies, no PII, IP addresses hashed with a daily rotating salt and never stored raw. The beacon uses `text/plain` content type to avoid CORS preflight requests, making it lightweight and reliable. Analytics run entirely at the edge on Cloudflare Workers — no external scripts, no additional cost, no cookie banners needed.

## Issues Encountered

- `sendBeacon` with `application/json` triggers CORS preflight on cross-origin requests — solved by using `text/plain` content type and parsing JSON server-side
- Both admin sidebar layouts (v2 glass + Catalyst) needed separate updates since they use different rendering approaches

## Dependencies

No dependencies added. Chart.js loaded via CDN in the admin template.

## Testing Notes

- Local D1 seeded with 164 page views + 12 exit clicks for dashboard demo
- Admin dashboard tested with 7d/30d/90d period filters
- Beacon component tested with page views and external link click tracking
- Not yet deployed to production — migrations only applied locally

## Next Steps

- [ ] Deploy to production (merge to develop → main)
- [ ] Run migrations 032 + 033 on remote D1
- [ ] Verify beacon tracking on live site
- [ ] Consider adding bounce rate calculation
- [ ] Add real-time visitor count (WebSocket or polling)

---

**Branch:** feature/built-in-analytics
**Issue:** N/A
**Impact:** HIGH - New core feature spanning migrations, API, admin UI, and frontend beacon
