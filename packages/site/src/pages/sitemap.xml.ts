import type { APIRoute } from 'astro'
import { getDocsSections, getDocsPages } from '../lib/flare'

interface SitemapUrl {
  loc: string
  priority: string
  changefreq: string
}

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString().replace(/\/$/, '') || 'https://flare-site.pages.dev'

  // Static pages
  const staticPages: SitemapUrl[] = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/docs', priority: '0.9', changefreq: 'weekly' },
    { loc: '/blog', priority: '0.8', changefreq: 'weekly' },
    { loc: '/terms', priority: '0.2', changefreq: 'yearly' },
    { loc: '/privacy', priority: '0.2', changefreq: 'yearly' },
    { loc: '/code-of-conduct', priority: '0.2', changefreq: 'yearly' },
  ]

  // Dynamic docs pages (fetched from CMS API)
  let docsUrls: SitemapUrl[] = []

  try {
    const [sections, docs] = await Promise.all([
      getDocsSections(),
      getDocsPages(),
    ])

    docsUrls = docs.map((doc) => {
      const section = sections.find((s) => s.id === doc.data.section)
      const sectionSlug = section?.data.slug || section?.slug || ''
      const pageSlug = doc.data.slug || doc.slug
      return {
        loc: `/docs/${sectionSlug}/${pageSlug}`,
        priority: '0.7',
        changefreq: 'monthly',
      }
    })
  } catch {
    // CMS API unavailable -- return sitemap with static pages only
  }

  const allUrls = [...staticPages, ...docsUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>
    <loc>${siteUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
