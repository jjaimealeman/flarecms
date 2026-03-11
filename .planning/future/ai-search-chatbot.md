# AI-Powered Search & Chatbot — Flare CMS

## Overview

Built-in semantic search and AI chatbot for Flare CMS sites. Uses Cloudflare Workers AI + Vectorize — no external APIs, no OpenAI keys, no extra infrastructure. Everything runs on the same Cloudflare account as the CMS.

**This is a killer differentiator.** No CMS on the market (Payload, Sanity, Storyblok, TinaCMS, Keystatic, CloudCannon, StudioCMS) ships built-in AI search or a chatbot widget. They all punt to third-party integrations.

## What It Does

### 1. Semantic Search
User searches "how do I upload images" → finds the media documentation even if those exact words don't appear. Searches by **meaning**, not keywords.

### 2. AI Chatbot Widget
`<FlareChatbot />` component. Visitor asks a question, AI answers using your actual site content as context. Cites sources with links. Like having a knowledgeable support agent who's read every page on your site.

### 3. Related Content
"You might also like..." at the bottom of every page, powered by actual content similarity — not manual tags or random suggestions.

### 4. Smart Admin Search
In the admin UI, search across ALL content (posts, docs, pages, settings, media descriptions) with natural language.

## Architecture

```
                    BUILD/SAVE TIME
                    ══════════════
Content saved in CMS
        ↓
Workers AI embedding model (bge-base-en-v1.5)
        ↓
Vector stored in Vectorize (with D1 content ID as metadata)
        ↓
        ✓ Ready for search


                    QUERY TIME (Search)
                    ═══════════════════
User types query
        ↓
Workers AI embeds the query → vector
        ↓
Vectorize finds nearest content vectors
        ↓
D1 lookup for full content → return results


                    QUERY TIME (Chatbot)
                    ════════════════════
Visitor asks question
        ↓
Workers AI embeds question → vector
        ↓
Vectorize finds top 5 relevant content chunks
        ↓
Workers AI text generation model (llama-3.1-8b-instruct)
  + system prompt: "Answer using only the provided context"
  + context: the 5 content chunks
        ↓
Streamed response with source citations
```

## Cloudflare Services Used

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Workers AI** | Generate embeddings + chatbot responses | 10,000 neurons/day |
| **Vectorize** | Store and query content vectors | 10M vectors, 100 indexes |
| **D1** | Already have it — stores content | Already in use |
| **Workers** | Already have it — runs the CMS | Already in use |

### Recommended Models

**Embeddings:** `@cf/baai/bge-base-en-v1.5` — 768 dimensions, fast, good quality, free tier
**Chatbot:** `@cf/meta/llama-3.1-8b-instruct` — 8B params, good for RAG, conversational
**Alternative embeddings:** `@cf/google/embedding-gemma-300m` — newer, 100+ languages

## Wrangler Bindings

```toml
# Add to packages/cms/wrangler.toml
[ai]
binding = "AI"

[[vectorize]]
binding = "VECTORIZE"
index_name = "flare-content-index"
```

## Components to Build

### 1. Content Indexing Pipeline (Core)
- Hook into content save/update/delete in the CMS
- On save: chunk content → embed each chunk → upsert to Vectorize
- On delete: remove vectors from Vectorize
- Metadata per vector: `{ contentId, collection, path, title, chunk_index }`
- Chunking strategy: ~500 tokens per chunk with overlap

### 2. Search API Endpoint
```
GET /api/search?q=how+do+I+upload+images&limit=10
```
- Embeds query → Vectorize similarity search → D1 content lookup
- Returns ranked results with relevance scores
- Falls back to keyword search if AI unavailable

### 3. Chatbot API Endpoint
```
POST /api/chat
{ "message": "How do I configure authentication?", "history": [...] }
```
- RAG (Retrieval-Augmented Generation) pattern
- Embeds question → finds relevant chunks → feeds to LLM with system prompt
- Streams response via SSE (Server-Sent Events)
- Cites sources: "Based on [Authentication Docs](/docs/authentication)"

### 4. `<FlareSearch />` Astro Component
- Drop-in search bar with instant results
- Replaces basic keyword search
- Shows results as user types (debounced)
- Reads `PUBLIC_FLARE_API_URL` from env

### 5. `<FlareChatbot />` Astro Component
- Floating chat widget (bottom-right corner)
- Expandable chat interface
- Streaming responses with typing indicator
- Source citations with links
- Conversation history within session
- Customizable: colors, position, welcome message
- ~2KB gzipped

### 6. Admin UI — Analytics + Index Management
- `/admin/ai` page showing:
  - Total indexed content chunks
  - Search queries log (what are people searching for?)
  - Chatbot conversations log
  - Re-index button (rebuild all vectors)
  - Index health/status

## Content Chunking Strategy

Large content (blog posts, docs) needs to be split into chunks for effective retrieval:

```
"Authentication in Flare CMS" (3000 words)
  → Chunk 1: "Password Hashing — Flare CMS uses bcrypt..." (500 tokens)
  → Chunk 2: "Authentication Middleware — Every request..." (500 tokens)
  → Chunk 3: "Session Management — JWT tokens are..." (500 tokens)
  → Each chunk embedded separately, all linked to parent content ID
```

## Privacy & Safety

- Chatbot answers ONLY from your content (RAG — no hallucination about unrelated topics)
- System prompt enforces: "If the answer isn't in the provided context, say so"
- No visitor data sent to third parties
- Search queries can be logged in D1 for analytics (opt-in)
- All processing happens on Cloudflare's network

## User Experience

### Site Visitor
1. Sees search bar or chat widget on the site
2. Types a question in natural language
3. Gets instant, accurate answers sourced from actual site content
4. Clicks through to full articles

### CMS Admin
1. Content is automatically indexed when saved
2. Admin dashboard shows what people are searching for
3. Can re-index content manually if needed
4. Can disable AI features per-site if not wanted

## Phased Rollout

### Phase 1 — Semantic Search
- Vectorize binding + indexing pipeline
- Search API endpoint
- `<FlareSearch />` component
- Admin re-index button

### Phase 2 — AI Chatbot
- Chat API endpoint with RAG
- `<FlareChatbot />` component
- Streaming responses
- Source citations

### Phase 3 — Smart Features
- Related content suggestions
- Auto-tagging/categorization
- Admin-side smart search
- Search analytics dashboard

## Branch

`feature/ai-search-chatbot` (off develop, after analytics feature)

## Why This Is Huge

1. **Zero config for users** — it's a binding + component, not a SaaS integration
2. **No API keys** — Workers AI is part of your Cloudflare account
3. **No extra cost** — free tiers cover most CMS use cases
4. **Data ownership** — vectors live in YOUR Vectorize index
5. **Edge performance** — queries resolve on Cloudflare's network, not a round-trip to OpenAI
6. **Competitors can't match this** — they're not on Cloudflare, so they can't use these primitives natively
