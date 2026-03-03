#!/bin/bash
# provision-client.sh <client-name>
#
# Automates Cloudflare resource creation for a new SonicJS CMS client instance.
# Creates: D1 database, R2 bucket, KV namespace
# Outputs: wrangler.toml [env.<client-name>] snippet ready to paste
#
# Usage: ./scripts/provision-client.sh <client-name>
# Example: ./scripts/provision-client.sh 915website
#
# Prerequisites:
#   - wrangler CLI authenticated (run: wrangler login)
#   - Cloudflare account with D1, R2, and KV access

set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput &>/dev/null && tput colors &>/dev/null 2>&1; then
  BOLD=$(tput bold)
  GREEN=$(tput setaf 2)
  YELLOW=$(tput setaf 3)
  CYAN=$(tput setaf 6)
  RED=$(tput setaf 1)
  RESET=$(tput sgr0)
else
  BOLD='' GREEN='' YELLOW='' CYAN='' RED='' RESET=''
fi

info()  { echo "${GREEN}${BOLD}[+]${RESET} $*"; }
warn()  { echo "${YELLOW}${BOLD}[!]${RESET} $*"; }
error() { echo "${RED}${BOLD}[x]${RESET} $*" >&2; }
step()  { echo "${CYAN}${BOLD}───${RESET} $*"; }

