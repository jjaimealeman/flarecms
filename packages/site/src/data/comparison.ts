export interface CMSComparison {
  slug: string
  name: string
  tagline: string
  website: string
  logo: string // emoji fallback
  color: string // tailwind color class
  category: 'headless' | 'traditional' | 'git-based'
  openSource: boolean
  selfHosted: boolean
  astroIntegration: 'native' | 'api' | 'plugin' | 'none'
  cloudflareNative: boolean
  summary: string
  strengths: string[]
  weaknesses: string[]
  pricing: string
  scores: {
    edgePerformance: number // 1-5
    astroIntegration: number
    selfHosting: number
    developerExperience: number
    contentModeling: number
    mediaHandling: number
  }
  details: {
    hosting: string
    database: string
    media: string
    api: string
    adminUI: string
    auth: string
    caching: string
    deployment: string
  }
}

export const competitors: CMSComparison[] = [
  {
    slug: 'payload',
    name: 'Payload CMS',
    tagline: 'The most powerful TypeScript CMS',
    website: 'https://payloadcms.com',
    logo: '🎯',
    color: 'blue',
    category: 'headless',
    openSource: true,
    selfHosted: true,
    astroIntegration: 'api',
    cloudflareNative: false,
    summary: 'Payload is a powerful, code-first TypeScript CMS with deep customization. However, it requires Node.js and cannot run on Cloudflare Workers. Its Next.js-centric admin UI adds significant weight.',
    strengths: [
      'Deep TypeScript integration with code-first config',
      'Powerful access control and field-level permissions',
      'Rich plugin ecosystem (SEO, form builder, redirects)',
      'Self-hosted with full data ownership',
      'Built-in draft/publish workflow',
    ],
    weaknesses: [
      'Requires Node.js server — no edge runtime support',
      'Heavy admin UI (Next.js bundle)',
      'Complex setup for simple use cases',
      'No native Cloudflare Workers deployment',
      'MongoDB, Postgres, or SQLite required — no embedded database',
    ],
    pricing: 'Free (MIT). Cloud hosting plans from $25/mo.',
    scores: {
      edgePerformance: 1,
      astroIntegration: 3,
      selfHosting: 4,
      developerExperience: 4,
      contentModeling: 5,
      mediaHandling: 3,
    },
    details: {
      hosting: 'Node.js server (Express/Next.js). Self-hosted or Payload Cloud.',
      database: 'MongoDB, PostgreSQL, or SQLite. No embedded option.',
      media: 'Local disk + cloud adapters (S3, R2, GCS, Azure, Vercel Blob).',
      api: 'REST + GraphQL. Auto-generated from schema.',
      adminUI: 'Built-in React/Next.js admin. Highly customizable.',
      auth: 'Built-in with JWT. Email/password, API keys.',
      caching: 'Application-level. No built-in edge cache.',
      deployment: 'Docker, VPS, or Payload Cloud. No Workers support.',
    },
  },
  {
    slug: 'tinacms',
    name: 'TinaCMS',
    tagline: 'Visual editing for your content',
    website: 'https://tina.io',
    logo: '🦙',
    color: 'orange',
    category: 'git-based',
    openSource: true,
    selfHosted: true,
    astroIntegration: 'plugin',
    cloudflareNative: false,
    summary: 'TinaCMS offers Git-based visual editing with a unique inline editing experience. It works with Astro but relies on a separate GraphQL backend and Git for content storage — not designed for edge deployment.',
    strengths: [
      'Visual/inline editing directly on your site',
      'Git-backed content — version control built in',
      'Good Astro integration via @tinacms/astro',
      'Self-hostable with tina-self-hosted package',
      'Strong Markdown/MDX support',
    ],
    weaknesses: [
      'Requires separate GraphQL backend service',
      'Git-based storage adds latency for dynamic content',
      'Self-hosting is complex (MongoDB + auth provider needed)',
      'No edge runtime support',
      'Tina Cloud required for easiest setup',
    ],
    pricing: 'Free tier (2 users). Team plans from $29/mo.',
    scores: {
      edgePerformance: 2,
      astroIntegration: 4,
      selfHosting: 3,
      developerExperience: 4,
      contentModeling: 3,
      mediaHandling: 2,
    },
    details: {
      hosting: 'Tina Cloud (hosted) or self-hosted with Node.js + MongoDB.',
      database: 'Git (files) + MongoDB for indexing. No embedded option.',
      media: 'Git repo, Cloudinary, or S3.',
      api: 'GraphQL only. Auto-generated from schema.',
      adminUI: 'Inline visual editor overlaid on your site.',
      auth: 'Tina Cloud auth or custom (self-hosted).',
      caching: 'Static at build time. No runtime edge cache.',
      deployment: 'Frontend anywhere, backend on Node.js or Tina Cloud.',
    },
  },
  {
    slug: 'keystatic',
    name: 'Keystatic',
    tagline: 'Content management for your codebase',
    website: 'https://keystatic.com',
    logo: '🔑',
    color: 'purple',
    category: 'git-based',
    openSource: true,
    selfHosted: true,
    astroIntegration: 'plugin',
    cloudflareNative: false,
    summary: 'Keystatic by Thinkmill is a Git-based CMS with great Astro support via @keystatic/astro. It stores content as files in your repo. Simple and developer-friendly, but limited to file-based content and no edge runtime.',
    strengths: [
      'Zero-dependency file-based content (YAML/JSON/Markdoc)',
      'Official @keystatic/astro integration',
      'Clean, modern admin UI with real-time preview',
      'Content lives in your Git repo — full version control',
      'Excellent developer experience and TypeScript support',
    ],
    weaknesses: [
      'File-based only — no database for dynamic content',
      'No REST/GraphQL API for external consumers',
      'GitHub API required for production editing',
      'No edge runtime support',
      'Limited to static/SSG sites for best results',
    ],
    pricing: 'Free (MIT). Keystatic Cloud (GitHub integration) free.',
    scores: {
      edgePerformance: 2,
      astroIntegration: 5,
      selfHosting: 4,
      developerExperience: 5,
      contentModeling: 3,
      mediaHandling: 2,
    },
    details: {
      hosting: 'No server needed — reads/writes files in your repo.',
      database: 'None. Files stored as YAML, JSON, or Markdoc in repo.',
      media: 'Git repo (public directory). No CDN or R2.',
      api: 'File system reader API. No REST/GraphQL.',
      adminUI: 'Built-in React admin. Clean and lightweight.',
      auth: 'GitHub OAuth for production editing.',
      caching: 'Static files. Build-time only.',
      deployment: 'Any static host. Admin needs GitHub API access.',
    },
  },
  {
    slug: 'studiocms',
    name: 'StudioCMS',
    tagline: 'CMS built for Astro',
    website: 'https://studiocms.dev',
    logo: '🎬',
    color: 'indigo',
    category: 'headless',
    openSource: true,
    selfHosted: true,
    astroIntegration: 'native',
    cloudflareNative: false,
    summary: 'StudioCMS is the closest competitor — a CMS built specifically for Astro using Astro DB (libSQL). It has native Astro integration but relies on Astro DB (Turso) for hosting, not Cloudflare. It is Astro-first but not edge-native.',
    strengths: [
      'Built natively for Astro — deepest integration',
      'Supports libSQL (Turso), MySQL, and PostgreSQL',
      'Astro integration package for zero-config setup',
      'Active development and community',
      'Dashboard built as Astro pages',
    ],
    weaknesses: [
      'Not Cloudflare native — no D1/R2 support',
      'No R2 for media — relies on external storage',
      'Younger project with fewer battle-tested deployments',
      'No Cloudflare Workers deployment option',
      'Limited plugin ecosystem compared to established CMS',
    ],
    pricing: 'Free (MIT). Astro DB free tier, then Turso pricing.',
    scores: {
      edgePerformance: 3,
      astroIntegration: 5,
      selfHosting: 3,
      developerExperience: 4,
      contentModeling: 3,
      mediaHandling: 2,
    },
    details: {
      hosting: 'Astro SSR on any host. Database via Astro DB (Turso).',
      database: 'libSQL (Turso), MySQL, or PostgreSQL. Not Cloudflare D1.',
      media: 'External providers. No built-in storage.',
      api: 'Astro content loader. Internal API only.',
      adminUI: 'Built-in Astro dashboard pages.',
      auth: 'Astro Auth integration. Multiple providers.',
      caching: 'Astro built-in. No KV edge cache.',
      deployment: 'Any Astro host. Not Cloudflare Workers native.',
    },
  },
  {
    slug: 'cloudcannon',
    name: 'CloudCannon',
    tagline: 'The CMS for your Git workflow',
    website: 'https://cloudcannon.com',
    logo: '🏔️',
    color: 'teal',
    category: 'git-based',
    openSource: false,
    selfHosted: false,
    astroIntegration: 'plugin',
    cloudflareNative: false,
    summary: 'CloudCannon is a polished, commercial Git-based CMS with excellent Astro support. Great visual editing and team collaboration, but it is proprietary, cloud-only, and cannot be self-hosted.',
    strengths: [
      'Excellent visual/inline editing experience',
      'Strong Astro SSG support with live preview',
      'Great team collaboration and publishing workflows',
      'Beautiful, polished admin interface',
      'Bookshop component-based page building',
    ],
    weaknesses: [
      'Proprietary — not open source',
      'Cannot be self-hosted — cloud only',
      'No free tier — starts at $55/mo',
      'Optimized for SSG, limited SSR support',
      'No API for headless use cases',
    ],
    pricing: 'Paid only (from $55/mo). 21-day free trial.',
    scores: {
      edgePerformance: 2,
      astroIntegration: 4,
      selfHosting: 0,
      developerExperience: 4,
      contentModeling: 3,
      mediaHandling: 3,
    },
    details: {
      hosting: 'CloudCannon hosting only. Git-based builds.',
      database: 'None. Markdown/YAML files in Git.',
      media: 'CloudCannon DAM or external providers.',
      api: 'No headless API. Git file access only.',
      adminUI: 'Proprietary visual editor. Industry-leading UX.',
      auth: 'CloudCannon accounts. SSO available on enterprise.',
      caching: 'CDN for built sites. No runtime cache.',
      deployment: 'CloudCannon builds and hosts. Output to Cloudflare optional.',
    },
  },
  {
    slug: 'storyblok',
    name: 'Storyblok',
    tagline: 'The headless CMS that empowers teams',
    website: 'https://storyblok.com',
    logo: '📦',
    color: 'emerald',
    category: 'headless',
    openSource: false,
    selfHosted: false,
    astroIntegration: 'plugin',
    cloudflareNative: false,
    summary: 'Storyblok is a popular headless CMS with visual editing and a component-based content model. Official Astro integration exists, but it is proprietary, cloud-only, and your data lives on their servers.',
    strengths: [
      'Visual editor with real-time preview',
      'Component-based content modeling (nested blocks)',
      'Official @storyblok/astro integration',
      'Strong internationalization support',
      'Asset management with built-in CDN',
    ],
    weaknesses: [
      'Proprietary — not open source',
      'Cannot be self-hosted — vendor lock-in',
      'Pricing scales with usage ($99/mo for teams)',
      'Your content lives on their servers',
      'No Cloudflare-native deployment',
    ],
    pricing: 'Free (1 user, 1 space). Business from $99/mo.',
    scores: {
      edgePerformance: 2,
      astroIntegration: 4,
      selfHosting: 0,
      developerExperience: 4,
      contentModeling: 5,
      mediaHandling: 4,
    },
    details: {
      hosting: 'Storyblok Cloud only. Multi-region available.',
      database: 'Proprietary. No direct database access.',
      media: 'Built-in asset manager with Cloudflare CDN.',
      api: 'REST + GraphQL + Management API.',
      adminUI: 'Proprietary visual editor. Component-based.',
      auth: 'Storyblok accounts. SSO on enterprise plans.',
      caching: 'CDN layer. Stale-while-revalidate.',
      deployment: 'Frontend anywhere. CMS always on Storyblok Cloud.',
    },
  },
  {
    slug: 'sanity',
    name: 'Sanity',
    tagline: 'The composable content platform',
    website: 'https://sanity.io',
    logo: '🔴',
    color: 'red',
    category: 'headless',
    openSource: false,
    selfHosted: false,
    astroIntegration: 'api',
    cloudflareNative: false,
    summary: 'Sanity is a powerful, real-time headless CMS with a highly customizable React-based studio. It has a strong developer community and GROQ query language, but it is proprietary and cannot be self-hosted.',
    strengths: [
      'Real-time collaboration with presence indicators',
      'GROQ — powerful query language for content',
      'Highly customizable React-based Studio',
      'Strong developer community and ecosystem',
      'Structured content with references and validation',
    ],
    weaknesses: [
      'Proprietary content lake — no data ownership',
      'Cannot be self-hosted',
      'Complex pricing model (API CDN requests, datasets)',
      'No native Astro integration (REST/GROQ only)',
      'Studio requires React knowledge to customize',
    ],
    pricing: 'Free (20 users, 250k API req/mo). Growth from $15/user/mo.',
    scores: {
      edgePerformance: 3,
      astroIntegration: 3,
      selfHosting: 0,
      developerExperience: 5,
      contentModeling: 5,
      mediaHandling: 4,
    },
    details: {
      hosting: 'Sanity Cloud only. Global CDN for content.',
      database: 'Proprietary "Content Lake". No direct access.',
      media: 'Built-in asset pipeline with transformations.',
      api: 'GROQ + GraphQL. Real-time listeners.',
      adminUI: 'Sanity Studio (React). Fully customizable.',
      auth: 'Sanity accounts. Google, GitHub SSO.',
      caching: 'Global CDN. Real-time updates.',
      deployment: 'Studio anywhere. Content always on Sanity Cloud.',
    },
  },
]

export const flareScores = {
  edgePerformance: 5,
  astroIntegration: 5,
  selfHosting: 5,
  developerExperience: 4,
  contentModeling: 4,
  mediaHandling: 5,
}

export const scoreLabels: Record<string, string> = {
  edgePerformance: 'Edge Performance',
  astroIntegration: 'Astro Integration',
  selfHosting: 'Self-Hosting',
  developerExperience: 'Developer Experience',
  contentModeling: 'Content Modeling',
  mediaHandling: 'Media Handling',
}

export const categoryLabels: Record<string, string> = {
  headless: 'Headless CMS',
  traditional: 'Traditional CMS',
  'git-based': 'Git-based CMS',
}
