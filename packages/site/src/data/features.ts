export interface Feature {
  icon: string
  title: string
  description: string
  color: string
  status?: 'stable' | 'beta' | 'coming-soon'
}

export interface AnalyticsComparison {
  feature: string
  ga: string
  plausible: string
  umami: string
  flare: string
  flareHighlight?: boolean
}

// === Hero differentiators (top 3 selling points) ===

export const differentiators = [
  {
    icon: 'astro',
    title: 'Built for Astro',
    description: 'Native Content Layer loader, Astro collections schema, and SSR on Cloudflare Pages. Not a generic CMS bolted on — purpose-built for the Astro DX.',
    color: 'flare',
  },
  {
    icon: 'edge',
    title: 'Edge-native on Cloudflare',
    description: 'Runs on Cloudflare Workers across 330+ locations. D1 database, R2 media storage, KV caching — zero external services, zero cold starts.',
    color: 'cyan',
  },
  {
    icon: 'plugins',
    title: 'Plugin-first Architecture',
    description: '15 built-in plugins with a full SDK for building your own. Hooks, middleware, custom routes, admin pages — extend everything.',
    color: 'purple',
  },
]

// === Core features grid ===

export const coreFeatures: Feature[] = [
  {
    icon: 'layout-dashboard',
    title: 'Admin Dashboard',
    description: 'Full-featured admin UI with rich text editing, media library, user management, and content workflows. Lucide icons, WordPress-style sidebar, sticky save bar.',
    color: 'cyan',
    status: 'stable',
  },
  {
    icon: 'file-text',
    title: 'Content Versioning',
    description: 'Full version history with one-click rollback. Track every change with who, what, and when. Side-by-side diff comparison.',
    color: 'emerald',
    status: 'stable',
  },
  {
    icon: 'workflow',
    title: 'Content Workflows',
    description: 'Multi-stage approval pipelines: Draft → Review → Approved → Published. Role-based permissions at every stage with audit trail.',
    color: 'amber',
    status: 'stable',
  },
  {
    icon: 'image',
    title: 'Media Library',
    description: 'R2-backed storage with folder organization, tagging, thumbnails, and bulk operations. Drag-and-drop uploads with progress tracking.',
    color: 'flare',
    status: 'stable',
  },
  {
    icon: 'file-input',
    title: 'Forms Engine',
    description: 'Dynamic form submissions with status workflow (pending, reviewed, approved, spam). UTM tracking, file attachments, and spam detection.',
    color: 'purple',
    status: 'beta',
  },
  {
    icon: 'mail',
    title: 'Email Templates',
    description: 'Themed email system with variable substitution, Markdown templates, and preview mode. Resend integration with queue-based delivery.',
    color: 'rose',
    status: 'beta',
  },
  {
    icon: 'key',
    title: 'Auth & API Tokens',
    description: 'JWT auth with RBAC (admin, editor, author, viewer). Scoped API tokens with per-collection permissions and expiration. OTP passwordless login.',
    color: 'emerald',
    status: 'stable',
  },
  {
    icon: 'book-open',
    title: 'REST API + Docs',
    description: 'Auto-generated CRUD endpoints with Scalar API documentation. Rate limiting, CORS, pagination, filtering, and field selection.',
    color: 'blue',
    status: 'stable',
  },
  {
    icon: 'shield',
    title: 'Security',
    description: 'CSRF protection, input sanitization, security headers, Turnstile CAPTCHA integration. OWASP Top 10 compliance built in.',
    color: 'cyan',
    status: 'stable',
  },
  {
    icon: 'database',
    title: 'Database Tools',
    description: 'Drizzle ORM with D1. Bundled migrations, schema evolution tracking, seed data generation, and admin database tools.',
    color: 'amber',
    status: 'stable',
  },
  {
    icon: 'code',
    title: '34+ Field Types',
    description: 'String, number, boolean, date, rich text (Quill/TinyMCE/MDX), media, select, multiselect, JSON, blocks, references, slug, and more.',
    color: 'purple',
    status: 'stable',
  },
  {
    icon: 'webhook',
    title: 'Webhooks & Automation',
    description: 'HMAC-signed webhook delivery with retry and exponential backoff. Rule-based automation triggers for email, state changes, and more.',
    color: 'flare',
    status: 'stable',
  },
]

// === AI Search feature details ===

export const aiSearchDetails = {
  title: 'AI-Powered Search',
  description: 'Semantic search powered by Cloudflare Vectorize and Workers AI. Traditional keyword search plus RAG-powered intelligent retrieval across all your content.',
  capabilities: [
    'Semantic search with embeddings',
    'Traditional full-text keyword search',
    'Auto-indexing across collections',
    'Autocomplete suggestions',
    'Search analytics tracking',
    'RAG service for AI-powered answers',
  ],
  status: 'beta' as const,
}

// === Analytics comparison ===

export const analyticsComparison: AnalyticsComparison[] = [
  { feature: 'Self-hosted', ga: '✗', plausible: 'Optional', umami: '✓', flare: '✓', flareHighlight: true },
  { feature: 'Cookie-free', ga: '✗', plausible: '✓', umami: '✓', flare: '✓', flareHighlight: true },
  { feature: 'No external scripts', ga: '✗', plausible: '✗', umami: '✗', flare: '✓', flareHighlight: true },
  { feature: 'Edge-computed', ga: '✗', plausible: '✗', umami: '✗', flare: '✓', flareHighlight: true },
  { feature: 'Built into CMS', ga: '✗', plausible: '✗', umami: '✗', flare: '✓', flareHighlight: true },
  { feature: 'GDPR-compliant', ga: 'With consent', plausible: '✓', umami: '✓', flare: '✓', flareHighlight: true },
  { feature: 'Free tier', ga: '✓', plausible: '✗', umami: 'Self-host', flare: '✓', flareHighlight: true },
  { feature: 'Additional cost', ga: 'Free*', plausible: 'From $9/mo', umami: 'Free / $9/mo+', flare: '$0', flareHighlight: true },
]

export const analyticsTracking = [
  'Page views and unique visitors',
  'Referral sources and UTM parameters',
  'Device, browser, and OS breakdown',
  'Geographic location (country/region)',
  'Top pages and content performance',
  'API usage and cache hit ratios',
  'Custom event tracking',
  'Real-time dashboard',
]

// === Roadmap ===

export const roadmap = [
  {
    title: 'Ecommerce Plugin',
    description: 'Products, categories, cart, orders, and payment processing — all running on the edge.',
    quarter: 'Q2 2026',
  },
  {
    title: 'GraphQL API',
    description: 'Optional GraphQL layer alongside REST. Query exactly the fields you need.',
    quarter: 'Q3 2026',
  },
  {
    title: 'Internationalization (i18n)',
    description: 'Multi-language content with locale-aware routing and translation workflows.',
    quarter: 'Q3 2026',
  },
  {
    title: 'Real-time Collaboration',
    description: 'WebSocket-powered live editing with presence indicators and conflict resolution.',
    quarter: 'Q4 2026',
  },
]
