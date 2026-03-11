/**
 * Analytics Tracking API
 *
 * POST /api/track — receives beacon from <FlareAnalytics /> component
 * GET  /api/analytics/* — admin-only aggregated stats (HTMX endpoints)
 *
 * Privacy-first: no cookies, no PII, IP hashed with daily rotating salt
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware'

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  JWT_SECRET?: string
}

type Variables = {
  user?: {
    userId: string
    email: string
    role: string
  }
}

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ============================================================================
// Helpers
// ============================================================================

/** Hash IP + User-Agent + date for daily unique visitor ID (not PII) */
async function hashVisitor(ip: string, ua: string): Promise<string> {
  const date = new Date().toISOString().split('T')[0] // daily rotation
  const data = `${ip}:${ua}:${date}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Parse User-Agent into device type */
function parseDevice(ua: string, screenWidth?: number): string {
  if (screenWidth) {
    if (screenWidth < 768) return 'mobile'
    if (screenWidth < 1024) return 'tablet'
    return 'desktop'
  }
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile'
  if (/ipad|tablet/i.test(ua)) return 'tablet'
  return 'desktop'
}

/** Extract browser name from User-Agent */
function parseBrowser(ua: string): string {
  if (/firefox/i.test(ua)) return 'Firefox'
  if (/edg/i.test(ua)) return 'Edge'
  if (/chrome/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  if (/opera|opr/i.test(ua)) return 'Opera'
  return 'Other'
}

/** Extract OS from User-Agent */
function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows'
  if (/macintosh|mac os/i.test(ua)) return 'macOS'
  if (/linux/i.test(ua) && !/android/i.test(ua)) return 'Linux'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  return 'Other'
}

/** Extract specific device name (iPhone, Samsung, iPad, Pixel, etc.) */
function parseDeviceName(ua: string): string | null {
  // iPhone models
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  if (/ipod/i.test(ua)) return 'iPod'

  // Android devices
  if (/samsung|sm-/i.test(ua)) return 'Samsung'
  if (/pixel/i.test(ua)) return 'Google Pixel'
  if (/oneplus/i.test(ua)) return 'OnePlus'
  if (/huawei/i.test(ua)) return 'Huawei'
  if (/xiaomi|redmi|poco/i.test(ua)) return 'Xiaomi'
  if (/oppo/i.test(ua)) return 'Oppo'
  if (/vivo/i.test(ua)) return 'Vivo'
  if (/motorola|moto /i.test(ua)) return 'Motorola'
  if (/lg[- ]/i.test(ua)) return 'LG'

  // Desktop — no specific device
  return null
}

/** Generate a simple ID */
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `pv_${timestamp}_${random}`
}

// ============================================================================
// POST /api/track — Public beacon endpoint (no auth required)
// ============================================================================

// CORS for cross-origin beacon from Astro site
router.use('/track', cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,
}))

router.post('/track', async (c) => {
  try {
    // Accept both application/json and text/plain (sendBeacon uses text/plain to avoid CORS preflight)
    let body: any
    const contentType = c.req.header('content-type') || ''
    if (contentType.includes('text/plain')) {
      const text = await c.req.text()
      body = JSON.parse(text)
    } else {
      body = await c.req.json()
    }

    // Basic validation
    if (!body.path || typeof body.path !== 'string') {
      return c.body(null, 204)
    }

    // Rate limiting: 1 track per IP per path per 5 seconds
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    const rateLimitKey = `analytics:rate:${ip}:${body.path}`

    try {
      const existing = await c.env.CACHE_KV.get(rateLimitKey)
      if (existing) {
        return c.body(null, 204) // silently drop duplicate
      }
      await c.env.CACHE_KV.put(rateLimitKey, '1', { expirationTtl: 5 })
    } catch {
      // KV errors shouldn't block tracking
    }

    // Extract data
    const ua = c.req.header('user-agent') || ''
    const country = c.req.header('cf-ipcountry') || null
    const visitorHash = await hashVisitor(ip, ua)
    const device = parseDevice(ua, body.screenWidth)
    const browser = parseBrowser(ua)
    const os = parseOS(ua)
    const deviceName = parseDeviceName(ua)
    const eventType = body.eventType || 'pageview'
    const eventData = body.eventData ? body.eventData.substring(0, 1000) : null

    // Sanitize path (prevent storing query params with sensitive data)
    const path = body.path.split('?')[0].substring(0, 500)
    const referrer = body.referrer ? body.referrer.substring(0, 1000) : null

    const id = generateId()

    await c.env.DB.prepare(`
      INSERT INTO page_views (id, path, referrer, country, device, visitor_hash, utm_source, utm_medium, utm_campaign, screen_width, load_time_ms, session_id, browser, os, event_type, event_data, device_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      path,
      referrer,
      country,
      device,
      visitorHash,
      body.utmSource || null,
      body.utmMedium || null,
      body.utmCampaign || null,
      body.screenWidth || null,
      body.loadTime || null,
      body.sessionId || null,
      browser,
      os,
      eventType,
      eventData,
      deviceName
    ).run()

    return c.body(null, 204)
  } catch (error) {
    console.error('[Analytics] Track error:', error)
    return c.body(null, 204) // never fail the beacon
  }
})

