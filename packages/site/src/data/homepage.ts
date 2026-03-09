export const features = [
  {
    icon: 'globe',
    title: 'Edge-Native',
    description: "Runs entirely on Cloudflare Workers. D1 for database, R2 for media, KV for cache. No origin server needed.",
  },
  {
    icon: 'layout-dashboard',
    title: 'Admin Dashboard',
    description: 'Built-in content management UI with Quill rich text editor, media uploads, collection management, and user authentication.',
  },
  {
    icon: 'code',
    title: 'API-First',
    description: 'RESTful JSON API with sorting and pagination. Scalar API docs at /docs. JWT authentication for protected routes.',
  },
  {
    icon: 'database',
    title: 'Schema Collections',
    description: 'Define content types with typed schemas. String, textarea, Quill rich text, media, select, datetime, and slug fields.',
  },
  {
    icon: 'git-branch',
    title: 'Workflow & Versioning',
    description: 'Draft, review, and publish workflow. Content versioning with history tracking. Scheduled publishing via cron triggers.',
  },
  {
    icon: 'puzzle',
    title: 'Any Frontend',
    description: 'Standard REST API works with any framework — Astro, React, Vue, Svelte, or vanilla JS. Fetch your content from anywhere.',
  },
]

export const stats = [
  { value: '<50ms', label: 'Global Latency' },
  { value: '300+', label: 'Edge Locations' },
  { value: '0', label: 'Cold Starts' },
  { value: '99.9%', label: 'Uptime' },
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
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
]
