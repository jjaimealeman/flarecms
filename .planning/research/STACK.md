# Stack Research

**Domain:** Hardening and productionizing a headless CMS on Cloudflare Workers (SonicJS v2.8.0 soft fork)
**Researched:** 2026-03-01
**Confidence:** MEDIUM-HIGH (core platform HIGH, some library versions MEDIUM)

---

## Context: What This Research Is NOT

The base stack is already decided and locked:

| Decided | Version | Notes |
|---------|---------|-------|
| Hono | current | Web framework — do not replace |
| Drizzle ORM | current | D1 ORM — do not replace |
| D1 (SQLite) | — | Database — do not replace |
| R2 | — | Media storage — do not replace |
| KV | — | Cache store — do not replace |
| Cloudflare Workers | — | Runtime — do not replace |

This research covers only the **security, caching, media, migration, and observability layers** that need to be added or wired up.

---

## Recommended Stack

### Auth / Security Layer

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Hono built-in `jwt` middleware | Hono v4.x | JWT verification with env secret | Already in dependency tree; supports `c.env.JWT_SECRET` via factory pattern; no new dependency needed | HIGH |
| Web Crypto API (`crypto.subtle`) | Workers built-in | PBKDF2 password hashing | Native to Workers runtime; no library needed; supports `PBKDF2` algorithm | HIGH |
| Hono `secureHeaders` middleware | Hono v4.x built-in | Security response headers | Sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CORP, COOP by default; inspired by Helmet | HIGH |
| Hono `cors` middleware | Hono v4.x built-in | Restrict CORS to explicit origins | Built-in; already used — just needs `origin` list instead of wildcard | HIGH |
| Hono `csrf` middleware | Hono v4.x built-in | CSRF protection for admin forms | Header-based (Origin + Sec-Fetch-Site); no token storage needed; note: known issue with old browsers that strip Origin | HIGH |

**PBKDF2 specifics — critical note:**

The mmcintosh PR #659 uses 100,000 iterations of PBKDF2-SHA256. The Cloudflare Workers production runtime **caps PBKDF2 at 100,000 iterations** (GitHub issue #1346 in cloudflare/workerd). OWASP recommends 600,000 for SHA-256 — this is unachievable on Workers today. The cap has been removed in open-source workerd but not deployed to production CF. **100,000 iterations with PBKDF2-SHA256 is the correct pragmatic choice for now.** This is still vastly superior to the current SHA-256 without iterations.

Storage format from PR #659: `pbkdf2:<iterations>:<salt_hex>:<hash_hex>` — backward compatible, re-hashes legacy SHA-256 on next successful login.

### Rate Limiting

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `@elithrar/workers-hono-rate-limit` | latest | Rate limiting for auth endpoints | Wraps Cloudflare's native Rate Limiting binding; Hono middleware interface; authored by a Cloudflare employee | MEDIUM |
| Cloudflare Workers Rate Limiting binding | platform native | Actual rate limit enforcement | Runs on CF infrastructure; configured via `wrangler.jsonc`; requires wrangler v4.36.0+; period must be 10s or 60s | HIGH |

**Configuration required in `wrangler.jsonc`:**
```json
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1"
simple = { limit = 10, period = 60 }
```

**Alternative considered:** `@hono-rate-limiter/cloudflare` — also uses CF native bindings but `@elithrar/workers-hono-rate-limit` is more commonly referenced in CF documentation itself.

### Input Validation

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Zod | ^3.x | Schema validation on API inputs | De facto standard for TypeScript runtime validation; `@hono/zod-validator` integrates directly as Hono middleware; prevents injection via type coercion | HIGH |
| `@hono/zod-validator` | latest | Hono middleware wrapper for Zod | Validates request body/query/params with typed result; error formatting built in | HIGH |

**SQL injection note:** Drizzle ORM uses parameterized queries by default — SQL injection is prevented at the ORM level when you use Drizzle's query builder. Only raw `.prepare()` with user-concatenated strings is dangerous. Zod adds a layer for API surface validation (XSS prevention, type enforcement). Use both.

### Caching Strategy

| Technology | Purpose | When to Use | Confidence |
|------------|---------|-------------|------------|
| In-memory cache (existing) | Sub-millisecond hot path | Current request isolation only; lost on worker restart | HIGH |
| Cloudflare KV | Cross-request persistent cache | Content API responses with TTL; global read-heavy data; up to 60s eventual consistency acceptable | HIGH |
| Cloudflare Cache API (`caches.default`) | Edge cache for public responses | Public GET endpoints only (no auth); free; tied to datacenter | HIGH |

