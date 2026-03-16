/**
 * Demo Sandbox Plugin
 *
 * Provides a public-facing sandbox experience for visitors to explore Flare CMS.
 * Creates scoped demo users (viewer role + editor permission on demo-sandbox-collection).
 *
 * Routes (Phase 12):
 *   POST /demo/auth/request — validate email, rate limit, send OTP via Resend
 *   POST /demo/auth/verify  — verify OTP, create demo user, issue 30-min JWT session
 */

import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import { PluginBuilder } from '../../sdk/plugin-builder'
import type { Plugin } from '@flare-cms/core'
import { OTPService } from '../otp-login-plugin/otp-service'
import type { OTPSettings } from '../otp-login-plugin/otp-service'
import { createDemoUser } from './demo-service'
import { getDemoOtpEmailHtml } from './email-templates'
import { AuthManager, generateCsrfToken } from '../../../middleware'

// Fallback JWT secret — mirrors auth.ts / csrf.ts pattern for local dev
const JWT_SECRET_FALLBACK = 'your-super-secret-jwt-key-change-in-production'

// Tighter OTP settings for demo (5-min expiry, max 3 attempts, 3 requests/hour)
const DEMO_OTP_SETTINGS: OTPSettings = {
  codeLength: 6,
  codeExpiryMinutes: 5,
  maxAttempts: 3,
  rateLimitPerHour: 3,
  allowNewUserRegistration: true,
}

