/**
 * Main Application Factory
 *
 * Creates a configured Flare CMS application with all core functionality
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import {
  apiRoutes,
  apiMediaRoutes,
  apiSystemRoutes,
  adminApiRoutes,
  authRoutes,
  testCleanupRoutes,
  adminContentRoutes,
  adminUsersRoutes,
  adminMediaRoutes,
  adminPluginRoutes,
  adminLogsRoutes,
  adminDashboardRoutes,
  adminCollectionsRoutes,
  adminSettingsRoutes,
  adminFormsRoutes,
  publicFormsRoutes,
  adminApiReferenceRoutes,
  adminApiTokensRoutes
} from './routes'
import { getCoreVersion, getVersionDisplay } from './utils/version'
import { bootstrapMiddleware } from './middleware/bootstrap'
import { metricsMiddleware } from './middleware/metrics'
import { securityHeadersMiddleware } from './middleware/security-headers'
import { csrfProtection } from './middleware/csrf'
import { createDatabaseToolsAdminRoutes } from './plugins/core-plugins/database-tools-plugin/admin-routes'
import { createSeedDataAdminRoutes } from './plugins/core-plugins/seed-data-plugin/admin-routes'
import { emailPlugin } from './plugins/core-plugins/email-plugin'
import { otpLoginPlugin } from './plugins/core-plugins/otp-login-plugin'
import { aiSearchPlugin } from './plugins/core-plugins/ai-search-plugin'
import { createMagicLinkAuthPlugin } from './plugins/available/magic-link-auth'
import cachePlugin, { setGlobalKVNamespace as setPluginKVNamespace } from './plugins/cache'
import { setGlobalKVNamespace as setSimpleKVNamespace } from './services/cache'
import { faviconSvg } from './assets/favicon'
import { PluginManager } from './plugins/plugin-manager'
import type { Plugin } from './types'

// ============================================================================
// Type Definitions
// ============================================================================

export interface Bindings {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  EMAIL_QUEUE?: Queue
  SENDGRID_API_KEY?: string
  DEFAULT_FROM_EMAIL?: string
  IMAGES_ACCOUNT_ID?: string
  IMAGES_API_TOKEN?: string
  ENVIRONMENT?: string
  JWT_SECRET?: string
  CORS_ORIGINS?: string
  BUCKET_NAME?: string
  GOOGLE_MAPS_API_KEY?: string
}

export interface Variables {
  user?: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
  // API token context — set when request authenticates via X-API-Key header
  apiToken?: {
    id: string
    name: string
    token_prefix: string
    user_id: string
    permissions: string | null
    allowed_collections: string[] | null
    is_read_only: boolean
    expires_at: number | null
    last_used_at: number | null
    created_at: number
  }
  requestId?: string
  startTime?: number
  appVersion?: string
  csrfToken?: string
}

export interface FlareConfig {
  // Collections configuration
  collections?: {
    directory?: string
    autoSync?: boolean
  }

  // Plugins configuration
  plugins?: {
    directory?: string
    autoLoad?: boolean
    disableAll?: boolean  // Disable all plugins including core plugins
    /** Plugin instances to install during app initialization */
    instances?: Plugin[]
  }

  // Custom routes
  routes?: Array<{
    path: string
    handler: Hono
  }>

  // Custom middleware
  middleware?: {
    beforeAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
    afterAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
  }

  // App metadata
  version?: string
  name?: string
}

export type FlareApp = Hono<{ Bindings: Bindings; Variables: Variables }>

// ============================================================================
// Application Factory
// ============================================================================

// Module-level flag: Workers reuse the same isolate across requests within a
// cold start window. setGlobalKVNamespace sets a module-level variable, so we
// only need to call it once per isolate lifetime.
let kvInitialized = false

// Module-level flag: ensure user-provided plugin instances are installed only
// once per Workers isolate lifetime (mirrors kvInitialized pattern).
let pluginsInstalled = false

/**
 * Create a Flare CMS application with core functionality
 *
 * @param config - Application configuration
 * @returns Configured Hono application
 *
 * @example
 * ```typescript
 * import { createFlareApp } from '@flare-cms/core'
 *
 * const app = createFlareApp({
 *   collections: {
 *     directory: './src/collections',
 *     autoSync: true
 *   },
 *   plugins: {
 *     directory: './src/plugins',
 *     autoLoad: true
 *   }
 * })
 *
 * export default app
 * ```
 */