// ============================================================================
// Admin analytics endpoints (auth required)
// ============================================================================

const adminRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>()
adminRouter.use('*', requireAuth())

/**
 * GET /admin/analytics/overview — Summary stats for a period
 * Query: ?period=7d|30d|90d (default 30d)
 */
adminRouter.get('/overview', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const prevSince = new Date()
    prevSince.setDate(prevSince.getDate() - (days * 2))
    const prevSinceStr = prevSince.toISOString()

    // Current period stats
    const current = await db.prepare(`
      SELECT
        COUNT(*) as page_views,
        COUNT(DISTINCT visitor_hash) as unique_visitors,
        COUNT(DISTINCT path) as unique_pages
      FROM page_views
      WHERE created_at >= ?
    `).bind(sinceStr).first() as any

    // Previous period stats (for growth %)
    const previous = await db.prepare(`
      SELECT
        COUNT(*) as page_views,
        COUNT(DISTINCT visitor_hash) as unique_visitors
      FROM page_views
      WHERE created_at >= ? AND created_at < ?
    `).bind(prevSinceStr, sinceStr).first() as any

    const pvGrowth = previous?.page_views > 0
      ? ((current?.page_views - previous?.page_views) / previous?.page_views * 100).toFixed(1)
      : '0'
    const uvGrowth = previous?.unique_visitors > 0
      ? ((current?.unique_visitors - previous?.unique_visitors) / previous?.unique_visitors * 100).toFixed(1)
      : '0'

    return c.json({
      pageViews: current?.page_views || 0,
      uniqueVisitors: current?.unique_visitors || 0,
      uniquePages: current?.unique_pages || 0,
      growth: {
        pageViews: parseFloat(pvGrowth as string),
        visitors: parseFloat(uvGrowth as string),
      },
      period,
    })
  } catch (error) {
    console.error('[Analytics] Overview error:', error)
    return c.json({ error: 'Failed to fetch analytics' }, 500)
  }
})

/**
 * GET /admin/analytics/timeseries — Page views over time
 * Query: ?period=7d|30d|90d
 */
adminRouter.get('/timeseries', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const { results } = await db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as views,
        COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views
      WHERE created_at >= ?
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).bind(sinceStr).all()

    return c.json(results || [])
  } catch (error) {
    console.error('[Analytics] Timeseries error:', error)
    return c.json([], 500)
  }
})

/**
 * GET /admin/analytics/top-pages — Most visited pages
 * Query: ?period=30d&limit=10
 */
adminRouter.get('/top-pages', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const limit = parseInt(c.req.query('limit') || '10')
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const { results } = await db.prepare(`
      SELECT
        path,
        COUNT(*) as views,
        COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views
      WHERE created_at >= ?
      GROUP BY path
      ORDER BY views DESC
      LIMIT ?
    `).bind(sinceStr, limit).all()

    return c.json(results || [])
  } catch (error) {
    console.error('[Analytics] Top pages error:', error)
    return c.json([], 500)
  }
})

