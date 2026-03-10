export const features = [
  {
    icon: 'globe',
    title: 'Edge-native Performance',
    description: 'Runs on Cloudflare Workers across 330+ locations. Sub-50ms latency globally with zero cold starts.',
  },
  {
    icon: 'database',
    title: 'D1 + R2 + KV',
    description: "Cloudflare's native storage trifecta. D1 for database, R2 for media, KV for fast caching.",
  },
  {
    icon: 'puzzle',
    title: 'Plugin Architecture',
    description: 'Extend functionality with a robust plugin system. Custom fields, hooks, and middleware integration.',
  },
  {
    icon: 'layout-dashboard',
    title: 'Built-in Admin UI',
    description: 'Manage content with an included admin dashboard. Rich text editing, media library, and user management out of the box.',
  },
]

export const comparisonRows = [
  { feature: 'Cold Starts', traditional: 'Common (500ms+)', flare: 'Zero', flareHighlight: true },
  { feature: 'Pricing', traditional: 'Expensive Tiered', flare: 'Free Tier Included', flareHighlight: true },
  { feature: 'Global Distribution', traditional: 'Region-based', flare: '330+ Locations', flareHighlight: true },
  { feature: 'Infrastructure', traditional: 'External Servers', flare: 'Cloudflare Native', flareHighlight: true },
  { feature: 'Database', traditional: 'External (Postgres/MySQL)', flare: 'D1 (Built-in)', flareHighlight: true },
  { feature: 'Media Storage', traditional: 'S3 / External', flare: 'R2 (Built-in)', flareHighlight: true },
]

export const stats = [
  { value: '<50ms', label: 'Global Latency' },
  { value: '330+', label: 'Edge Locations' },
  { value: '0', label: 'Cold Starts' },
  { value: '99.95%', label: 'Uptime SLA' },
]

export const blogPosts = [
  {
    category: 'Getting Started',
    categoryColor: 'flare',
    title: 'Getting Started with Flare CMS',
    excerpt: 'Set up your headless CMS on Cloudflare Workers with D1, R2, and a built-in admin dashboard.',
    date: '2026-03-02',
    slug: 'getting-started-with-flare-cms',
  },
  {
    category: 'Tutorial',
    categoryColor: 'cyan',
    title: 'Building an Astro Frontend',
    excerpt: 'Connect your Astro SSR site to the Flare CMS API running on Cloudflare Workers.',
    date: '2026-03-01',
    slug: 'building-an-astro-frontend',
  },
  {
    category: 'Announcement',
    categoryColor: 'amber',
    title: 'Flare CMS v1.0 Released',
    excerpt: "Forked from SonicJS and rebuilt as a monorepo. Here's what changed and why.",
    date: '2026-02-28',
    slug: 'flare-cms-v1-released',
  },
]

export const codeSchema = `import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'blog-posts',
  displayName: 'Blog Posts',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Title', required: true },
      slug: { type: 'slug', title: 'URL Slug' },
      excerpt: { type: 'textarea', title: 'Excerpt' },
      content: { type: 'quill', title: 'Content' },
      featuredImage: { type: 'media', title: 'Image' },
      author: { type: 'string', title: 'Author' },
    },
    required: ['title', 'slug', 'content', 'author']
  },
  listFields: ['title', 'author', 'status'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc'
} satisfies CollectionConfig`

export const codeResponse = `GET /api/collections/blog-posts/content

{
  "data": [
    {
      "id": "content-blog-posts-d13a588a",
      "title": "Deploying to the Edge",
      "slug": "deploying-to-the-edge",
      "status": "published",
      "data": {
        "title": "Deploying to the Edge",
        "content": "<p>Your content here...</p>",
        "slug": "deploying-to-the-edge",
        "author": "Jaime Aleman"
      },
      "created_at": 1770192000000,
      "updated_at": 1770192000000
    }
  ],
  "meta": {
    "count": 1,
    "timestamp": "2026-03-02T00:00:00Z",
    "cache": { "hit": true, "source": "kv" }
  }
}`

export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Docs', href: '/docs' },
  { label: 'Features', href: '/features' },
  { label: 'Comparison', href: '/comparison' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
]