**Recommendation — two-tier approach:**

1. **KV for CMS content** (`/api/collections/*/content` responses): TTL 60-300s, invalidated on write. Already partially wired in SonicJS — just needs the KV binding connected.
2. **Cache API for R2 media responses**: Cache public image/media responses at the edge. Free, fast, appropriate for public binary assets.
3. **Do NOT use KV for session/auth data**: KV's eventual consistency (up to 60s lag) means a revoked token could still be accepted. Use short JWT expiry instead.

**KV consistency warning:** KV is eventually consistent globally. A content editor publishing an update may see stale API responses from another region for up to 60 seconds. This is acceptable for a CMS serving read-heavy public content. If immediate consistency is required, use the Cache API with short TTLs (10-30s) instead.

### Media Serving (R2)

| Feature | Implementation | Notes | Confidence |
|---------|---------------|-------|------------|
| Range requests | R2 `get()` with `range: { offset, length }` option | Native to Workers R2 binding; required for video/audio streaming; return `Content-Range` header manually | HIGH |
| ETag / conditional GET | R2 object returns `httpEtag` field; use `If-None-Match` conditional | CF docs confirm `httpEtag` is RFC 9110 compliant (quoted); reduces bandwidth for unchanged assets | HIGH |
| Content-Type passthrough | R2 `httpMetadata.contentType` returned with object | Set during upload; return as-is in response | HIGH |
| Cache-Control headers | Set in Worker response | Public assets: `max-age=31536000, immutable` (hash in filename); vary per asset type | MEDIUM |
| Public bucket vs Worker | Worker-mediated access preferred | Enables auth checks, transformation, range request handling; public bucket has known range request header issues | MEDIUM |

**Range request implementation pattern (from community + CF docs):**
```typescript
const rangeHeader = request.headers.get('Range')
if (rangeHeader) {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
  const offset = parseInt(match[1])
  const end = match[2] ? parseInt(match[2]) : object.size - 1
  const length = end - offset + 1
  const ranged = await env.MEDIA_BUCKET.get(key, { range: { offset, length } })
  return new Response(ranged.body, {
    status: 206,
    headers: {
      'Content-Range': `bytes ${offset}-${end}/${object.size}`,
      'Content-Length': String(length),
      'Accept-Ranges': 'bytes',
    }
  })
}
```

**Binding name fix required:** Current SonicJS uses `BUCKET`; the binding needs to be `MEDIA_BUCKET` per PROJECT.md tracking or a consistent name must be set in `wrangler.jsonc`.

### Database Migrations (D1)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Drizzle Kit | ^0.31.x | Migration generation and application | Already in project; `drizzle-kit generate` creates SQL migration files; `drizzle-kit migrate` applies via D1 HTTP API | HIGH |
| `wrangler d1 migrations apply` | wrangler v4.x | Alternative: apply migrations via wrangler CLI | Official CF approach; works with local `--local` flag for dev; without flag for production | HIGH |

**Recommended workflow:**

```bash
# 1. Generate migration from schema change
npx drizzle-kit generate

# 2. Apply to local D1 (development)
npx wrangler d1 migrations apply DB --local

# 3. Apply to production D1
npx wrangler d1 migrations apply DB
```

**Do not use `drizzle-kit push` in production** — it bypasses migration history and applies schema diffs directly. Use `generate` + `migrate` for auditable migration trail.

**D1 migration config in `drizzle.config.ts`:**
```typescript
export default {
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
    token: process.env.CLOUDFLARE_D1_TOKEN,
  }
}
```

### Secrets Management

| Technology | Purpose | Why | Confidence |
|------------|---------|-----|------------|
| `wrangler secret put JWT_SECRET` | Store JWT signing secret | Encrypted at rest; not visible in dashboard after set; accessed via `c.env.JWT_SECRET` at runtime | HIGH |
| `.dev.vars` file (local only) | Local development secrets | Equivalent of `.env` for `wrangler dev`; never committed | HIGH |

**Never use:** Plaintext `[vars]` in `wrangler.toml` for secrets — CF docs explicitly warn against this. Secrets go through `wrangler secret put`.

**Access pattern:**
```typescript
// JWT middleware — must be factory pattern to access c.env
app.use('/protected/*', (c, next) => {
  return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
})
```

### Observability / Monitoring

