-- Built-in Analytics: page_views table for privacy-first visitor tracking
-- No PII stored — IP is hashed with daily salt, never stored raw

CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  device TEXT,
  visitor_hash TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  screen_width INTEGER,
  load_time_ms INTEGER,
  session_id TEXT,
  browser TEXT,
  os TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_country ON page_views(country);
