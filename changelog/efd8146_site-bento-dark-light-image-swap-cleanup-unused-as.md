# 2026-03-11 - feat(site): bento dark/light image swap, cleanup unused assets

**Keywords:** [feat] [auto-generated]
**Commit:** efd8146

## What Changed

 .gitignore                                         |   3 ++-
 .../core/src/templates/components/logo.template.ts |   2 +-
 packages/site/public/favicon-light.svg             |   1 +
 .../site/public/images/admin-content-dark.webp     | Bin 0 -> 81698 bytes
 .../site/public/images/admin-content-light.webp    | Bin 0 -> 81720 bytes
 .../site/public/images/admin-dashboard-light.webp  | Bin 0 -> 49208 bytes
 packages/site/public/images/admin-dashboard.webp   | Bin 0 -> 48464 bytes
 .../site/public/images/blog/cloudflare-workers.jpg | Bin 51361 -> 0 bytes
 packages/site/public/images/blog/desert-tech.jpg   | Bin 92117 -> 0 bytes
 .../site/public/images/blog/edge-computing.jpg     | Bin 53270 -> 0 bytes
 packages/site/public/images/blog/headless-cms.jpg  | Bin 78730 -> 0 bytes
 packages/site/public/images/pages/about.jpg        | Bin 101481 -> 0 bytes
 packages/site/public/images/pages/contact.jpg      | Bin 51502 -> 0 bytes
 packages/site/public/images/pages/uses.jpg         | Bin 40930 -> 0 bytes
 packages/site/src/components/CodeShowcase.astro    |  18 ++++++-------
 packages/site/src/components/Features.astro        |  14 ++++++++---
 packages/site/src/components/Hero.astro            |  28 +++++++++++----------
 packages/site/src/layouts/Layout.astro             |   3 ++-
 packages/site/src/styles/global.css                |   4 ++-
 screenshots/admin-api-reference.png                | Bin 300360 -> 0 bytes
 screenshots/admin-api-tokens.png                   | Bin 10409 -> 0 bytes
 screenshots/admin-cache.png                        | Bin 74861 -> 0 bytes
 screenshots/admin-code-examples.png                | Bin 65997 -> 0 bytes
 screenshots/admin-collections.png                  | Bin 114785 -> 0 bytes
 screenshots/admin-content-editor-blog.png          | Bin 137953 -> 0 bytes
 screenshots/admin-content-editor.png               | Bin 764212 -> 0 bytes
 screenshots/admin-content-list-blog.png            | Bin 255712 -> 0 bytes
 screenshots/admin-content-list-dark.png            | Bin 255436 -> 0 bytes
 screenshots/admin-content-list-docs.png            | Bin 255712 -> 0 bytes
 screenshots/admin-content-new.png                  | Bin 134464 -> 0 bytes
 screenshots/admin-dashboard-dark.png               | Bin 133263 -> 0 bytes
 screenshots/admin-dashboard.png                    | Bin 131275 -> 0 bytes
 screenshots/admin-database-tools.png               | Bin 10016 -> 0 bytes
 screenshots/admin-deploy-modal.png                 | Bin 124875 -> 0 bytes
 screenshots/admin-faq.png                          | Bin 110299 -> 0 bytes
 screenshots/admin-form-builder.png                 | Bin 332155 -> 0 bytes
 screenshots/admin-forms-list-dark.png              | Bin 72780 -> 0 bytes
 screenshots/admin-forms-list.png                   | Bin 72744 -> 0 bytes
 screenshots/admin-login.png                        | Bin 32639 -> 0 bytes
 screenshots/admin-logs.png                         | Bin 74755 -> 0 bytes
 screenshots/admin-media.png                        | Bin 158374 -> 0 bytes
 screenshots/admin-plugins-dark.png                 | Bin 319617 -> 0 bytes
 screenshots/admin-plugins.png                      | Bin 320312 -> 0 bytes
 screenshots/admin-schema-migrations.png            | Bin 58229 -> 0 bytes
 screenshots/admin-settings.png                     | Bin 76724 -> 0 bytes
 screenshots/admin-testimonials.png                 | Bin 123364 -> 0 bytes
 screenshots/admin-users.png                        | Bin 85349 -> 0 bytes
 screenshots/site-blog.png                          | Bin 63170 -> 0 bytes
 screenshots/site-contact.png                       | Bin 91027 -> 0 bytes
 screenshots/site-docs.png                          | Bin 117476 -> 0 bytes
 screenshots/site-faq.png                           | Bin 117692 -> 0 bytes
 screenshots/site-features.png                      | Bin 665297 -> 0 bytes
 screenshots/site-homepage.png                      | Bin 537467 -> 0 bytes
 53 files changed, 43 insertions(+), 30 deletions(-)

## Files

- `.gitignore`
- `packages/core/src/templates/components/logo.template.ts`
- `packages/site/public/favicon-light.svg`
- `packages/site/public/images/admin-content-dark.webp`
- `packages/site/public/images/admin-content-light.webp`
- `packages/site/public/images/admin-dashboard-light.webp`
- `packages/site/public/images/admin-dashboard.webp`
- `packages/site/public/images/blog/cloudflare-workers.jpg`
- `packages/site/public/images/blog/desert-tech.jpg`
- `packages/site/public/images/blog/edge-computing.jpg`
- `packages/site/public/images/blog/headless-cms.jpg`
- `packages/site/public/images/pages/about.jpg`
- `packages/site/public/images/pages/contact.jpg`
- `packages/site/public/images/pages/uses.jpg`
- `packages/site/src/components/CodeShowcase.astro`
- `packages/site/src/components/Features.astro`
- `packages/site/src/components/Hero.astro`
- `packages/site/src/layouts/Layout.astro`
- `packages/site/src/styles/global.css`
- `screenshots/admin-api-reference.png`
- `screenshots/admin-api-tokens.png`
- `screenshots/admin-cache.png`
- `screenshots/admin-code-examples.png`
- `screenshots/admin-collections.png`
- `screenshots/admin-content-editor-blog.png`
- `screenshots/admin-content-editor.png`
- `screenshots/admin-content-list-blog.png`
- `screenshots/admin-content-list-dark.png`
- `screenshots/admin-content-list-docs.png`
- `screenshots/admin-content-new.png`
- `screenshots/admin-dashboard-dark.png`
- `screenshots/admin-dashboard.png`
- `screenshots/admin-database-tools.png`
- `screenshots/admin-deploy-modal.png`
- `screenshots/admin-faq.png`
- `screenshots/admin-form-builder.png`
- `screenshots/admin-forms-list-dark.png`
- `screenshots/admin-forms-list.png`
- `screenshots/admin-login.png`
- `screenshots/admin-logs.png`
- `screenshots/admin-media.png`
- `screenshots/admin-plugins-dark.png`
- `screenshots/admin-plugins.png`
- `screenshots/admin-schema-migrations.png`
- `screenshots/admin-settings.png`
- `screenshots/admin-testimonials.png`
- `screenshots/admin-users.png`
- `screenshots/site-blog.png`
- `screenshots/site-contact.png`
- `screenshots/site-docs.png`
- `screenshots/site-faq.png`
- `screenshots/site-features.png`
- `screenshots/site-homepage.png`

---

**Branch:** feature/redesign-homepage
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