| Technology | Purpose | Plan Required | Configuration | Confidence |
|------------|---------|---------------|---------------|------------|
| Workers Logs (native) | Capture `console.log`, errors, invocation metadata | Free + Paid (200k/day free, 20M/mo paid) | `[observability] enabled = true` in wrangler.toml; min wrangler v3.78.6 | HIGH |
| Workers Logpush | Export logs to R2 / S3 / external provider | Workers Paid | Sends trace event logs; useful for persistent audit trail | MEDIUM |
| Workers Traces | Request flow tracing (beta) | Paid | Distributed tracing across Workers | LOW (beta) |

**Recommended for this project:** Enable Workers Logs with `head_sampling_rate = 1` during initial production phase. Add structured `console.log` at auth events (login, token refresh, failed attempts). Free tier sufficient for personal/client use.

**No external monitoring tool recommended at this stage.** Sentry, Datadog, etc. add bundle size and egress cost. Workers Logs + Logpush to R2 is sufficient for a solo-operated CMS.

### Production Deployment

| Tool | Purpose | Notes | Confidence |
|------|---------|-------|------------|
| Wrangler v4.36.0+ | Deploy Workers to production | Required for Rate Limiting binding; `npx wrangler deploy` | HIGH |
| Wrangler environments (`[env.production]`) | Per-client deployment configs | Different D1/R2/KV IDs per client in same `wrangler.toml`; deploy with `--env production` | HIGH |
| Cloudflare Pages | Deploy Astro frontend | `npx wrangler pages deploy`; connect to git for CI | HIGH |

**Per-client deployment pattern (single-tenant):**
```toml
# wrangler.toml
[env.client-acme]
name = "cms-acme"
[[env.client-acme.d1_databases]]
binding = "DB"
database_name = "cms-acme-db"
database_id = "..."
```

Deploy with: `npx wrangler deploy --env client-acme`

This avoids Workers for Platforms (which is for SaaS multi-tenancy at scale) — separate wrangler environments per client is simpler and appropriate for 1-10 clients.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Password hashing | Web Crypto PBKDF2 | bcrypt / argon2 | bcrypt and argon2 require Node.js native modules; not available in Workers runtime |
| Rate limiting | CF native Rate Limit binding + `@elithrar/workers-hono-rate-limit` | In-memory counter | In-memory counters reset per Worker instance; not effective across distributed Workers |
| CSRF protection | Hono `csrf` middleware (header-based) | Double-submit cookie token | Double-submit requires stateful token storage; header-based works with SPA + admin UI without cookies |
| Caching | KV (content) + Cache API (media) | Only in-memory | In-memory is per-isolate; KV is globally consistent (with eventual lag); Cache API is free for public responses |
| Input validation | Zod + `@hono/zod-validator` | Manual validation | Manual validation is error-prone and verbose; Zod provides schema-as-source-of-truth for types and runtime |
| Migrations | Drizzle Kit generate+migrate | Wrangler `d1 execute --file` | `d1 execute` works but lacks migration tracking; Drizzle Kit integrates with existing Drizzle setup |
| Logging | Workers Logs (native) | Sentry / Datadog | External services add latency, cost, and bundle size; Workers Logs is zero-config and sufficient |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| bcrypt, argon2 | Require Node.js native bindings; will throw at runtime in Workers | Web Crypto `crypto.subtle.deriveBits` with PBKDF2 |
| SHA-256 for passwords (no iterations) | Not a KDF; trivially brutable; current SonicJS bug | PBKDF2-SHA256 with 100k iterations + per-user salt |
| Hardcoded JWT secret in source code | Exposed in git history; current SonicJS bug | `wrangler secret put JWT_SECRET` |
| `[vars]` in wrangler.toml for secrets | Plaintext in config file; CF explicitly warns against | `wrangler secret put` |
| Workers for Platforms | Designed for SaaS multi-tenancy at scale; overkill for 1-10 clients | Wrangler environments per client |
| `drizzle-kit push` in production | Bypasses migration history; destructive diffs possible | `drizzle-kit generate` + `drizzle-kit migrate` |
| TinyMCE | Requires paid API key; existing CLAUDE.md guidance | Quill (already decided) |
| Public R2 bucket for all media | No auth layer; known range-request header issues with public buckets | Worker-mediated R2 access |
| KV for auth token revocation | Eventually consistent (60s lag); revoked tokens may still work | Short JWT expiry (15min access token) |

---

## Installation

