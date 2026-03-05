export interface StaticBlogPost {
  slug: string
  title: string
  excerpt: string
  category: string
  categoryColor: string
  author: string
  date: string
  readTime: string
  content: string
}

export const blogPosts: StaticBlogPost[] = [
  {
    slug: 'getting-started-with-flare-cms',
    title: 'Getting Started with Flare CMS',
    excerpt: 'Set up your headless CMS on Cloudflare Workers with D1, R2, and a built-in admin dashboard.',
    category: 'Getting Started',
    categoryColor: 'flare',
    author: 'Jaime Aleman',
    date: '2026-03-02',
    readTime: '5 min read',
    content: `
<h2>What is Flare CMS?</h2>
<p>Flare CMS is an open-source headless content management system built to run entirely on <strong>Cloudflare Workers</strong>. It uses D1 for database storage, R2 for media files, and KV for caching — no origin server required.</p>
<p>Forked from <a href="https://flarecms.dev">Flare CMS</a> and rebuilt as a pnpm monorepo, Flare CMS gives you a complete CMS backend with a built-in admin UI, RESTful API, and Astro frontend — all deployed to the edge.</p>

<h2>Prerequisites</h2>
<ul>
<li>Node.js 20+</li>
<li>pnpm (not npm or yarn)</li>
<li>A Cloudflare account (free tier works)</li>
<li>Wrangler CLI installed globally or via npx</li>
</ul>

<h2>Quick Setup</h2>
<p>Clone the repository and install dependencies:</p>
<pre><code>git clone https://github.com/jjaimealeman/flarecms
cd flarecms
pnpm install</code></pre>

<p>Build the core package (required before the CMS or site can run):</p>
<pre><code>pnpm build</code></pre>
<p>This produces <code>packages/core/dist/</code> with 8 entry points: index, services, middleware, routes, templates, plugins, utils, and types.</p>

<h2>Start the CMS Locally</h2>
<pre><code>cd packages/cms
wrangler dev</code></pre>
<p>Your CMS is now running at <code>http://localhost:8787</code>. Visit <code>/admin</code> for the dashboard and <code>/docs</code> for the Scalar API documentation.</p>

<h2>Project Structure</h2>
<p>Flare CMS is organized as a pnpm monorepo with three packages:</p>
<ul>
<li><strong>packages/core</strong> — The engine. Collections, API routes, admin UI templates, database schema, and migrations. Built with tsup.</li>
<li><strong>packages/cms</strong> — The Cloudflare Worker backend. Your collection configs, custom middleware, and wrangler.toml bindings live here.</li>
<li><strong>packages/site</strong> — The Astro 5 frontend. SSR on Cloudflare Pages, consuming the CMS API.</li>
</ul>

<h2>Defining Your First Collection</h2>
<p>Collections are defined as plain TypeScript objects with <code>satisfies CollectionConfig</code>:</p>
<pre><code>import type { CollectionConfig } from '@flare-cms/core'

export default {
  name: 'blog-posts',
  displayName: 'Blog Posts',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Title', required: true },
      slug: { type: 'slug', title: 'URL Slug' },
      content: { type: 'quill', title: 'Content' },
      featuredImage: { type: 'media', title: 'Image' },
    },
    required: ['title', 'slug', 'content']
  },
  listFields: ['title', 'status'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc'
} satisfies CollectionConfig</code></pre>

<h2>What's Next</h2>
<p>Once your CMS is running, you can:</p>
<ul>
<li>Create content through the admin dashboard at <code>/admin</code></li>
<li>Fetch content via the REST API at <code>/api/collections/{name}/content</code></li>
<li>Deploy to production with <code>wrangler deploy --env production</code></li>
<li>Connect an Astro frontend to render your content at the edge</li>
</ul>
`,
  },
  {
    slug: 'building-an-astro-frontend',
    title: 'Building an Astro Frontend',
    excerpt: 'Connect your Astro SSR site to the Flare CMS API running on Cloudflare Workers.',
    category: 'Tutorial',
    categoryColor: 'cyan',
    author: 'Jaime Aleman',
    date: '2026-03-01',
    readTime: '7 min read',
    content: `
<h2>Why Astro?</h2>
<p>Astro is a natural fit for Flare CMS. Both run on Cloudflare — the CMS as a Worker, the frontend as Pages. Astro's SSR mode with the <code>@astrojs/cloudflare</code> adapter means your pages are rendered at the edge, right next to your CMS data.</p>
<p>The result: sub-50ms page loads globally, with no client-side JavaScript required for content pages.</p>

<h2>Setting Up the API Client</h2>
<p>Create a typed API client at <code>src/lib/flare.ts</code>:</p>
<pre><code>const API_URL = import.meta.env.PUBLIC_FLARE_API_URL || 'http://localhost:8787'

interface FlareResponse&lt;T&gt; {
  data: T
  meta: {
    count: number
    timestamp: string
    cache: { hit: boolean, source: string }
  }
}

export async function getBlogPosts(): Promise&lt;BlogPost[]&gt; {
  const response = await fetch(
    \`\${API_URL}/api/collections/blog-posts/content\`
  )
  const result: FlareResponse&lt;BlogPost[]&gt; = await response.json()
  return result.data.filter(post =&gt; post.status === 'published')
}</code></pre>

<h2>Important: The PUBLIC_ Prefix</h2>
<p>When running on Cloudflare Pages, environment variables must use the <code>PUBLIC_</code> prefix for Astro to inline them at build time. Without it, <code>import.meta.env.FLARE_API_URL</code> will be <code>undefined</code> at runtime.</p>
<p>Set this in your <code>wrangler.jsonc</code>:</p>
<pre><code>{
  "vars": {
    "PUBLIC_FLARE_API_URL": "https://admin.flarecms.dev"
  }
}</code></pre>

<h2>Creating Routes</h2>
<p>Astro's file-based routing makes it simple. For a blog listing page:</p>
<pre><code>// src/pages/blog/index.astro
---
import { getBlogPosts } from '../../lib/flare'
import Layout from '../../layouts/Layout.astro'

const posts = await getBlogPosts()
---

&lt;Layout title="Blog"&gt;
  {posts.map(post =&gt; (
    &lt;a href={\`/blog/\${post.data.slug}\`}&gt;
      &lt;h2&gt;{post.data.title}&lt;/h2&gt;
    &lt;/a&gt;
  ))}
&lt;/Layout&gt;</code></pre>

<h2>Client-Side Filtering</h2>
<p>One thing to be aware of: the Flare CMS API's filter parameters are currently broken (inherited from Flare CMS v2.8.0). Query parameters like <code>?filter[status][equals]=published</code> are ignored server-side.</p>
<p>The workaround is simple — fetch all content and filter in your API client:</p>
<pre><code>return result.data.filter(post =&gt; post.status === 'published')</code></pre>

<h2>Deploying to Cloudflare Pages</h2>
<p>Build and deploy in one command:</p>
<pre><code>pnpm run build
wrangler pages deploy ./dist --branch main</code></pre>
<p>Or let GitHub Actions handle it — push to main and CI/CD does the rest.</p>
`,
  },
  {
    slug: 'flare-cms-v1-released',
    title: 'Flare CMS v1.0 Released',
    excerpt: "Forked from Flare CMS and rebuilt as a monorepo. Here's what changed and why.",
    category: 'Announcement',
    categoryColor: 'amber',
    author: 'Jaime Aleman',
    date: '2026-02-28',
    readTime: '4 min read',
    content: `
<h2>The Birth of Flare CMS</h2>
<p>Flare CMS started as a fork of <a href="https://flarecms.dev">Flare CMS v2.8.0</a>, an excellent headless CMS for Cloudflare Workers. After months of building on top of it — adding collections, fixing bugs, deploying to production — it became clear that the project had evolved enough to stand on its own.</p>

<h2>What Changed</h2>
<p>The migration from four separate repositories into one pnpm monorepo was the biggest structural change:</p>
<ul>
<li><strong>packages/core</strong> — Renamed from <code>@sonicjs-cms/core</code> to <code>@flare-cms/core</code>. All exports renamed: <code>createFlareApp</code>, <code>FlareConfig</code>, <code>FlareApp</code>, <code>FLARE_VERSION</code>. Old names kept as deprecated aliases.</li>
<li><strong>packages/cms</strong> — Cloudflare Worker backend with collection configs. Renamed to <code>flare-cms</code> on Cloudflare.</li>
<li><strong>packages/site</strong> — Astro 5 SSR frontend. Renamed to <code>flare-site</code> on Cloudflare Pages.</li>
</ul>

<h2>Admin UI Rebranding</h2>
<p>Every user-visible "Flare CMS" string in the admin dashboard, login page, API docs, and plugin system was updated. The version badge now shows <code>v1.0.0</code> instead of inheriting from upstream.</p>

<h2>CI/CD Pipeline</h2>
<p>GitHub Actions deploys automatically on push to <code>main</code>:</p>
<ol>
<li>Build the core package (produces 8 entry points via tsup)</li>
<li>Deploy the CMS Worker to Cloudflare (parallel)</li>
<li>Build and deploy the Astro site to Cloudflare Pages (parallel)</li>
</ol>
<p>Steps 2 and 3 run in parallel after the core build, cutting deploy time roughly in half.</p>

<h2>Custom Domains</h2>
<p>The project now runs on its own domain:</p>
<ul>
<li><strong>flarecms.dev</strong> — Public Astro site</li>
<li><strong>admin.flarecms.dev</strong> — CMS backend and admin dashboard</li>
</ul>

<h2>Known Issues</h2>
<p>Some bugs were inherited from Flare CMS v2.8.0 and remain in v1.0:</p>
<ul>
<li>API filter parameters are ignored server-side (must filter client-side)</li>
<li>Select field defaults don't pre-populate in the admin UI</li>
<li>Content status is one-way — can't unpublish once published</li>
<li>Soft-delete doesn't cascade to child records</li>
</ul>
<p>These will be addressed in future releases, either as fixes in <code>@flare-cms/core</code> or as upstream PRs to Flare CMS.</p>

<h2>What's Next</h2>
<p>The roadmap for v1.x includes:</p>
<ul>
<li>Full documentation site (dogfooding Flare CMS itself)</li>
<li>Fix the broken API filters</li>
<li>Redesigned admin UI (replacing the inherited Flare CMS look)</li>
<li>Image optimization via Cloudflare Images</li>
</ul>
`,
  },
]

export function getStaticBlogPost(slug: string): StaticBlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}

export function getAllStaticBlogPosts(): StaticBlogPost[] {
  return blogPosts
}
