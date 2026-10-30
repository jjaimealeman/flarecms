# 2026-06-25 - chore: remove TinyMCE editor plugin — Quill is the primary rich text editor

**Keywords:** [chore] [auto-generated]
**Commit:** find with `git log --diff-filter=A -1 --format=%H -- changelog/f2bb2dd_remove-tinymce-editor-plugin-quill-is-the-primary-.md`

## What Changed

 TASKS.md                                           |  4 +--
 packages/astro/src/schema.ts                       |  1 -
 .../src/__tests__/routes/admin-plugins.test.ts     | 12 -------
 .../templates/dynamic-field-extended.test.ts       | 11 -------
 packages/core/src/db/migrations-bundle.ts          |  8 ++---
 packages/core/src/routes/admin-collections.ts      | 29 +++--------------
 packages/core/src/routes/admin-content.ts          | 29 -----------------
 packages/core/src/routes/admin-plugins.ts          | 38 ----------------------
 .../templates/components/dynamic-field.template.ts | 10 ------
 .../pages/admin-collections-form.template.ts       |  4 +--
 .../templates/pages/admin-content-form.template.ts | 19 +----------
 .../templates/pages/admin-field-types.template.ts  |  4 +--
 .../src/templates/pages/admin-preview.template.ts  |  3 +-
 .../src/templates/pages/admin-snippets.template.ts |  1 -
 packages/core/src/types/collection-config.ts       |  1 -
 packages/site/src/data/features.ts                 |  2 +-
 16 files changed, 16 insertions(+), 160 deletions(-)

## Files

- `TASKS.md`
- `packages/astro/src/schema.ts`
- `packages/core/src/__tests__/routes/admin-plugins.test.ts`
- `packages/core/src/__tests__/templates/dynamic-field-extended.test.ts`
- `packages/core/src/db/migrations-bundle.ts`
- `packages/core/src/routes/admin-collections.ts`
- `packages/core/src/routes/admin-content.ts`
- `packages/core/src/routes/admin-plugins.ts`
- `packages/core/src/templates/components/dynamic-field.template.ts`
- `packages/core/src/templates/pages/admin-collections-form.template.ts`
- `packages/core/src/templates/pages/admin-content-form.template.ts`
- `packages/core/src/templates/pages/admin-field-types.template.ts`
- `packages/core/src/templates/pages/admin-preview.template.ts`
- `packages/core/src/templates/pages/admin-snippets.template.ts`
- `packages/core/src/types/collection-config.ts`
- `packages/site/src/data/features.ts`

---

**Branch:** feature/live-demo
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
