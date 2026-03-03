# Pitfalls Research

**Domain:** Edge-native headless CMS — Cloudflare Workers + D1 + R2 + KV, soft fork of SonicJS v2.8.0
**Researched:** 2026-03-01
**Confidence:** HIGH (most pitfalls verified against official Cloudflare docs and live source code inspection)

---

## Critical Pitfalls

### Pitfall 1: Hardcoded JWT Secret Deployed to Production

**What goes wrong:**
The fork's `auth.ts` contains `const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production'` — a literal string in source code. If the production Worker is deployed without overriding this via a Cloudflare secret, every token signed across all deployments shares the same predictable secret. An attacker who reads the open-source repo can forge valid JWTs for any user including admin.

**Why it happens:**
SonicJS shipped a placeholder and noted it in a comment. The developer must explicitly wire up a Cloudflare secret or the code silently uses the default. There is no runtime check that refuses to start if the secret is still the default value.

**How to avoid:**
1. Set the secret via Wrangler: `wrangler secret put JWT_SECRET`
2. Read it from environment in auth.ts: `const JWT_SECRET = c.env.JWT_SECRET` (pass via context or app-level config)
3. Add a startup assertion: if `JWT_SECRET === 'your-super-secret-jwt-key-change-in-production'` throw an error before the Worker handles any request
4. Add `.dev.vars` for local dev (gitignored), never put it in `wrangler.toml [vars]`

**Warning signs:**
- `wrangler.toml` has no `[vars]` or `secrets` reference for `JWT_SECRET`
- Source code grep for the literal string `your-super-secret-jwt-key` matches in deployed output
- Auth endpoints return valid 200 responses in production without any secret configuration

**Phase to address:** Security Hardening phase (Phase 1 priority)

---

### Pitfall 2: SHA-256 + Static Salt for Password Storage

**What goes wrong:**
`AuthManager.hashPassword()` uses `crypto.subtle.digest('SHA-256', password + 'salt-change-in-production')`. SHA-256 is a general-purpose cryptographic hash — modern GPUs can compute billions of SHA-256 hashes per second. The static salt string is also embedded in source code, meaning all passwords share the same salt. A database dump plus the repo gives an attacker everything needed to crack all passwords offline in minutes.

**Why it happens:**
SHA-256 is the only hash available without installing npm packages in some environments. The comment says "change in production" but there is no mechanism to do so — the salt is hardcoded, not environment-configurable.

**How to avoid:**
Use PBKDF2 (built into Web Crypto API, no npm needed) with a per-user random salt:
```typescript
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256)
  // Store salt + hash together: hex(salt):hex(hash)
}
```
PBKDF2 is available in the Workers runtime without any npm packages. Argon2 is the 2025 gold standard but requires a WASM package.

**Warning signs:**
- `passwordHash` column in the users table contains identical prefixes for different users (same salt means same prefix for short passwords)
- The seed script `seed-admin.ts` calls `crypto.createHash('sha256')` directly — confirmed in source
- No `iterations` or `pbkdf` in any auth-related code

**Phase to address:** Security Hardening phase (Phase 1 priority)

---

### Pitfall 3: R2 Binding Name Mismatch Between User Project and Core Package

**What goes wrong:**
The fork's core package expects the R2 bucket bound as `MEDIA_BUCKET` in the Worker environment. The `my-astro-cms` project's `wrangler.toml` declares `binding = "BUCKET"`. The result: `c.env.MEDIA_BUCKET` is undefined at runtime, media uploads silently fail, the admin media library shows nothing, and the error is only visible in Wrangler logs — not in the UI.

**Why it happens:**
The upstream SonicJS used `MEDIA_BUCKET`. The project template was generated with `BUCKET`. These are two different strings; no validation at startup checks for the expected binding name.

**How to avoid:**
1. Align `wrangler.toml` binding name to match what the core package uses: `binding = "MEDIA_BUCKET"`
2. Add a startup check in the app initialization: if `!env.MEDIA_BUCKET` throw a descriptive error
3. When upgrading the core package, always diff the `Bindings` type interface for new or renamed bindings

**Warning signs:**
- Media upload returns 500 or hangs without error message
- Wrangler dev logs show `[MEDIA UPLOAD] MEDIA_BUCKET is not available!` (this log line exists in the source)
- Admin media library page loads but shows 0 files despite uploads being attempted

**Phase to address:** Infrastructure/Binding Audit (first phase, before any feature work)

---

### Pitfall 4: KV Token Cache Cannot Be Invalidated Globally

**What goes wrong:**
The `requireAuth` middleware caches verified JWT payloads in KV with a 5-minute TTL using the first 20 chars of the token as the key. KV is eventually consistent — changes take up to 60 seconds to propagate globally. A user whose token is revoked or account is disabled may still authenticate for up to 5 minutes (TTL) plus 60 seconds (KV propagation) from any global edge node that cached the old value. There is no logout mechanism that invalidates the KV cache entry.

**Why it happens:**
KV was added as a performance optimization. The auth code does not implement a token blocklist or invalidation path. KV's eventual consistency is documented but easy to overlook when building auth flows.

**How to avoid:**
1. For session revocation to work reliably, do NOT cache tokens in KV. Verify JWT cryptographically on every request (fast, sub-millisecond)
2. If caching is required for performance, use a short TTL (60 seconds max) and accept the lag window, or use Durable Objects for strongly-consistent session state
3. Implement logout as: (a) clear the cookie, (b) add the token to a KV blocklist with TTL equal to token expiry (inverted logic — presence means revoked)

**Warning signs:**
- Logged-out users can still access admin after clicking logout
- Disabled user accounts still function for several minutes after disabling
- No blocklist table or KV key prefix for revoked tokens exists in the codebase

**Phase to address:** Security Hardening phase (same phase as JWT secret fix)

---

### Pitfall 5: D1 Migration Transaction Syntax Fails in Production

**What goes wrong:**
SQL migration files that use `BEGIN TRANSACTION` / `COMMIT` syntax work fine locally (`wrangler dev`) but fail in production D1 with: `"To execute a transaction, please use the state.storage.transaction() API instead"`. This is a D1-specific constraint — the Workers runtime intercepts transaction management. A migration that runs cleanly in local dev can brick the production database on first deploy.

**Why it happens:**
D1 uses SQLite under the hood but wraps transaction management. Standard SQL tools generate `BEGIN TRANSACTION` / `COMMIT` blocks. Drizzle Kit sometimes generates them in migration output. The difference only surfaces at production deploy time.

**How to avoid:**
1. Never use `BEGIN TRANSACTION` or `SAVEPOINT` in `.sql` migration files
2. Review every generated migration file before applying to production: `grep -i "BEGIN TRANSACTION\|SAVEPOINT" migrations/*.sql`
3. Test with `wrangler d1 migrations apply DB --local` first, but also test with `--remote` against a staging database before touching production
4. Keep a staging D1 database (cheap — D1 pricing is per-query, not per-database) that mirrors production schema

**Warning signs:**
- Migration runs successfully locally but returns an error on `--remote` apply
- Error message contains `state.storage.transaction`
- Drizzle Kit `generate` output includes `BEGIN;` or `BEGIN TRANSACTION;` lines

**Phase to address:** Database Migration phase (establish the pattern before writing any new migrations)

---

### Pitfall 6: Fork Divergence Compounding — No Upstream Sync Strategy

**What goes wrong:**
The fork starts as a clean copy of upstream SonicJS v2.8.0. Without a defined sync strategy, every local fix (security patches, bug fixes) creates a divergent commit history. When upstream releases a security patch or new feature, merging becomes increasingly expensive. At 6 months of divergence, cherry-picking upstream fixes takes hours. At 12 months, it can become impractical and the fork is effectively abandoned-and-maintained-in-isolation — a significant support burden.

**Why it happens:**
The upstream maintainer is inactive (noted in project context). PRs exist but aren't merged. The temptation is to just fix things locally and move on. Each fix that isn't upstreamed is a future merge conflict.

**How to avoid:**
1. Maintain a clear separation: user-land changes (collections, wrangler.toml, src/index.ts) vs. core changes (middleware/auth.ts, routes)
2. Tag every commit that touches core files with a `[fork-patch]` prefix
3. When upstream releases, use `git log upstream/main --oneline` to identify relevant commits and cherry-pick selectively
4. Upstream all security fixes as PRs — even if the maintainer is inactive, they become visible and may be merged later
5. Keep a `FORK-CHANGES.md` file that documents every deliberate divergence from upstream with the rationale

**Warning signs:**
- Core package changes (`packages/core/src/`) are mixed in with user-project changes in the same commit
- No `upstream` remote in the git repo: `git remote -v` shows no upstream tracking
- `FORK-CHANGES.md` does not exist
- Security patches from upstream are being manually re-implemented rather than cherry-picked

**Phase to address:** Pre-work before any phase — establish the fork management strategy first

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded JWT secret with "change me" comment | Works out of box for local dev | Single stolen secret compromises all sites | Never in production |
| SHA-256 for passwords, no per-user salt | No npm dependency needed | Entire user table crackable in minutes after a DB dump | Never |
| Skip staging D1 database | Saves $0.00 (D1 is free per-database) | Production migrations can fail irreversibly | Never |
| Cache all JWT verifications in KV | Fewer crypto ops per request | Revoked tokens remain valid for cache TTL | Only if logout is disabled and TTL is ≤60s |
| Trust `--local` test before `--remote` migrations | Fast iteration | Transaction syntax differences cause production failures | Never trust local-only for migrations |
| Mix fork patches with user config in one branch | Simpler git history | Upstream merges become impossible | Only in throwaway prototypes |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| R2 + Workers | Binding name in `wrangler.toml` does not match the variable name the Worker code reads | Always match the `binding =` value to `c.env.BINDING_NAME` exactly; add startup validation |
| KV + Auth | Using KV to cache tokens for invalidation (revocation) purposes | KV is eventually consistent; use it only for read-heavy, latency-tolerant data; not for security-critical state that needs immediate invalidation |
| D1 + Drizzle migrations | Running `drizzle-kit generate` and applying output directly without reviewing for `BEGIN TRANSACTION` | Always inspect generated SQL before applying to remote D1 |
| R2 + CORS | Configuring CORS in the Worker code instead of on the bucket itself | CORS for direct browser-to-R2 access must be set on the bucket via `wrangler r2 bucket cors put`; Worker-served R2 objects set their own response headers |
| Wrangler secrets | Storing JWT_SECRET in `wrangler.toml [vars]` (plaintext, visible in dashboard) | Use `wrangler secret put JWT_SECRET` — secrets are encrypted and not visible after setting |
| D1 + large migrations | Running bulk UPDATE/DELETE on millions of rows in one query | D1 query timeout is 30s; break bulk operations into batches of ≤1,000 rows |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Returning entire D1 table in one query for client-side filtering (workaround for broken API filters) | 200ms+ response times; memory errors on large datasets | Fix server-side filtering in the API routes; paginate with `LIMIT`/`OFFSET` | At ~500 content items (response body exceeds practical client parsing time) |
| Streaming large R2 files through the Worker (buffering in memory) | "Memory limit would be exceeded before EOF" error | Use `r2Object.body` as a ReadableStream and pass directly to response; never call `.arrayBuffer()` on large files | At files >50MB (128MB memory limit per isolate) |
| D1 single-thread bottleneck without read replication | API response times grow linearly with concurrent users | Enable D1 read replication with Sessions API for read-heavy public endpoints | At ~10 concurrent writes + reads sharing the same D1 instance |
| KV eventual consistency on auth checks | Users see stale data up to 60s after changes | Do not use KV for data that must be immediately consistent globally | Any global deployment with user-visible side effects |
| Loading all plugin migrations on every cold start | Cold start latency grows with each plugin added | Cache migration state; only run migration checks once at startup | At 5+ plugins active simultaneously |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoded JWT secret in source | Any attacker with repo access can forge admin tokens for all production sites | `wrangler secret put JWT_SECRET`; assert at startup it is not the default value |
| SHA-256 + static salt for passwords | Entire user database crackable offline in hours after DB dump | Replace with PBKDF2 (built into Web Crypto); per-user random salt stored alongside hash |
| No CSRF protection on admin form submissions | Malicious site can trigger admin actions via cross-origin form POST | Hono has built-in CSRF middleware (note: versions <4.5.8 had bypass vulnerabilities; verify current version) |
| Storing secrets in `wrangler.toml [vars]` | Secrets visible in Cloudflare dashboard and plaintext in repo | Use `wrangler secret put` for all sensitive values; `.dev.vars` for local dev (gitignored) |
| JWT token cached in KV with no invalidation path | Revoked sessions remain active globally for cache TTL + propagation time | Cryptographically verify JWT on every request; use KV blocklist pattern if caching is needed |
| Admin password in seed script hardcoded in source | Password + salt exposed in repo history | Seed script should accept password via env var or prompt; never hardcode credentials |
| R2 bucket public access without signed URLs | Anyone with the object key can access private media | Use presigned URLs for private media; set bucket access to private; configure CORS explicitly |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Status transitions are one-way (can't unpublish) | Content editors are locked into published state with no recourse | Fix the workflow engine to allow reverse transitions, or add an "archive" state |
| Broken API filters with no error or warning | Headless frontend developers think filtering works; only discover breakage when client-side filtering fails on paginated data | Add a server-side fix for filter params; or at minimum return a `X-Filter-Applied: false` header as a warning |
| API token management has no UI | Developers can't generate tokens for headless consumers without direct DB access | Implement the API tokens admin page (the `api_tokens` table exists, the UI does not) |
| Select field `default` property is silently ignored | Content editors see "Choose an option..." instead of the intended default, causing invalid submissions | Fix the field renderer to read the `default` property from schema |
| Datetime picker requires manual time entry | Editors abandon time fields or enter invalid dates causing save failures | Add "Now" button; make time optional by defaulting to 00:00 when only date is selected |

---

## "Looks Done But Isn't" Checklist

- [ ] **JWT secret is set:** Grep for `your-super-secret` in production bundle output, or check Cloudflare dashboard > Worker > Settings > Variables that `JWT_SECRET` appears as a secret (not a var)
- [ ] **R2 binding is wired:** Upload a test file through the admin UI and verify it appears in the R2 bucket in the Cloudflare dashboard — not just that the upload returned 200
- [ ] **Migrations ran remotely, not just locally:** Run `wrangler d1 migrations list DB --remote` and verify all expected migrations show status "applied"
- [ ] **Password hashing is per-user-salted:** Query the D1 users table and confirm different users have different hash prefixes, not identical ones (identical = shared static salt)
- [ ] **API filtering works server-side:** Request `GET /api/collections/blog-posts/content?filter[status][equals]=draft` and verify only draft items are returned, not all items
- [ ] **Media serving works in production:** Upload an image, copy the public URL, open it in an incognito browser — verify it loads without CORS errors
- [ ] **KV is not being used for critical security decisions:** Search codebase for `kv.get` inside auth middleware — any hit that returns a cached auth payload is a consistency risk
- [ ] **CSRF protection is active on admin routes:** Attempt a cross-origin POST to `/admin/*` from a test page on a different origin — should return 403

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hardcoded JWT secret discovered in production | MEDIUM | Rotate: `wrangler secret put JWT_SECRET` with new value; all existing tokens immediately invalid; users must re-login |
| SHA-256 passwords after DB dump | HIGH | Force password reset for all users; implement PBKDF2; notify affected users per applicable breach notification law |
| R2 binding mismatch discovered after deploy | LOW | Fix `wrangler.toml` binding name; redeploy Worker (no data loss) |
| D1 migration with BEGIN TRANSACTION failed in production | HIGH | Migration partially applied — manually inspect D1 state; apply remaining statements individually via `wrangler d1 execute`; update migration tracking table |
| Fork diverged beyond practical merge | HIGH | Accept divergence; maintain a `FORK-CHANGES.md` going forward; selectively port critical security fixes only; full re-sync is rarely worth the cost |
| KV cached stale token after account disable | LOW | Delete the specific KV key: `wrangler kv key delete --namespace-id=<ID> "auth:<token-prefix>"`; or wait for TTL expiry |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded JWT secret | Phase 1: Security Hardening | `wrangler secret list` shows JWT_SECRET; startup assertion in code |
| SHA-256 password storage | Phase 1: Security Hardening | New users get PBKDF2 hash; migration script re-hashes existing users on next login |
| R2 binding mismatch | Phase 0: Infrastructure Audit (before any other work) | Test media upload in production; check Wrangler logs |
| KV auth cache invalidation | Phase 1: Security Hardening | Logout test: verify admin access blocked immediately after logout |
| D1 transaction syntax | Phase 0: Infrastructure Audit | Staging D1 created; all existing migrations verified clean; process documented |
| Fork divergence compounding | Phase 0: Repo Setup (before any code changes) | `FORK-CHANGES.md` exists; upstream remote added; patch commits labeled |
| Large file memory overflow | Phase 2: Media/R2 Hardening | Stream large files from R2; test with files >50MB |
| D1 single-thread bottleneck | Phase 3: Performance (post-security) | Load test read endpoints; evaluate read replication if needed |
| CSRF on admin routes | Phase 1: Security Hardening | Cross-origin POST test returns 403 |
| Broken API filters | Phase 2: Core Bug Fixes | Integration test: filter returns correct subset, not all records |

---

## Sources

- Cloudflare Workers Limits (official docs, verified 2026-03-01): https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare D1 Limits (official docs, verified 2026-03-01): https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 Migrations (official docs): https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare D1 Read Replication (official docs): https://developers.cloudflare.com/d1/best-practices/read-replication/
- Cloudflare KV How It Works — eventual consistency behavior (official docs): https://developers.cloudflare.com/kv/concepts/how-kv-works/
- Cloudflare Workers Secrets (official docs): https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare R2 CORS Configuration (official docs): https://developers.cloudflare.com/r2/buckets/cors/
- OWASP Password Storage Cheat Sheet — SHA-256 is insecure for passwords: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Hono CSRF Middleware (official docs): https://hono.dev/docs/middleware/builtin/csrf
- Hono CVE-2024-43787 — CSRF bypass via Content-Type manipulation (verified): https://security.snyk.io/vuln/SNYK-JS-HONO-7814167
- Fork drift analysis: https://preset.io/blog/stop-forking-around-the-hidden-dangers-of-fork-drift-in-open-source-adoption/
- D1 transaction syntax production failure: https://github.com/cloudflare/workerd/issues/5411
- Live source inspection: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/middleware/auth.ts` (hardcoded JWT secret, SHA-256 hash)
- Live source inspection: `/home/jaime/www/_github/sonicjs/my-astro-cms/scripts/seed-admin.ts` (SHA-256 password in seed)
- Live source inspection: `/home/jaime/www/_github/sonicjs/my-astro-cms/wrangler.toml` (BUCKET binding vs MEDIA_BUCKET expected by core)

---
*Pitfalls research for: edge-native headless CMS on Cloudflare Workers — SonicJS v2.8.0 fork hardening*
*Researched: 2026-03-01*
