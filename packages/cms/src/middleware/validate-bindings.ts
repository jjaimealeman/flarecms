import type { Context } from 'hono'
import type { Bindings } from '@flare-cms/core'

const JWT_SECRET_HARDCODED_DEFAULT = 'your-super-secret-jwt-key-change-in-production'

type MiddlewareFn = (c: Context, next: () => Promise<void>) => Promise<void>

export function validateBindingsMiddleware(): MiddlewareFn {
  return async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    const missing: string[] = []

    if (!c.env.DB) missing.push('DB (D1 database)')
    if (!c.env.MEDIA_BUCKET) missing.push('MEDIA_BUCKET (R2 bucket)')

    if (missing.length > 0) {
      console.error('[Startup] Missing required bindings:', missing.join(', '))
      return c.json(
        { error: 'Service unavailable: infrastructure misconfiguration' },
        500
      )
    }

    // JWT_SECRET assertion — block all requests if using hardcoded default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jwtSecret = (c.env as any).JWT_SECRET
    if (!jwtSecret || jwtSecret === JWT_SECRET_HARDCODED_DEFAULT) {
      console.error('[Startup] FATAL: JWT_SECRET is not set or is using the hardcoded default. Run: wrangler secret put JWT_SECRET')
      return c.json({
        error: 'Service unavailable: JWT_SECRET must be configured — see wrangler secret put JWT_SECRET'
      }, 500)
    }

    // KV is optional — warn only, don't block
    if (!(c.env as any).CACHE_KV) {
      console.warn('[Startup] CACHE_KV binding not configured — rate limiting disabled')
    }

    await next()
  }
}
