# Feature Research

**Domain:** Edge-native headless CMS (SonicJS soft fork on Cloudflare Workers)
**Researched:** 2026-03-01
**Confidence:** MEDIUM-HIGH — Cross-referenced across multiple competitor docs, official Directus/SonicJS roadmaps, and industry checklists from 2025-2026.

---

## Context: What We're Doing

This is a **soft fork of SonicJS v2.8.0** targeting agency clients via 915website.com. The baseline already exists: CRUD, 3 collections, Quill editor, HTMX admin, plugin system, two-tier caching, Scalar docs.

The question is: what's needed to take this from "developer demo" to "client-deployable production CMS"?

Research sources: Directus features page (50+ features), SonicJS official roadmap, 2026 comparisons of Strapi/Directus/Payload, dotCMS developer checklist, Hygraph checklist, kernelics.com comparison guide.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every agency client assumes exist. Missing these causes immediate rejection or "this feels unfinished."

| Feature | Why Expected | Complexity | Current Status | Notes |
|---------|--------------|------------|----------------|-------|
| Working API filters | Every frontend query uses filters; broken = devs can't build | MEDIUM | BROKEN in v2.8.0 | Known bug — `filter[field][op]=value` ignored server-side. Fix is prerequisite for all else. |
| Role-based access control (RBAC) | Agencies need client editors who can't delete schema | MEDIUM | Partial/insecure | SonicJS has users but permissions are not granular at field or collection level |
| Draft / Published states | Content editors expect to work on drafts without publishing | LOW-MEDIUM | Partial — one-way bug | "Published" is irreversible in v2.8.0; unpublish doesn't work |
| Content versioning + rollback | Clients will accidentally destroy content and need to undo | MEDIUM | Partial — revisions tracked but rollback UX is rough | Version modal doesn't close (known bug #666) |
| Media library with organization | Images/files need to be browsable, sortable, filterable | MEDIUM | Basic R2 upload exists | PDF upload broken (#622), no folder organization |
| Webhooks (outgoing) | Frontend frameworks (Astro, Next.js) need cache invalidation triggers | LOW | On roadmap but not verified as working | Critical for JAMstack deployments |
| Content scheduling (publish at) | Marketing needs to publish at specific times | LOW-MEDIUM | Listed as feature on roadmap | Requires reliable cron/scheduled trigger on Workers |
| Audit log | Agencies need "who changed what and when" for client accountability | MEDIUM | Listed as complete in roadmap | Needs verification that it's surfaced in admin UI |
| Secure JWT auth with proper scoping | Production auth must have token expiry, refresh, scoped tokens | MEDIUM | Basic JWT exists | No refresh token flow, no read-only tokens for frontend |
| Field-level validation | Data integrity: required, min/max, regex patterns | LOW | Basic "required" works | No regex validation, no custom validators |
| API pagination + sorting | Any content list query needs limit/offset and sort | LOW | Exists but broken due to filter bug | Fix filter bug, verify pagination works |
| Slug uniqueness enforcement | Duplicate slugs cause 404s on frontend | LOW | Unknown — likely not enforced | Standard expectation |
| Content unpublish | Published content must be un-publishable | LOW | BROKEN — one-way bug | Must fix; clients will need this |
| SEO meta fields | Title, description, canonical per content item | LOW | Configurable via schema fields | Not a system feature, but needs documented pattern |

### Differentiators (Competitive Advantage)

Features that make the CMS stand out. Not expected on day one, but valued and remembered.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Edge-native performance (sub-100ms globally) | 6x faster than Node/Express; built into Cloudflare's 300+ edge locations | N/A (already built) | This is the primary competitive moat — lean into it |
| TypeScript-native client SDK with auto-generated types | Frontend devs get type safety from CMS schema — Payload's killer feature | HIGH | SonicJS issue #642 tracks this; Payload does it natively. High value for agency clients. |
| Live content preview in admin | Editors see changes before publishing without leaving CMS | HIGH | Requires iframe bridge to frontend; Strapi has this; useful for agency clients |
| Multi-tenant / organization support | One CMS install serving multiple agency clients (915website.com use case) | HIGH | SonicJS roadmap: 20% complete. Critical for agency scale. |
| Internationalization (i18n) | Multi-language content for international clients | MEDIUM-HIGH | SonicJS roadmap: 0% started. Directus does this natively. |
| Webhook + Flows visual automation | Visual builder for content-triggered automations (publish → rebuild → notify) | HIGH | Directus "Flows" is a differentiator. Complex to build but powerful. |
| GraphQL API | Flexibility for complex frontend queries; preferred by some developers | HIGH | SonicJS roadmap mid-term. Directus/Strapi both have it. |
| Zero-cost CDN via R2 | No egress fees for media delivery when using Cloudflare R2 | LOW (already exists) | Marketing differentiator over traditional CMS hosting |
| Plugin ecosystem | Third-party extensions without core changes | MEDIUM (foundation exists) | 22 hooks exist; needs documentation and published community plugins |
| AI content assistance | AI-generated content, auto-tagging, translation suggestions | HIGH | SonicJS roadmap near-term. More marketing value than real utility in 2026. |
| Two-factor authentication (2FA) | Security for agency admins managing client sites | LOW-MEDIUM | SonicJS roadmap near-term. Table stakes for enterprise but differentiator for smaller CMS. |
| Content calendar view | Editorial teams want to see scheduled content on a calendar UI | MEDIUM | SonicJS roadmap mid-term. Genuinely useful for marketing teams. |
| Import/Export (JSON, CSV) | Bulk content operations; migration between environments | LOW-MEDIUM | Directus has this. Useful for client onboarding. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that clients ask for but that create more problems than they solve for a small-team / single-dev context.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Real-time collaborative editing (WebSocket) | "Google Docs for content" sounds great | WebSocket on Cloudflare Workers is constrained; Durable Objects required; complexity is massive for marginal benefit in a CMS | Use content locking (optimistic locking) instead — simpler and good enough for 99% of teams |
| Full WYSIWYG page builder | Clients want drag-and-drop like WordPress | Tight coupling between design and content model; creates "HeroWithTwoButtonsLeft" content types that become unmaintainable; design-driven content modeling is a documented anti-pattern (Sanity blog) | Use structured content fields + a component library on the frontend; editors fill in data, developers control presentation |
| MACH composability (best-of-breed everything) | "Future-proof" architecture | Integration chaos, operational overload, unclear ROI per industry analysis from 2025; over-engineering for flexibility that isn't used | Opinionated defaults with extension points; SonicJS's plugin system already covers this |
| Built-in ecommerce | Some clients will ask for it | Ecommerce is a vertical product, not a CMS feature; maintaining it conflicts with headless philosophy | Recommend separate ecommerce platform (Shopify, Commerce.js) connected via API |
| Generative AI content creation as core feature | AI hype; clients ask for "write my blog posts" | AI output quality in CMSs is mediocre; creates liability for factual errors; better as optional plugin | Keep as plugin/optional; don't make it a core workflow |
| TinyMCE / rich text requiring API keys | Rich text editing is needed | TinyMCE in SonicJS requires external API key; adds dependency and cost | Already decided: use Quill editor. This is the right call. |
| Multi-database support (MySQL, Postgres, etc.) | "What if I want Postgres?" | Workers + D1 is the deployment constraint; multi-DB adds complexity with no benefit in this architecture | Embrace D1/SQLite. The edge-native constraint is a feature, not a bug. |
| Headless e-mail marketing / newsletter features | Clients bundle this with "CMS" | Separate concern; purpose-built tools do it better | Point to Mailchimp, Buttondown, etc. via webhooks |

---

## Feature Dependencies

```
[Broken API filters fix]
    └──required by──> [Content scheduling] (can't query scheduled items)
    └──required by──> [Search functionality] (filtering is prerequisite)
    └──required by──> [Frontend SDK] (SDK generates typed queries that hit filter API)

[RBAC / Roles & Permissions]
    └──required by──> [Multi-tenancy] (tenant isolation requires permission scoping)
    └──required by──> [Content workflows] (approve/reject requires role differentiation)
    └──enhances──> [Audit log] (logs are more useful when tied to roles)

[Draft/Publish fix (unpublish)]
    └──required by──> [Content workflows] (workflow states = draft → review → published)
    └──required by──> [Content scheduling] (schedule requires setting future publish, implies unpublish)

[Content versioning (stable)]
    └──enhances──> [Content workflows] (reviewers need to see version diffs)

[Webhooks (outgoing, reliable)]
    └──required by──> [Frontend cache invalidation] (Astro site needs rebuild triggers)
    └──required by──> [Visual automation / Flows] (webhooks are the action primitive)

[Secure JWT auth]
    └──required by──> [Read-only API tokens for frontend] (public frontends need scoped access)
    └──required by──> [2FA] (2FA layered on top of auth, not replacing it)

[Media library (stable)]
    └──required by──> [Import/Export] (media references must resolve in exports)
    └──enhances──> [TypeScript SDK] (typed media fields in SDK)
```

### Dependency Notes

- **API filter fix is the unblocking prerequisite.** Almost every downstream feature assumes filters work. This must be Phase 1.
- **RBAC must precede multi-tenancy.** You can't scope tenants without scoping permissions first.
- **Draft/publish reliability must precede content workflows.** Workflows are just structured state transitions; if the states themselves are buggy, workflows can't work.
- **Webhooks are a force multiplier.** Once reliable webhooks exist, teams can wire up external triggers without touching the CMS core. High priority for agency deployments.

---

## MVP Definition

This is a "subsequent milestone" — the CMS already exists with basic CRUD. MVP here means "production-deployable for a real agency client."

### Launch With (v1 — Production-Deployable)

Minimum needed before 915website.com can hand a CMS to a client:

- [ ] **API filter fix** — Without this, no reliable content querying
- [ ] **Content unpublish** — Clients will need to hide content; one-way publish is a dealbreaker
- [ ] **Granular RBAC** — Client editors need write access; client admins need collection config; agency needs superadmin
- [ ] **Reliable media library** — PDF upload, folder organization, stable selection (no reset bug)
- [ ] **Outgoing webhooks** — Astro frontend needs rebuild triggers on publish
- [ ] **Stable content versioning UI** — Modal close bug must be fixed; rollback must work
- [ ] **Secure JWT with refresh tokens** — Production auth requires token refresh, not just login

### Add After Validation (v1.x)

Add these once the first client is live and patterns are validated:

- [ ] **TypeScript SDK / auto-generated types** — Huge DX win; reduces frontend integration bugs; add when a second frontend (not just Astro) needs connecting
- [ ] **Content scheduling** — Marketing teams want this; add when first client asks
- [ ] **i18n / localization** — Add when first international client engagement happens; don't build speculatively
- [ ] **Live preview** — Complex to wire up; add when client feedback identifies it as friction point
- [ ] **Import/Export** — Add when client onboarding from another CMS becomes real need

### Future Consideration (v2+)

Features with real value but high complexity, low urgency:

- [ ] **Multi-tenancy** — Only needed when managing 3+ clients on one instance; build when the scale justifies it
- [ ] **GraphQL API** — Only needed if a client frontend team specifically requires it (they'll tell you)
- [ ] **Visual workflow automation (Flows)** — Powerful but complex; not needed until teams outgrow webhooks
- [ ] **Content calendar** — Nice UX improvement; defer until editorial team grows
- [ ] **WebSocket real-time collaboration** — Durable Objects complexity; defer indefinitely unless a team actually needs simultaneous editing

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| API filter fix | HIGH | MEDIUM | P1 — blocking everything else |
| Content unpublish | HIGH | LOW | P1 — dealbreaker bug |
| Granular RBAC | HIGH | MEDIUM | P1 — required for client handoff |
| Reliable media library | HIGH | MEDIUM | P1 — broken uploads block content entry |
| Outgoing webhooks | HIGH | LOW | P1 — frontend cache invalidation |
| Stable versioning UI | MEDIUM | LOW | P1 — fixes existing feature |
| Secure JWT / refresh tokens | HIGH | MEDIUM | P1 — production auth requirement |
| TypeScript SDK | HIGH | HIGH | P2 — major DX win, build after core is solid |
| Content scheduling | MEDIUM | LOW-MEDIUM | P2 — common client request |
| Live preview | MEDIUM | HIGH | P2 — nice but complex |
| i18n/localization | MEDIUM | HIGH | P2 — build when needed |
| Import/Export | LOW-MEDIUM | MEDIUM | P3 — useful but not urgent |
| Multi-tenancy | HIGH (long-term) | HIGH | P3 — build when scale demands |
| GraphQL API | LOW-MEDIUM | HIGH | P3 — only if clients ask |
| Content calendar | LOW | MEDIUM | P3 — editorial UX improvement |

---

## Competitor Feature Analysis

Reference: Strapi, Directus, Payload, Sanity (the four platforms clients may compare SonicJS against).

| Feature | Strapi | Directus | Payload | Sanity | SonicJS (target) |
|---------|--------|----------|---------|--------|-----------------|
| REST API | Yes | Yes | Yes | No (CDN API) | Yes |
| GraphQL API | Plugin | Yes | Yes | Yes (GROQ) | Roadmap |
| RBAC | Yes (granular) | Yes (field-level) | Yes (function-based) | Yes | Partial |
| Content versioning | Yes (v5+) | Yes | Yes | Yes | Partial |
| Draft/publish | Yes | Yes | Yes | Yes | Broken (one-way) |
| Content scheduling | Yes | Yes | Yes | Yes | Roadmap |
| Outgoing webhooks | Yes | Yes (Flows) | Yes | Yes | Needs verification |
| Media library | Yes (image opt) | Yes (S3/R2/etc) | Yes | Yes (CDN) | Basic |
| i18n/localization | Yes (plugin) | Yes (native) | Yes | Yes | 0% started |
| Audit log | Enterprise | Yes | Yes | Yes | Listed as complete |
| Live preview | Yes | No | Yes | Yes | Not started |
| TypeScript SDK | Community | Yes | Yes (Local API) | Yes | Requested (#585) |
| Plugin system | Yes (500+) | Yes (Marketplace) | None | None | Yes (22 hooks) |
| Edge-native | No | No | Yes (Workers) | No | Yes (primary moat) |
| Multi-tenancy | Enterprise | Yes | No | No | Roadmap (20%) |
| Self-hostable | Yes | Yes | Yes | No | Yes |
| Zero-cost media egress | No | No | No | No | Yes (R2) |

**Key insight:** SonicJS's edge-native architecture and R2 media delivery are genuinely differentiated. No other mainstream open-source CMS runs natively on Cloudflare Workers with zero-egress-cost media. The gap is in production reliability (bugs) and editorial polish (workflow states, versioning UX).

---

## Sources

- Directus Features official page: https://directus.io/features (HIGH confidence — official docs)
- SonicJS Official Roadmap: https://sonicjs.com/roadmap (HIGH confidence — official roadmap)
- SonicJS GitHub Issues: https://github.com/lane711/sonicjs/issues (HIGH confidence — observed bugs)
- dasroot.net 2026 CMS comparison (Strapi/Directus/Payload): https://dasroot.net/posts/2026/01/headless-cms-comparison-strapi-directus-payload/ (MEDIUM confidence — well-sourced blog)
- kernelics.com feature comparison guide: https://kernelics.com/blog/headless-cms-comparison-guide (MEDIUM confidence — comparative analysis)
- dotCMS headless CMS developer checklist: https://www.dotcms.com/blog/the-headless-cms-checklist-for-developers (MEDIUM confidence — vendor perspective but comprehensive)
- Sanity blog on design-driven content modeling anti-pattern: https://www.sanity.io/blog/why-design-driven-content-modeling-creates-technical-debt (MEDIUM confidence — vendor but applies universally)
- Cloudflare blog on Payload on Workers: https://blog.cloudflare.com/payload-cms-workers/ (HIGH confidence — official Cloudflare)
- Hygraph headless CMS checklist: https://hygraph.com/learn/headless-cms/headless-cms-checklist (MEDIUM confidence — vendor checklist)
- Strapi vs Directus vs Payload 2025 (Glukhov blog): https://www.glukhov.org/post/2025/11/headless-cms-comparison-strapi-directus-payload/ (MEDIUM confidence)

---

*Feature research for: Edge-native headless CMS (SonicJS fork)*
*Researched: 2026-03-01*
