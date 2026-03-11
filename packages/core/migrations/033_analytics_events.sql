-- Add event tracking to analytics (exit clicks, etc.)
ALTER TABLE page_views ADD COLUMN event_type TEXT NOT NULL DEFAULT 'pageview';
ALTER TABLE page_views ADD COLUMN event_data TEXT;
ALTER TABLE page_views ADD COLUMN device_name TEXT;

CREATE INDEX IF NOT EXISTS idx_page_views_event ON page_views(event_type);
