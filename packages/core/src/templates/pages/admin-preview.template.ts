import { renderDynamicField, renderFieldGroup, FieldDefinition } from '../components/dynamic-field.template'
import { getQuillCDN, getQuillInitScript } from '../../plugins/core-plugins/quill-editor'

export interface PreviewPageData {
  collection: {
    id: string
    name: string
    display_name: string
    schema: any
  }
  content: {
    id?: string
    title?: string
    slug?: string
    status?: string
    data?: Record<string, any>
  }
  fields: FieldDefinition[]
  siteUrl: string
  apiUrl: string
  quillEnabled?: boolean
  quillSettings?: {
    version?: string
    defaultHeight?: number
    defaultToolbar?: string
    theme?: string
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

export function renderAdminPreviewPage(data: PreviewPageData): string {
  const { collection, content, fields, siteUrl, apiUrl } = data

  const contentTitle = content.title || 'New'

  // Field rendering -- same logic as admin-content-form.template.ts
  const getFieldValue = (fieldName: string) => {
    if (fieldName === 'title') return content.title || content.data?.[fieldName] || ''
    if (fieldName === 'slug') return content.slug || content.data?.[fieldName] || ''
    return content.data?.[fieldName] || ''
  }

  const pluginStatuses = {
    quillEnabled: data.quillEnabled || false,
    mdxeditorEnabled: false,
    tinymceEnabled: false
  }

  // Group fields same as content form
  const coreFields = fields.filter(f => ['title', 'slug', 'content'].includes(f.field_name))
  const contentFields = fields.filter(f => !['title', 'slug', 'content'].includes(f.field_name) && !f.field_name.startsWith('meta_'))
  const metaFields = fields.filter(f => f.field_name.startsWith('meta_'))

  const coreFieldsHTML = coreFields
    .sort((a, b) => a.field_order - b.field_order)
    .map(field => renderDynamicField(field, {
      value: getFieldValue(field.field_name),
      errors: [],
      pluginStatuses,
      collectionId: collection.id,
      contentId: content.id
    }))

  const contentFieldsHTML = contentFields
    .sort((a, b) => a.field_order - b.field_order)
    .map(field => renderDynamicField(field, {
      value: getFieldValue(field.field_name),
      errors: [],
      pluginStatuses,
      collectionId: collection.id,
      contentId: content.id
    }))

  const metaFieldsHTML = metaFields
    .sort((a, b) => a.field_order - b.field_order)
    .map(field => renderDynamicField(field, {
      value: getFieldValue(field.field_name),
      errors: [],
      pluginStatuses,
      collectionId: collection.id,
      contentId: content.id
    }))

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${escapeHtml(contentTitle)} | Flare CMS</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            zinc: {
              50: '#fafafa',
              100: '#f4f4f5',
              200: '#e4e4e7',
              300: '#d4d4d8',
              400: '#a1a1aa',
              500: '#71717a',
              600: '#52525b',
              700: '#3f3f46',
              800: '#27272a',
              900: '#18181b',
              950: '#09090b'
            },
            flare: {
              500: '#f97316'
            }
          }
        }
      }
    }
  </script>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Custom scrollbar for editor pane */
    #editor-pane::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    #editor-pane::-webkit-scrollbar-track {
      background: #27272a;
    }
    #editor-pane::-webkit-scrollbar-thumb {
      background: #52525b;
      border-radius: 4px;
    }
    #editor-pane::-webkit-scrollbar-thumb:hover {
      background: #71717a;
    }

    /* Disable transition on everything to avoid janky resize */
    #split-container * {
      transition: none !important;
    }
    /* Re-enable transitions for specific elements */
    #preview-overlay {
      transition: opacity 200ms ease !important;
    }
    #preview-iframe {
      transition: opacity 200ms ease !important;
    }
    #preview-status {
      transition: color 200ms ease !important;
    }
  </style>

  <!-- Scripts for rich text editors -->
  <script src="https://unpkg.com/htmx.org@2.0.3"></script>

  ${data.quillEnabled ? getQuillCDN(data.quillSettings?.version) : '<!-- Quill not active -->'}

  <!-- CSRF: Auto-attach token to fetch requests -->
  <script>
    function getCsrfToken() {
      var cookie = document.cookie.split('; ')
        .find(function(row) { return row.startsWith('csrf_token='); });
      return cookie ? cookie.split('=')[1] : '';
    }
  </script>
