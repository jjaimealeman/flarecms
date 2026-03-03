# GSD Session Context — Save Point (March 1, 2026)

## Status: Mid-/gsd:new-project — Phase 3 (Questioning)

Git repo initialized at project root. Brownfield mapping skipped (deep context already gathered). Questioning phase started but not complete.

## Key Decisions Made
- **Fork type:** Soft fork of SonicJS v2.8.0 — diverge but watch upstream
- **Goal:** Production CMS for Jaime + 915website.com clients
- **Stack:** Full Cloudflare Workers (D1, R2, KV, Durable Objects)
- **Multi-tenancy:** NOT for v1. Single-tenant per deployment. Multi-tenant is v2+ dream.
- **Deployment model:** One CMS instance per client, scaffolded via CLI template

## What We Know About the Codebase

### SonicJS (sonicjs-fork/)
- v2.8.0, last upstream commit Feb 1 2026 (Lane Campbell @lane711)
- 1,478 stars, 187 forks, 100 open issues, MIT license
- **Critical security issues:** Hardcoded JWT secret, SHA-256 with static salt, default admin password "sonicjs!"
- **Broken API filtering:** QueryFilterBuilder exists but NOT wired to content API routes
- **R2 binding mismatch:** wrangler.toml has BUCKET, core expects MEDIA_BUCKET
- **Missing bindings:** CACHE_KV (caching), ASSETS (static serving)
- **Good parts:** Plugin system (22 hooks, fluent builder), Drizzle+D1 foundation, HTMX admin UI, two-tier caching
- **Community PRs unmerged:** @mmcintosh submitted 10+ security PRs (PBKDF2 hashing, env JWT secret, CORS, rate limiting, CSRF, XSS prevention, SQLi sanitization)

### Astro Frontend (my-astro-site/)
- v0.2.0 on main, tagged, ready to deploy
- Blog (4 posts with OpenAI abstract art), News (5 articles), Pages (About/Contact/Uses)
- Full nav: Home, Blog, News, Uses, About, Contact
- Tailwind CSS v4 + @tailwindcss/typography

### CMS Instance (my-astro-cms/)
- Running @sonicjs-cms/core@2.8.0 from npm
- Collections: blog-posts, news, pages
- Admin user: admin-1770148233567-90a7ju7xz / jjaimealeman@gmail.com
- Password reset to "sonicjs!" (SHA-256 + hardcoded salt)

## Cherry-Pick Priorities from @mmcintosh PRs
1. PR #659 — PBKDF2 password hashing (replaces SHA-256)
2. PR #660 — JWT secret from environment variable
3. PR #661 — CORS explicit allowed origins
4. PR #662 — Rate limiting on auth endpoints
5. PR #663 — Security headers middleware
6. PR #668 — CSRF token protection
7. PR #670 — SQL injection sanitization
8. PR #671 — XSS prevention on form submissions
9. PR #672 — Fix user_profiles migration

## Cherry-Pick from Payload Patterns
- Per-user salt + hash columns
- Login attempt lockout (login_attempts + lock_until)
- Range requests for R2 media serving
- ETag caching (304 Not Modified)
- SVG Content-Security-Policy
- Auto-generated TypeScript types from collection config
- Dev mode schema push / prod mode migrations

## User Context
- Jaime Aleman, El Paso TX, 915website.com (web dev agency)
- Past clients: BabsBoutique (Astro+Nuxt), AutoPlusElPaso (Nuxt)
- Tired of building custom backends for each client
- Wants to "dogfood" — use own CMS on personal/demo projects
- Uses: kitty + tmux, lazygit, Claude Code CLI
- NEVER push/merge/rebase (user handles via lazygit)
- NEVER run dev servers (user has tmux panes)

## Resume Instructions
1. Continue /gsd:new-project from Phase 3 (Questioning)
2. Key remaining questions: client workflow, template system, deployment automation
3. Then: PROJECT.md → config.json → research (optional) → REQUIREMENTS.md → ROADMAP.md
