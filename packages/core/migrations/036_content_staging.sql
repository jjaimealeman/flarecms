-- Migration 036: Content Staging
-- Extends content_versions to support pending revisions (editorial workflow).
-- Adds status column to content_versions and revision metadata table.

-- Add status to content_versions: 'history' (default), 'pending', 'approved', 'rejected'
ALTER TABLE content_versions ADD COLUMN status TEXT NOT NULL DEFAULT 'history';

-- Index for fast pending revision lookups
CREATE INDEX IF NOT EXISTS idx_cv_status ON content_versions(status) WHERE status = 'pending';

-- Index for pending revisions by content item
CREATE INDEX IF NOT EXISTS idx_cv_content_status ON content_versions(content_id, status);

-- Revision metadata: who submitted, who reviewed, comments
CREATE TABLE IF NOT EXISTS content_revision_meta (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  submitted_by TEXT NOT NULL REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  review_comment TEXT,
  submitted_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  UNIQUE(version_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_version ON content_revision_meta(version_id);
