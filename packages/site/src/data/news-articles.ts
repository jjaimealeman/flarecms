export interface StaticNewsArticle {
  slug: string
  title: string
  category: 'technology' | 'business' | 'general'
  author: string
  date: string
  content: string
}

export const newsArticles: StaticNewsArticle[] = [
  {
    slug: 'cloudflare-d1-ga-what-it-means',
    title: 'Cloudflare D1 is GA — What It Means for Flare CMS',
    category: 'technology',
    author: 'Jaime Aleman',
    date: '2026-03-01',
    content: `
<p>Cloudflare D1 has officially reached General Availability, and that's great news for Flare CMS. D1 is the SQLite-based database that powers every Flare CMS installation — storing collections, content, users, workflow state, and audit logs.</p>

<h2>What GA Means</h2>
<p>D1 has been in beta since 2022. With GA status, Cloudflare is committing to production-grade reliability, performance SLAs, and long-term support. For Flare CMS users, this means:</p>
<ul>
<li><strong>Reliability</strong> — Production SLA backing for your content database</li>
<li><strong>Performance</strong> — Continued improvements to read/write latency at the edge</li>
<li><strong>Durability</strong> — Automatic backups and point-in-time recovery</li>
<li><strong>Scale</strong> — Higher storage limits and row counts</li>
</ul>

<h2>No Migration Needed</h2>
<p>If you're already running Flare CMS, there's nothing to change. D1 GA is backwards compatible with the beta. Your existing database, migrations, and Drizzle ORM schema all continue to work exactly as before.</p>

<h2>Looking Ahead</h2>
<p>D1 GA unlocks features we've been waiting for — particularly larger database sizes and improved replication. As D1 evolves, Flare CMS will take advantage of new capabilities to deliver even faster content queries globally.</p>
`,
  },
  {
    slug: 'astro-5-ssr-cloudflare-pages',
    title: 'Astro 5 SSR on Cloudflare Pages: Lessons Learned',
    category: 'technology',
    author: 'Jaime Aleman',
    date: '2026-02-25',
    content: `
<p>Running Astro 5 in SSR mode on Cloudflare Pages has been a core part of the Flare CMS frontend from day one. Here are the lessons learned during development.</p>

<h2>The PUBLIC_ Prefix Gotcha</h2>
<p>This one cost us a production outage. In Cloudflare Pages, Astro's <code>import.meta.env</code> only works for variables prefixed with <code>PUBLIC_</code>. Without the prefix, your environment variable is silently <code>undefined</code> at runtime — even if it's set in <code>wrangler.jsonc</code>.</p>
<p>Our API URL was set as <code>FLARE_API_URL</code> instead of <code>PUBLIC_FLARE_API_URL</code>. The site deployed, the Worker was healthy, but every API call failed with "fetch failed" because the URL was empty.</p>

<h2>No Sharp at Runtime</h2>
<p>Cloudflare Workers don't support the Sharp image processing library at runtime. If you need image optimization, either handle it at build time (with <code>imageService: "compile"</code>) or use Cloudflare Images.</p>

<h2>SSR Means No getStaticPaths()</h2>
<p>With <code>output: 'server'</code>, every page is rendered on request. Dynamic routes like <code>[slug].astro</code> don't need <code>getStaticPaths()</code> — they just read the slug from <code>Astro.params</code> and fetch the content.</p>
<p>This simplifies the codebase significantly. No build-time data fetching, no incremental regeneration. Just fetch and render.</p>

<h2>Wrangler JSON Config</h2>
<p>Cloudflare Pages supports <code>wrangler.jsonc</code> for configuration. This is where you define your environment variables and bindings. The JSONC format allows comments, which is helpful for documenting what each binding does.</p>
`,
  },
  {
    slug: 'flarecms-dev-domain-live',
    title: 'flarecms.dev is Live',
    category: 'general',
    author: 'Jaime Aleman',
    date: '2026-02-28',
    content: `
<p>The Flare CMS project now has its own domain: <strong>flarecms.dev</strong>.</p>

<h2>Domain Setup</h2>
<ul>
<li><strong>flarecms.dev</strong> — Points to the Astro frontend on Cloudflare Pages</li>
<li><strong>admin.flarecms.dev</strong> — Points to the CMS Worker backend on Cloudflare Workers</li>
</ul>
<p>Both are configured as custom domains in the Cloudflare dashboard with automatic SSL.</p>

<h2>Why .dev?</h2>
<p>The <code>.dev</code> TLD is perfect for developer tools. It enforces HTTPS by default (it's on the HSTS preload list), the registration cost is reasonable at $12.20/year, and it immediately signals that this is a developer-focused project.</p>

<h2>What's at Each URL</h2>
<p>Visit <strong>flarecms.dev</strong> and you'll see the public site — homepage, blog, news, documentation. This is the Astro frontend consuming the CMS API.</p>
<p>Visit <strong>admin.flarecms.dev</strong> and you'll hit the CMS backend — the admin dashboard at <code>/admin</code>, the API at <code>/api/*</code>, and the Scalar API docs at <code>/docs</code>.</p>
`,
  },
]

export function getStaticNewsArticle(slug: string): StaticNewsArticle | undefined {
  return newsArticles.find(a => a.slug === slug)
}

export function getAllStaticNewsArticles(): StaticNewsArticle[] {
  return newsArticles
}
