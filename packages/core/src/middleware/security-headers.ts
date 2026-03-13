import { Context, Next } from 'hono'

/**
 * Security headers middleware.
 * Sets standard security headers on every response.
 * Skips HSTS in development to avoid local dev issues.
 */
export const securityHeadersMiddleware = () => {
  return async (c: Context, next: Next) => {
    await next()

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'SAMEORIGIN')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    c.header('Cross-Origin-Opener-Policy', 'same-origin')

    // CSP: allow inline styles/scripts (needed for admin UI templates),
    // images from self + data URIs + Cloudflare Images, fonts from bunny.net
    c.header('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
      "font-src 'self' https://fonts.bunny.net",
      "img-src 'self' data: blob: https://imagedelivery.net https://*.r2.dev",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '))

    // Only set HSTS in non-development environments
    const environment = (c.env as any)?.ENVIRONMENT
    if (environment !== 'development') {
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
  }
}
