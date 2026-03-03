# Phase 1: Security Hardening - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the CMS auth layer for production use: JWT secrets from environment variables (not hardcoded), PBKDF2 password hashing with backward-compatible migration, rate limiting on auth endpoints, security headers (HSTS, X-Frame-Options, X-Content-Type-Options), CORS origin allowlist, and CSRF protection on admin mutations. The cherry-picked @mmcintosh PRs (#659-#663, #668, #671) from Phase 0 provide the foundation — Phase 1 ensures they're wired correctly and fills gaps.

</domain>

<decisions>
## Implementation Decisions

### Password migration strategy
- Silent re-hash on login: verify old SHA-256 hash, immediately re-hash to PBKDF2-SHA256 with per-user salt, save updated hash. User never knows it happened
- No deadline: SHA-256 passwords keep working indefinitely until the user logs in and gets migrated. Small single-tenant user base doesn't justify forced resets
- Console logging: log "User X migrated to PBKDF2" in Workers logs for admin visibility. No user-facing indicator
- Hash detection method: Claude's discretion — use whatever the cherry-picked PR #659 already implements (likely format-based detection)

### Rate limiting behavior
- Fail open when CACHE_KV binding is missing: CMS starts and functions, rate limiting is skipped, warning logged. Ensures dev/staging usability without KV configured
- Cooldown timing: Claude's discretion based on the PR and security best practices
- Rate limiting scope (per-IP, per-account, or both): Claude's discretion based on single-tenant context and CF Workers capabilities
- Retry-After header inclusion: Claude's discretion based on security best practices

### CORS allowlist management
- Origin format: Claude's discretion based on what cherry-picked PR #661 already expects
- Local development: auto-allow localhost:* origins when running wrangler dev. No CORS_ORIGINS config needed for local dev
- Per-client CORS: Claude determines based on how SonicJS serves the admin UI (likely same-origin, so only frontend origin needed in CORS)
- Missing CORS_ORIGINS in production: Claude's discretion on whether to refuse startup or block all cross-origin requests

### CSRF token flow
- Token delivery mechanism: Claude's discretion — pick the pattern that works best with Hono on stateless Workers (likely double-submit cookie)
- Scope of CSRF validation: Claude's discretion on which mutations require CSRF
- API token exemption: Claude's discretion based on CSRF threat model (CSRF targets browser cookies, Bearer tokens are inherently CSRF-safe)
- Error response for invalid CSRF: Claude's discretion on balancing security vs debuggability

### Claude's Discretion
Claude has broad discretion on this phase — the user trusts the security implementation details. Key areas where Claude decides:
- PBKDF2 parameters (iterations, key length, salt length)
- Rate limit thresholds and cooldown durations
- CORS origin parsing and validation logic
- CSRF token generation and validation mechanism
- Security header values and middleware ordering
- Whether missing CORS_ORIGINS blocks startup or just blocks cross-origin requests
- Retry-After header behavior on 429 responses

</decisions>

<specifics>
## Specific Ideas

- Phase 0 already cherry-picked all 7 @mmcintosh security PRs — build on what's already in the codebase rather than reimplementing
- PR #661 CORS is known to require CORS_ORIGINS env var — noted in STATE.md decisions
- PR #659 PBKDF2 is known to break existing SHA-256 passwords — migration must handle this gracefully
- PR #662 rate limiting requires CACHE_KV binding — must degrade gracefully when not configured
- JWT_SECRET startup assertion should match the pattern from Phase 0's binding validation (clear error, blocks all requests)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-security-hardening*
*Context gathered: 2026-03-01*
