# Deploy Button with Change Review

## Summary
Add a deploy workflow to the admin UI — a sidebar button that detects pending content changes, opens a review modal showing all edits since last deploy, and triggers a Cloudflare Pages rebuild on confirm.

## UX Flow
1. User edits content pages, hits **Save** (no more "Save & Publish" button — status dropdown handles draft/publish)
2. Sidebar shows deploy indicator with badge count when changes are pending ("3 changes pending")
3. User clicks **Deploy** → modal opens showing all content modified since last deploy
4. Modal lists: title, collection, what changed (status change, content edit, new item, deleted item)
5. User reviews — can click through to fix mistakes before deploying
6. Confirm → POST to Cloudflare Pages deploy hook → updates `last_deployed_at` timestamp
7. Optional: show deploy status (building → live) via polling

## Technical Requirements

### Database
- Add `last_deployed_at` timestamp to system settings or new `deploy_history` table
- Query: `SELECT * FROM content WHERE updated_at > last_deployed_at`

### Sidebar Component
- Check for pending changes on page load (compare timestamps)
- Show badge count next to Deploy button
- Position: above Settings in sidebar

### Deploy Modal
- List all changed content items grouped by collection
- Show change type: created, updated, status changed, deleted
- Link each item back to its edit page for quick fixes
- Confirm/Cancel buttons

### Deploy Hook
- Cloudflare Pages deploy hook URL stored in admin settings
- POST request triggers rebuild
- Track deploy status if possible

### Content Form Changes
- Remove "Save & Publish" / "Update & Publish" button
- Keep only "Save" / "Update" button
- Status dropdown already handles draft → published transitions

## Dependencies
- Cloudflare Pages deploy hook URL (created in CF dashboard)
- No new packages needed

## Notes
- This is essentially a "staging area" for the site — like `git diff` before push
- Could later add: deploy history log, rollback capability, scheduled deploys
