/**
 * API Token Service
 *
 * Provides secure read-only API token management with:
 * - SHA-256 hashed storage (tokens never stored in plaintext)
 * - Collection-level scoping (token can only read specified collections)
 * - Token prefix display (only prefix shown after creation)
 * - Expiration support
 */

export interface ApiTokenRecord {
  id: string
  name: string
  token_prefix: string
  token_hash: string
  user_id: string
  permissions: string | null
  allowed_collections: string | null
  is_read_only: number
  expires_at: number | null
  last_used_at: number | null
  created_at: number
}

export interface ApiTokenSafe {
  id: string
  name: string
  token_prefix: string
  user_id: string
  permissions: string | null
  allowed_collections: string[] | null
  is_read_only: boolean
  expires_at: number | null
  last_used_at: number | null
  created_at: number
}

export interface CreateApiTokenParams {
  name: string
  userId: string
  allowedCollections: string[] | null
  expiresAt: number | null
}

export interface CreateApiTokenResult {
  tokenValue: string
  tokenPrefix: string
  id: string
}

export interface ValidateApiTokenResult {
  valid: boolean
  tokenRecord?: ApiTokenSafe
  error?: string
}

/**
 * Hash a token using SHA-256 via Web Crypto API
 * Returns hex string representation
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a cryptographically secure random hex string
 */
function generateSecureHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a unique ID for a new token
 */
function generateTokenId(): string {
  return 'tok_' + generateSecureHex(8) + '_' + Date.now().toString(36)
}

/**
 * Create a new API token
 *
 * The token value is returned ONCE and never stored. Only the SHA-256 hash is persisted.
 * Token format: st_<48 hex chars>
 * Token prefix: st_<first 8 chars>...
 */
export async function createApiToken(
  db: D1Database,
  params: CreateApiTokenParams
): Promise<CreateApiTokenResult> {
  // Generate token: "st_" prefix + 24 random bytes as 48 hex chars
  const randomHex = generateSecureHex(24)
  const tokenValue = `st_${randomHex}`
  const tokenPrefix = `st_${randomHex.substring(0, 8)}...`

  // Hash the token for storage
  const tokenHash = await hashToken(tokenValue)

  const tokenId = generateTokenId()
  const now = Date.now()

  const allowedCollectionsStr = params.allowedCollections
    ? JSON.stringify(params.allowedCollections)
    : null

  await db.prepare(`
    INSERT INTO api_tokens (
      id, name, token, token_hash, token_prefix,
      user_id, permissions, allowed_collections,
      is_read_only, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(
    tokenId,
    params.name,
    tokenPrefix, // store prefix in legacy "token" column for backward compat
    tokenHash,
    tokenPrefix,
    params.userId,
    'read', // read-only permission string
    allowedCollectionsStr,
    params.expiresAt,
    now
  ).run()

  return {
    tokenValue,
    tokenPrefix,
    id: tokenId,
  }
}

/**
 * Validate an API token
 *
 * Hashes the provided token and looks it up in the database.
 * Checks expiration and updates last_used_at on success.
 */
export async function validateApiToken(
  db: D1Database,
  token: string
): Promise<ValidateApiTokenResult> {
  if (!token || !token.startsWith('st_')) {
    return { valid: false, error: 'Invalid token format' }
  }

  let tokenHash: string
  try {
    tokenHash = await hashToken(token)
  } catch {
    return { valid: false, error: 'Token hashing failed' }
  }

  const record = await db.prepare(`
    SELECT id, name, token_prefix, token_hash, user_id, permissions,
           allowed_collections, is_read_only, expires_at, last_used_at, created_at
    FROM api_tokens
    WHERE token_hash = ?
  `).bind(tokenHash).first<ApiTokenRecord>()

  if (!record) {
    return { valid: false, error: 'Token not found' }
  }

  // Check expiration
  if (record.expires_at !== null && record.expires_at < Date.now()) {
    return { valid: false, error: 'Token has expired' }
  }

  // Update last_used_at (fire and forget — don't block the response)
  db.prepare(`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`)
    .bind(Date.now(), record.id)
    .run()
    .catch(err => console.error('Failed to update last_used_at:', err))

  const safeRecord: ApiTokenSafe = {
    id: record.id,
    name: record.name,
    token_prefix: record.token_prefix,
    user_id: record.user_id,
    permissions: record.permissions,
    allowed_collections: record.allowed_collections
      ? JSON.parse(record.allowed_collections)
      : null,
    is_read_only: record.is_read_only === 1,
    expires_at: record.expires_at,
    last_used_at: record.last_used_at,
    created_at: record.created_at,
  }

  return { valid: true, tokenRecord: safeRecord }
}

/**
 * Revoke an API token by ID
 *
 * Deletes the token record so it can no longer be used.
 */
export async function revokeApiToken(db: D1Database, tokenId: string): Promise<void> {
  await db.prepare(`DELETE FROM api_tokens WHERE id = ?`).bind(tokenId).run()
}

/**
 * List API tokens (safe — never returns hash)
 *
 * Optionally filter by userId.
 */
export async function listApiTokens(
  db: D1Database,
  userId?: string
): Promise<ApiTokenSafe[]> {
  let stmt
  if (userId) {
    stmt = db.prepare(`
      SELECT id, name, token_prefix, user_id, permissions,
             allowed_collections, is_read_only, expires_at, last_used_at, created_at
      FROM api_tokens
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId)
  } else {
    stmt = db.prepare(`
      SELECT id, name, token_prefix, user_id, permissions,
             allowed_collections, is_read_only, expires_at, last_used_at, created_at
      FROM api_tokens
      ORDER BY created_at DESC
    `)
  }

  const results = await stmt.all<Omit<ApiTokenRecord, 'token_hash'>>()

  return (results.results || []).map(record => ({
    id: record.id,
    name: record.name,
    token_prefix: record.token_prefix,
    user_id: record.user_id,
    permissions: record.permissions,
    allowed_collections: record.allowed_collections
      ? JSON.parse(record.allowed_collections)
      : null,
    is_read_only: record.is_read_only === 1,
    expires_at: record.expires_at,
    last_used_at: record.last_used_at,
    created_at: record.created_at,
  }))
}
