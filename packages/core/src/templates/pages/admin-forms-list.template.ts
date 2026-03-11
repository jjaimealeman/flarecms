import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../layouts/admin-layout-catalyst.template'
import { renderTable } from '../components/table.template'

export interface Form {
  id: string
  name: string
  display_name: string
  description?: string
  category: string
  submission_count: number
  is_active: boolean
  is_public: boolean
  created_at: number
  formattedDate: string
}

export interface FormsListPageData {
  forms: Form[]
  search?: string
  category?: string
  user?: {
    name: string
    email: string
    role: string
  }
  version?: string
}

export function renderFormsListPage(data: FormsListPageData): string {
  const tableData: any = {
    tableId: 'forms-table',
    rowClickable: true,
    rowClickUrl: (form: Form) => `/admin/forms/${form.id}/builder`,
    columns: [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        sortType: 'string',
        render: (_value: any, form: any) => `
            <div class="flex items-center gap-2 ml-2">
                <span class="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 text-sm font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
                  ${form.name}
                </span>
            </div>
          `
      },
      {
        key: 'display_name',
        label: 'Display Name',
        sortable: true,
        sortType: 'string'
      },
      {
        key: 'category',
        label: 'Category',
        sortable: true,
        sortType: 'string',
        render: (_value: any, form: any) => {
          const categoryColors: Record<string, string> = {
            'contact': 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-700/10 dark:ring-blue-400/20',
            'survey': 'bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-700/10 dark:ring-slate-400/20',
            'registration': 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 ring-green-700/10 dark:ring-green-400/20',
            'feedback': 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-700/10 dark:ring-orange-400/20',
            'general': 'bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-300 ring-gray-700/10 dark:ring-gray-400/20'
          }
          const colorClass = categoryColors[form.category] || categoryColors['general']
          return `
            <span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${colorClass}">
              ${form.category || 'general'}
            </span>
          `
        }
      },
      {
        key: 'submission_count',
        label: 'Submissions',
        sortable: true,
        sortType: 'number',
        render: (_value: any, form: any) => {
          const count = form.submission_count || 0
          if (count === 0) {
            return `
              <div class="flex items-center">
                <span class="inline-flex items-center rounded-full bg-zinc-50 dark:bg-zinc-500/10 px-2.5 py-1 text-sm font-medium text-zinc-500 dark:text-zinc-500 ring-1 ring-inset ring-zinc-700/10 dark:ring-zinc-400/20">
                  0
                </span>
              </div>
            `
          }
          return `
            <div class="flex items-center">
              <a href="/admin/forms/${form.id}/submissions" class="group/sub inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 text-sm font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:ring-blue-700/20 dark:hover:ring-blue-400/30 transition-colors" title="View ${count} submission${count !== 1 ? 's' : ''}" onclick="event.stopPropagation()">
                <svg class="w-3.5 h-3.5 opacity-60 group-hover/sub:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                </svg>
                ${count}
              </a>
            </div>
          `
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        sortType: 'string',
        render: (_value: any, form: any) => {
          if (form.is_active) {
            return `
              <span class="inline-flex items-center rounded-full bg-green-50 dark:bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-700/10 dark:ring-green-400/20">
                Active
              </span>
            `
          } else {
            return `
              <span class="inline-flex items-center rounded-full bg-gray-50 dark:bg-gray-500/10 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-700/10 dark:ring-gray-400/20">
                Inactive
              </span>
            `
          }
        }
      },
      {
        key: 'formattedDate',
        label: 'Created',
        sortable: true,
        sortType: 'date'
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_value: any, form: any) => {
          if (!form || !form.id) return '<span class="text-zinc-500 dark:text-zinc-400">-</span>'
          return `
            <div class="flex items-center space-x-2">
              <a href="/admin/forms/${form.id}/builder" class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-950 dark:bg-blue-600 text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors" title="Edit Form">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </a>
              <a href="/forms/${form.name}" target="_blank" class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 p-1.5 text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" title="View Public Form">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </a>
              <a href="/admin/forms/${form.id}/submissions" class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 p-1.5 text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" title="View Submissions">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </a>
            </div>
          `
        }
      }
    ],
    rows: data.forms,
    emptyMessage: 'No forms found. Create your first form to get started!'
  }

  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Forms</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Create and manage forms with the visual form builder</p>
        </div>
        <div class="mt-4 sm:mt-0 flex flex-wrap items-center gap-3">
          <!-- Documentation Links -->
          <a href="/admin/forms/examples" class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" title="View interactive examples">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Examples
          </a>
          <a href="/admin/forms/docs" class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors" title="Quick reference guide">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Quick Reference
          </a>
          <a href="/admin/forms/new" class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-blue-600 px-4 py-2 text-sm font-semibold text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors shadow-sm">
            <svg class="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Create Form
          </a>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/5 dark:border-white/10 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">Total Forms</dt>
                <dd class="text-2xl font-semibold text-zinc-900 dark:text-white">${data.forms.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/5 dark:border-white/10 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">Active Forms</dt>
                <dd class="text-2xl font-semibold text-zinc-900 dark:text-white">${data.forms.filter(f => f.is_active).length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/5 dark:border-white/10 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-8 w-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">Total Submissions</dt>
                <dd class="text-2xl font-semibold text-zinc-900 dark:text-white">${data.forms.reduce((sum, f) => sum + (f.submission_count || 0), 0)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/5 dark:border-white/10 p-4 mb-6">
        <form class="flex flex-col sm:flex-row gap-4" method="get" action="/admin/forms">
          <div class="flex-1">
            <input
              type="text"
              name="search"
              placeholder="Search forms..."
              value="${data.search || ''}"
              class="block w-full h-[38px] rounded-lg border-2 border-blue-200/50 dark:border-blue-700/50 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3"
            />
          </div>
          <div class="w-full sm:w-48">
            <select
              name="category"
              class="block w-full h-[38px] rounded-lg border-2 border-blue-200/50 dark:border-blue-700/50 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3"
            >
              <option value="">All Categories</option>
              <option value="contact" ${data.category === 'contact' ? 'selected' : ''}>Contact</option>
              <option value="survey" ${data.category === 'survey' ? 'selected' : ''}>Survey</option>
              <option value="registration" ${data.category === 'registration' ? 'selected' : ''}>Registration</option>
              <option value="feedback" ${data.category === 'feedback' ? 'selected' : ''}>Feedback</option>
              <option value="general" ${data.category === 'general' ? 'selected' : ''}>General</option>
            </select>
          </div>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            Filter
          </button>
          ${data.search || data.category ? `
            <a
              href="/admin/forms"
              class="inline-flex items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              Clear
            </a>
          ` : ''}
        </form>
      </div>

      <!-- Forms Table -->
      <div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-950/5 dark:border-white/10 overflow-hidden">
        ${renderTable(tableData)}
      </div>
    </div>
  `

  const layoutData: AdminLayoutCatalystData = {
    title: 'Forms',
    content: pageContent,
    user: data.user,
    version: data.version
  }

  return renderAdminLayoutCatalyst(layoutData)
}