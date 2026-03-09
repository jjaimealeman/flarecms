import matter from 'gray-matter'
import { glob } from 'glob'
import { readFileSync } from 'fs'
import { basename, dirname, resolve } from 'path'

/**
 * Seed script for documentation content
 *
 * Reads markdown files from content/docs/ and pushes them to the CMS API.
 *
 * Usage:
 *   npx tsx scripts/seed-docs.ts http://localhost:8787          # API mode (local)
 *   npx tsx scripts/seed-docs.ts https://flare-cms.jjaimealeman.workers.dev  # Production
 *   npx tsx scripts/seed-docs.ts --direct                       # Direct D1 mode
 */

const CONTENT_DIR = resolve(import.meta.dirname ?? '.', '..', 'content', 'docs')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeContent(raw: string): string {
  return raw.replace(/\r\n/g, '\n')
}

function log(msg: string) {
  console.log(`  ${msg}`)
}

function logStep(msg: string) {
  console.log(`\n=> ${msg}`)
}

// ---------------------------------------------------------------------------
// API mode
// ---------------------------------------------------------------------------

async function authenticate(baseUrl: string): Promise<string> {
  const email = process.env.FLARE_ADMIN_EMAIL ?? 'jjaimealeman@gmail.com'
  const password = process.env.FLARE_ADMIN_PASSWORD ?? ''

  logStep(`Authenticating as ${email}...`)

  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `Authentication failed (status ${res.status}): ${text}`
    )
  }

  const json = (await res.json()) as any
  const token = json.token
  if (!token) {
    throw new Error('Authentication succeeded but no token in response body.')
  }

  // Also check for auth_token cookie as fallback
  const setCookieHeader = res.headers.get('set-cookie') ?? ''
  const cookieMatch = setCookieHeader.match(/auth_token=([^;]+)/)

  log('Authenticated successfully')
  return token
}

async function getCollectionIds(
  baseUrl: string,
  jwt: string
): Promise<{ docsId: string; sectionsId: string }> {
  logStep('Fetching collection IDs...')

  const res = await fetch(`${baseUrl}/api/collections`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch collections: ${res.status}`)

  const json = (await res.json()) as any
  const list: any[] = json.data ?? json

  const docs = list.find((c: any) => c.name === 'docs')
  const sections = list.find((c: any) => c.name === 'docs-sections')

  if (!docs) throw new Error('Collection "docs" not found in CMS')
  if (!sections) throw new Error('Collection "docs-sections" not found in CMS')

  log(`docs collection: ${docs.id}`)
  log(`docs-sections collection: ${sections.id}`)

  return { docsId: docs.id, sectionsId: sections.id }
}

async function wipeExisting(
  baseUrl: string,
  jwt: string,
  docsId: string,
  sectionsId: string
) {
  logStep('Wiping existing docs content...')

  const headers = { Authorization: `Bearer ${jwt}` }

  // Delete pages first (FK references sections)
  const pagesRes = await fetch(
    `${baseUrl}/api/collections/docs/content?limit=1000`,
    { headers }
  )
  if (pagesRes.ok) {
    const pagesJson = (await pagesRes.json()) as any
    const pages: any[] = pagesJson.data ?? []
    for (const page of pages) {
      const delRes = await fetch(`${baseUrl}/api/content/${page.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!delRes.ok) {
        console.warn(`  Warning: failed to delete page ${page.id}: ${delRes.status}`)
      }
    }
    log(`Deleted ${pages.length} existing pages`)
  }

  // Then delete sections
  const sectionsRes = await fetch(
    `${baseUrl}/api/collections/docs-sections/content?limit=1000`,
    { headers }
  )
  if (sectionsRes.ok) {
    const sectionsJson = (await sectionsRes.json()) as any
    const sections: any[] = sectionsJson.data ?? []
    for (const section of sections) {
      const delRes = await fetch(`${baseUrl}/api/content/${section.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!delRes.ok) {
        console.warn(`  Warning: failed to delete section ${section.id}: ${delRes.status}`)
      }
    }
    log(`Deleted ${sections.length} existing sections`)
  }
}

async function createSectionsApi(
  baseUrl: string,
  jwt: string,
  sectionsCollectionId: string
): Promise<Map<string, string>> {
  logStep('Creating sections...')

  const slugToId = new Map<string, string>()
  const sectionFiles = await glob('*/_section.md', { cwd: CONTENT_DIR })

  // Sort by order field
  const sections: Array<{ file: string; data: any }> = []
  for (const file of sectionFiles) {
    const raw = readFileSync(resolve(CONTENT_DIR, file), 'utf-8')
    const parsed = matter(raw)
    sections.push({ file, data: parsed.data })
  }
  sections.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))

  for (const { data } of sections) {
    const payload = {
      collectionId: sectionsCollectionId,
      title: data.name,
      slug: data.slug,
      status: 'published',
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? '',
        order: data.order ?? 0,
      },
    }

    const res = await fetch(`${baseUrl}/api/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`  ERROR creating section "${data.name}": ${res.status} ${text}`)
      continue
    }

    const json = (await res.json()) as any
    const id = json.data?.id ?? json.id
    slugToId.set(data.slug, id)
    log(`Created section: ${data.name} (${id})`)
  }

  return slugToId
}

