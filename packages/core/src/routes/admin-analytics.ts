/**
 * Admin Analytics Routes
 *
 * /admin/analytics — Full analytics dashboard page
 * /admin/analytics/*-html — HTMX fragment endpoints for dynamic sections
 */

import { Hono } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware'
import {
  renderAnalyticsPage,
  renderOverviewStats,
  renderTopPagesHtml,
  renderReferrersHtml,
  renderCountriesHtml,
  renderDevicesHtml,
  renderExitLinksHtml,
  renderDeviceNamesHtml,
} from '../templates/pages/admin-analytics.template'
import { getVersionDisplay } from '../utils/version'

const VERSION = getVersionDisplay()

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
}

type Variables = {
  user?: {
    userId: string
    email: string
    role: string
  }
}

const router = new Hono<{ Bindings: Bindings; Variables: Variables }>()
router.use('*', requireAuth())

/**
 * GET /admin/analytics — Full page
 */
router.get('/', async (c) => {
  const user = c.get('user')
  return c.html(renderAnalyticsPage({
    user: {
      name: user!.email.split('@')[0] || user!.email,
      email: user!.email,
      role: user!.role,
    },
    version: VERSION,
  }))
})

/**
 * GET /admin/analytics/overview-html — HTMX fragment
 */
router.get('/overview-html', async (c) => {
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

    const current = await db.prepare(`
      SELECT
        COUNT(*) as page_views,
        COUNT(DISTINCT visitor_hash) as unique_visitors,
        COUNT(DISTINCT path) as unique_pages
      FROM page_views
      WHERE created_at >= ?
    `).bind(sinceStr).first() as any

    const previous = await db.prepare(`
      SELECT
        COUNT(*) as page_views,
        COUNT(DISTINCT visitor_hash) as unique_visitors
      FROM page_views
      WHERE created_at >= ? AND created_at < ?
    `).bind(prevSinceStr, sinceStr).first() as any

    const pvGrowth = previous?.page_views > 0
      ? (current?.page_views - previous?.page_views) / previous?.page_views * 100
      : 0
    const uvGrowth = previous?.unique_visitors > 0
      ? (current?.unique_visitors - previous?.unique_visitors) / previous?.unique_visitors * 100
      : 0

    return c.html(renderOverviewStats({
      pageViews: current?.page_views || 0,
      uniqueVisitors: current?.unique_visitors || 0,
      uniquePages: current?.unique_pages || 0,
      growth: { pageViews: pvGrowth, visitors: uvGrowth },
    }))
  } catch (error) {
    console.error('[Analytics] Overview error:', error)
    return c.html('<div class="text-red-500 p-4">Failed to load analytics overview</div>')
  }
})

/**
 * GET /admin/analytics/top-pages-html — HTMX fragment
 */
router.get('/top-pages-html', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { results } = await db.prepare(`
      SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views WHERE created_at >= ?
      GROUP BY path ORDER BY views DESC LIMIT 10
    `).bind(since.toISOString()).all()

    return c.html(renderTopPagesHtml((results || []) as any))
  } catch (error) {
    console.error('[Analytics] Top pages error:', error)
    return c.html('<div class="text-red-500 p-4">Failed to load top pages</div>')
  }
})

/**
 * GET /admin/analytics/referrers-html — HTMX fragment
 */
router.get('/referrers-html', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { results } = await db.prepare(`
      SELECT COALESCE(referrer, 'Direct') as source, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views WHERE created_at >= ?
      GROUP BY referrer ORDER BY views DESC LIMIT 10
    `).bind(since.toISOString()).all()

    return c.html(renderReferrersHtml((results || []) as any))
  } catch (error) {
    console.error('[Analytics] Referrers error:', error)
    return c.html('<div class="text-red-500 p-4">Failed to load referrers</div>')
  }
})

/**
 * GET /admin/analytics/countries-html — HTMX fragment
 */
router.get('/countries-html', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { results } = await db.prepare(`
      SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views WHERE created_at >= ?
      GROUP BY country ORDER BY views DESC LIMIT 10
    `).bind(since.toISOString()).all()

    return c.html(renderCountriesHtml((results || []) as any))
  } catch (error) {
    console.error('[Analytics] Countries error:', error)
    return c.html('<div class="text-red-500 p-4">Failed to load countries</div>')
  }
})

/**
 * GET /admin/analytics/devices-html — HTMX fragment
 */
router.get('/devices-html', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const [devices, browsers, oses] = await Promise.all([
      db.prepare(`SELECT device, COUNT(*) as count FROM page_views WHERE created_at >= ? GROUP BY device ORDER BY count DESC`).bind(sinceStr).all(),
      db.prepare(`SELECT browser, COUNT(*) as count FROM page_views WHERE created_at >= ? GROUP BY browser ORDER BY count DESC`).bind(sinceStr).all(),
      db.prepare(`SELECT os, COUNT(*) as count FROM page_views WHERE created_at >= ? GROUP BY os ORDER BY count DESC`).bind(sinceStr).all(),
    ])

    return c.html(renderDevicesHtml({
      devices: (devices.results || []) as any,
      browsers: (browsers.results || []) as any,
      os: (oses.results || []) as any,
    }))
  } catch (error) {
    console.error('[Analytics] Devices error:', error)
    return c.html('<div class="text-red-500 p-4">Failed to load devices</div>')
  }
})

/**
 * GET /admin/analytics/exit-links-html — HTMX fragment
 */
router.get('/exit-links-html', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { results } = await db.prepare(`
      SELECT event_data as destination, COUNT(*) as clicks
      FROM page_views
      WHERE event_type = 'exit' AND created_at >= ?
      GROUP BY event_data ORDER BY clicks DESC LIMIT 10
    `).bind(since.toISOString()).all()

    return c.html(renderExitLinksHtml((results || []) as any))
  } catch (error) {
    console.error('[Analytics] Exit links error:', error)
    return c.html('<div class="text-red-500 p-4">Failed to load exit links</div>')
  }
})

/**
 * GET /admin/analytics/device-names-html — HTMX fragment
 */
router.get('/device-names-html', async (c) => {
  try {
    const db = c.env.DB
    const period = c.req.query('period') || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { results } = await db.prepare(`
      SELECT COALESCE(device_name, device) as name, COUNT(*) as count
      FROM page_views
      WHERE created_at >= ? AND event_type = 'pageview'
      GROUP BY COALESCE(device_name, device) ORDER BY count DESC
    `).bind(since.toISOString()).all()

    return c.html(renderDeviceNamesHtml((results || []) as any))
  } catch (error) {
    console.error('[Analytics] Device names error:', error)
    return c.html('<div class="text-red-500 p-4">Failed to load device names</div>')
  }
})

export { router as adminAnalyticsRoutes }
