# Phase 0: Foundation - Research

**Researched:** 2026-03-01
**Domain:** Cloudflare Workers / Wrangler bindings, Git cherry-pick workflow, SonicJS fork management
**Confidence:** HIGH

## Summary

Phase 0 is repo hygiene and infrastructure correctness — no new features. Three distinct problem domains: (1) fix the R2 binding mismatch in `wrangler.toml` and add startup validation in `my-astro-cms`, (2) establish fork tracking conventions in `sonicjs-fork`, and (3) cherry-pick 7 open security PRs from mmcintosh into the fork.

The R2 binding mismatch is confirmed by direct code inspection: `wrangler.toml` declares `binding = "BUCKET"` but the installed `@sonicjs-cms/core` v2.8.0 `Bindings` interface expects `MEDIA_BUCKET`. The upstream `my-sonicjs-app/wrangler.toml` in the fork already uses `MEDIA_BUCKET`, confirming the current project file is stale. Renaming `BUCKET` to `MEDIA_BUCKET` is a one-line fix.

All 7 mmcintosh PRs (#659-#663, #668, #671) are open and unmerged into upstream/main. Their commit SHAs are retrievable via `git fetch upstream refs/pull/NNN/head:pr/NNN`. Each PR has 1-2 commits to cherry-pick. Hono is already at v4.10.7 in `my-astro-cms` and v4.11.7 in the fork's core, both well above the 4.5.8 threshold for PR #668 (CSRF).

**Primary recommendation:** Work in `sonicjs-fork` for the cherry-picks (fork work), `my-astro-cms` for the wrangler/startup fixes (deployment work), and the project root git repo for FORK-CHANGES.md and planning docs.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| wrangler | 4.52.1 (installed), 4.69.0 (global) | Cloudflare Workers CLI — create D1, manage KV, deploy | Official CF toolchain |
| `@sonicjs-cms/core` | ^2.8.0 | SonicJS CMS; defines `Bindings` interface with `MEDIA_BUCKET` | Already installed |
| hono | ^4.10.7 (app), ^4.11.7 (fork) | Middleware injection for startup validation | Already used by SonicJS |
| git | system | cherry-pick, remote management | Standard VCS |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `npx wrangler d1 create` | 4.x | Create remote D1 databases | Creating staging DB |
| `npx wrangler d1 execute` | 4.x | Run SQL queries against D1 | Verifying migration state |

### Alternatives Considered
| Standard | Alternative | Tradeoff |
|----------|-------------|----------|
| Startup middleware in `src/index.ts` | Bootstrap middleware in core | Core bootstrap runs after request arrives; custom beforeAuth runs first — better for fail-fast |
| Per-PR cherry-pick by commit SHA | Merge squash | Cherry-pick preserves attribution and PR mapping; squash loses traceability |

## Architecture Patterns

### Recommended Project Structure

The work touches three distinct git contexts:

```
sonicjs/                          # Root repo (main branch — LOCKED for commits)
├── .planning/                    # Planning docs (commit here via planning workflow)
├── my-astro-cms/                 # SonicJS deployment — wrangler.toml fix, validation
│   ├── wrangler.toml             # BUCKET → MEDIA_BUCKET rename + staging env
│   └── src/
│       ├── index.ts              # Inject binding validation middleware
│       └── middleware/
│           └── validate-bindings.ts  # New: fail-fast binding checker
└── sonicjs-fork/                 # Fork repo — cherry-picks land here
    ├── FORK-CHANGES.md           # New: fork tracking document
    └── packages/core/src/        # Modified by cherry-picked PRs
```

### Pattern 1: wrangler.toml R2 Binding Rename

**What:** Change `binding = "BUCKET"` to `binding = "MEDIA_BUCKET"` in `my-astro-cms/wrangler.toml`
**When to use:** Any time the binding name in wrangler.toml diverges from what the application code expects

```toml
# BEFORE (broken)
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-astro-cms-media"

# AFTER (correct)
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

Source: Verified against `node_modules/@sonicjs-cms/core/dist/app-CYEm1ytG.d.ts` — `Bindings.MEDIA_BUCKET: R2Bucket`

### Pattern 2: Staging D1 Environment in wrangler.toml

**What:** Add a `[env.staging]` block with a separate D1 binding pointing to `my-astro-cms-db-staging`
**When to use:** Need separate database for migration testing without touching production data

```toml
[env.staging]
name = "my-sonicjs-app-staging"
vars = { ENVIRONMENT = "staging" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db-staging"
database_id = "<id-from-wrangler-d1-create>"

[[env.staging.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

Source: Verified against https://developers.cloudflare.com/d1/configuration/environments/ — `[[env.staging.d1_databases]]` is the correct TOML syntax.

### Pattern 3: Startup Binding Validation Middleware

**What:** Hono middleware that checks required bindings before the first request is processed. Injected via `config.middleware.beforeAuth` so it runs before any route handler.
**When to use:** Any Cloudflare Workers app where missing bindings cause obscure errors instead of clear failures

```typescript
// Source: SonicJS app.ts config.middleware.beforeAuth injection pattern
// File: src/middleware/validate-bindings.ts

import type { Context, Next } from 'hono'
import type { Bindings } from '@sonicjs-cms/core'

export function validateBindingsMiddleware() {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const missing: string[] = []

    if (!c.env.DB) missing.push('DB (D1 database)')
    if (!c.env.MEDIA_BUCKET) missing.push('MEDIA_BUCKET (R2 bucket)')

    if (missing.length > 0) {
      // Log details to Workers console, return generic 500 to client
      console.error('[Startup] Missing required bindings:', missing.join(', '))
      return c.json(
        { error: 'Service unavailable: infrastructure misconfiguration' },
        500
      )
    }

    // KV is optional — only log a warning, don't block
    if (!c.env.CACHE_KV) {
      console.warn('[Startup] CACHE_KV binding not configured — caching disabled')
    }

    await next()
  }
}
```

Inject in `src/index.ts`:

```typescript
const config: SonicJSConfig = {
  collections: { autoSync: true },
  plugins: { directory: './src/plugins', autoLoad: false },
  middleware: {
    beforeAuth: [validateBindingsMiddleware()]
  }
}
```

### Pattern 4: Cherry-Pick PRs from GitHub PR Branches

**What:** Fetch open PRs as local branches, cherry-pick their commits onto a feature branch in sonicjs-fork
**When to use:** PRs are open and unmerged; you want to apply them without waiting for upstream merge

```bash
# Step 1: Fetch all PR branches locally (run from sonicjs-fork/)
git fetch upstream \
  refs/pull/659/head:pr/659 \
  refs/pull/660/head:pr/660 \
  refs/pull/661/head:pr/661 \
  refs/pull/662/head:pr/662 \
  refs/pull/663/head:pr/663 \
  refs/pull/668/head:pr/668 \
  refs/pull/671/head:pr/671

# Step 2: Create a feature branch from main
git checkout main
git checkout -b feature/security-prs

# Step 3: Cherry-pick commits from each PR (verify SHAs first)
# Each PR's unique commits (not in upstream/main):
# PR #659: 2fa1dad4, 5ca59cf1 (PBKDF2)
# PR #660: b53e5d44 (JWT secret env var)
# PR #661: 3ae11631, cd6828d9 (CORS)
# PR #662: 0a6ffb2c (rate limiting)
# PR #663: cd18de8d (security headers)
# PR #668: 822f6e66 (CSRF)
# PR #671: b9f3a8aa (XSS sanitization)

git cherry-pick 2fa1dad4 5ca59cf1  # PR #659
git cherry-pick b53e5d44             # PR #660
# ... etc
```

Source: Verified by running `git fetch upstream refs/pull/659/head:pr/659 ...` and inspecting `git log --oneline pr/659 ^upstream/main`

### Pattern 5: FORK-CHANGES.md Format

**What:** Document that tracks the fork's divergence from upstream with feature-level grouping
**When to use:** Any soft fork that needs to be mergeable back or trackable for upstream syncing

```markdown
# Fork Changes

**Fork point:** <SHA of upstream/main at fork time>
**Upstream remote:** https://github.com/lane711/sonicjs.git
**Our fork:** https://github.com/jjaimealeman/sonicjs.git

## Binding Fixes

### MEDIA_BUCKET rename (fork-patch, not upstreamed)
- Renamed `BUCKET` R2 binding to `MEDIA_BUCKET` in sample app wrangler.toml
- Aligns with core package Bindings interface expectation

## Security Patches (mmcintosh PRs)

### PR #659: PBKDF2 Password Hashing
- **Status:** Cherry-picked, unmodified
- **Commits:** 2fa1dad4, 5ca59cf1
- Replaces SHA-256 with PBKDF2 (100,000 iterations, per-user salt)

### PR #660: JWT Secret Environment Variable
- **Status:** Cherry-picked, unmodified
- **Commits:** b53e5d44
- Moves JWT secret from hardcoded constant to c.env.JWT_SECRET

[... etc for each PR]
```

### Anti-Patterns to Avoid

- **Using `binding = "BUCKET"` in wrangler.toml while code expects `MEDIA_BUCKET`:** The binding name in wrangler.toml must exactly match what the code references in `c.env.*`. Mismatches cause silent `undefined` values, not errors at startup.
- **Cherry-picking into main directly:** Always use a feature branch; merging into main should be a deliberate step.
- **Cherry-picking merge commits:** Only cherry-pick the actual change commits (listed above), not merge commits.
- **Forgetting `git fetch upstream` before cherry-pick:** PR branches must be fetched locally first.
- **Setting `CACHE_KV` as required:** PR #662 explicitly degrades gracefully when `CACHE_KV` is absent. The validation middleware should treat KV as optional.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Binding validation | Custom Worker lifecycle hook | Hono middleware via `config.middleware.beforeAuth` | SonicJS already supports this injection point |
| CSRF protection | Custom token system | Cherry-pick PR #668 | mmcintosh already implemented it correctly with HMAC-SHA256 |
| Password hashing | Custom crypto | Cherry-pick PR #659 | PBKDF2 with Web Crypto API, 100k iterations, properly implemented |
| CORS enforcement | Custom headers | Cherry-pick PR #661 | Handles origin allowlist, X-API-Key header, secure defaults |
| Rate limiting | Custom counter | Cherry-pick PR #662 | KV-backed sliding window with graceful degradation |

**Key insight:** All 7 security PRs are high quality and complete. Do not re-implement them. Cherry-pick as-is.

## Common Pitfalls

### Pitfall 1: Binding Mismatch Is Silent at Runtime

**What goes wrong:** `c.env.MEDIA_BUCKET` returns `undefined` instead of an error when the wrangler.toml uses `BUCKET`. The media upload routes silently fail or return confusing errors.
**Why it happens:** Cloudflare Workers bindings are set via environment name. Wrong name = undefined binding, not a type error.
**How to avoid:** Always verify binding names match between wrangler.toml and the core's `Bindings` interface. Cross-check with `node_modules/@sonicjs-cms/core/dist/app-CYEm1ytG.d.ts`.
**Warning signs:** `MEDIA_BUCKET is not available!` errors in worker logs, upload failures.

### Pitfall 2: Cherry-Picking Merge Commits

**What goes wrong:** `git cherry-pick <merge-commit>` fails with "error: commit ... is a merge but no -m option was given".
**Why it happens:** Merge commits have two parents and cherry-pick doesn't know which diff to apply.
**How to avoid:** Only cherry-pick the actual code commits (listed above in Pattern 4). Never cherry-pick the merge commit itself.
**Warning signs:** `-m` option error in git output.

### Pitfall 3: PR #661 CORS Is a Breaking Change

**What goes wrong:** After cherry-picking PR #661, cross-origin requests are rejected by default. The admin UI works (same-origin) but any external API consumer fails.
**Why it happens:** PR #661 changes from `Access-Control-Allow-Origin: *` to explicit allowlist. No `CORS_ORIGINS` env var = reject all cross-origin.
**How to avoid:** After cherry-pick, verify the fork's sample `wrangler.toml` includes `CORS_ORIGINS = "http://localhost:8787"` for development. This is already in the PR's wrangler.toml diff.
**Warning signs:** 403 on cross-origin API calls after applying PR #661.

### Pitfall 4: KV Namespace Missing for Rate Limiting

**What goes wrong:** PR #662 requires `CACHE_KV` binding. The current `my-astro-cms/wrangler.toml` has no `kv_namespaces` block. Rate limiting silently skips (graceful degradation), which is fine for Phase 0, but the binding should be added for correctness.
**Why it happens:** Rate limiting was added but the KV namespace wasn't provisioned in the project.
**How to avoid:** Note that CACHE_KV is needed; add it to wrangler.toml but treat it as optional (consistent with the CONTEXT.md decision: "KV is optional").
**Warning signs:** No `X-RateLimit-*` headers in auth responses.

### Pitfall 5: Wrong Git Repo for Cherry-Pick Work

**What goes wrong:** Running cherry-pick in the project root repo (`/home/jaime/www/_github/sonicjs`) instead of `sonicjs-fork/`.
**Why it happens:** The project is a mono-repo with sonicjs-fork as a subdirectory — it's easy to confuse contexts.
**How to avoid:** Always `cd sonicjs-fork` before any git operations related to the fork. The root repo and sonicjs-fork are separate git repos.
**Warning signs:** `git log` shows planning commits instead of SonicJS source commits.

### Pitfall 6: Staging DB Not in wrangler.toml Non-Inheritable Bindings

**What goes wrong:** D1 bindings defined at the top level are NOT inherited by `[env.staging]`. You must repeat them under `[[env.staging.d1_databases]]`.
**Why it happens:** Cloudflare design: bindings are non-inheritable by environment. Only `[vars]` and some settings inherit.
**How to avoid:** Always explicitly define `[[env.staging.d1_databases]]` with the staging database ID.
**Warning signs:** `wrangler dev --env staging` uses production DB instead of staging.

## Code Examples

### R2 Binding Rename (wrangler.toml)

```toml
# Source: verified against sonicjs-fork/my-sonicjs-app/wrangler.toml (correct upstream example)
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

### Staging Environment Block (wrangler.toml)

```toml
# Source: https://developers.cloudflare.com/d1/configuration/environments/
[env.staging]
name = "my-sonicjs-app-staging"
vars = { ENVIRONMENT = "staging" }

[[env.staging.d1_databases]]
binding = "DB"
database_name = "my-astro-cms-db-staging"
database_id = "REPLACE_WITH_STAGING_DB_ID"

[[env.staging.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "my-astro-cms-media"
```

### Create Staging D1 Database

```bash
# Run from my-astro-cms/ — uses project's wrangler version
npx wrangler d1 create my-astro-cms-db-staging
# Copy the returned database_id into wrangler.toml [[env.staging.d1_databases]]
```

### Fetch PR Branches and Inspect Commits

```bash
# Run from sonicjs-fork/
git fetch upstream \
  refs/pull/659/head:pr/659 \
  refs/pull/660/head:pr/660 \
  refs/pull/661/head:pr/661 \
  refs/pull/662/head:pr/662 \
  refs/pull/663/head:pr/663 \
  refs/pull/668/head:pr/668 \
  refs/pull/671/head:pr/671

# Verify commits to cherry-pick for each PR
git log --oneline pr/659 ^upstream/main
```

### Cherry-Pick with Fork-Patch Tag

```bash
# After cherry-pick, amend the commit message to add [fork-patch] tag
git cherry-pick 2fa1dad4
git commit --amend -m "[fork-patch] security: replace SHA-256 password hashing with PBKDF2 (PR #659)"
```

### Migration Review Pattern

```bash
# Always check for transaction boundaries before applying
grep -n "BEGIN TRANSACTION\|COMMIT\|ROLLBACK" ./migrations/NNNN_migration_name.sql

# Apply to staging first
npx wrangler d1 migrations apply DB --env staging

# Apply to local only
npx wrangler d1 migrations apply DB --local
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `binding = "BUCKET"` in wrangler.toml | `binding = "MEDIA_BUCKET"` | Fixes silent media upload failures |
| No startup validation | Binding validator middleware via `beforeAuth` | Clear 500 with console details before first bad request |
| No fork tracking | FORK-CHANGES.md + upstream remote + `[fork-patch]` prefix | Trackable divergence, easier upstream sync |
| SHA-256 passwords | PBKDF2 100k iterations (PR #659) | Rainbow tables ineffective |
| Wildcard CORS `*` | Explicit CORS_ORIGINS allowlist (PR #661) | Prevents cross-origin exploitation |
| No CSRF protection | Signed double-submit cookie (PR #668) | Stops CSRF attacks on state-changing mutations |

## Open Questions

1. **Which git repo owns the FORK-CHANGES.md?**
   - What we know: `sonicjs-fork/` is the fork of lane711/sonicjs. The root repo is the project workspace.
   - What's unclear: CONTEXT.md says FORK-CHANGES.md should exist — but in which repo? The ROADMAP success criteria says "FORK-CHANGES.md exists" without specifying the path.
   - Recommendation: Place it in `sonicjs-fork/FORK-CHANGES.md` — it documents the fork's divergence and belongs with the fork's codebase. The root repo's `CLAUDE.md` can reference it.

2. **Does cherry-picking into sonicjs-fork main require a feature branch and PR, or direct main commit?**
   - What we know: The root repo is on main (protected per CLAUDE.md). The sonicjs-fork is a separate git repo on `docs/fix-astro-integration-guide` branch.
   - What's unclear: Whether sonicjs-fork/main is treated as protected or if direct commits are acceptable.
   - Recommendation: Create a feature branch in sonicjs-fork (e.g., `feature/security-prs`) for cherry-picks, then user merges via lazygit. This follows the established workflow.

3. **Should KV namespace be created in Phase 0 or deferred to Phase 3?**
   - What we know: KV is optional per CONTEXT.md; rate limiting degrades gracefully. Phase 3 explicitly wires KV cache.
   - What's unclear: Whether adding `[[kv_namespaces]]` to wrangler.toml in Phase 0 (before the namespace exists) causes wrangler errors.
   - Recommendation: Defer KV provisioning to Phase 3. For Phase 0, document in `FORK-CHANGES.md` that CACHE_KV is needed. The wrangler.toml `[env.staging]` block should omit kv_namespaces for now.

4. **Exact commit SHAs to cherry-pick — should these be re-verified at execution time?**
   - What we know: SHAs were verified during research: PR#659 (2fa1dad4, 5ca59cf1), PR#660 (b53e5d44), PR#661 (3ae11631, cd6828d9), PR#662 (0a6ffb2c), PR#663 (cd18de8d), PR#668 (822f6e66), PR#671 (b9f3a8aa).
   - What's unclear: PRs are open — authors could force-push and change SHAs.
   - Recommendation: During execution, always re-run `git log --oneline pr/NNN ^upstream/main` to confirm SHAs before cherry-picking.

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `/home/jaime/www/_github/sonicjs/my-astro-cms/wrangler.toml` — confirmed `binding = "BUCKET"` (wrong)
- Direct file inspection: `/home/jaime/www/_github/sonicjs/my-astro-cms/node_modules/@sonicjs-cms/core/dist/app-CYEm1ytG.d.ts` — confirmed `MEDIA_BUCKET: R2Bucket` in Bindings interface
- Direct file inspection: `/home/jaime/www/_github/sonicjs/sonicjs-fork/my-sonicjs-app/wrangler.toml` — confirms `binding = "MEDIA_BUCKET"` is the correct upstream pattern
- Direct git inspection: `git fetch upstream refs/pull/659/head:pr/659 ...` + `git log --oneline pr/NNN ^upstream/main` — verified all 7 PR commit SHAs
- Direct file inspection: `/home/jaime/www/_github/sonicjs/sonicjs-fork/packages/core/src/app.ts` — confirmed `config.middleware.beforeAuth` injection point exists

### Secondary (MEDIUM confidence)
- https://developers.cloudflare.com/d1/configuration/environments/ — `[[env.staging.d1_databases]]` TOML syntax for staging DB
- https://developers.cloudflare.com/workers/wrangler/environments/ — non-inheritable bindings per environment
- GitHub PR pages for #659, #660, #661, #662, #663, #668, #671 — fetched and verified PR descriptions

### Tertiary (LOW confidence)
- None — all key findings verified via direct code inspection or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by inspecting installed packages and upstream fork
- Architecture: HIGH — patterns verified against actual code structure
- Pitfalls: HIGH — binding mismatch confirmed by direct inspection; cherry-pick pitfalls from git behavior
- PR commit SHAs: HIGH at time of research — but re-verify at execution time (open PRs can be force-pushed)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable technology; PR SHAs re-verify at execution)