```bash
# Input validation
npm install zod @hono/zod-validator

# Rate limiting (Hono middleware for CF native binding)
npm install @elithrar/workers-hono-rate-limit

# No new installs needed for:
# - JWT (hono/jwt — already in hono)
# - Security headers (hono/secure-headers — already in hono)
# - CSRF (hono/csrf — already in hono)
# - PBKDF2 (Web Crypto — Workers built-in)
# - Workers Logs (wrangler.toml config only)
# - Drizzle migrations (drizzle-kit already present)
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@elithrar/workers-hono-rate-limit` | Hono v4.x, wrangler >=4.36.0 | Requires CF Rate Limit binding in wrangler.jsonc |
| `@hono/zod-validator` | Hono v4.x, Zod ^3.x | Use `zValidator` import |
| `drizzle-kit` ^0.31.x | `drizzle-orm` ^0.39.x | Versions must stay in sync — check drizzle-team/drizzle-orm releases |
| Hono `jwt` middleware | Hono v4.x | Use factory pattern for `c.env.JWT_SECRET` access |
| Workers Rate Limit binding | wrangler v4.36.0+ | `period` must be exactly 10 or 60 seconds |
| Workers Logs | wrangler v3.78.6+ | Free plan: 200k logs/day, 3-day retention |

---

## Key Security PRs to Cherry-Pick

These PRs are open on upstream `lane711/sonicjs` as of 2026-03-01. All seven were submitted by mmcintosh in February 2026 and are not merged. Cherry-pick directly into `sonicjs-fork/`:

| PR | Title | What It Fixes |
|----|-------|---------------|
| #660 | security: move JWT secret to environment variable | Hardcoded JWT secret bug |
| #659 | security: replace SHA-256 password hashing with PBKDF2 | Weak password storage |
| #662 | security: add rate limiting to auth endpoints | No brute-force protection |
| #661 | security: restrict CORS to explicit allowed origins | Wildcard CORS |
| #663 | security: add real security headers middleware | Missing security headers |
| #668 | security: add CSRF token protection (signed double-submit cookie) | CSRF on admin forms |
| #671 | hotfix: sanitize public form submission data to prevent stored XSS | XSS via form inputs |

**Note on PR #659 iteration count:** The PR uses 100,000 iterations, reduced from an initial 600,000 to accommodate the Workers production limit. This is the pragmatic maximum achievable. Accept this as correct, do not attempt to increase it.

---

## Sources

- [Cloudflare Workers Secrets docs](https://developers.cloudflare.com/workers/configuration/secrets/) — HIGH confidence; verified secrets vs env vars distinction
- [Cloudflare Workers Rate Limiting API docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) — HIGH confidence; wrangler v4.36.0 requirement, period constraints
- [Workers Logs docs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) — HIGH confidence; pricing, configuration, wrangler version requirements
- [R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) — HIGH confidence; range request options, ETag handling, conditional headers
- [D1 Prepared Statements docs](https://developers.cloudflare.com/d1/worker-api/prepared-statements/) — HIGH confidence; SQL injection prevention via bind()
- [Hono JWT middleware docs](https://hono.dev/docs/middleware/builtin/jwt) — HIGH confidence; factory pattern for env secret access
- [Hono Secure Headers middleware docs](https://hono.dev/docs/middleware/builtin/secure-headers) — HIGH confidence; default headers list
- [Hono CSRF middleware docs](https://hono.dev/docs/middleware/builtin/csrf) — HIGH confidence; known browser limitation noted
- [cloudflare/workerd issue #1346](https://github.com/cloudflare/workerd/issues/1346) — HIGH confidence; 100k PBKDF2 iteration cap confirmed, not yet lifted in production
- [lane711/sonicjs PRs](https://github.com/lane711/sonicjs/pulls) — HIGH confidence; all 7 mmcintosh security PRs confirmed open as of 2026-02-24
- [@elithrar/workers-hono-rate-limit](https://github.com/elithrar/workers-hono-rate-limit) — MEDIUM confidence; repo verified, npm install path confirmed
- [Drizzle ORM D1 docs](https://orm.drizzle.team/docs/connect-cloudflare-d1) — MEDIUM confidence; migration workflow confirmed, exact versions not pinned in docs
- [WebSearch: Hono v4.12.0 release] — MEDIUM confidence; current version via GitHub releases
- [WebSearch: drizzle-orm@0.39.0, drizzle-kit@0.31.1] — MEDIUM confidence; from search result citing Dec 2025 source

---

*Stack research for: SonicJS fork — security hardening + production deployment on Cloudflare Workers*
*Researched: 2026-03-01*
