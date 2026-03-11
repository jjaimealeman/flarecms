# Built-in Analytics — Flare CMS

## Overview

Privacy-first, self-hosted analytics built into Flare CMS. No third-party services, no cookies, no GDPR banner. Data lives in your D1 database. Every Flare CMS user gets analytics for free.

**Differentiator:** None of the competitors (Payload, TinaCMS, Keystatic, StudioCMS, CloudCannon, Storyblok, Sanity) offer built-in frontend analytics.

## Architecture

```
Visitor → Astro Page (Cloudflare Pages)
              ↓ <FlareAnalytics /> beacon (~500 bytes)
         CMS Worker /api/track → D1 (analytics table)
              ↓
         Admin Dashboard → analytics widget
```

## Components

### 1. `<FlareAnalytics />` Astro Component
- Ships from `packages/site/src/components/FlareAnalytics.astro`
- Reads `PUBLIC_FLARE_API_URL` from env (already exists in packages/site/.env)
- Sends `POST {PUBLIC_FLARE_API_URL}/api/track` beacon on page load
- ~500 bytes, no dependencies, no cookies
- Payload: path, referrer, screen width, timezone, UTM params
- Uses `navigator.sendBeacon()` for non-blocking fire-and-forget

### 2. Worker Endpoint — `POST /api/track`
- New Hono route in packages/core
- Extracts from request: CF headers (`cf-ipcountry`, `cf-connecting-ip`), User-Agent
- Hashes IP+UA+date for unique visitor ID (never stores raw IP)
- Writes to D1 `page_views` table
- Returns 204 No Content (fast)
- Rate-limited via existing KV cache

### 3. D1 Table — `page_views`
```sql
CREATE TABLE page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT, -- 'mobile' | 'desktop' | 'tablet'
  visitor_hash TEXT, -- daily hash of IP+UA, not PII
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  screen_width INTEGER,
  load_time_ms INTEGER,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_page_views_path ON page_views(path);
CREATE INDEX idx_page_views_created ON page_views(created_at);
CREATE INDEX idx_page_views_visitor ON page_views(visitor_hash, created_at);
```

### 4. Admin Dashboard Widget
- New section on /admin dashboard (or dedicated /admin/analytics page)
- Queries D1 for aggregated stats
- Displays:
  - Visitors over time (line chart, reuse Chart.js already loaded)
  - Top pages (table)
  - Referrer sources (table)
  - Countries (map or table)
  - Device breakdown (pie/donut)
  - Bounce rate, avg session duration
  - 404 hits

## What Gets Tracked

**Core (from beacon):**
- Page path + timestamp
- Referrer source
- Screen width → device type
- Timezone
- UTM parameters (source, medium, campaign)
- Page load performance (performance.now())

**From CF headers (free, server-side):**
- Country (cf-ipcountry)
- Unique visitor hash (daily rotating, not PII)

**Derived (from queries):**
- Unique visitors (COUNT DISTINCT visitor_hash)
- Bounce rate (single-page sessions)
- Session duration (time between first/last beacon)
- Top entry/exit pages
- Time-of-day patterns
- 404 hit tracking

## Privacy

- No cookies
- No fingerprinting
- No PII stored (IP hashed with daily salt, never raw)
- No third-party scripts
- Compliant with GDPR/CCPA without consent banners
- Users own their data (it's in their D1)

## Branch

`feature/built-in-analytics` (off develop, after admin-ui-overhaul merges)

## Effort Estimate

- Tracking script + component: small
- Worker endpoint: small
- D1 migration: small
- Dashboard widget: medium (charts, queries, UI)
- Total: ~3-4 GSD phases
