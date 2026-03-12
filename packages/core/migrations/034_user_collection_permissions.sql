-- Migration 034: User Collection Permissions
-- Creates the user_collection_permissions table for collection-scoped RBAC.
-- Required by: packages/core/src/services/rbac.ts

CREATE TABLE IF NOT EXISTS user_collection_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  granted_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_ucp_user ON user_collection_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ucp_collection ON user_collection_permissions(collection_id);