# ─── Validate argument ────────────────────────────────────────────────────────
if [ $# -lt 1 ] || [ -z "$1" ]; then
  error "Missing required argument: client name"
  echo ""
  echo "  Usage: $0 <client-name>"
  echo "  Example: $0 915website"
  echo ""
  echo "  The client name must contain only letters, numbers, and hyphens."
  echo "  It becomes part of all Cloudflare resource names and the wrangler env key."
  exit 1
fi

CLIENT_NAME="$1"

# Validate: alphanumeric + hyphens only (kebab-case-safe, no leading/trailing hyphens)
if ! echo "$CLIENT_NAME" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$'; then
  error "Invalid client name: '$CLIENT_NAME'"
  echo ""
  echo "  Client name must:"
  echo "    - Contain only letters, numbers, and hyphens"
  echo "    - Not start or end with a hyphen"
  echo "    - Be at least 1 character"
  echo ""
  echo "  Examples: 915website, acme-corp, client42"
  exit 1
fi

# Derived resource names
DB_NAME="my-astro-cms-db-${CLIENT_NAME}"
BUCKET_NAME="my-astro-cms-media-${CLIENT_NAME}"
KV_BINDING="CACHE_KV_${CLIENT_NAME}"
WORKER_NAME="my-sonicjs-app-${CLIENT_NAME}"

echo ""
echo "${BOLD}SonicJS CMS — Provision Client: ${CYAN}${CLIENT_NAME}${RESET}"
echo "─────────────────────────────────────────────────────"
echo "  Worker:  ${WORKER_NAME}"
echo "  D1:      ${DB_NAME}"
echo "  R2:      ${BUCKET_NAME}"
echo "  KV:      ${KV_BINDING} (title will be prefixed with worker name by wrangler)"
echo ""

# ─── Create D1 database ───────────────────────────────────────────────────────
step "Creating D1 database: ${DB_NAME}"
DB_OUTPUT=$(wrangler d1 create "$DB_NAME" 2>&1) || {
  error "Failed to create D1 database. wrangler output:"
  echo "$DB_OUTPUT"
  exit 1
}
echo "$DB_OUTPUT"

# Parse database_id from output — handles both quoted and unquoted formats:
#   database_id = "abc-123"       (toml snippet format)
#   "database_id": "abc-123"      (json format)
DB_ID=$(echo "$DB_OUTPUT" | grep -oE '"?database_id"?\s*[=:]\s*"[^"]+"' | grep -oE '"[0-9a-f-]{36}"' | tr -d '"' | head -1 || true)

if [ -z "$DB_ID" ]; then
  warn "Could not auto-parse D1 database_id from wrangler output above."
  warn "You will need to paste it manually into the snippet below."
  DB_ID="PASTE-DATABASE-ID-HERE"
fi

info "D1 database created${DB_ID:+: ID = ${DB_ID}}"
echo ""

# ─── Create R2 bucket ─────────────────────────────────────────────────────────
step "Creating R2 bucket: ${BUCKET_NAME}"
R2_OUTPUT=$(wrangler r2 bucket create "$BUCKET_NAME" 2>&1) || {
  error "Failed to create R2 bucket. wrangler output:"
  echo "$R2_OUTPUT"
  exit 1
}
echo "$R2_OUTPUT"
info "R2 bucket created"
echo ""

# ─── Create KV namespace ──────────────────────────────────────────────────────
step "Creating KV namespace: ${KV_BINDING}"
KV_OUTPUT=$(wrangler kv namespace create "$KV_BINDING" 2>&1) || {
  error "Failed to create KV namespace. wrangler output:"
  echo "$KV_OUTPUT"
  exit 1
}
echo "$KV_OUTPUT"

# Parse id from KV output — handles both toml and json formats:
#   id = "abc123"     (toml)
#   "id": "abc123"   (json)
KV_ID=$(echo "$KV_OUTPUT" | grep -oE '"?id"?\s*[=:]\s*"[0-9a-f]{32}"' | grep -oE '"[0-9a-f]{32}"' | tr -d '"' | head -1 || true)

if [ -z "$KV_ID" ]; then
  warn "Could not auto-parse KV namespace id from wrangler output above."
  warn "You will need to paste it manually into the snippet below."
  KV_ID="PASTE-KV-NAMESPACE-ID-HERE"
fi

info "KV namespace created${KV_ID:+: ID = ${KV_ID}}"
echo ""

# ─── Warn if any IDs need manual intervention ─────────────────────────────────
if [[ "$DB_ID" == PASTE-* ]] || [[ "$KV_ID" == PASTE-* ]]; then
  echo "${YELLOW}${BOLD}NOTE:${RESET} One or more IDs could not be parsed automatically from wrangler output."
  echo "      Find the IDs in the wrangler output above and replace the PASTE-...-HERE"
  echo "      placeholders in the wrangler.toml snippet below."
  echo ""
fi

# ─── Output wrangler.toml snippet ────────────────────────────────────────────
echo "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo "${BOLD}  Add this to my-astro-cms/wrangler.toml${RESET}"
echo "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo ""
cat << SNIPPET
[env.${CLIENT_NAME}]
name = "${WORKER_NAME}"
vars = { ENVIRONMENT = "production", CORS_ORIGINS = "https://${WORKER_NAME}.workers.dev", WEBHOOK_URLS = "", WEBHOOK_SECRET = "" }

[[env.${CLIENT_NAME}.d1_databases]]
binding = "DB"
database_name = "${DB_NAME}"
database_id = "${DB_ID}"
migrations_dir = "./node_modules/@sonicjs-cms/core/migrations"

[[env.${CLIENT_NAME}.r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "${BUCKET_NAME}"

[[env.${CLIENT_NAME}.kv_namespaces]]
binding = "CACHE_KV"
id = "${KV_ID}"
SNIPPET
echo ""

# ─── Next steps ───────────────────────────────────────────────────────────────
echo "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo "${BOLD}  Next steps${RESET}"
echo "${BOLD}═══════════════════════════════════════════════════════════════${RESET}"
echo ""
echo "  ${BOLD}1. Paste the snippet above into wrangler.toml${RESET}"
echo "     Update CORS_ORIGINS if the client has a custom domain."
echo ""
echo "  ${BOLD}2. Apply database migrations${RESET}"
echo "     ${CYAN}wrangler d1 migrations apply DB --remote --env ${CLIENT_NAME}${RESET}"
echo "     Run from my-astro-cms/ directory."
echo ""
echo "  ${BOLD}3. Set required secrets${RESET} (interactive prompts for values)"
echo "     ${CYAN}wrangler secret put JWT_SECRET --env ${CLIENT_NAME}${RESET}"
echo ""
echo "  ${BOLD}4. (Optional) Set webhook secret${RESET}"
echo "     ${CYAN}wrangler secret put WEBHOOK_SECRET --env ${CLIENT_NAME}${RESET}"
echo "     Only needed if WEBHOOK_URLS will be configured for this client."
echo ""
echo "  ${BOLD}5. Deploy the Worker${RESET}"
echo "     ${CYAN}wrangler deploy --env ${CLIENT_NAME}${RESET}"
echo ""
echo "  ${BOLD}6. Seed the admin user${RESET}"
echo "     Option A — via D1 execute (replace values as needed):"
echo "     ${CYAN}wrangler d1 execute DB --remote --env ${CLIENT_NAME} --command \\${RESET}"
echo "       ${CYAN}\"INSERT INTO users (id, email, password, role, created_at, updated_at) \\${RESET}"
echo "        ${CYAN}VALUES ('admin-\$(date +%s)-\$(head -c4 /dev/urandom | xxd -p)', \\${RESET}"
echo "        ${CYAN}'admin@${CLIENT_NAME}.com', 'HASHED_PASSWORD', 'admin', \\${RESET}"
echo "        ${CYAN}\$(date +%s000), \$(date +%s000))\"${RESET}"
echo "     Option B — check if SonicJS /auth/register route is enabled and use it."
echo "     See: scripts/seed-admin.ts for local seeding reference."
echo ""
echo "  ${BOLD}7. Verify deployment${RESET}"
echo "     ${CYAN}curl https://${WORKER_NAME}.workers.dev/api/health${RESET}"
echo ""
info "Provisioning complete for client: ${CLIENT_NAME}"
echo ""
