---
phase: 05-production-deployment
plan: 02
subsystem: infra
tags: [bash, wrangler, cloudflare, d1, r2, kv, provisioning, deployment]

# Dependency graph
requires:
  - phase: 05-01-production-deployment
    provides: pre-deploy checklist and migration runbook context
provides:
  - Per-client Cloudflare resource provisioning automation (provision-client.sh)
  - Paste-ready wrangler.toml [env.client-name] snippet generation
  - Onboarding runbook for new client deployments (migrations, secrets, deploy, admin seed)
affects: [05-03-production-deployment, 05-04-production-deployment, future client onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bash provisioning script with set -euo pipefail for safe automation"
    - "wrangler CLI resource creation: d1 create, r2 bucket create, kv namespace create"
    - "Heredoc toml snippet generation for wrangler.toml [env.client-name] sections"
    - "Regex ID parsing from wrangler output with fallback placeholder + warn pattern"
    - "Color terminal output gated on tput/TTY detection"

key-files:
  created:
    - my-astro-cms/scripts/provision-client.sh
  modified: []

key-decisions:
  - "Bash chosen over Node.js for simplicity — no dependencies, runs with wrangler in PATH (confirmed from 05-RESEARCH.md Pattern 7)"
  - "ID parsing uses regex with fallback PASTE-...-HERE placeholder — wrangler output format is fragile, user instructed to verify manually if auto-parse fails"
  - "KV binding arg is CACHE_KV_{CLIENT} (not a title) — wrangler prefixes it with worker name; documented in script comment and research Pitfall 6"
  - "migrations_dir included in D1 snippet — matches wrangler.toml root pattern, critical for wrangler d1 migrations apply to find migration files"
  - "Admin seeding via wrangler d1 execute --remote included as Option A — addresses Open Question 1 from 05-RESEARCH.md"

patterns-established:
  - "Pattern: provision-client.sh is the canonical client onboarding tool — run once per new client, paste output into wrangler.toml"
  - "Pattern: color output gated on tput — scripts work in both TTY and CI/pipe contexts"

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 5 Plan 02: Per-Client Provisioning Script Summary

**Bash provisioning script that creates D1/R2/KV Cloudflare resources via wrangler CLI and outputs a paste-ready wrangler.toml [env.client-name] snippet with full onboarding runbook**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T18:26:18Z
- **Completed:** 2026-03-02T18:29:51Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `my-astro-cms/scripts/provision-client.sh` — executable bash script (203 lines)
- Script validates input (alphanumeric + hyphens, no leading/trailing hyphens) before touching any Cloudflare resources
- Automates `wrangler d1 create`, `wrangler r2 bucket create`, and `wrangler kv namespace create` with error handling
- Parses resource IDs from wrangler output (regex) with graceful fallback placeholder when parsing fails
- Outputs a complete, paste-ready `[env.{client}]` wrangler.toml section including all bindings: DB, MEDIA_BUCKET, CACHE_KV
- Prints a 7-step next-steps runbook covering migrations, secrets, deploy, and admin user seeding

## Task Commits

Each task was committed atomically:

1. **Task 1: Create per-client provisioning script** - `8eb6a35` (feat) — in `my-astro-cms` repo (feature/phase-0-foundation)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `my-astro-cms/scripts/provision-client.sh` - Per-client Cloudflare provisioning automation; validates args, creates D1/R2/KV, outputs wrangler.toml snippet + runbook

## Decisions Made
- **Bash over Node.js:** Simpler, no dependencies, runs anywhere wrangler is in PATH. Matches Pattern 7 from research.
- **ID parsing with fallback:** wrangler output format is not guaranteed stable. If regex fails, the script replaces the ID with a `PASTE-...-HERE` placeholder and warns the user — never silently wrong.
- **KV binding name as `CACHE_KV_{CLIENT}`:** The wrangler kv namespace create argument is a binding name suffix (not a title). The actual namespace title becomes `{worker-name}-CACHE_KV_{client}`. Documented per Pitfall 6 from research.
- **`migrations_dir` included in D1 snippet:** Added to match the root wrangler.toml pattern. Critical for `wrangler d1 migrations apply` to locate migration files.
- **Admin seeding via SQL:** Research Open Question 1 had no definitive answer on a SonicJS registration endpoint. Provided `wrangler d1 execute --remote` SQL template as Option A with seed-admin.ts as Option B reference.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**my-astro-cms is a nested git repo:** The parent `/home/jaime/www/_github/sonicjs/` git repo does not track `my-astro-cms/` contents — it's a separate git repo on branch `feature/phase-0-foundation`. Committed the script to the inner repo, which is the correct location per project structure.

## User Setup Required

None - no external service configuration required. The script itself is the tool for provisioning; it requires `wrangler login` to be run before first use (standard prerequisite).

## Next Phase Readiness
- `provision-client.sh` is ready to use for any new client onboarding
- Script assumes wrangler is authenticated (`wrangler login`) before running
- Update CORS_ORIGINS in the generated snippet if client has a custom domain (not workers.dev)
- Phase 5 plans 03 and 04 can proceed (structured logger, health check, Pages deploy)

---
*Phase: 05-production-deployment*
*Completed: 2026-03-02*
