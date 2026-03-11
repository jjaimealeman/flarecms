/**
 * Astro Snippet Generator
 *
 * Generates copy-paste Astro code snippets for a given collection schema.
 * Used in the collections list via HTMX modal.
 */

interface CollectionSchema {
  type?: string
  properties?: Record<string, {
    type?: string
    title?: string
    required?: boolean
    enum?: string[]
  }>
  required?: string[]
}

interface SnippetData {
  collectionName: string
  displayName: string
  schema: CollectionSchema
  cmsUrl?: string
}

/** Convert kebab-case to camelCase */
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

/** Convert kebab-case to PascalCase */
function toPascalCase(str: string): string {
  const camel = toCamelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/** Map Flare field types to TypeScript types for comments */
function tsType(fieldType: string): string {
  switch (fieldType) {
    case 'string':
    case 'slug':
    case 'quill':
    case 'tinymce':
    case 'mdxeditor':
    case 'richtext':
    case 'markdown':
    case 'media':
    case 'reference':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'datetime':
      return 'Date'
    case 'select':
      return 'string'
    case 'json':
    case 'array':
    case 'object':
      return 'any'
    default:
      return 'string'
  }
}

function generateContentConfigSnippet(data: SnippetData): string {
  const camelName = toCamelCase(data.collectionName)
  const url = data.cmsUrl || 'https://your-flare-cms.workers.dev'

  return `// content.config.ts
import { defineCollection } from 'astro:content'
import { flareLoader } from '@flare-cms/astro'

const ${camelName} = defineCollection({
  loader: flareLoader({
    apiUrl: '${url}',
    collection: '${data.collectionName}',
    filter: { status: 'published' },
  }),
})

export const collections = { ${camelName} }`
}

function generatePageSnippet(data: SnippetData): string {
  const camelName = toCamelCase(data.collectionName)
  const pascalName = toPascalCase(data.collectionName)
  const props = data.schema?.properties || {}
  const required = data.schema?.required || []

  const fieldLines = Object.entries(props).map(([key, field]) => {
    const isRequired = required.includes(key) || field.required === true
    const type = tsType(field.type || 'string')
    return `  ${key}: item.data.${key}${isRequired ? '' : ' ?? undefined'},  // ${type}`
  }).join('\n')

  return `---
// ${data.displayName} listing page
import { getCollection } from 'astro:content'
import Layout from '../layouts/Layout.astro'

const all${pascalName} = await getCollection('${camelName}')
const items = all${pascalName}.map(item => ({
${fieldLines}
}))
---

<Layout title="${data.displayName}">
  <h1>${data.displayName}</h1>
  <div class="grid gap-6">
    {items.map(item => (
      <article>
        <h2>{item.${Object.keys(props)[0] || 'title'}}</h2>
      </article>
    ))}
  </div>
</Layout>`
}

function generateFetchSnippet(data: SnippetData): string {
  const url = data.cmsUrl || 'https://your-flare-cms.workers.dev'

  return `// Direct API fetch (without @flare-cms/astro)
const res = await fetch(
  '${url}/api/collections/${data.collectionName}/content?status=published'
)
const { data: items } = await res.json()

// Each item shape:
// {
//   id: string,
//   title: string,
//   slug: string,
//   status: 'draft' | 'published' | 'archived',
//   data: { /* your schema fields */ },
//   created_at: number,
//   updated_at: number
// }`
}

function generateFieldReference(data: SnippetData): string {
  const props = data.schema?.properties || {}
  const required = data.schema?.required || []

  if (Object.keys(props).length === 0) return '// No fields defined in schema'

  const lines = Object.entries(props).map(([key, field]) => {
    const isRequired = required.includes(key) || field.required === true
    const type = tsType(field.type || 'string')
    return `//   ${key}: ${type}${isRequired ? '' : ' | undefined'}  — ${field.title || key} (${field.type || 'string'})`
  }).join('\n')

  return `// ${data.displayName} — Field Reference
// Access via item.data.{fieldName}
//
${lines}`
}

/** Render the snippet modal content (returned via HTMX) */
export function renderSnippetModal(data: SnippetData): string {
  const snippets = [
    { id: 'content-config', label: 'Content Config', code: generateContentConfigSnippet(data) },
    { id: 'page', label: 'Astro Page', code: generatePageSnippet(data) },
    { id: 'fetch', label: 'API Fetch', code: generateFetchSnippet(data) },
    { id: 'fields', label: 'Field Reference', code: generateFieldReference(data) },
  ]

  const tabs = snippets.map((s, i) => `
    <button
      onclick="showSnippetTab('${s.id}')"
      id="tab-${s.id}"
      class="snippet-tab px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        i === 0
          ? 'bg-zinc-950 text-white dark:bg-blue-600 dark:text-white'
          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
      }"
    >${s.label}</button>
  `).join('')

  const panels = snippets.map((s, i) => `
    <div id="panel-${s.id}" class="snippet-panel ${i === 0 ? '' : 'hidden'}">
      <div class="relative">
        <button
          onclick="copySnippet('${s.id}')"
          class="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors z-10"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/>
          </svg>
          <span id="copy-label-${s.id}">Copy</span>
        </button>
        <pre class="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 pr-20 overflow-x-auto text-sm text-zinc-800 dark:text-zinc-200 ring-1 ring-zinc-200 dark:ring-zinc-700"><code id="code-${s.id}">${escapeHtml(s.code)}</code></pre>
      </div>
    </div>
  `).join('')

  return `
    <div class="flex items-center gap-2 mb-4 flex-wrap">
      ${tabs}
    </div>
    ${panels}
    <script>
      function showSnippetTab(id) {
        document.querySelectorAll('.snippet-tab').forEach(function(tab) {
          tab.className = 'snippet-tab px-3 py-1.5 text-sm font-medium rounded-lg transition-colors text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5';
        });
        document.querySelectorAll('.snippet-panel').forEach(function(panel) {
          panel.classList.add('hidden');
        });
        var activeTab = document.getElementById('tab-' + id);
        activeTab.className = 'snippet-tab px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-zinc-950 text-white dark:bg-blue-600 dark:text-white';
        document.getElementById('panel-' + id).classList.remove('hidden');
      }

      function copySnippet(id) {
        var code = document.getElementById('code-' + id).textContent;
        navigator.clipboard.writeText(code).then(function() {
          var label = document.getElementById('copy-label-' + id);
          label.textContent = 'Copied!';
          setTimeout(function() { label.textContent = 'Copy'; }, 2000);
        });
      }
    </script>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}