async function createPagesApi(
  baseUrl: string,
  jwt: string,
  docsCollectionId: string,
  slugToSectionId: Map<string, string>
): Promise<number> {
  logStep('Creating pages...')

  const pageFiles = await glob('**/*.md', {
    cwd: CONTENT_DIR,
    ignore: '**/_section.md',
  })

  let created = 0
  let errors = 0

  // Group by section and sort by order
  const pages: Array<{ file: string; data: any; content: string; sectionSlug: string }> = []
  for (const file of pageFiles) {
    const raw = readFileSync(resolve(CONTENT_DIR, file), 'utf-8')
    const parsed = matter(raw)
    const sectionSlug = basename(dirname(file))
    pages.push({
      file,
      data: parsed.data,
      content: normalizeContent(parsed.content),
      sectionSlug,
    })
  }
  pages.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))

  for (const page of pages) {
    const sectionId = slugToSectionId.get(page.sectionSlug)
    if (!sectionId) {
      console.error(`  ERROR: No section ID for slug "${page.sectionSlug}" (file: ${page.file})`)
      errors++
      continue
    }

    const payload = {
      collectionId: docsCollectionId,
      title: page.data.title ?? basename(page.file, '.md'),
      slug: page.data.slug ?? basename(page.file, '.md'),
      status: 'published',
      data: {
        title: page.data.title ?? basename(page.file, '.md'),
        slug: page.data.slug ?? basename(page.file, '.md'),
        excerpt: page.data.excerpt ?? '',
        content: page.content,
        section: sectionId,
        order: page.data.order ?? 0,
        status: 'published',
        lastUpdated: page.data.lastUpdated ?? new Date().toISOString(),
      },
    }

    const res = await fetch(`${baseUrl}/api/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`  ERROR creating page "${page.data.title}": ${res.status} ${text}`)
      errors++
      continue
    }

    created++
    log(`Created page: ${page.data.title} (${page.sectionSlug})`)
  }

  if (errors > 0) {
    console.warn(`\n  ${errors} page(s) failed to create`)
  }

  return created
}

async function runApiMode(baseUrl: string) {
  console.log(`\nFlare CMS Docs Seeder (API mode)`)
  console.log(`Target: ${baseUrl}`)

  const jwt = await authenticate(baseUrl)
  const { docsId, sectionsId } = await getCollectionIds(baseUrl, jwt)

  await wipeExisting(baseUrl, jwt, docsId, sectionsId)

  const slugToSectionId = await createSectionsApi(baseUrl, jwt, sectionsId)
  const pageCount = await createPagesApi(baseUrl, jwt, docsId, slugToSectionId)

  logStep('Summary')
  log(`Sections created: ${slugToSectionId.size}`)
  log(`Pages created: ${pageCount}`)
  console.log('\nDone!\n')
}

// ---------------------------------------------------------------------------
// Direct D1 mode
// ---------------------------------------------------------------------------

async function runDirectMode() {
  console.log(`\nFlare CMS Docs Seeder (Direct D1 mode)`)

  // Dynamic imports for D1 mode only
  const { getPlatformProxy } = await import('wrangler')
  const { createDb, content, collections } = await import('@flare-cms/core')
  const { eq } = await import('drizzle-orm')

  const { env, dispose } = await getPlatformProxy()

  if (!env?.DB) {
    console.error('ERROR: DB binding not found. Check wrangler.toml.')
    process.exit(1)
  }

  const db = createDb((env as any).DB)

  try {
    // Find collection IDs
    logStep('Fetching collection IDs...')
    const allCollections = await db.select().from(collections).all()
    const docsCollection = allCollections.find((c) => c.name === 'docs')
    const sectionsCollection = allCollections.find((c) => c.name === 'docs-sections')

    if (!docsCollection) throw new Error('Collection "docs" not found')
    if (!sectionsCollection) throw new Error('Collection "docs-sections" not found')

    log(`docs collection: ${docsCollection.id}`)
    log(`docs-sections collection: ${sectionsCollection.id}`)

    // Find admin user for authorId
    const { users } = await import('@flare-cms/core')
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .get()

    if (!adminUser) throw new Error('No admin user found in database')
    log(`Author: ${adminUser.email}`)

    // Wipe existing docs content
    logStep('Wiping existing docs content...')

    // Collect IDs of all docs-related content for FK cleanup
    const existingPages = await db
      .select()
      .from(content)
      .where(eq(content.collectionId, docsCollection.id))
      .all()
    const existingSections = await db
      .select()
      .from(content)
      .where(eq(content.collectionId, sectionsCollection.id))
      .all()

    const allIds = [...existingPages, ...existingSections].map((c) => c.id)

    // Delete FK-dependent records first (raw SQL for tables without Drizzle exports)
    if (allIds.length > 0) {
      const placeholders = allIds.map(() => '?').join(',')
      const fkTables = [
        'content_versions',
        'workflow_history',
        'content_relationships',
        'content_workflow_status',
        'scheduled_content',
        'auto_save_drafts',
      ]
      for (const table of fkTables) {
        try {
          await (env as any).DB.prepare(
            `DELETE FROM ${table} WHERE content_id IN (${placeholders})`
          )
            .bind(...allIds)
            .run()
        } catch {
          // Table may not exist or have no matching rows — safe to ignore
        }
      }
      // Also clean content_relationships source/target
      try {
        await (env as any).DB.prepare(
          `DELETE FROM content_relationships WHERE source_content_id IN (${placeholders}) OR target_content_id IN (${placeholders})`
        )
          .bind(...allIds, ...allIds)
          .run()
      } catch {
        // safe to ignore
      }
      log(`Cleaned FK-dependent records for ${allIds.length} content items`)
    }

    // Now delete pages first (FK to sections within content table)
    for (const page of existingPages) {
      await db.delete(content).where(eq(content.id, page.id)).run()
    }
    log(`Deleted ${existingPages.length} existing pages`)

    for (const section of existingSections) {
      await db.delete(content).where(eq(content.id, section.id)).run()
    }
    log(`Deleted ${existingSections.length} existing sections`)

    // Create sections
    logStep('Creating sections...')
    const slugToId = new Map<string, string>()
    const sectionFiles = await glob('*/_section.md', { cwd: CONTENT_DIR })

    const sectionEntries: Array<{ data: any }> = []
    for (const file of sectionFiles) {
      const raw = readFileSync(resolve(CONTENT_DIR, file), 'utf-8')
      const parsed = matter(raw)
      sectionEntries.push({ data: parsed.data })
    }
    sectionEntries.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))

    for (const { data } of sectionEntries) {
      const id = crypto.randomUUID()
      const now = new Date()

      await db
        .insert(content)
        .values({
          id,
          collectionId: sectionsCollection.id,
          slug: data.slug,
          title: data.name,
          data: {
            name: data.name,
            slug: data.slug,
            description: data.description ?? '',
            order: data.order ?? 0,
          },
          status: 'published',
          publishedAt: now,
          authorId: adminUser.id,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      slugToId.set(data.slug, id)
      log(`Created section: ${data.name} (${id})`)
    }

    // Create pages
    logStep('Creating pages...')
    const pageFiles = await glob('**/*.md', {
      cwd: CONTENT_DIR,
      ignore: '**/_section.md',
    })

    let created = 0
    const pageEntries: Array<{ data: any; content: string; sectionSlug: string; file: string }> = []
    for (const file of pageFiles) {
      const raw = readFileSync(resolve(CONTENT_DIR, file), 'utf-8')
      const parsed = matter(raw)
      const sectionSlug = basename(dirname(file))
      pageEntries.push({
        data: parsed.data,
        content: normalizeContent(parsed.content),
        sectionSlug,
        file,
      })
    }
    pageEntries.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))

    for (const page of pageEntries) {
      const sectionId = slugToId.get(page.sectionSlug)
      if (!sectionId) {
        console.error(`  ERROR: No section ID for slug "${page.sectionSlug}" (file: ${page.file})`)
        continue
      }

      const id = crypto.randomUUID()
      const now = new Date()

      try {
        await db
          .insert(content)
          .values({
            id,
            collectionId: docsCollection.id,
            slug: page.data.slug ?? basename(page.file, '.md'),
            title: page.data.title ?? basename(page.file, '.md'),
            data: {
              title: page.data.title ?? basename(page.file, '.md'),
              slug: page.data.slug ?? basename(page.file, '.md'),
              excerpt: page.data.excerpt ?? '',
              content: page.content,
              section: sectionId,
              order: page.data.order ?? 0,
              status: 'published',
              lastUpdated: page.data.lastUpdated ?? now.toISOString(),
            },
            status: 'published',
            publishedAt: now,
            authorId: adminUser.id,
            createdAt: now,
            updatedAt: now,
          })
          .run()

        created++
        log(`Created page: ${page.data.title ?? page.file} (${page.sectionSlug})`)
      } catch (err) {
        console.error(`  ERROR creating page "${page.file}":`, err)
      }
    }

    logStep('Summary')
    log(`Sections created: ${slugToId.size}`)
    log(`Pages created: ${created}`)
    console.log('\nDone!\n')
  } finally {
    await dispose()
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)

if (args.includes('--direct')) {
  runDirectMode().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
} else if (args.length === 0 || args[0]?.startsWith('-')) {
  console.error('Usage:')
  console.error('  npx tsx scripts/seed-docs.ts <base-url>       # API mode')
  console.error('  npx tsx scripts/seed-docs.ts --direct          # Direct D1 mode')
  console.error('')
  console.error('Examples:')
  console.error('  npx tsx scripts/seed-docs.ts http://localhost:8787')
  console.error('  npx tsx scripts/seed-docs.ts https://flare-cms.jjaimealeman.workers.dev')
  process.exit(1)
} else {
  const baseUrl = args[0].replace(/\/+$/, '') // Strip trailing slashes

  // Production safety check: require --confirm-production for non-localhost URLs
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/.test(baseUrl)
  if (!isLocalhost) {
    if (!args.includes('--confirm-production')) {
      console.error('')
      console.error('WARNING: You are about to seed against a production URL:')
      console.error(`  ${baseUrl}`)
      console.error('')
      console.error('This will DELETE all existing docs content and recreate it.')
      console.error('')
      console.error('To confirm, re-run with --confirm-production flag:')
      console.error(`  npx tsx scripts/seed-docs.ts ${baseUrl} --confirm-production`)
      console.error('')
      process.exit(1)
    }
    console.log(`\nProduction mode confirmed. Target: ${baseUrl}`)
  }

  runApiMode(baseUrl).catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
