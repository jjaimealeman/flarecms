-- Migration 035: Soft Delete Cascade
-- Adds deleted_at timestamp to content table for trash retention tracking
-- Backfills existing deleted content with current timestamp

-- Add deleted_at column to content table
ALTER TABLE content ADD COLUMN deleted_at INTEGER;

-- Backfill: set deleted_at for any content already marked as deleted
UPDATE content SET deleted_at = updated_at WHERE status = 'deleted' AND deleted_at IS NULL;

-- Index for efficient trash queries and auto-purge
CREATE INDEX IF NOT EXISTS idx_content_deleted_at ON content(deleted_at) WHERE deleted_at IS NOT NULL;
