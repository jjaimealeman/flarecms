import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { renderFormsListPage } from '../templates/pages/admin-forms-list.template'
import { renderFormBuilderPage, type FormBuilderPageData } from '../templates/pages/admin-forms-builder.template'
import { renderFormCreatePage } from '../templates/pages/admin-forms-create.template'
import { TurnstileService } from '../plugins/core-plugins/turnstile-plugin/services/turnstile'

// Type definitions for forms
interface Form {
  id: string
  name: string
  display_name: string
  description?: string
  category: string
  submission_count: number
  is_active: boolean
  is_public: boolean
  created_at: number
  updated_at: number
  formattedDate: string
}

interface FormData {
  id?: string
  name?: string
  display_name?: string
  description?: string
  category?: string
  formio_schema?: any
  settings?: any
  is_active?: boolean
  is_public?: boolean
  google_maps_api_key?: string
  turnstile_site_key?: string
  error?: string
  success?: string
  user?: {
    name: string
    email: string
    role: string
  }
  version?: string
}

interface FormsListPageData {
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

type Bindings = {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  EMAIL_QUEUE?: Queue
  SENDGRID_API_KEY?: string
  DEFAULT_FROM_EMAIL?: string
  ENVIRONMENT?: string
  GOOGLE_MAPS_API_KEY?: string
}

type Variables = {
  user?: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
  requestId?: string
  startTime?: number
  appVersion?: string
}

export const adminFormsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply authentication middleware
adminFormsRoutes.use('*', requireAuth())
adminFormsRoutes.use('*', requireRole(['admin', 'editor']))

// Forms management - List all forms
adminFormsRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    const db = c.env.DB
    const search = c.req.query('search') || ''
    const category = c.req.query('category') || ''

    // Build query — use actual submission count from form_submissions table
    let query = `SELECT f.*, COALESCE(sc.cnt, 0) AS real_submission_count
      FROM forms f
      LEFT JOIN (SELECT form_id, COUNT(*) AS cnt FROM form_submissions GROUP BY form_id) sc ON sc.form_id = f.id
      WHERE 1=1`
    const params: string[] = []

    if (search) {
      query += ' AND (f.name LIKE ? OR f.display_name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    if (category) {
      query += ' AND f.category = ?'
      params.push(category)
    }

    query += ' ORDER BY f.created_at DESC'

    const result = await db.prepare(query).bind(...params).all()

    // Format dates, use real submission count
    const forms = result.results.map((form: any) => ({
      ...form,
      submission_count: form.real_submission_count,
      formattedDate: new Date(form.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }))

    const pageData: FormsListPageData = {
      forms,
      search,
      category,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined,
      version: c.get('appVersion')
    }

    return c.html(renderFormsListPage(pageData))
  } catch (error: any) {
    console.error('Error listing forms:', error)
    return c.html('<p>Error loading forms</p>', 500)
  }
})

// Show create form page
adminFormsRoutes.get('/new', async (c) => {
  try {
    const user = c.get('user')

    const pageData: FormData = {
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined,
      version: c.get('appVersion')
    }

    return c.html(renderFormCreatePage(pageData))
  } catch (error: any) {
    console.error('Error showing create form page:', error)
    return c.html('<p>Error loading form</p>', 500)
  }
})

// Show docs page
adminFormsRoutes.get('/docs', async (c) => {
  try {
    const user = c.get('user')
    const { renderFormsDocsPage } = await import('../templates/index.js')

    const pageData = {
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined,
      version: c.get('appVersion')
    }

    return c.html(renderFormsDocsPage(pageData))
  } catch (error: any) {
    console.error('Error showing forms docs page:', error)
    return c.html('<p>Error loading documentation</p>', 500)
  }
})

// Show examples page
adminFormsRoutes.get('/examples', async (c) => {
  try {
    const user = c.get('user')
    const { renderFormsExamplesPage } = await import('../templates/index.js')

    const pageData = {
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined,
      version: c.get('appVersion')
    }

    return c.html(renderFormsExamplesPage(pageData))
  } catch (error: any) {
    console.error('Error showing forms examples page:', error)
    return c.html('<p>Error loading examples</p>', 500)
  }
})

