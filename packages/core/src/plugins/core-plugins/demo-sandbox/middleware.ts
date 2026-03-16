/**
 * Demo Sandbox Middleware
 *
 * Provides mutation rate limiting and upload restrictions for demo users.
 * Demo users are identified by KV key existence (demo-mutations:{userId}),
 * NOT by role check — this ensures API token users (viewer role) and standard
 * registered viewer users are never affected.
 */

import type { Context, Next } from 'hono'
import type { Bindings, Variables } from '../../../app'

type HonoContext = Context<{ Bindings: Bindings; Variables: Variables }>

const MUTATION_LIMIT = 50
const KV_TTL = 86400 // 24 hours in seconds

/**
 * Returns true if the current user is a demo user (KV key exists).
 * Returns false for non-demo users (admin, editor, API token viewer, standard viewer).
 */
async function isDemoUser(
  c: HonoContext,
  userId: string,
): Promise<{ isDemo: boolean; kvKey: string; counterValue: string | null }> {
  const kv = c.env.CACHE_KV
  if (!kv) {
    return { isDemo: false, kvKey: '', counterValue: null }
  }

  const kvKey = `demo-mutations:${userId}`
  const counterValue = await kv.get(kvKey)

  // Key does NOT exist = not a demo user
  if (counterValue === null) {
    return { isDemo: false, kvKey, counterValue: null }
  }

  return { isDemo: true, kvKey, counterValue }
}

/**
 * demoMutationGuard
 *
 * Counts mutations (POST, PUT, PATCH, DELETE) for demo users.
 * Returns 429 when the demo user exceeds 50 mutations.
 * GET/HEAD/OPTIONS requests are always allowed and do not count.
 * Non-demo users pass through unimpeded.
 */
export function demoMutationGuard() {
  return async (c: HonoContext, next: Next) => {
    const user = c.get('user')
    if (!user) return next()

    const kv = c.env.CACHE_KV
    if (!kv) return next()

    // Only count write methods
    const method = c.req.method
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next()
    }

    const { isDemo, kvKey, counterValue } = await isDemoUser(c, user.userId)
    if (!isDemo) return next()

    const count = parseInt(counterValue!, 10) || 0

    if (count >= MUTATION_LIMIT) {
      return c.json(
        {
          error:
            'You have reached the demo limit of 50 changes. Start a new demo session to continue.',
        },
        429,
      )
    }

    // Increment counter (non-blocking — mutation is optimistic)
    await kv.put(kvKey, String(count + 1), { expirationTtl: KV_TTL })

    // Inform the client how many mutations remain
    c.header('X-Demo-Mutations-Remaining', String(MUTATION_LIMIT - 1 - count))

    return next()
  }
}

/**
 * demoUploadGuard
 *
 * Restricts demo user uploads to images only, maximum 2 MB.
 * Parses the request formData once and stores it on the context as
 * `parsedFormData` so downstream handlers (api-media.ts) can reuse it
 * without triggering a second body-consumption error.
 * Non-demo users pass through unimpeded.
 */
export function demoUploadGuard() {
  return async (c: HonoContext, next: Next) => {
    const user = c.get('user')
    if (!user) return next()

    const kv = c.env.CACHE_KV
    if (!kv) return next()

    // Only guard POST requests (uploads)
    if (c.req.method !== 'POST') return next()

    const { isDemo } = await isDemoUser(c, user.userId)
    if (!isDemo) return next()

    // Parse formData — this consumes the request body, so we store it on context
    let formData: FormData
    try {
      formData = await c.req.formData()
    } catch {
      // If body parsing fails, let the downstream handler deal with it
      return next()
    }

    // Store parsed formData on context for downstream reuse
    c.set('parsedFormData', formData)

    const file = formData.get('file') as File | null

    // No file attached — let downstream handler return the appropriate error
    if (!file) return next()

    // Reject non-image file types
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'Demo accounts can only upload images.' }, 400)
    }

    // Reject files larger than 2 MB
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: 'Demo image uploads are limited to 2 MB.' }, 400)
    }

    return next()
  }
}