/**
 * Known disposable / throwaway email domains.
 * Rejected at the /request step with HTTP 422.
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'spam4.me',
  'trashmail.com',
  'trashmail.me',
  'trashmail.net',
  'dispostable.com',
  'maildrop.cc',
  'mailnull.com',
  'spamgourmet.com',
  '10minutemail.com',
  'temp-mail.org',
])

// ============================================================================
// Validation schemas
// ============================================================================

const requestSchema = z.object({
  email: z.string().email('A valid email address is required'),
})

const verifySchema = z.object({
  email: z.string().email('A valid email address is required'),
  code: z.string().min(4).max(8),
})

// ============================================================================
// Plugin factory
// ============================================================================

export function createDemoSandboxPlugin(): Plugin {
  const builder = PluginBuilder.create({
    name: 'demo-sandbox',
    version: '1.0.0',
    description: 'Public demo sandbox for visitors to explore Flare CMS',
  })

  builder.metadata({
    author: {
      name: 'Flare CMS Team',
      email: 'team@flarecms.dev',
    },
    license: 'MIT',
    compatibility: '^2.1.0',
  })

  // ============================================================================
  // Demo Auth API — /demo/auth/*
  // ============================================================================

  const demoAuthAPI = new Hono()

  /**
   * POST /demo/auth/request
   *
   * Validates the submitted email, blocks disposable domains, enforces rate
   * limiting, creates an OTP code in the DB, and sends a branded email via
   * the Resend API (settings loaded from the email plugin row in the DB).
   */
  demoAuthAPI.post('/request', async (c: any) => {
    try {
      const body = await c.req.json()
      const validation = requestSchema.safeParse(body)

      if (!validation.success) {
        return c.json({ error: 'Validation failed', details: validation.error.issues }, 400)
      }

      const { email } = validation.data
      const normalizedEmail = email.toLowerCase().trim()
      const db = c.env.DB
      const ipAddress = c.req.header('cf-connecting-ip') || 'unknown'

      // --- Block already-logged-in admin users ---
      const existingToken = getCookie(c, 'auth_token')
      if (existingToken) {
        const jwtSecret = c.env.JWT_SECRET || JWT_SECRET_FALLBACK
        const payload = await AuthManager.verifyToken(existingToken, jwtSecret)
        if (payload && payload.role === 'admin') {
          return c.json(
            { error: "You're already logged in as an admin. Log out first." },
            409,
          )
        }
      }

      // --- Block disposable email domains ---
      const domain = normalizedEmail.split('@')[1]
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        return c.json({ error: 'Please use a real email address.' }, 422)
      }

      const otpService = new OTPService(db)

      // --- Rate limit: 3 requests per email per hour ---
      const canRequest = await otpService.checkRateLimit(normalizedEmail, DEMO_OTP_SETTINGS)
      if (!canRequest) {
        return c.json({ error: 'Too many requests. Please try again in an hour.' }, 429)
      }

      // --- Create OTP code ---
      const userAgent = c.req.header('user-agent') || 'unknown'
      const otpCode = await otpService.createOTPCode(normalizedEmail, DEMO_OTP_SETTINGS, ipAddress, userAgent)

      // --- Send branded email via Resend ---
      try {
        const isDevMode = c.env.ENVIRONMENT === 'development'

        if (isDevMode) {
          console.log(`[DEV] Demo OTP Code for ${normalizedEmail}: ${otpCode.code}`)
        }

        const emailPlugin = await db
          .prepare(`SELECT settings FROM plugins WHERE id = 'email'`)
          .first() as { settings: string | null } | null

        if (emailPlugin?.settings) {
          const emailSettings = JSON.parse(emailPlugin.settings)

          if (emailSettings.apiKey && emailSettings.fromEmail && emailSettings.fromName) {
            const emailContent = getDemoOtpEmailHtml(otpCode.code)

            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${emailSettings.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: `${emailSettings.fromName} <${emailSettings.fromEmail}>`,
                to: [normalizedEmail],
                subject: 'Your Flare CMS demo login code',
                html: emailContent.html,
                text: emailContent.text,
                reply_to: emailSettings.replyTo || emailSettings.fromEmail,
              }),
            })

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json() as { message?: string }
              console.error('[demo-sandbox] Failed to send OTP email via Resend:', errorData)
            }
          } else {
            console.warn('[demo-sandbox] Email plugin is not fully configured (missing apiKey, fromEmail, or fromName)')
          }
        } else {
          console.warn('[demo-sandbox] Email plugin has no settings configured')
        }
      } catch (emailError) {
        console.error('[demo-sandbox] Error sending OTP email:', emailError)
        // Don't block the response — user gets a success even if email fails
        // (the code is created; they can request again)
      }

      return c.json({ message: 'Check your email for a login code.', expiresIn: 300 })
    } catch (error) {
      console.error('[demo-sandbox] /request error:', error)
      return c.json({ error: 'An error occurred. Please try again.' }, 500)
    }
  })

  /**
   * POST /demo/auth/verify
   *
   * Verifies the OTP code, creates or retrieves the demo user, issues a
   * 30-minute JWT, and sets auth_token + csrf_token cookies.
   */
  demoAuthAPI.post('/verify', async (c: any) => {
    try {
      const body = await c.req.json()
      const validation = verifySchema.safeParse(body)

      if (!validation.success) {
        return c.json({ error: 'Validation failed', details: validation.error.issues }, 400)
      }

      const { email, code } = validation.data
      const normalizedEmail = email.toLowerCase().trim()
      const db = c.env.DB
      const ipAddress = c.req.header('cf-connecting-ip') || 'unknown'
      const userAgent = c.req.header('user-agent') || null

      const otpService = new OTPService(db)

      // --- Verify OTP code ---
      const verification = await otpService.verifyCode(normalizedEmail, code, DEMO_OTP_SETTINGS)

      if (!verification.valid) {
        const attempts = await otpService.incrementAttempts(normalizedEmail, code)
        const attemptsRemaining = Math.max(0, DEMO_OTP_SETTINGS.maxAttempts - attempts)
        return c.json(
          {
            error: verification.error || 'Invalid code',
            attemptsRemaining,
          },
          401,
        )
      }

      // --- Create or retrieve demo user ---
      const jwtSecret = c.env.JWT_SECRET || JWT_SECRET_FALLBACK
      const { isNew } = await createDemoUser(db, c.env.CACHE_KV, normalizedEmail, ipAddress, userAgent, jwtSecret)

      // --- Fetch the actual user record ---
      const user = await db
        .prepare('SELECT id, email, role FROM users WHERE email = ?')
        .bind(normalizedEmail)
        .first() as { id: string; email: string; role: string } | null

      if (!user) {
        return c.json({ error: 'User not found after creation' }, 500)
      }

      // --- Issue 30-minute JWT (NOT via AuthManager.generateToken — that hardcodes 24h) ---
      const nowSeconds = Math.floor(Date.now() / 1000)
      const expiresAt = nowSeconds + 1800

      const demoToken = await sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          exp: expiresAt,
          iat: nowSeconds,
        },
        jwtSecret,
        'HS256',
      )

      // --- Set auth_token cookie (httpOnly, 30-min TTL) ---
      setCookie(c, 'auth_token', demoToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        path: '/',
        maxAge: 1800,
      })

      // --- Set CSRF cookie (readable by JS, 30-min TTL) ---
      const csrfToken = await generateCsrfToken(jwtSecret)
      const isDev = c.env?.ENVIRONMENT === 'development' || !c.env?.ENVIRONMENT
      setCookie(c, 'csrf_token', csrfToken, {
        httpOnly: false,
        secure: !isDev,
        sameSite: 'Strict',
        path: '/',
        maxAge: 1800,
      })

      return c.json({
        success: true,
        isNew,
        expiresAt: expiresAt * 1000,
        redirect: '/admin',
      })
    } catch (error) {
      console.error('[demo-sandbox] /verify error:', error)
      return c.json({ error: 'An error occurred. Please try again.' }, 500)
    }
  })

  // Register routes — must be before builder.build()
  builder.addRoute('/demo/auth', demoAuthAPI, {
    description: 'Demo authentication endpoints (OTP-gated passwordless login)',
    requiresAuth: false,
    priority: 100,
  })

  // Lifecycle hooks
  builder.lifecycle({
    activate: async () => {
      console.info('[demo-sandbox] plugin activated')
    },
    deactivate: async () => {
      console.info('[demo-sandbox] plugin deactivated')
    },
  })

  return builder.build() as Plugin
}

export const demoSandboxPlugin = createDemoSandboxPlugin()