</head>
<body class="bg-zinc-900 text-white overflow-hidden">

  <!-- Top bar -->
  <div class="h-12 flex items-center justify-between px-4 bg-zinc-800 border-b border-zinc-700">
    <a
      href="#"
      onclick="goBack(); return false;"
      class="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
      </svg>
      Back to editor
    </a>
    <span class="text-sm text-zinc-500">Live Preview</span>
    <span id="preview-status" class="text-xs text-zinc-500">Ready</span>
  </div>

  <!-- Split pane container -->
  <div id="split-container" class="flex" style="height: calc(100vh - 48px);">

    <!-- Editor pane (left) -->
    <div id="editor-pane" style="width: 40%; min-width: 300px; overflow-y: auto;" class="p-6 bg-zinc-900">
      <form id="preview-form">
        <input type="hidden" name="collection_id" value="${escapeHtml(collection.id)}">
        <input type="hidden" name="id" value="${escapeHtml(content.id || '')}">
        <input type="hidden" name="collection_name" value="${escapeHtml(collection.name)}">

        ${renderFieldGroup('Basic Information', coreFieldsHTML)}
        ${contentFields.length > 0 ? renderFieldGroup('Content Details', contentFieldsHTML) : ''}
        ${metaFields.length > 0 ? renderFieldGroup('SEO & Metadata', metaFieldsHTML, true) : ''}
      </form>
    </div>

    <!-- Draggable divider -->
    <div id="divider" class="w-1 bg-zinc-700 hover:bg-orange-500 cursor-col-resize flex-shrink-0" style="transition: background-color 150ms ease !important;"></div>

    <!-- Preview pane (right) -->
    <div id="preview-pane" style="flex: 1; position: relative; min-width: 300px;">
      <div id="preview-overlay" class="absolute inset-0 bg-zinc-900/60 flex items-center justify-center pointer-events-none opacity-0 z-10">
        <div class="flex items-center gap-2">
          <svg class="animate-spin h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm text-zinc-400">Updating preview...</span>
        </div>
      </div>
      <iframe id="preview-iframe" class="w-full h-full border-none" src="about:blank"></iframe>
    </div>

  </div>

  ${data.quillEnabled ? getQuillInitScript() : '<!-- Quill init not needed -->'}

  <script>
    // --- Config ---
    var SITE_URL = '${escapeJs(siteUrl)}';
    var API_URL = '${escapeJs(apiUrl)}';
    var COLLECTION = '${escapeJs(collection.name)}';
    var CONTENT_ID = '${escapeJs(content.id || 'new')}';
    var CONTENT_SLUG = '${escapeJs(content.slug || '')}';
    var DEBOUNCE_MS = 500;

    // --- Elements ---
    var editorPane = document.getElementById('editor-pane');
    var divider = document.getElementById('divider');
    var previewPane = document.getElementById('preview-pane');
    var splitContainer = document.getElementById('split-container');
    var iframe = document.getElementById('preview-iframe');
    var overlay = document.getElementById('preview-overlay');
    var statusEl = document.getElementById('preview-status');
    var form = document.getElementById('preview-form');
    var debounceTimer = null;

    // --- Back navigation ---
    function goBack() {
      var contentId = form.querySelector('[name="id"]').value;
      if (contentId) {
        window.location.href = '/admin/content/' + contentId + '/edit';
      } else {
        window.history.back();
      }
    }

    // --- Draggable divider ---
    var isDragging = false;

    divider.addEventListener('mousedown', function(e) {
      isDragging = true;
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      // Prevent iframe from capturing mouse events during drag
      iframe.style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;

      var containerRect = splitContainer.getBoundingClientRect();
      var offsetX = e.clientX - containerRect.left;
      var containerWidth = containerRect.width;
      var dividerWidth = divider.offsetWidth;

      // Enforce min width of 300px on each side
      var minWidth = 300;
      if (offsetX < minWidth) offsetX = minWidth;
      if (offsetX > containerWidth - minWidth - dividerWidth) {
        offsetX = containerWidth - minWidth - dividerWidth;
      }

      editorPane.style.width = offsetX + 'px';
      editorPane.style.flexShrink = '0';
    });

    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        iframe.style.pointerEvents = '';
      }
    });

    // --- Collect form data ---
    function collectFormData() {
      // Sync Quill editors if present
      var quillEditors = document.querySelectorAll('.ql-container');
      quillEditors.forEach(function(container) {
        var editorDiv = container.querySelector('.ql-editor');
        var hiddenInput = container.parentElement.querySelector('input[type="hidden"]');
        if (editorDiv && hiddenInput) {
          hiddenInput.value = editorDiv.innerHTML;
        }
      });

      var formData = new FormData(form);
      var data = {};
      var collectionId = formData.get('collection_id');
      var contentId = formData.get('id') || null;
      var collectionName = formData.get('collection_name');

      // Extract field values using sonicReadFieldValue if available
      var fieldWrappers = form.querySelectorAll('[data-field-name]');
      fieldWrappers.forEach(function(wrapper) {
        var fieldName = wrapper.dataset.fieldName;
        if (fieldName === 'collection_id' || fieldName === 'id' || fieldName === 'collection_name') return;

        if (typeof window.sonicReadFieldValue === 'function') {
          data[fieldName] = window.sonicReadFieldValue(wrapper);
        } else {
          // Fallback: read from form data
          var val = formData.get(fieldName);
          if (val !== null) data[fieldName] = val;
        }
      });

      // Also grab title/slug from direct inputs if not captured
      if (!data.title) {
        var titleInput = form.querySelector('[name="title"]');
        if (titleInput) data.title = titleInput.value;
      }
      if (!data.slug) {
        var slugInput = form.querySelector('[name="slug"]');
        if (slugInput) data.slug = slugInput.value;
      }

      return {
        collectionId: collectionId,
        contentId: contentId,
        title: data.title || '',
        slug: data.slug || CONTENT_SLUG,
        data: data
      };
    }

    // --- Update preview ---
    function updatePreview(token) {
      // Show overlay
      overlay.style.opacity = '1';
      statusEl.textContent = 'Updating...';
      statusEl.style.color = '#f97316';

      // Build preview URL
      var slug = collectFormData().slug || CONTENT_SLUG || CONTENT_ID;
      var previewUrl = SITE_URL + '/preview/' + COLLECTION + '/' + slug + '?token=' + encodeURIComponent(token);

      iframe.src = previewUrl;
    }

    iframe.addEventListener('load', function() {
      // Hide overlay when iframe finishes loading
      overlay.style.opacity = '0';
      statusEl.textContent = 'Ready';
      statusEl.style.color = '';
    });

    // --- Save draft and refresh ---
    function saveDraftAndRefresh() {
      var payload = collectFormData();

      statusEl.textContent = 'Saving draft...';
      statusEl.style.color = '#f97316';

      fetch(API_URL + '/api/preview/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Draft save failed: ' + response.status);
        return response.json();
      })
      .then(function(result) {
        if (result.token) {
          updatePreview(result.token);
        }
      })
      .catch(function(err) {
        console.error('Draft save error:', err);
        statusEl.textContent = 'Error saving draft';
        statusEl.style.color = '#ef4444';
        overlay.style.opacity = '0';
      });
    }

    // --- Debounced form change handler ---
    function onFormChange() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(saveDraftAndRefresh, DEBOUNCE_MS);
    }

    // --- Attach listeners ---
    function attachFormListeners() {
      // Listen for input/change events on all form fields
      form.addEventListener('input', onFormChange);
      form.addEventListener('change', onFormChange);

      // Also observe Quill editors via MutationObserver
      var quillEditors = document.querySelectorAll('.ql-editor');
      quillEditors.forEach(function(editor) {
        var observer = new MutationObserver(onFormChange);
        observer.observe(editor, { childList: true, subtree: true, characterData: true });
      });
    }

    // --- Initial load ---
    document.addEventListener('DOMContentLoaded', function() {
      attachFormListeners();

      // Trigger initial preview after a short delay to let editors initialize
      setTimeout(saveDraftAndRefresh, 300);
    });
  </script>

</body>
</html>`
}