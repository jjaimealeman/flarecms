import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../layouts/admin-layout-catalyst.template'

interface FaqFormData {
  faq?: {
    id: number
    question: string
    answer: string
    category: string | null
    tags: string | null
    isPublished: boolean
    sortOrder: number
  }
  isEdit: boolean
  categories: string[]
  user?: { name: string; email: string; role: string }
  version?: string
  errors?: Record<string, string[]>
  message?: string
  messageType?: 'success' | 'error' | 'warning' | 'info'
}

function escHtml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderFaqForm(data: FaqFormData): string {
  const { faq, isEdit, categories, errors, message, messageType } = data

  const inputClass = 'block w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
  const inputErrorClass = 'block w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-red-500/50 focus:ring-2 focus:ring-red-500'

  function fieldError(field: string): string {
    if (!errors || !errors[field]) return ''
    return `<p class="mt-1.5 text-xs text-red-500">${escHtml(errors[field][0])}</p>`
  }

  const messageHtml = message ? `
    <div class="mb-6 rounded-lg p-4 text-sm ${
      messageType === 'error'
        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-600/10 dark:ring-red-500/20'
        : 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-green-600/10 dark:ring-green-500/20'
    }">
      ${escHtml(message)}
    </div>
  ` : ''

  const pageContent = `
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-4">
          <a href="/admin/faq" class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">
              ${isEdit ? 'Edit FAQ' : 'New FAQ'}
            </h1>
            <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">
              ${isEdit ? 'Update this frequently asked question' : 'Add a new frequently asked question'}
            </p>
          </div>
        </div>
      </div>

      ${messageHtml}

      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 sm:p-8">
        <form method="POST" action="${isEdit ? `/admin/faq/${faq?.id}` : '/admin/faq'}" class="space-y-6">

          <!-- Question -->
          <div>
            <label for="question" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
              Question <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="question"
              name="question"
              value="${escHtml(faq?.question || '')}"
              placeholder="What would you like to know?"
              required
              class="${errors?.question ? inputErrorClass : inputClass}"
            />
            ${fieldError('question')}
          </div>

          <!-- Answer -->
          <div>
            <label for="answer" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
              Answer <span class="text-red-500">*</span>
            </label>
            <textarea
              id="answer"
              name="answer"
              rows="6"
              placeholder="Provide a clear, helpful answer..."
              required
              class="${errors?.answer ? inputErrorClass : inputClass}"
            >${escHtml(faq?.answer || '')}</textarea>
            ${fieldError('answer')}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Category -->
            <div>
              <label for="category" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                value="${escHtml(faq?.category || '')}"
                placeholder="e.g. general, billing, technical"
                list="category-suggestions"
                class="${inputClass}"
              />
              <datalist id="category-suggestions">
                ${categories.map(cat => `<option value="${escHtml(cat)}">`).join('')}
              </datalist>
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Type a new category or select existing</p>
            </div>

            <!-- Tags -->
            <div>
              <label for="tags" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Tags</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value="${escHtml(faq?.tags || '')}"
                placeholder="comma-separated tags"
                class="${inputClass}"
              />
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Separate multiple tags with commas</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Sort Order -->
            <div>
              <label for="sortOrder" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Sort Order</label>
              <input
                type="number"
                id="sortOrder"
                name="sortOrder"
                value="${faq?.sortOrder ?? 0}"
                min="0"
                class="${inputClass}"
              />
              <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Lower numbers appear first</p>
            </div>

            <!-- Published -->
            <div>
              <label for="isPublished" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Status</label>
              <select id="isPublished" name="isPublished" class="${inputClass}">
                <option value="true" ${faq?.isPublished !== false ? 'selected' : ''}>Published</option>
                <option value="false" ${faq?.isPublished === false ? 'selected' : ''}>Draft</option>
              </select>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-zinc-950/5 dark:border-white/5">
            <div>
              ${isEdit ? `
                <button
                  type="button"
                  onclick="if(confirm('Delete this FAQ? This cannot be undone.')) { var f = document.createElement('form'); f.method='POST'; f.action='/admin/faq/${faq?.id}'; var m = document.createElement('input'); m.type='hidden'; m.name='_method'; m.value='DELETE'; f.appendChild(m); document.body.appendChild(f); f.submit(); }"
                  class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                >
                  Delete FAQ
                </button>
              ` : ''}
            </div>
            <div class="flex items-center gap-3">
              <a href="/admin/faq" class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                Cancel
              </a>
              <button type="submit" class="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
                ${isEdit ? 'Save Changes' : 'Create FAQ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `

  const layoutData: AdminLayoutCatalystData = {
    title: isEdit ? 'Edit FAQ' : 'New FAQ',
    content: pageContent,
    user: data.user,
    version: data.version
  }

  return renderAdminLayoutCatalyst(layoutData)
}