/**
 * GET /admin/analytics/referrers — Top referrer sources
 */
adminRouter.get('/referrers', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const limit = parseInt(c.req.query('limit') || '10')
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const { results } = await db.prepare(`
      SELECT
        COALESCE(referrer, 'Direct') as source,
        COUNT(*) as views,
        COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views
      WHERE created_at >= ?
      GROUP BY referrer
      ORDER BY views DESC
      LIMIT ?
    `).bind(sinceStr, limit).all()

    return c.json(results || [])
  } catch (error) {
    console.error('[Analytics] Referrers error:', error)
    return c.json([], 500)
  }
})

/**
 * GET /admin/analytics/countries — Top countries
 */
adminRouter.get('/countries', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const limit = parseInt(c.req.query('limit') || '10')
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const { results } = await db.prepare(`
      SELECT
        COALESCE(country, 'Unknown') as country,
        COUNT(*) as views,
        COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views
      WHERE created_at >= ?
      GROUP BY country
      ORDER BY views DESC
      LIMIT ?
    `).bind(sinceStr, limit).all()

    return c.json(results || [])
  } catch (error) {
    console.error('[Analytics] Countries error:', error)
    return c.json([], 500)
  }
})

/**
 * GET /admin/analytics/devices — Device/browser/OS breakdown
 */
adminRouter.get('/devices', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const [devices, browsers, oses] = await Promise.all([
      db.prepare(`
        SELECT device, COUNT(*) as count FROM page_views
        WHERE created_at >= ? GROUP BY device ORDER BY count DESC
      `).bind(sinceStr).all(),
      db.prepare(`
        SELECT browser, COUNT(*) as count FROM page_views
        WHERE created_at >= ? GROUP BY browser ORDER BY count DESC
      `).bind(sinceStr).all(),
      db.prepare(`
        SELECT os, COUNT(*) as count FROM page_views
        WHERE created_at >= ? GROUP BY os ORDER BY count DESC
      `).bind(sinceStr).all(),
    ])

    return c.json({
      devices: devices.results || [],
      browsers: browsers.results || [],
      os: oses.results || [],
    })
  } catch (error) {
    console.error('[Analytics] Devices error:', error)
    return c.json({ devices: [], browsers: [], os: [] }, 500)
  }
})

/**
 * GET /admin/analytics/exit-links — Top exit link destinations
 */
adminRouter.get('/exit-links', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const limit = parseInt(c.req.query('limit') || '10')
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { results } = await db.prepare(`
      SELECT
        event_data as destination,
        path as exit_page,
        COUNT(*) as clicks
      FROM page_views
      WHERE event_type = 'exit' AND created_at >= ?
      GROUP BY event_data
      ORDER BY clicks DESC
      LIMIT ?
    `).bind(since.toISOString(), limit).all()

    return c.json(results || [])
  } catch (error) {
    console.error('[Analytics] Exit links error:', error)
    return c.json([], 500)
  }
})

/**
 * GET /admin/analytics/device-names — Specific device breakdown (iPhone vs Samsung vs Pixel)
 */
adminRouter.get('/device-names', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { results } = await db.prepare(`
      SELECT
        COALESCE(device_name, device) as name,
        COUNT(*) as count
      FROM page_views
      WHERE created_at >= ? AND event_type = 'pageview'
      GROUP BY COALESCE(device_name, device)
      ORDER BY count DESC
    `).bind(since.toISOString()).all()

    return c.json(results || [])
  } catch (error) {
    console.error('[Analytics] Device names error:', error)
    return c.json([], 500)
  }
})

// Mount admin analytics under the admin router
router.route('/analytics', adminRouter)

export { router as apiAnalyticsRoutes }
export { adminRouter as adminAnalyticsRoutes }
