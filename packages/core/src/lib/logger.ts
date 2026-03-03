/**
 * Structured logger for Workers Logs observability.
 *
 * Workers Logs (observability.enabled = true in wrangler.toml) automatically
 * indexes structured JSON fields from console output. Using JSON.stringify
 * ensures Workers Logs receives parseable JSON rather than [Object object].
 *
 * Usage:
 *   log.info('auth.login', { userId, email, ip })
 *   log.warn('auth.login_failed', { email, reason: 'invalid_password', ip })
 *   log.error('content.create_failed', { collectionId, userId, error: err.message })
 */

export const log = {
  info(event: string, fields: Record<string, unknown> = {}): void {
    console.log(JSON.stringify({ level: 'info', event, ts: Date.now(), ...fields }))
  },
  warn(event: string, fields: Record<string, unknown> = {}): void {
    console.warn(JSON.stringify({ level: 'warn', event, ts: Date.now(), ...fields }))
  },
  error(event: string, fields: Record<string, unknown> = {}): void {
    console.error(JSON.stringify({ level: 'error', event, ts: Date.now(), ...fields }))
  },
}
