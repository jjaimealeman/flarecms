# Phase 12: Demo Authentication - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Passwordless OTP login flow for demo access. Visitor submits email, receives a 6-digit code via Resend, enters it, and lands in the admin dashboard with `demo` role. Session hard-expires after 30 minutes. This phase covers the API endpoints (send OTP, verify OTP), session creation, and expiry enforcement. The /demo page UI is Phase 13.

</domain>

<decisions>
## Implementation Decisions

### OTP flow behavior
- 6-digit numeric code
- 5-minute expiry window on codes
- 3 wrong attempts max, then code is invalidated -- user must request a new one
- Resend button invalidates old code and sends a fresh one (no stale codes floating around)

### Session lifecycle
- Hard TTL: session dies exactly 30 minutes after OTP verification, regardless of activity
- 5-minute warning before expiry (toast or banner in admin: "Your demo session expires in 5 minutes")
- On expiry: modal overlay in admin ("Session expired") with link back to /demo
- Re-entry after expiry: Claude's discretion on whether to allow immediate re-entry or impose a cooldown

### Email gating
- Block disposable/temporary email domains (mailinator, guerrillamail, etc.)
- Rate limit: 3 OTP requests per email per hour
- Repeat visitor with active session: Claude's discretion on resume-vs-replace behavior
- Global rate limit on total OTP sends: Claude's discretion based on abuse risk assessment

### Error handling
- Already logged in as admin: block demo entry ("You're already logged in as an admin. Log out first.")
- OTP email template: branded HTML email with Flare CMS logo and styled code display
- Resend API failure messaging: Claude's discretion on exact error copy

### Claude's Discretion
- Re-entry cooldown after session expiry (or allow immediate)
- Repeat visitor session handling (resume existing vs replace)
- Global OTP send rate limit (whether needed, what threshold)
- Error message copy for email delivery failures
- 5-minute warning implementation approach (polling vs calculated timer)

</decisions>

<specifics>
## Specific Ideas

- OTP plugin already exists and is wired in the system (depends on email plugin with Resend)
- `demo_signups` table already exists from Phase 11 -- records email, IP, timestamp
- Demo user detection uses KV key existence (`demo-mutations:{userId}`), not role check
- Session must assign `demo` role so Phase 11 sandbox permissions apply
- Branded email should feel professional -- this is the first impression of Flare CMS

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 12-demo-authentication*
*Context gathered: 2026-03-16*
