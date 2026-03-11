import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../layouts/admin-layout-catalyst.template'
import { renderTable } from '../components/table.template'

interface FaqListData {
  faqs: any[]
  categories: string[]
  totalCount: number
  currentPage: number
  totalPages: number
  filters: { category?: string; published?: string; search?: string }
  user?: { name: string; email: string; role: string }
  version?: string
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

export function renderFaqList(data: FaqListData): string {
  const { faqs, categories, totalCount, currentPage, totalPages, filters, message, messageType } = data

  const messageHtml = message ? `
    <div class="mb-6 rounded-lg p-4 text-sm ${
      messageType === 'error'
        ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-red-600/10 dark:ring-red-500/20'
        : 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-green-600/10 dark:ring-green-500/20'
    }">
      ${escHtml(message)}
    </div>
  ` : ''

  const tableData: any = {
    tableId: 'faq-table',
    rowClickable: true,
    rowClickUrl: (row: any) => `/admin/faq/${row.id}`,
    columns: [
      {
        key: 'sortOrder',
        label: '#',
        sortable: true,
        sortType: 'number',
        render: (_v: any, row: any) => `<span class="text-zinc-400 dark:text-zinc-500 text-xs font-mono">${row.sortOrder}</span>`
      },
      {
        key: 'question',
        label: 'Question',
        sortable: true,
        sortType: 'string',
        render: (_v: any, row: any) => {
          const q = escHtml(row.question)
          const truncated = q.length > 80 ? q.substring(0, 80) + '...' : q
          return `<div class="font-medium text-zinc-950 dark:text-white max-w-md">${truncated}</div>`
        }
      },
      {
        key: 'category',
        label: 'Category',
        sortable: true,
        sortType: 'string',
        render: (_v: any, row: any) => {
          if (!row.category) return '<span class="text-zinc-300 dark:text-zinc-600">&mdash;</span>'
          return `
            <span class="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
              ${escHtml(row.category)}
            </span>
          `
        }
      },
      {
        key: 'isPublished',
        label: 'Status',
        sortable: true,
        sortType: 'boolean',
        render: (_v: any, row: any) => {
          return row.isPublished
            ? '<span class="inline-flex items-center rounded-full bg-green-50 dark:bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/20">Published</span>'
            : '<span class="inline-flex items-center rounded-full bg-zinc-50 dark:bg-zinc-500/10 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 ring-1 ring-inset ring-zinc-500/20">Draft</span>'
        }
      },
      {
        key: 'actions',
        label: '',
        sortable: false,
        render: (_v: any, row: any) => `
          <div class="flex items-center gap-1">
            <a href="/admin/faq/${row.id}" class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-950/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors" title="Edit" onclick="event.stopPropagation()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </a>
            <button onclick="event.stopPropagation(); deleteFaq(${row.id}, '${escHtml(row.question).replace(/'/g, "\\'").substring(0, 50)}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-950/10 dark:border-white/10 text-zinc-400 dark:text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800 transition-colors" title="Delete">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        `
      }
    ],
    rows: faqs,
    emptyMessage: 'No FAQs found. Create your first FAQ to get started!'
  }

  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">FAQs</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage frequently asked questions</p>
        </div>
        <div class="mt-4 sm:mt-0 flex items-center gap-3">
          <span class="text-sm text-zinc-500 dark:text-zinc-400">${totalCount} ${totalCount === 1 ? 'item' : 'items'}</span>
          <a href="/admin/faq/new"
             class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-blue-600 px-4 py-2 text-sm font-semibold text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors shadow-sm">
            <svg class="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add FAQ
          </a>
        </div>
      </div>

      ${messageHtml}

      <!-- Filters -->
      <div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/5 dark:border-white/10 p-4 mb-6">
        <form class="flex flex-col sm:flex-row gap-4" method="get" action="/admin/faq">
          <div class="flex-1">
            <input
              type="text"
              name="search"
              placeholder="Search questions..."
              value="${escHtml(filters.search || '')}"
              class="block w-full rounded-lg border-2 border-blue-200/50 dark:border-blue-700/50 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
            />
          </div>
          <div class="w-full sm:w-40">
            <select
              name="category"
              class="block w-full rounded-lg border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white sm:text-sm px-3 py-2"
            >
              <option value="">All Categories</option>
              ${categories.map(cat => `<option value="${escHtml(cat)}" ${filters.category === cat ? 'selected' : ''}>${escHtml(cat)}</option>`).join('')}
            </select>
          </div>
          <div class="w-full sm:w-36">
            <select
              name="published"
              class="block w-full rounded-lg border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white sm:text-sm px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="true" ${filters.published === 'true' ? 'selected' : ''}>Published</option>
              <option value="false" ${filters.published === 'false' ? 'selected' : ''}>Draft</option>
            </select>
          </div>
          <button type="submit" class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
            Filter
          </button>
          ${(filters.search || filters.category || filters.published) ? `
            <a href="/admin/faq" class="inline-flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
              Clear
            </a>
          ` : ''}
        </form>
      </div>

      <!-- FAQ Table -->
      <div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/5 dark:border-white/10 overflow-hidden">
        ${renderTable(tableData)}
      </div>
    </div>

    <script>
      function deleteFaq(id, question) {
        if (!confirm('Delete FAQ: "' + question + '"? This cannot be undone.')) return;
        fetch('/admin/faq/' + id, { method: 'DELETE' })
          .then(function(res) {
            if (res.ok) location.href = '/admin/faq?message=FAQ deleted successfully';
          });
      }
    </script>
  `

  const layoutData: AdminLayoutCatalystData = {
    title: 'FAQs',
    content: pageContent,
    user: data.user,
    version: data.version
  }

  return renderAdminLayoutCatalyst(layoutData)
}