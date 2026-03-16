-- Migration: Schema Migrations tracking table
-- Description: Records schema evolution history for collections
-- Date: March 2026
-- Phase 9: Schema Migrations UI

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  changes TEXT NOT NULL,
  description TEXT NOT NULL,
  sql_executed TEXT,
  status TEXT NOT NULL DEFAULT 'applied',
  previous_schema TEXT,
  applied_by TEXT,
  applied_at INTEGER NOT NULL,
  rolled_back_at INTEGER,
  rolled_back_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_collection ON schema_migrations(collection_id);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_status ON schema_migrations(status);
