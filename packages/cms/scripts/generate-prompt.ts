/**
 * Generate a self-contained PROMPT.md from the live CMS schema
 *
 * Reads collection definitions from the CMS API and outputs a markdown
 * document suitable for instructing an LLM to generate seed content.
 *
 * Usage:
 *   npx tsx scripts/generate-prompt.ts http://localhost:8787
 *   npx tsx scripts/generate-prompt.ts http://localhost:8787 > PROMPT.md
 */

interface SchemaProperty {
  type: string
  title?: string
  required?: boolean
  maxLength?: number
  helpText?: string
  enum?: string[]
  enumLabels?: string[]
  default?: any
  collection?: string
  placeholder?: string
}

interface CollectionSchema {
  type: string
  properties: Record<string, SchemaProperty>
  required?: string[]
}

interface Collection {
  id: string
  name: string
  displayName: string
  description?: string
  schema: CollectionSchema
}

function formatFieldType(prop: SchemaProperty): string {
  if (prop.enum) {
    return `select (${prop.enum.join(' | ')})`
  }
  if (prop.collection) {
    return `reference -> ${prop.collection}`
  }
  return prop.type
}

function formatConstraints(prop: SchemaProperty, required: boolean): string[] {
  const constraints: string[] = []
  if (required) constraints.push('required')
  if (prop.maxLength) constraints.push(`max ${prop.maxLength} chars`)
  if (prop.default !== undefined) constraints.push(`default: ${JSON.stringify(prop.default)}`)
  return constraints
}

function generateCollectionDocs(collection: Collection): string {
  const lines: string[] = []
  const schema = collection.schema
  const requiredFields = new Set(schema.required ?? [])

  lines.push(`### ${collection.displayName} (\`${collection.name}\`)`)
  if (collection.description) {
    lines.push(``)
    lines.push(collection.description)
  }
  lines.push(``)
  lines.push(`| Field | Type | Constraints | Description |`)
  lines.push(`|-------|------|-------------|-------------|`)

  for (const [key, prop] of Object.entries(schema.properties)) {
    const type = formatFieldType(prop)
    const constraints = formatConstraints(prop, requiredFields.has(key) || prop.required === true)
    const desc = prop.helpText ?? prop.title ?? ''
    lines.push(`| \`${key}\` | ${type} | ${constraints.join(', ')} | ${desc} |`)
  }

  return lines.join('\n')
}

function buildPrompt(collections: Collection[], baseUrl: string): string {
  const collectionDocs = collections.map(generateCollectionDocs).join('\n\n')

  return `# Flare CMS - Content Generation Prompt

## System Context

Flare CMS is a headless CMS built on Cloudflare Workers with D1 (SQLite), R2 (object storage), and KV (caching). It exposes a REST API for all content operations.

**Base URL:** \`${baseUrl}\`

## Authentication

All write operations require authentication via JWT cookie.

\`\`\`bash
# Login (returns Set-Cookie with JWT token)
curl -X POST ${baseUrl}/auth/login \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "email=admin@example.com&password=yourpassword" \\
  -c cookies.txt

# Use cookie for subsequent requests
curl ${baseUrl}/api/collections -b cookies.txt
\`\`\`

## Collections

${collectionDocs}

## API Endpoints

### Collections
| Method | Path | Description |
|--------|------|-------------|
| GET | \`/api/collections\` | List all collections |
| GET | \`/api/collections/:name\` | Get collection by name |

### Content
| Method | Path | Description |
|--------|------|-------------|
| GET | \`/api/collections/:name/content\` | List content in collection |
| GET | \`/api/collections/:name/content?limit=N\` | List with pagination |
| GET | \`/api/content/:id\` | Get content item by ID |
| POST | \`/api/content\` | Create content item |
| PUT | \`/api/content/:id\` | Update content item |
| DELETE | \`/api/content/:id\` | Delete content item |

### Example: Create Content

\`\`\`bash
curl -X POST ${baseUrl}/api/content \\
  -H "Content-Type: application/json" \\
  -b cookies.txt \\
  -d '{
    "collectionId": "<collection-uuid>",
    "title": "My Page Title",
    "slug": "my-page-title",
    "status": "published",
    "data": {
      "title": "My Page Title",
      "slug": "my-page-title",
      "content": "Markdown content here...",
      "section": "<section-uuid>",
      "order": 1,
      "status": "published"
    }
  }'
\`\`\`

### Example: Response Format

\`\`\`json
{
  "data": {
    "id": "<uuid>",
    "collectionId": "<collection-uuid>",
    "slug": "my-page-title",
    "title": "My Page Title",
    "data": { ... },
    "status": "published",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
\`\`\`

## Instructions for Content Generation

When generating content for Flare CMS:

1. **Create sections first** — pages reference sections by UUID
2. **Use the \`data\` field** — collection-specific fields go inside the \`data\` JSON object
3. **Markdown content** — the \`content\` field accepts raw markdown (not HTML)
4. **Slugs must be unique** within each collection
5. **Status** — set to \`"published"\` for immediate visibility
6. **Order** — use integers for sort position (lower = first)
7. **References** — use the UUID of the referenced content item (e.g., section ID)
`
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0]?.startsWith('-')) {
    console.error('Usage: npx tsx scripts/generate-prompt.ts <base-url>')
    console.error('Example: npx tsx scripts/generate-prompt.ts http://localhost:8787')
    process.exit(1)
  }

  const baseUrl = args[0].replace(/\/+$/, '')

  console.error(`Fetching collections from ${baseUrl}...`)

  const res = await fetch(`${baseUrl}/api/collections`)
  if (!res.ok) {
    console.error(`Failed to fetch collections: ${res.status} ${res.statusText}`)
    process.exit(1)
  }

  const json = (await res.json()) as any
  const collections: Collection[] = json.data ?? json

  console.error(`Found ${collections.length} collections`)

  const prompt = buildPrompt(collections, baseUrl)

  // Write to stdout (can be piped to file)
  process.stdout.write(prompt)

  // Also write to PROMPT.md if not piped
  if (process.stdout.isTTY) {
    const { writeFileSync } = await import('fs')
    writeFileSync('PROMPT.md', prompt, 'utf-8')
    console.error(`\nWritten to PROMPT.md`)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
