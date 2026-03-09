---
phase: 01-cms-content-foundation
plan: 02
subsystem: cms-admin
tags: [easymde, editor, r2-upload, media, code-blocks]

# Dependency graph
requires: [01-01]
provides:
  - EasyMDE code block toolbar button for fenced code block insertion
  - R2 image upload via drag-and-drop/paste in EasyMDE
  - Custom media domain (images.flarecms.dev) for R2 URLs
  - Slug regeneration support for name field (not just title)
  - Content list title fallback to data.name
affects: [02-docs-layout-navigation, 05-documentation-content]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EasyMDE custom toolbar button with CodeMirror replaceSelection"
    - "imageUploadFunction for R2 media upload in EasyMDE"
    - "MEDIA_DOMAIN env var for configurable image serving domain"

key-files:
  modified:
    - packages/core/src/plugins/available/easy-mdx/index.ts
    - packages/core/src/routes/admin-content.ts
    - packages/core/src/routes/api-media.ts
    - packages/core/src/templates/components/dynamic-field.template.ts
    - packages/core/src/templates/pages/admin-content-form.template.ts
    - packages/core/src/app.ts
    - packages/cms/wrangler.toml

key-decisions:
  - "Use images.flarecms.dev custom domain instead of pub-*.r2.dev for media URLs"
  - "Slug source field falls back to name when title doesn't exist"
  - "TinyMCE script suppressed when EasyMDE is active to avoid API key warnings"

patterns-established:
  - "MEDIA_DOMAIN env var for R2 custom domain configuration"
  - "Content title fallback chain: data.title -> data.name -> 'Untitled'"

# Metrics
duration: 45min
completed: 2026-03-08
---

# Phase 1 Plan 2: EasyMDE Enhancements Summary

**EasyMDE code block button, R2 image upload, and admin UI fixes for docs workflow**

## Performance

- **Duration:** 45 min (including iterative bug fixes during human verification)
- **Started:** 2026-03-08
- **Completed:** 2026-03-08
- **Tasks:** 2 (1 auto + 1 checkpoint)
- **Files modified:** 7

## Accomplishments
- Added custom "Code Block" toolbar button to EasyMDE that inserts fenced ```ts template
- Integrated R2 image upload via drag-and-drop/paste using imageUploadFunction
- Configured images.flarecms.dev as custom R2 domain for media URLs
- Fixed slug regeneration to work with name field (not just title)
- Fixed content list to show data.name when title column is empty
- Fixed auto-save URL shadowed by form buttons named "action"
- Fixed HTMX script redeclaration error for reference fields
- Suppressed TinyMCE loading when EasyMDE plugin is active

## Task Commits

1. **Task 1: Add code block button and R2 image upload** - `a765990` (feat)
2. **Fix: Slug regeneration, title fallback, TinyMCE conflicts** - `6a40610` (fix)
3. **Fix: Image upload, auto-save URL, HTMX redeclaration** - `e3f6ea7` (fix)
4. **Fix: Correct media upload path** - `709694f` (fix)
5. **Fix: Match media upload response format** - `21feac7` (fix)
6. **Feat: Custom media domain** - `635517f` (feat)
7. **Fix: Remaining r2.dev URL** - `a058c9e` (fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Slug regeneration hardcoded to title field**
- Slug "Regenerate from title" JS was hardcoded to `input[name="title"]`
- Fixed to try title first, then name as fallback

**2. [Rule 1 - Bug] Content list shows "Untitled" for collections without title field**
- DB INSERT used `data.title || 'Untitled'` with no name fallback
- List query only selected c.title with no JSON fallback
- Fixed both INSERT and SELECT to fall back to data.name

**3. [Rule 1 - Bug] TinyMCE API key warning when EasyMDE active**
- TinyMCE CDN script loaded unconditionally when plugin was active
- Fixed to skip TinyMCE when mdxeditor (EasyMDE) is active

**4. [Rule 1 - Bug] Auto-save URL was [object RadioNodeList]**
- form.action shadowed by submit buttons with name="action"
- Fixed to use form.getAttribute('hx-post')

**5. [Rule 1 - Bug] HTMX let redeclaration error**
- Reference field script used let which fails on HTMX re-processing
- Changed to var with fallback initialization

**6. [Rule 1 - Bug] Wrong media upload endpoint**
- Plan specified /api/v1/media/upload but actual route is /api/media/upload
- Fixed endpoint path

**7. [Rule 1 - Bug] Wrong response field name for media URL**
- Response returns file.publicUrl, callback looked for file.url
- Fixed extraction to check publicUrl first

**8. [Rule 3 - Blocker] R2 pub-*.r2.dev URLs not publicly accessible**
- R2 bucket had no public access; added images.flarecms.dev custom domain
- Added MEDIA_DOMAIN env var for configurable media serving

---

**Total deviations:** 8 auto-fixed (7 bugs, 1 blocker)
**Impact on plan:** All fixes were necessary for the docs workflow to function. No scope creep — all fixes directly support Phase 1 success criteria.

## Issues Encountered
- Local wrangler dev uses local R2, so images uploaded locally won't be visible via images.flarecms.dev (expected behavior, works in production)
- EasyMDE status bar warning for upload-image — fixed by adding to status config

## Next Phase Readiness
- EasyMDE editor fully functional for code-heavy documentation content
- Image upload pipeline works end-to-end (local → R2 → custom domain)
- Collections and editor ready for Phase 2 (layout/navigation) and Phase 5 (content authoring)

---
*Phase: 01-cms-content-foundation*
*Completed: 2026-03-08*
