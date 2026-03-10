# 2026-03-10 - Plugin Audit: FAQ Plugin, Forms Overhaul, OTP Login Wiring

**Keywords:** [FEATURE] [UI] [BACKEND] [ROUTING] [ENHANCEMENT]
**Session:** Afternoon, Duration (~3 hours)
**Commit:** 4b35237

## What Changed

- File: `packages/core/src/routes/admin-faq.ts`
  - New file: full FAQ admin CRUD (list, create, edit, delete, reorder)
- File: `packages/core/src/routes/api-faq.ts`
  - New file: public FAQ API endpoints (`/api/faq`, `/api/faq/categories`)
- File: `packages/core/src/templates/pages/admin-faq-form.template.ts`
  - New file: FAQ create/edit form template with Catalyst styling
- File: `packages/core/src/templates/pages/admin-faq-list.template.ts`
  - New file: FAQ list page template with category grouping
- File: `packages/core/src/routes/admin-forms.ts`
  - Added form submissions route with real JOIN-based count
  - Clickable submission count, auto-open detail if single submission
- File: `packages/core/src/routes/public-forms.ts`
  - Public form API with CORS support
- File: `packages/core/src/templates/pages/admin-forms-builder.template.ts`
  - Complete Catalyst styling overhaul, dark mode fix, delete confirmation dialog, dialog scroll fix
- File: `packages/core/src/templates/pages/admin-forms-list.template.ts`
  - Submissions badge now links to submissions page
- File: `packages/core/src/routes/admin-plugins.ts`
  - Added OTP Login to AVAILABLE_PLUGINS registry
  - Added OTP Login install handler with default settings
  - Changed Discord link to GitHub Issues on plugins list
- File: `packages/core/src/templates/pages/admin-plugins-list.template.ts`
  - Discord → GitHub Issues link update
- File: `packages/core/src/app.ts`
  - Mounted FAQ admin and API routes
- File: `packages/core/src/routes/index.ts`
  - Exported FAQ route modules
- File: `packages/core/src/templates/icons.ts`
  - Added FAQ icon for sidebar
- File: `packages/core/src/templates/index.ts`
  - Exported FAQ templates
- File: `packages/core/src/templates/layouts/admin-layout-catalyst.template.ts`
  - Added FAQ nav link in admin sidebar
- File: `packages/core/src/db/migrations-bundle.ts`
  - Cleaned SonicJS references → Flare CMS
- File: `packages/site/src/pages/faq.astro`
  - New file: public FAQ page with accordion UI, category grouping
- File: `packages/site/src/pages/contact.astro`
  - New file: contact page with native form rendering from Form.io schema, Turnstile support
- File: `packages/site/src/layouts/Layout.astro`
  - Updated nav and footer with FAQ link
- File: `packages/site/src/data/homepage.ts`
  - Minor homepage data update

## Why

Part of the plugin audit on `feature/plugin-testing` branch. Three goals:
1. Build the FAQ plugin from scratch (admin CRUD + public API + Astro page)
2. Overhaul the Forms builder UI to match Catalyst design system with proper dark mode
3. Wire OTP Login into the admin plugins registry so it can be installed from the UI (code already existed, just wasn't visible)

## Issues Encountered

- Forms builder had classList.add('foo bar') bug — space-separated classes silently fail in classList.add, needed individual class additions
- Dialog scroll was broken on long form field lists — fixed with overflow-y-auto

## Dependencies

No dependencies added.

## Testing Notes

- FAQ admin CRUD tested manually through admin UI
- FAQ public API verified at `/api/faq` and `/api/faq/categories`
- Forms builder dark mode verified
- OTP Login: build passes, plugin appears in registry — full login flow testing deferred to after email plugin is configured
- Contact page Turnstile integration tested

## Next Steps

- [ ] Tier 3 cleanup: remove stub plugins (core-analytics, core-auth, core-media)
- [ ] Delete dead code (email-templates-plugin, design plugin)
- [ ] Clean ghost/duplicate DB entries
- [ ] Decide on Workflow Engine fate
- [ ] Mount testimonials + code-examples routes in app.ts

---

**Branch:** feature/plugin-testing
**Issue:** N/A
**Impact:** HIGH - new plugin, major UI overhaul, new public pages
