-- Migration 038: Demo Sandbox
-- Creates demo_signups table, registers the demo-sandbox plugin,
-- and seeds the demo-sandbox collection with sample content.

-- demo_signups: records each public demo user creation
CREATE TABLE IF NOT EXISTS demo_signups (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_signups_email ON demo_signups(email);
CREATE INDEX IF NOT EXISTS idx_demo_signups_created_at ON demo_signups(created_at DESC);

-- Register demo-sandbox plugin
INSERT OR IGNORE INTO plugins (
  id, name, display_name, description, version, author, category, icon,
  status, is_core, permissions, installed_at, last_updated
) VALUES (
  'demo-sandbox',
  'demo-sandbox',
  'Demo Sandbox',
  'Public demo sandbox for visitors to explore Flare CMS',
  '1.0.0',
  'Flare CMS Team',
  'demo',
  NULL,
  'active',
  TRUE,
  '[]',
  unixepoch(),
  unixepoch()
);

-- Create the demo-sandbox collection
INSERT OR IGNORE INTO collections (
  id, name, display_name, description, schema, is_active, managed, created_at, updated_at
) VALUES (
  'demo-sandbox-collection',
  'demo-sandbox',
  'Sandbox',
  'Public demo sandbox collection — visitors can create and edit content here',
  '{"type":"object","properties":{"title":{"type":"string","title":"Title","required":true},"content":{"type":"string","title":"Content","format":"richtext"},"status":{"type":"string","title":"Status","enum":["draft","published"],"default":"draft"}},"required":["title"]}',
  1,
  1,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- Seed 3 demo content rows
-- author_id references the seeded admin user
INSERT OR IGNORE INTO content (
  id, collection_id, slug, title, data, status, author_id, created_at, updated_at
) VALUES
(
  'demo-sandbox-seed-1',
  'demo-sandbox-collection',
  'welcome-to-the-sandbox',
  'Welcome to the Sandbox',
  '{"title":"Welcome to the Sandbox","content":"<p>This is the Flare CMS demo sandbox. You can create, edit, and delete content here to explore how the CMS works.</p><p>Your changes are scoped to your demo session — feel free to experiment!</p>","status":"published"}',
  'published',
  'admin-1770148233567-90a7ju7xz',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'demo-sandbox-seed-2',
  'demo-sandbox-collection',
  'try-editing-this-post',
  'Try Editing This Post',
  '{"title":"Try Editing This Post","content":"<p>Click the edit button above to modify this content. You can change the title, update this body text, and save your changes.</p><p>This is a great way to see how the content editor works in Flare CMS.</p>","status":"published"}',
  'published',
  'admin-1770148233567-90a7ju7xz',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'demo-sandbox-seed-3',
  'demo-sandbox-collection',
  'create-your-own-content',
  'Create Your Own Content',
  '{"title":"Create Your Own Content","content":"<p>Use the <strong>New Content</strong> button to create your own entries in this sandbox collection.</p><p>Try adding a title and some rich text content — you have full editor access to this collection.</p>","status":"published"}',
  'published',
  'admin-1770148233567-90a7ju7xz',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