// Create new form
adminFormsRoutes.post('/', async (c) => {
  try {
    const user = c.get('user')
    const db = c.env.DB
    const body = await c.req.parseBody()

    const name = body.name as string
    const displayName = body.displayName as string
    const description = (body.description as string) || ''
    const category = (body.category as string) || 'general'

    // Validate required fields
    if (!name || !displayName) {
      return c.json({ error: 'Name and display name are required' }, 400)
    }

    // Validate name format (lowercase, numbers, underscores only)
    if (!/^[a-z0-9_]+$/.test(name)) {
      return c.json({ 
        error: 'Form name must contain only lowercase letters, numbers, and underscores' 
      }, 400)
    }

    // Check for duplicate name
    const existing = await db.prepare('SELECT id FROM forms WHERE name = ?')
      .bind(name)
      .first()

    if (existing) {
      return c.json({ error: 'A form with this name already exists' }, 400)
    }

    // Create form with empty schema
    const formId = crypto.randomUUID()
    const now = Date.now()
    const emptySchema = { components: [] } // Empty Form.io schema

    await db.prepare(`
      INSERT INTO forms (
        id, name, display_name, description, category,
        formio_schema, settings, is_active, is_public,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      formId,
      name,
      displayName,
      description,
      category,
      JSON.stringify(emptySchema),
      JSON.stringify({
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!',
        requireAuth: false,
        emailNotifications: false
      }),
      1, // is_active
      1, // is_public
      user?.userId || null,
      now,
      now
    ).run()

    // Redirect to builder
    return c.redirect(`/admin/forms/${formId}/builder`)
  } catch (error: any) {
    console.error('Error creating form:', error)
    return c.json({ error: 'Failed to create form' }, 500)
  }
})

// Show form builder
adminFormsRoutes.get('/:id/builder', async (c) => {
  try {
    const user = c.get('user')
    const db = c.env.DB
    const formId = c.req.param('id')
    const googleMapsApiKey = c.env.GOOGLE_MAPS_API_KEY || ''

    // Get form
    const form = await db.prepare('SELECT * FROM forms WHERE id = ?')
      .bind(formId)
      .first()

    if (!form) {
      return c.html('<p>Form not found</p>', 404)
    }

    // Get Turnstile configuration
    const turnstileService = new TurnstileService(db)
    const turnstileSettings = await turnstileService.getSettings()

    const pageData: FormData = {
      id: form.id as string,
      name: form.name as string,
      display_name: form.display_name as string,
      description: form.description as string | undefined,
      category: form.category as string,
      formio_schema: form.formio_schema ? JSON.parse(form.formio_schema as string) : { components: [] },
      settings: form.settings ? JSON.parse(form.settings as string) : {},
      is_active: Boolean(form.is_active),
      is_public: Boolean(form.is_public),
      google_maps_api_key: googleMapsApiKey,
      turnstile_site_key: turnstileSettings?.siteKey || '',
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : undefined,
      version: c.get('appVersion')
    }

    return c.html(renderFormBuilderPage(pageData as FormBuilderPageData))
  } catch (error: any) {
    console.error('Error showing form builder:', error)
    return c.html('<p>Error loading form builder</p>', 500)
  }
})

// Update form (save schema)
adminFormsRoutes.put('/:id', async (c) => {
  try {
    const user = c.get('user')
    const db = c.env.DB
    const formId = c.req.param('id')
    const body = await c.req.json()

    // Check if form exists
    const form = await db.prepare('SELECT id FROM forms WHERE id = ?')
      .bind(formId)
      .first()

    if (!form) {
      return c.json({ error: 'Form not found' }, 404)
    }

    const now = Date.now()

    // Update form
    await db.prepare(`
      UPDATE forms 
      SET formio_schema = ?, 
          updated_by = ?, 
          updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(body.formio_schema),
      user?.userId || null,
      now,
      formId
    ).run()

    return c.json({ success: true, message: 'Form saved successfully' })
  } catch (error: any) {
    console.error('Error updating form:', error)
    return c.json({ error: 'Failed to save form' }, 500)
  }
})

