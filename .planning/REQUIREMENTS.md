# Requirements: SonicJS Fork — Production Edge CMS

**Defined:** 2026-03-01
**Core Value:** A secure, reliable CMS that Jaime can deploy per-client and trust in production

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Fix R2 binding mismatch (BUCKET → MEDIA_BUCKET in wrangler.toml)
- [x] **FOUND-02**: Establish fork tracking (FORK-CHANGES.md, upstream remote, `[fork-patch]` commit convention)
- [x] **FOUND-03**: Cherry-pick 7 @mmcintosh security PRs (#659, #660, #661, #662, #663, #668, #671)
- [x] **FOUND-04**: Add startup binding validation (fail fast if D1/R2/KV bindings missing)
- [x] **FOUND-05**: Create staging D1 database for migration testing

### Security

- [x] **SEC-01**: JWT secret from environment variable (wrangler secret put, startup assertion rejects hardcoded default)
- [x] **SEC-02**: PBKDF2 password hashing with per-user salt (100k iterations via Web Crypto, backward-compatible re-hash on login)
- [x] **SEC-03**: Rate limiting on auth endpoints (CF native binding, 10s/60s periods)
- [x] **SEC-04**: Security headers middleware (HSTS, X-Frame-Options, X-Content-Type-Options via Hono secureHeaders)
- [x] **SEC-05**: CORS with explicit allowed origins (replace wildcard * with configured domains)
- [x] **SEC-06**: CSRF protection on admin routes (Hono built-in header-based CSRF)

### Content Workflow

- [x] **CONT-01**: Fix API query filtering (parse filter[field][op]=value into D1 WHERE clauses)
- [x] **CONT-02**: Content unpublish (published → draft bidirectional transition with state machine)
- [x] **CONT-03**: Workflow history audit trail (log all status transitions with user + timestamp)
- [x] **CONT-04**: Content versioning UI fix (modal close bug #666, stable rollback)
- [x] **CONT-05**: Content scheduling (publish at future date via Workers scheduled triggers)
- [x] **CONT-06**: Slug uniqueness enforcement (per-collection unique constraint)

### Access Control

- [x] **AUTH-01**: Collection-level RBAC (admin, editor, author, viewer roles with per-collection permissions)
- [x] **AUTH-02**: Read-only API tokens for frontend queries (scoped tokens, no write access)

### Media

- [x] **MEDIA-01**: Fix R2 media uploads (depends on FOUND-01 binding fix, fix PDF upload)
- [x] **MEDIA-02**: Streaming upload (replace file.arrayBuffer() with file.stream() to avoid 128MB limit)
- [x] **MEDIA-03**: Cache API for media serving (immutable CDN caching with ETag support)

### Caching

- [x] **CACHE-01**: Wire KV namespace into three-tier cache (memory → KV → D1)
- [x] **CACHE-02**: Write-through cache invalidation on content mutations

### Integration

- [x] **INTG-01**: Wire hook system (replace emitEvent() stubs with hookSystem.execute() calls in routes)
- [x] **INTG-02**: Outgoing webhooks (trigger Astro rebuild on content publish)

### Deployment

- [x] **DEPLOY-01**: Deploy CMS backend to Cloudflare Workers (production)
- [x] **DEPLOY-02**: Deploy Astro frontend to Cloudflare Pages (production)
- [x] **DEPLOY-03**: Per-client wrangler environment template (reusable setup for new client instances)
- [x] **DEPLOY-04**: Workers Logs observability (structured logging for auth events and errors)

## v2 Requirements

### Access Control

- **AUTH-03**: Field-level permissions (Directus-style granular per-field RBAC)
- **AUTH-04**: 2FA for admin users
- **AUTH-05**: Login attempt lockout (lock_until + login_attempts columns)

### Content

- **CONT-07**: TypeScript SDK with auto-generated types from collection config
- **CONT-08**: Content calendar view for editorial teams
- **CONT-09**: Import/Export (JSON/CSV) for client onboarding

### Integration

- **INTG-03**: API token management UI in admin dashboard
- **INTG-04**: Live content preview in admin (iframe bridge to frontend)

### Platform

- **PLAT-01**: Multi-tenancy (single DB, multiple tenants with isolation)
- **PLAT-02**: GraphQL API
- **PLAT-03**: i18n / localization support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full WYSIWYG page builder | Design-driven content modeling anti-pattern; creates unmaintainable content types |
| Multi-database support (MySQL/Postgres) | D1/SQLite is an edge-native feature, not a limitation |
| Built-in ecommerce | Separate vertical; recommend Shopify + API integration |
| Real-time collaborative editing | Durable Objects complexity; marginal benefit for CMS use case |
| TinyMCE integration | Requires API key; Quill is sufficient |
| Custom admin UI rebuild | HTMX admin works; improve incrementally |
| Generative AI content creation | Better as optional plugin, not core feature |
| Headless email/newsletter | Separate concern; use Mailchimp/Buttondown via webhooks |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 0 | Complete |
| FOUND-02 | Phase 0 | Complete |
| FOUND-03 | Phase 0 | Complete |
| FOUND-04 | Phase 0 | Complete |
| FOUND-05 | Phase 0 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-05 | Phase 1 | Complete |
| SEC-06 | Phase 1 | Complete |
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CONT-04 | Phase 2 | Complete |
| CONT-05 | Phase 2 + 6 | Complete |
| CONT-06 | Phase 2 | Complete |
| AUTH-01 | Phase 2 + 6 | Complete |
| AUTH-02 | Phase 2 | Complete |
| MEDIA-01 | Phase 3 | Complete |
| MEDIA-02 | Phase 3 | Complete |
| MEDIA-03 | Phase 3 | Complete |
| CACHE-01 | Phase 3 | Complete |
| CACHE-02 | Phase 3 | Complete |
| INTG-01 | Phase 4 | Complete |
| INTG-02 | Phase 4 | Complete |
| DEPLOY-01 | Phase 5 | Complete |
| DEPLOY-02 | Phase 5 | Complete |
| DEPLOY-03 | Phase 5 | Complete |
| DEPLOY-04 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 — full coverage

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 — traceability mapped after roadmap creation*
