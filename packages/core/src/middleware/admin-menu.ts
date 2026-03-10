/**
 * Admin Menu Middleware
 *
 * Queries active collections from D1 and builds the dynamic menu items
 * array for the admin sidebar. Runs on all /admin/* routes.
 */

import type { Context, Next } from 'hono'
import { icon, collectionIcon } from '../templates/icons'

export interface AdminMenuItem {
  label: string
  slug: string
  collectionId: string
  icon: string
}

/**
 * Middleware that attaches `adminMenuItems` to the Hono context.
 * Each admin route handler can then read `c.get('adminMenuItems')` and
 * pass it as `dynamicMenuItems` to the layout template.
 */
export function adminMenuMiddleware() {
  // Cache menu items per isolate to avoid querying DB on every request
  let cachedItems: AdminMenuItem[] | null = null
  let cacheTimestamp = 0
  const CACHE_TTL = 60_000 // 1 minute

  return async (c: Context, next: Next) => {
    const now = Date.now()

    if (!cachedItems || now - cacheTimestamp > CACHE_TTL) {
      try {
        const db = c.env.DB
        if (db) {
          const result = await db.prepare(
            `SELECT id, name, display_name FROM collections WHERE is_active = 1 ORDER BY display_name ASC, name ASC`
          ).all()

          cachedItems = (result.results || []).map((row: any) => ({
            label: row.display_name || row.name,
            slug: row.name,
            collectionId: row.id,
            icon: icon(collectionIcon(), 'h-5 w-5 shrink-0'),
          }))
          cacheTimestamp = now
        }
      } catch (err) {
        console.error('adminMenuMiddleware: failed to query collections', err)
        // Fall back to empty if query fails
        if (!cachedItems) cachedItems = []
      }
    }

    c.set('adminMenuItems', cachedItems || [])
    await next()
  }
}
