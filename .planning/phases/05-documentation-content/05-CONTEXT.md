# Phase 5: Documentation Content - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Author all 8 documentation sections with substantive technical content, seed via a reproducible API script, and provide a TS prompt generator that outputs an LLM-ready prompt for any Flare CMS schema. The seed script uses CMS API by default with a D1 direct fallback for fast local resets.

</domain>

<decisions>
## Implementation Decisions

### Content depth & tone
- Casual & friendly tone — like Supabase or Remix docs. Conversational, uses "you", occasional personality
- Concise with context — commands listed with brief explanations, assumes developer comfort with terminal/git/npm
- API Reference uses endpoint + example pairs format — each endpoint gets description, request example, response example (like Stripe docs)
- All endpoints documented — complete API surface, no omissions
- Known bugs documented honestly with warning/caution callouts and workarounds (e.g., "Known issue: filters are broken, use client-side filtering")

### Seed script workflow
- Default: CMS REST API (pass URL as arg — localhost or production). Goes through full CMS pipeline, proves dogfooding
- Fallback: `--direct` flag for fast local D1 inserts when iterating
- Idempotency strategy: Claude's discretion based on CMS API capabilities
- Content stored as markdown files with frontmatter in a `content/` directory in the repo — readable, reviewable, git-tracked
- Seed script reads .md files and pushes to CMS

### Prompt generator
- TypeScript file that reads the current Flare CMS schema (collections, fields, relationships) and generates a PROMPT.md
- Output is an LLM-ready markdown file any developer can feed to Claude Code, Gemini CLI, Codex CLI, etc.
- Prompt knows the schema, tables, and API surface — user just feeds it to their tool to generate seed content for their specific use case
- Works for any schema structure — docs site, blog, image gallery, etc.

### Content sourcing & accuracy
- Real API code snippets from the actual codebase, plus authored examples showing how to customize for various schemas/structures
- Self-contained examples — each doc page has complete, copy-pasteable code, no need to dig into source
- Code examples reflect the current FlareCMS API surface

### Section structure & ordering
- 8 sections as defined in roadmap requirements
- Section ordering: Claude decides based on natural learning progression
- Page count per section: varies by content needs — no forced uniformity. One page if that's enough, many pages if the topic demands it
- Every section has a landing page with substantive overview — teaches the high-level concept and links to detail pages. Useful even without clicking through

### Claude's Discretion
- Idempotency approach for seed script (wipe & reseed vs upsert)
- Exact page breakdown per section — driven by content needs
- Section ordering based on learning progression
- Whether conceptual sections include code examples (per-section decision)
- Prompt generator implementation details (how it reads schema, output format)

</decisions>

<specifics>
## Specific Ideas

- "Show real API, then show how to customize it" — every code example should demonstrate both the actual usage and adaptability
- Dogfooding philosophy: seed script goes through the CMS API to prove the system works end-to-end
- Prompt generator makes Flare CMS instantly accessible to any developer using AI coding tools — zero onboarding friction
- Content should be accurate against the actual codebase, not aspirational

</specifics>

<deferred>
## Deferred Ideas

- `flare generate-prompt` as a proper CLI command in core — for now it's a standalone TS file in the repo
- Automated content drift detection (comparing docs examples against actual source) — future tooling
- Interactive API playground / try-it-out feature — separate phase

</deferred>

---

*Phase: 05-documentation-content*
*Context gathered: 2026-03-08*