export function createFlareApp(config: FlareConfig = {}): FlareApp {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  // Set app metadata
  const appVersion = config.version || getVersionDisplay()
  const appName = config.name || 'Flare CMS'

  // App version middleware
  app.use('*', async (c, next) => {
    c.set('appVersion', appVersion)
    await next()
  })

  // Metrics middleware - track all requests for real-time analytics
  app.use('*', metricsMiddleware())

  // Bootstrap middleware - runs migrations, syncs collections, and initializes plugins
  // Pass app reference so PluginManager can include it in PluginContext.activate()
  app.use('*', bootstrapMiddleware(config, app))

  // Install user-registered plugin instances (runs once per Workers isolate).
  // Placed after bootstrap so DB bindings are available, and before custom
  // middleware so plugin middleware participates in the full request chain.
  if (config.plugins?.instances?.length && !config.plugins?.disableAll) {
    app.use('*', async (c, next) => {
      if (!pluginsInstalled) {
        pluginsInstalled = true
        const pm = new PluginManager()
        await pm.initialize({
          db: c.env.DB,
          kv: c.env.CACHE_KV,
          r2: c.env.MEDIA_BUCKET,
          config: { enabled: true },
          services: {} as any,
          hooks: pm.hooks,
          logger: {
            debug: (...args: any[]) => console.debug(...args),
            info: (...args: any[]) => console.info(...args),
            warn: (...args: any[]) => console.warn(...args),
            error: (...args: any[]) => console.error(...args)
          },
          // Cast required: FlareApp is Hono<{Bindings,Variables}> which is not
          // assignable to PluginContext.app type Hono<BlankEnv> — same pattern
          // used in bootstrap.ts for getAppReference() (decision [04-01])
          app: app as any
        })
        for (const plugin of config.plugins!.instances!) {
          await pm.install(plugin)
        }
      }
      await next()
    })
  }

  // Custom middleware - before auth
  if (config.middleware?.beforeAuth) {
    for (const middleware of config.middleware.beforeAuth) {
      app.use('*', middleware)
    }
  }

  // Logging middleware
  app.use('*', async (_c, next) => {
    // Logging logic here
    await next()
  })

  // Security middleware
  app.use('*', securityHeadersMiddleware())

  // CSRF protection middleware
  app.use('*', csrfProtection())

  // Custom middleware - after auth
  if (config.middleware?.afterAuth) {
    for (const middleware of config.middleware.afterAuth) {
      app.use('*', middleware)
    }
  }

  // Wire KV namespace into three-tier cache (must run before any route handler calls getCacheService)
  // getCacheService() creates a singleton on first call — if a route runs before this middleware,
  // the singleton is created without KV and subsequent setGlobalKVNamespace calls won't affect it.
  app.use('*', async (c, next) => {
    if (!kvInitialized && c.env.CACHE_KV) {
      setPluginKVNamespace(c.env.CACHE_KV)
      setSimpleKVNamespace(c.env.CACHE_KV)
      kvInitialized = true
    }
    await next()
  })

  // Core routes
  // Routes are being imported incrementally from routes/*
  // Each route is tested and migrated one-by-one
  app.route('/api', apiRoutes)
  app.route('/api/media', apiMediaRoutes)
  app.route('/api/system', apiSystemRoutes)
  app.route('/admin/api', adminApiRoutes)
  app.route('/admin/dashboard', adminDashboardRoutes)
  app.route('/admin/collections', adminCollectionsRoutes)
  app.route('/admin/forms', adminFormsRoutes)
  app.route('/admin/settings', adminSettingsRoutes)
  app.route('/forms', publicFormsRoutes)
  app.route('/api/forms', publicFormsRoutes) // API endpoint for form submissions
  app.route('/admin/api-reference', adminApiReferenceRoutes)
  app.route('/admin/api-tokens', adminApiTokensRoutes)
  app.route('/admin/database-tools', createDatabaseToolsAdminRoutes())
  app.route('/admin/seed-data', createSeedDataAdminRoutes())
  app.route('/admin/content', adminContentRoutes)
  app.route('/admin/media', adminMediaRoutes)
  // Plugin routes - AI Search (MUST be registered BEFORE admin/plugins to avoid route conflict)
  // Register AI Search routes first so they take precedence over the generic /:id handler
  if (aiSearchPlugin.routes && aiSearchPlugin.routes.length > 0) {
    for (const route of aiSearchPlugin.routes) {
      app.route(route.path, route.handler)
    }
  }

  // Plugin routes - Cache (dashboard and management API)
  // Fixes GitHub Issue #461: Cache routes were not registered
  app.route('/admin/cache', cachePlugin.getRoutes())

  // Plugin routes - OTP Login (MUST be registered BEFORE admin/plugins to avoid route conflict)
  // Register OTP Login routes first so they take precedence over the generic /:id handler
  if (otpLoginPlugin.routes && otpLoginPlugin.routes.length > 0) {
    for (const route of otpLoginPlugin.routes) {
      app.route(route.path, route.handler as any)
    }
  }

  app.route('/admin/plugins', adminPluginRoutes)
  app.route('/admin/logs', adminLogsRoutes)
  app.route('/admin', adminUsersRoutes)
  app.route('/auth', authRoutes)

  // Test cleanup routes (only for development/test environments)
  app.route('/', testCleanupRoutes)

  // Plugin routes - Email
  if (emailPlugin.routes && emailPlugin.routes.length > 0) {
    for (const route of emailPlugin.routes) {
      app.route(route.path, route.handler as any)
    }
  }

  // Plugin routes - Magic Link Auth (passwordless authentication via email links)
  const magicLinkPlugin = createMagicLinkAuthPlugin()
  if (magicLinkPlugin.routes && magicLinkPlugin.routes.length > 0) {
    for (const route of magicLinkPlugin.routes) {
      app.route(route.path, route.handler as any)
    }
  }

  // Serve favicon
  app.get('/favicon.svg', (c) => {
    return new Response(faviconSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  })

  // Serve files from R2 storage (public file access)
  // Cache API integration: responses are cached at the edge on first access (custom domains only)
  // Cache API is transparent — no X-Cache-Status headers on media responses
  app.get('/files/*', async (c) => {
    try {
      // Extract the path from the URL pathname (everything after /files/)
      const url = new URL(c.req.url)
      const pathname = url.pathname

      // Remove the /files/ prefix to get the R2 object key
      const objectKey = pathname.replace(/^\/files\//, '')

      if (!objectKey) {
        return c.notFound()
      }

      // Cache API check — returns cached response on hit (custom domains only)
      // Note: cache.match() always misses on *.workers.dev and local dev — this is expected
      const cache = caches.default
      const cacheKey = new Request(c.req.url)
      const cachedResponse = await cache.match(cacheKey)
      if (cachedResponse) {
        return cachedResponse
      }

      // Cache miss — fetch from R2
      const object = await c.env.MEDIA_BUCKET.get(objectKey)

      if (!object) {
        return c.notFound()
      }

      // Build response headers using R2 recommended approach
      // writeHttpMetadata sets Content-Type, Content-Disposition, and other HTTP metadata
      const headers = new Headers()
      object.writeHttpMetadata(headers)
      headers.set('etag', object.httpEtag)
      headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')

      const response = new Response(object.body as any, { headers })

      // Store in Cache API non-blocking via waitUntil (custom domains only)
      if (c.executionCtx) {
        c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
      }

      return response
    } catch (error) {
      console.error('Error serving file:', error)
      return c.notFound()
    }
  })

  // Custom routes - User-defined routes
  if (config.routes) {
    for (const route of config.routes) {
      app.route(route.path, route.handler)
    }
  }

  // Root redirect to login
  app.get('/', (c) => {
    return c.redirect('/auth/login')
  })

  // Health check
  app.get('/health', (c) => {
    return c.json({
      name: appName,
      version: appVersion,
      status: 'running',
      timestamp: new Date().toISOString()
    })
  })

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not Found', status: 404 }, 404)
  })

  // Error handler
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal Server Error', status: 500 }, 500)
  })

  return app
}

/**
 * Setup core middleware (backward compatibility)
 *
 * @param _app - Hono application
 * @deprecated Use createFlareApp() instead
 */
export function setupCoreMiddleware(_app: FlareApp): void {
  console.warn('setupCoreMiddleware is deprecated. Use createFlareApp() instead.')
  // Backward compatibility implementation
}

/**
 * Setup core routes (backward compatibility)
 *
 * @param _app - Hono application
 * @deprecated Use createFlareApp() instead
 */
export function setupCoreRoutes(_app: FlareApp): void {
  console.warn('setupCoreRoutes is deprecated. Use createFlareApp() instead.')
  // Backward compatibility implementation
}