// Delete form
adminFormsRoutes.delete('/:id', async (c) => {
  try {
    const db = c.env.DB
    const formId = c.req.param('id')

    // Check if form exists
    const form = await db.prepare('SELECT id, submission_count FROM forms WHERE id = ?')
      .bind(formId)
      .first()

    if (!form) {
      return c.json({ error: 'Form not found' }, 404)
    }

    // Warn if form has submissions
    const submissionCount = form.submission_count as number || 0
    if (submissionCount > 0) {
      return c.json({ 
        error: `Cannot delete form with ${submissionCount} submissions. Archive it instead.` 
      }, 400)
    }

    // Delete form (cascade will delete submissions and files)
    await db.prepare('DELETE FROM forms WHERE id = ?').bind(formId).run()

    return c.json({ success: true, message: 'Form deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting form:', error)
    return c.json({ error: 'Failed to delete form' }, 500)
  }
})

// View form submissions
adminFormsRoutes.get('/:id/submissions', async (c) => {
  try {
    const user = c.get('user')
    const db = c.env.DB
    const formId = c.req.param('id')

    // Get form
    const form = await db.prepare('SELECT * FROM forms WHERE id = ?')
      .bind(formId)
      .first()

    if (!form) {
      return c.html('<p>Form not found</p>', 404)
    }

    // Get submissions
    const submissions = await db.prepare(
      'SELECT * FROM form_submissions WHERE form_id = ? ORDER BY submitted_at DESC'
    ).bind(formId).all()

    // Parse submission data and extract field keys for table headers
    const parsed = submissions.results.map((sub: any) => {
      let data: Record<string, any> = {}
      try { data = JSON.parse(sub.submission_data) } catch {}
      return { ...sub, _data: data }
    })

    // Collect all unique field keys across submissions (skip internal fields)
    const skipKeys = new Set(['turnstile', 'submit'])
    const fieldKeys: string[] = []
    parsed.forEach((sub: any) => {
      Object.keys(sub._data).forEach((key: string) => {
        if (!fieldKeys.includes(key) && !skipKeys.has(key)) fieldKeys.push(key)
      })
    })

    // Friendly field label (capitalize, split camelCase)
    function fieldLabel(key: string): string {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/^\w/, (c: string) => c.toUpperCase())
        .trim()
    }

    // Format date
    function formatDate(ts: number): string {
      const d = new Date(ts)
      const month = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      const year = d.getFullYear()
      const hours = d.getHours()
      const mins = d.getMinutes().toString().padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const h12 = hours % 12 || 12
      return `${month}/${day}/${year} ${h12}:${mins} ${ampm}`
    }

    // Escape HTML
    function esc(str: any): string {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    const pageContent = `
      <div>
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <a href="/admin/forms" class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </a>
              <div>
                <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">
                  ${esc(form.display_name)} Submissions
                </h1>
                <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">
                  ${parsed.length} submission${parsed.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <a
                href="/admin/forms/${esc(formId)}/builder"
                class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
              >
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Edit Form
              </a>
            </div>
          </div>
        </div>

        ${parsed.length === 0 ? `
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-12 text-center">
            <svg class="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <p class="mt-4 text-sm font-medium text-zinc-900 dark:text-white">No submissions yet</p>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Submissions will appear here when someone fills out this form.</p>
          </div>
        ` : `
          <!-- Submissions table -->
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-zinc-950/5 dark:divide-white/5">
                <thead>
                  <tr class="bg-zinc-50 dark:bg-zinc-800/50">
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">#</th>
                    ${fieldKeys.map(key => `
                      <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">${esc(fieldLabel(key))}</th>
                    `).join('')}
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Submitted</th>
                    <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-950/5 dark:divide-white/5">
                  ${parsed.map((sub: any, i: number) => `
                    <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td class="px-4 py-3 text-sm text-zinc-400 dark:text-zinc-500 whitespace-nowrap">${parsed.length - i}</td>
                      ${fieldKeys.map(key => {
                        const val = sub._data[key]
                        const display = val !== undefined && val !== null && val !== '' ? esc(val) : '<span class="text-zinc-300 dark:text-zinc-600">&mdash;</span>'
                        return `<td class="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 max-w-xs truncate">${display}</td>`
                      }).join('')}
                      <td class="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">${formatDate(sub.submitted_at)}</td>
                      <td class="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onclick="viewSubmission('${esc(sub.id)}')"
                          class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-950/10 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          title="View details"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                        <button
                          onclick="deleteSubmission('${esc(sub.id)}')"
                          class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-950/10 dark:border-white/10 text-zinc-400 dark:text-zinc-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800 transition-colors"
                          title="Delete"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>

      <!-- Detail Modal -->
      <div id="detail-modal" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden ring-1 ring-zinc-950/5 dark:ring-white/10">
          <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-950/5 dark:border-white/5">
            <h2 class="text-base font-semibold text-zinc-950 dark:text-white">Submission Details</h2>
            <button onclick="closeModal()" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div id="detail-content" class="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-4">
          </div>
          <div class="px-6 py-3 border-t border-zinc-950/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end">
            <button onclick="closeModal()" class="px-4 py-1.5 text-sm font-medium rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
              Close
            </button>
          </div>
        </div>
      </div>

      <script>
        var submissionsData = ${JSON.stringify(parsed.map((s: any) => ({ id: s.id, data: s._data, submitted_at: s.submitted_at, ip_address: s.ip_address, user_agent: s.user_agent })))};

        function viewSubmission(id) {
          var sub = submissionsData.find(function(s) { return s.id === id });
          if (!sub) return;

          var content = document.getElementById('detail-content');
          content.textContent = '';

          // Timestamp
          var timeDiv = document.createElement('div');
          timeDiv.className = 'text-xs text-zinc-400 dark:text-zinc-500';
          timeDiv.textContent = new Date(sub.submitted_at).toLocaleString();
          content.appendChild(timeDiv);

          // Field values
          Object.keys(sub.data).forEach(function(key) {
            var group = document.createElement('div');

            var label = document.createElement('dt');
            label.className = 'text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1';
            label.textContent = key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^\\w/, function(c) { return c.toUpperCase() });

            var value = document.createElement('dd');
            value.className = 'text-sm text-zinc-900 dark:text-zinc-100';
            value.textContent = sub.data[key] || '—';

            group.appendChild(label);
            group.appendChild(value);
            content.appendChild(group);
          });

          // Metadata
          if (sub.ip_address) {
            var ipDiv = document.createElement('div');
            ipDiv.className = 'pt-3 border-t border-zinc-950/5 dark:border-white/5';

            var ipLabel = document.createElement('dt');
            ipLabel.className = 'text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1';
            ipLabel.textContent = 'IP Address';
            var ipVal = document.createElement('dd');
            ipVal.className = 'text-xs text-zinc-500 dark:text-zinc-400 font-mono';
            ipVal.textContent = sub.ip_address;

            ipDiv.appendChild(ipLabel);
            ipDiv.appendChild(ipVal);
            content.appendChild(ipDiv);
          }

          document.getElementById('detail-modal').classList.remove('hidden');
        }

        function closeModal() {
          document.getElementById('detail-modal').classList.add('hidden');
        }

        // Close on backdrop click
        document.getElementById('detail-modal').addEventListener('click', function(e) {
          if (e.target.id === 'detail-modal') closeModal();
        });

        // Close on Escape
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') closeModal();
        });

        function deleteSubmission(id) {
          if (!confirm('Delete this submission? This cannot be undone.')) return;
          fetch('/admin/forms/${formId}/submissions/' + id, { method: 'DELETE' })
            .then(function(res) {
              if (res.ok) location.reload();
            });
        }

        // Auto-open detail modal if only 1 submission
        if (submissionsData.length === 1) {
          viewSubmission(submissionsData[0].id);
        }
      </script>
    `

    const { renderAdminLayoutCatalyst } = await import('../templates/layouts/admin-layout-catalyst.template')

    return c.html(renderAdminLayoutCatalyst({
      title: `${form.display_name} Submissions`,
      content: pageContent,
      user: user ? { name: user.email.split('@')[0] || user.email, email: user.email, role: user.role } : undefined,
    }))
  } catch (error: any) {
    console.error('Error loading submissions:', error)
    return c.html('<p>Error loading submissions</p>', 500)
  }
})

// Delete a single submission
adminFormsRoutes.delete('/:id/submissions/:subId', async (c) => {
  try {
    const db = c.env.DB
    const formId = c.req.param('id')
    const subId = c.req.param('subId')

    const sub = await db.prepare('SELECT id FROM form_submissions WHERE id = ? AND form_id = ?')
      .bind(subId, formId)
      .first()

    if (!sub) {
      return c.json({ error: 'Submission not found' }, 404)
    }

    await db.prepare('DELETE FROM form_submissions WHERE id = ?').bind(subId).run()

    // Sync the cached count
    const countResult = await db.prepare('SELECT COUNT(*) AS cnt FROM form_submissions WHERE form_id = ?')
      .bind(formId)
      .first<{ cnt: number }>()

    await db.prepare('UPDATE forms SET submission_count = ? WHERE id = ?')
      .bind(countResult?.cnt ?? 0, formId)
      .run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting submission:', error)
    return c.json({ error: 'Failed to delete submission' }, 500)
  }
})

export default adminFormsRoutes
