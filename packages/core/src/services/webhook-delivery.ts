/**
 * Webhook Delivery Service
 *
 * Fire-and-forget outbound webhook delivery with optional HMAC-SHA256 signing.
 * Used by content route handlers to notify external systems on publish/unpublish events.
 *
 * Usage:
 *   import { deliverWebhooks } from './webhook-delivery'
 *   await deliverWebhooks(env.WEBHOOK_URLS, env.WEBHOOK_SECRET, {
 *     event: 'content:after-publish',
 *     contentId: '...',
 *     contentType: 'blog-posts',
 *     timestamp: Date.now(),
 *   })
 */

export interface WebhookPayload {
  /** Event name, e.g. 'content:after-publish' */
  event: string
  /** Content item ID */
  contentId: string
  /** Collection name (optional) */
  contentType?: string
  /** Unix timestamp in milliseconds */
  timestamp: number
}

/**
 * Deliver a webhook payload to one or more URLs.
 *
 * @param webhookUrls - Comma-separated list of URLs to POST to (from WEBHOOK_URLS env var)
 * @param webhookSecret - Shared secret for HMAC-SHA256 signing (from WEBHOOK_SECRET env var, optional)
 * @param payload - The webhook payload to send
 *
 * Behavior:
 * - If webhookSecret is provided: signs payload with HMAC-SHA256, sends X-Webhook-Signature header
 * - If webhookSecret is missing: sends webhooks unsigned with a console.warn
 * - Errors per-URL are logged but do not throw — fire-and-forget, no retries
 */
export async function deliverWebhooks(
  webhookUrls: string,
  webhookSecret: string | undefined,
  payload: WebhookPayload,
): Promise<void> {
  const urls = webhookUrls.split(',').map(u => u.trim()).filter(Boolean)

  if (urls.length === 0) {
    return
  }

  const body = JSON.stringify(payload)

  if (!webhookSecret) {
    console.warn(
      '[webhook] WEBHOOK_SECRET is not set — sending webhooks without HMAC signature. ' +
      'Set WEBHOOK_SECRET in wrangler.toml for signed payloads.',
    )
  }

  for (const url of urls) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': payload.event,
      }

      // Only sign if secret is available
      if (webhookSecret) {
        const signature = await createSignature(body, webhookSecret)
        headers['X-Webhook-Signature'] = signature
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      })
      console.log(`[webhook] ${payload.event} -> ${url} = ${response.status}`)
    } catch (error) {
      console.error(`[webhook] ${payload.event} -> ${url} FAILED:`, error)
      // Fire and forget — no retries per CONTEXT.md decision
    }
  }
}

/**
 * Generate HMAC-SHA256 signature for a payload string.
 * Returns 'sha256=<hex>' format (same as GitHub webhook signatures).
 */
async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${hex}`
}
