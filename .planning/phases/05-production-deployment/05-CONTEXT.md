# Phase 5: Production Deployment - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the CMS backend (Cloudflare Workers) and Astro frontend (Cloudflare Pages) to production. Establish per-client provisioning so spinning up a new client instance takes minutes. Add structured observability so errors and auth events are visible in Workers Logs.

</domain>

<decisions>
## Implementation Decisions

### Domain & DNS setup
- Start with Cloudflare defaults (*.workers.dev and *.pages.dev) for initial deploy
- Custom domains added per-client later — not a blocker for going live
- Subdomain pattern when custom domains are added: cms.clientdomain.com for CMS, clientdomain.com (or www) for frontend
- CMS admin UI publicly accessible with JWT auth (no Cloudflare Access for v1 — existing auth layer from Phase 1 is sufficient)

### Per-client template
- Fully separate resources per client: each gets own D1 database, R2 bucket, and KV namespace — complete isolation
- Wrangler environment sections: [env.client-name] in a shared wrangler.toml, deploy with `wrangler deploy --env client-name`
- Semi-automated provisioning: script creates D1/R2/KV and generates config, but deploy is a manual wrangler command
- New clients include default collections (blog-posts, news, pages) out of the box

### Observability & logging
- Workers Logs only for v1 — built-in Cloudflare observability with `observability.enabled = true` in wrangler.toml
- Structured log events: auth events (login/failure/permission denials) and content mutations (create/update/delete/publish)
- Lightweight logger utility (log.info, log.warn, log.error) with consistent JSON field structure
- Enhanced health check: /api/health returns dependency status (D1, R2, KV reachability) for uptime monitoring

### Deploy workflow
- Manual wrangler deploy from terminal for v1 — full control, no CI/CD pipeline setup needed
- D1 migrations applied manually before deploy (wrangler d1 migrations apply --remote, then wrangler deploy)
- Secrets managed via wrangler secret put with a documented runbook listing all required secrets per environment
- Rollback via wrangler rollback (instant revert to previous deployment version)

### Claude's Discretion
- Logger utility implementation details (function signatures, field naming)
- Provisioning script language (bash vs node)
- Exact health check response format
- Migration pre-check automation level
- wrangler.toml template structure

</decisions>

<specifics>
## Specific Ideas

- Per-client model matches existing agency workflow: each client = separate Cloudflare environment
- 915website.com is the likely first production client
- Pending TODO from earlier phases: set CORS_ORIGINS in [env.production] with actual domain
- Multiple D1 migrations from Phases 2-4 need to be applied --remote before production (see STATE.md Pending Todos and Blockers)

</specifics>

<deferred>
## Deferred Ideas

- CI/CD pipeline (GitHub Actions) — future improvement once manual deploy is proven
- Cloudflare Access zero-trust gate — future hardening if needed
- Multi-region deployment — not needed for current client base
- Automated backup/restore for D1 — operational concern for later

</deferred>

---

*Phase: 05-production-deployment*
*Context gathered: 2026-03-02*
