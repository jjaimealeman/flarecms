# Phase 3: Media Pipeline + Caching - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make media uploads reliable for all file types including large files, serve media efficiently from the edge via Cache API, and wire KV cache for content API responses with write-through invalidation. No new media features (transforms, CDN pipeline) — just fix what's broken and add caching.

</domain>

<decisions>
## Implementation Decisions

### Upload experience
- No file type restrictions — R2 accepts whatever is uploaded
- Max upload size: Claude's Discretion (pick practical limit based on Workers constraints)
- Progress feedback: Claude's Discretion (pick based on what streaming implementation supports)
- Error handling on mid-upload failure: Claude's Discretion (pick most practical approach)

### Media serving rules
- URL strategy (hash-based vs original filenames): Claude's Discretion (pick most practical for R2 + Cache API)
- Image transforms: Claude's Discretion (determine what's practical within Workers constraints)
- Cache duration: Claude's Discretion (pick based on URL strategy — if hash-based, immutable; if original names, shorter TTL)
- Cache purge on delete: Claude's Discretion (pick based on caching strategy chosen)

### KV cache behavior
- What to cache: Claude's Discretion (determine what's worth caching based on access patterns)
- Invalidation granularity: Claude's Discretion (balance freshness vs simplicity)
- TTL safety net: Claude's Discretion (pick based on D1/KV reliability characteristics)
- Cache tiers: Claude's Discretion (evaluate whether memory tier adds meaningful value on Workers)

### Admin media management
- Media library: Claude's Discretion (determine what's practical within SonicJS admin patterns)
- File replacement: Claude's Discretion (pick based on cache invalidation strategy)
- Metadata display: Claude's Discretion (pick practical metadata based on what R2 provides)
- Bulk delete: Claude's Discretion (determine based on admin UI patterns already in place)

### Claude's Discretion
All four areas were delegated to Claude's judgment. User trusts Claude to make practical decisions based on:
- Workers runtime constraints (memory limits, execution time)
- R2 and Cache API capabilities
- Existing SonicJS admin patterns
- KV performance characteristics
- What produces a reliable, production-ready result

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants a working, reliable media pipeline and caching layer. Implementation details are fully delegated.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-media-pipeline-caching*
*Context gathered: 2026-03-02*
