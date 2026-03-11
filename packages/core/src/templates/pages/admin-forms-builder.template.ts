import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../layouts/admin-layout-catalyst.template'

export interface FormBuilderPageData {
  id: string
  name: string
  display_name: string
  description?: string
  category?: string
  formio_schema: any
  settings?: any
  is_active?: boolean
  is_public?: boolean
  google_maps_api_key?: string
  turnstile_site_key?: string
  user?: {
    name: string
    email: string
    role: string
  }
  version?: string
}

// Inline Turnstile component for Form.io builder
function getTurnstileComponentScript(): string {
  return `
    (function() {
      'use strict';

      if (!window.Formio || !window.Formio.Components) {
        console.error('Form.io library not loaded');
        return;
      }

      const FieldComponent = Formio.Components.components.field;

      class TurnstileComponent extends FieldComponent {
        static schema(...extend) {
          return FieldComponent.schema({
            type: 'turnstile',
            label: 'Turnstile Verification',
            key: 'turnstile',
            input: true,
            persistent: false,
            protected: true,
            unique: false,
            hidden: false,
            clearOnHide: true,
            tableView: false,
            validate: {
              required: false
            },
            siteKey: '',
            theme: 'auto',
            size: 'normal',
            action: '',
            appearance: 'always',
            errorMessage: 'Please complete the security verification'
          }, ...extend);
        }

        static get builderInfo() {
          return {
            title: 'Turnstile',
            group: 'premium',
            icon: 'fa fa-shield-alt',
            weight: 120,
            documentation: '/admin/forms/docs#turnstile',
            schema: TurnstileComponent.schema()
          };
        }

        constructor(component, options, data) {
          super(component, options, data);
          this.widgetId = null;
          this.scriptLoaded = false;
        }

        init() {
          super.init();
          // Only load script if NOT in builder/edit mode
          if (!this.options.editMode && !this.options.builder && !this.builderMode) {
            this.loadTurnstileScript();
          }
        }

        loadTurnstileScript() {
          // Extra safety: never load in builder
          if (this.options.editMode || this.options.builder || this.builderMode) {
            console.log('Turnstile: Skipping script load in builder mode');
            return Promise.resolve();
          }

          if (window.turnstile) {
            this.scriptLoaded = true;
            return Promise.resolve();
          }

          if (this.scriptPromise) {
            return this.scriptPromise;
          }

          console.log('Turnstile: Loading script for form mode');
          this.scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.defer = true;
            script.onload = () => {
              this.scriptLoaded = true;
              resolve();
            };
            script.onerror = () => reject(new Error('Failed to load Turnstile'));
            document.head.appendChild(script);
          });

          return this.scriptPromise;
        }

        render() {
          return super.render(\`
            <div ref="turnstileContainer" class="formio-component-turnstile">
              <div ref="turnstileWidget" style="margin: 10px 0;"></div>
              \${this.component.description ? \`<div class="help-block">\${this.component.description}</div>\` : ''}
            </div>
          \`);
        }

        attach(element) {
          this.loadRefs(element, {
            turnstileContainer: 'single',
            turnstileWidget: 'single'
          });

          const superAttach = super.attach(element);

          // Check if we're in builder mode or form mode
          if (this.options.editMode || this.options.builder) {
            // Builder mode - show placeholder only
            this.renderPlaceholder();
          } else {
            // Form mode - render actual widget
            this.loadTurnstileScript()
              .then(() => this.renderWidget())
              .catch(err => {
                console.error('Failed to load Turnstile:', err);
                if (this.refs.turnstileWidget) {
                  this.refs.turnstileWidget.innerHTML = \`
                    <div class="alert alert-danger" style="padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
                      <strong>Error:</strong> Failed to load security verification
                    </div>
                  \`;
                }
              });
          }

          return superAttach;
        }

        renderPlaceholder() {
          if (!this.refs.turnstileWidget) {
            return;
          }
          
          this.refs.turnstileWidget.innerHTML = \`
            <div style="
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 8px;
              color: white;
              text-align: center;
              border: 2px dashed rgba(255,255,255,0.3);
            ">
              <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
              <div style="font-weight: 600; margin-bottom: 4px;">Turnstile Verification</div>
              <div style="font-size: 12px; opacity: 0.9;">CAPTCHA-free bot protection by Cloudflare</div>
              <div style="font-size: 11px; margin-top: 8px; opacity: 0.7;">Widget will appear here on the live form</div>
            </div>
          \`;
        }

        renderWidget() {
          if (!this.refs.turnstileWidget || !window.turnstile) {
            return;
          }

          this.refs.turnstileWidget.innerHTML = '';

          const siteKey = this.component.siteKey || 
                          (this.root && this.root.options && this.root.options.turnstileSiteKey) || 
                          '';
          
          if (!siteKey) {
            this.refs.turnstileWidget.innerHTML = \`
              <div class="alert alert-warning" style="padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                <strong>⚠️ Configuration Required:</strong> Turnstile site key not configured. 
                Please enable the Turnstile plugin in Settings → Plugins.
              </div>
            \`;
            return;
          }

          try {
            const self = this;
            this.widgetId = window.turnstile.render(this.refs.turnstileWidget, {
              sitekey: siteKey,
              theme: this.component.theme || 'auto',
              size: this.component.size || 'normal',
              action: this.component.action || '',
              appearance: this.component.appearance || 'always',
              callback: function(token) {
                self.updateValue(token);
                self.triggerChange();
              },
              'error-callback': function() {
                self.updateValue(null);
                self.setCustomValidity(self.component.errorMessage || 'Security verification failed');
              },
              'expired-callback': function() {
                self.updateValue(null);
                self.setCustomValidity('Security verification expired. Please verify again.');
              },
              'timeout-callback': function() {
                self.updateValue(null);
                self.setCustomValidity('Security verification timed out. Please try again.');
              }
            });
          } catch (err) {
            console.error('Failed to render Turnstile widget:', err);
            this.refs.turnstileWidget.innerHTML = \`
              <div class="alert alert-danger" style="padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
                <strong>Error:</strong> Failed to render security verification
              </div>
            \`;
          }
        }

        detach() {
          if (this.widgetId !== null && window.turnstile) {
            try {
              window.turnstile.remove(this.widgetId);
              this.widgetId = null;
            } catch (err) {
              console.error('Failed to remove Turnstile widget:', err);
            }
          }
          return super.detach();
        }

        getValue() {
          if (this.widgetId !== null && window.turnstile) {
            return window.turnstile.getResponse(this.widgetId);
          }
          return this.dataValue;
        }

        setValue(value, flags) {
          const changed = super.setValue(value, flags);
          return changed;
        }

        getValueAsString(value) {
          return value ? '✅ Verified' : '❌ Not Verified';
        }

        isEmpty(value) {
          return !value;
        }

        updateValue(value, flags) {
          const changed = super.updateValue(value, flags);
          
          if (value) {
            this.setCustomValidity('');
          }
          
          return changed;
        }

        checkValidity(data, dirty, row) {
          const result = super.checkValidity(data, dirty, row);
          
          if (this.component.validate && this.component.validate.required) {
            const value = this.getValue();
            if (!value) {
              this.setCustomValidity(this.component.errorMessage || 'Please complete the security verification');
              return false;
            }
          }
          
          return result;
        }
      }

      Formio.Components.addComponent('turnstile', TurnstileComponent);
      console.log('✅ Turnstile component registered with Form.io');
      window.TurnstileComponent = TurnstileComponent;
    })();
  `;
}

export function renderFormBuilderPage(data: FormBuilderPageData): string {
  const formioSchema = data.formio_schema || { components: [] }
  const settings = data.settings || {}
  const googleMapsApiKey = data.google_maps_api_key || ''
  const turnstileSiteKey = data.turnstile_site_key || ''

  const pageContent = `
    <style>
      /* ========================================
       * Form.io Builder — Catalyst Design System
       * Uses .dark class (not prefers-color-scheme)
       * to match admin layout's darkMode: 'class'
       * ======================================== */

      /* Hide loading spinner after Form.io loads */
      #builder-loading.hidden { display: none; }

      /* Builder container — Catalyst card (matches content table card) */
      #builder-container {
        min-height: 600px;
        width: 100%;
        background: white;
        border-radius: 0.75rem;
        border: 1px solid rgb(9 9 11 / 0.05);
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05);
        padding: 0;
        overflow: hidden;
      }

      .dark #builder-container {
        background: rgb(24 24 27);
        border-color: rgb(255 255 255 / 0.1);
      }

      /* Display type toggle buttons */
      .display-type-btn {
        background: white;
        color: #3f3f46;
        border: 1px solid rgb(9 9 11 / 0.1);
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      }

      .display-type-btn:hover {
        background: #f4f4f5;
      }

      .display-type-btn.active {
        background: #18181b;
        color: white;
        border-color: #18181b;
      }

      .dark .display-type-btn {
        background: rgb(39 39 42);
        color: #d4d4d8;
        border-color: rgb(255 255 255 / 0.1);
      }

      .dark .display-type-btn:hover {
        background: rgb(63 63 70);
      }

      .dark .display-type-btn.active {
        background: white;
        color: #18181b;
        border-color: white;
      }

      /* Force Bootstrap grid — sidebar + canvas layout */
      .formio.builder.row {
        display: flex !important;
        flex-wrap: wrap !important;
        margin: 0 !important;
        min-height: 600px;
      }

      /* Sidebar column */
      .formio.builder.row > .formcomponents {
        position: relative !important;
        width: 100% !important;
        padding: 16px !important;
        flex: 0 0 220px !important;
        max-width: 220px !important;
        background: #f8fafc;
        border-right: 1px solid rgb(9 9 11 / 0.05);
        max-height: 700px;
        overflow-y: auto;
        overflow-x: hidden;
      }

      /* Canvas column */
      .formio.builder.row > .formarea {
        position: relative !important;
        width: 100% !important;
        padding: 24px !important;
        flex: 1 1 0% !important;
        max-width: none !important;
        background: white !important;
        border: none !important;
        border-radius: 0 !important;
        min-height: 600px !important;
      }

      .dark .formio.builder.row > .formcomponents {
        background: rgb(24 24 27);
        border-right-color: rgb(255 255 255 / 0.07);
      }

      .dark .formio.builder.row > .formarea {
        background: rgb(39 39 42) !important;
      }

      /* Drop zone hint text */
      .formio.builder.row > .formarea .drag-container:empty::before {
        content: 'Drag and drop components here';
        display: block;
        padding: 80px 40px;
        text-align: center;
        color: #a1a1aa;
        font-size: 0.875rem;
        border: 2px dashed #e4e4e7;
        border-radius: 0.75rem;
        background: #f8fafc;
      }

      .dark .formio.builder.row > .formarea .drag-container:empty::before {
        color: #52525b;
        border-color: rgb(255 255 255 / 0.07);
        background: rgb(24 24 27);
      }

      @media (max-width: 768px) {
        .formio.builder.row > .formcomponents {
          flex: 0 0 160px !important;
          max-width: 160px !important;
        }
      }

      /* Sidebar search input */
      .formcomponents .builder-sidebar_search input {
        width: 100% !important;
        padding: 6px 10px !important;
        font-size: 0.8125rem !important;
        border-radius: 0.5rem !important;
        border: 1px solid rgb(9 9 11 / 0.1) !important;
        background: white !important;
        color: #18181b !important;
        outline: none !important;
        margin-bottom: 8px !important;
      }

      .formcomponents .builder-sidebar_search input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 2px rgb(59 130 246 / 0.15) !important;
      }

      .dark .formcomponents .builder-sidebar_search input {
        background: rgb(39 39 42) !important;
        border-color: rgb(255 255 255 / 0.1) !important;
        color: white !important;
      }

      /* Sidebar group titles (Layout, Basic, Advanced, etc.) */
      .formcomponents .card {
        background: transparent !important;
        border: none !important;
        margin: 0 !important;
        box-shadow: none !important;
      }

      .formcomponents .card-header {
        background: transparent !important;
        border: none !important;
        padding: 10px 0 4px !important;
      }

      .formcomponents .card-header .card-title,
      .formcomponents .card-header button,
      .formcomponents .card-header a {
        font-size: 0.6875rem !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        color: #a1a1aa !important;
        text-decoration: none !important;
        padding: 0 !important;
        background: none !important;
        border: none !important;
      }

      .formcomponents .card-body {
        padding: 0 !important;
      }

      /* Sidebar draggable component items */
      .formcomponent {
        background: white !important;
        border: 1px solid rgb(9 9 11 / 0.07) !important;
        border-radius: 0.5rem !important;
        padding: 7px 10px !important;
        margin: 3px 0 !important;
        font-weight: 500 !important;
        font-size: 0.8125rem !important;
        color: #3f3f46 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        visibility: visible !important;
        cursor: grab !important;
        transition: all 0.15s ease !important;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.03) !important;
        line-height: 1.4 !important;
      }

      .formcomponent i,
      .formcomponent .fa {
        font-size: 0.75rem !important;
        color: #a1a1aa !important;
        width: 16px !important;
        text-align: center !important;
      }

      .formcomponent span {
        font-size: 0.8125rem !important;
      }

      .formcomponent:hover {
        background: #f4f4f5 !important;
        border-color: rgb(9 9 11 / 0.12) !important;
        box-shadow: 0 2px 4px rgb(0 0 0 / 0.06) !important;
      }

      .formcomponent:active {
        cursor: grabbing !important;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.1) !important;
      }

      .dark .formcomponent {
        background: rgb(39 39 42) !important;
        border-color: rgb(255 255 255 / 0.08) !important;
        color: #d4d4d8 !important;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.2) !important;
      }

      .dark .formcomponent i,
      .dark .formcomponent .fa {
        color: #71717a !important;
      }

      .dark .formcomponent:hover {
        background: rgb(63 63 70) !important;
        border-color: rgb(255 255 255 / 0.15) !important;
      }

      /* Dropped components in canvas */
      .builder-component {
        background: white !important;
        padding: 16px !important;
        margin: 8px 0 !important;
        border: 1px solid rgb(9 9 11 / 0.07) !important;
        border-radius: 0.75rem !important;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.04) !important;
        transition: all 0.15s ease !important;
      }

      .builder-component:hover {
        border-color: rgb(9 9 11 / 0.12) !important;
        box-shadow: 0 2px 6px rgb(0 0 0 / 0.06) !important;
      }

      .dark .builder-component {
        background: rgb(24 24 27) !important;
        border-color: rgb(255 255 255 / 0.08) !important;
      }

      .dark .builder-component:hover {
        border-color: rgb(255 255 255 / 0.15) !important;
      }

      /* Component labels in canvas */
      .builder-component label,
      .formio-component label {
        color: #18181b !important;
        font-weight: 500 !important;
        font-size: 0.875rem !important;
      }

      .dark .builder-component label,
      .dark .formio-component label {
        color: #fafafa !important;
      }

      /* Form control inputs in canvas */
      .builder-component input.form-control,
      .builder-component select.form-control,
      .builder-component textarea.form-control {
        border-radius: 0.5rem !important;
        border: 1px solid rgb(9 9 11 / 0.1) !important;
        padding: 6px 10px !important;
        font-size: 0.875rem !important;
        background: #fafafa !important;
        color: #71717a !important;
      }

      .dark .builder-component input.form-control,
      .dark .builder-component select.form-control,
      .dark .builder-component textarea.form-control {
        background: rgb(39 39 42) !important;
        border-color: rgb(255 255 255 / 0.1) !important;
        color: #a1a1aa !important;
      }

      /* Component action toolbar — hidden until hover */
      .component-btn-group {
        background: white !important;
        padding: 3px !important;
        border-radius: 0.5rem !important;
        border: 1px solid rgb(9 9 11 / 0.08) !important;
        box-shadow: 0 4px 12px rgb(0 0 0 / 0.08) !important;
        gap: 2px !important;
        display: flex !important;
        opacity: 0 !important;
        transition: opacity 0.15s ease !important;
        pointer-events: none !important;
      }

      .builder-component:hover .component-btn-group,
      .formio-component:hover > .component-btn-group {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      .component-btn-group .btn {
        width: 28px !important;
        height: 28px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #71717a !important;
        font-size: 0.75rem !important;
        padding: 0 !important;
        border-radius: 0.375rem !important;
        border: 1px solid transparent !important;
        background: transparent !important;
        transition: all 0.15s ease !important;
      }

      .component-btn-group .btn:hover {
        background: #f4f4f5 !important;
        color: #18181b !important;
        border-color: rgb(9 9 11 / 0.08) !important;
      }

      /* Delete button gets red on hover */
      .component-btn-group .btn-danger,
      .component-btn-group .btn:last-child {
        color: #a1a1aa !important;
      }

      .component-btn-group .btn-danger:hover,
      .component-btn-group .btn:last-child:hover {
        background: #fef2f2 !important;
        color: #dc2626 !important;
        border-color: rgb(220 38 38 / 0.15) !important;
      }

      /* Hide the tooltip "Edit" label */
      .component-btn-group .btn[title] {
        font-size: 0 !important;
      }

      .component-btn-group .btn[title] i,
      .component-btn-group .btn[title] .fa {
        font-size: 0.75rem !important;
      }

      .dark .component-btn-group {
        background: rgb(39 39 42) !important;
        border-color: rgb(255 255 255 / 0.1) !important;
        box-shadow: 0 4px 12px rgb(0 0 0 / 0.25) !important;
      }

      .dark .component-btn-group .btn {
        color: #a1a1aa !important;
      }

      .dark .component-btn-group .btn:hover {
        background: rgb(63 63 70) !important;
        color: white !important;
        border-color: rgb(255 255 255 / 0.1) !important;
      }

      .dark .component-btn-group .btn-danger:hover,
      .dark .component-btn-group .btn:last-child:hover {
        background: rgb(127 29 29 / 0.3) !important;
        color: #fca5a5 !important;
        border-color: rgb(220 38 38 / 0.3) !important;
      }

      /* Bootstrap collapse — sidebar accordions */
      #builder-container .collapse {
        display: none !important;
      }

      #builder-container .collapse.show {
        display: block !important;
      }

      #builder-container .collapsing {
        display: block !important;
        height: 0;
        overflow: hidden;
        transition: height 0.2s ease;
      }

      /* Submit / button components in canvas */
      .builder-component .btn-primary,
      .formarea .btn-primary {
        background: #18181b !important;
        border-color: #18181b !important;
        color: white !important;
        border-radius: 0.5rem !important;
        padding: 8px 20px !important;
        font-weight: 500 !important;
        font-size: 0.875rem !important;
      }

      .dark .builder-component .btn-primary,
      .dark .formarea .btn-primary {
        background: white !important;
        border-color: white !important;
        color: #18181b !important;
      }

      /* ===================================
       * Form.io Component Edit Dialog
       * =================================== */

      /* Overlay backdrop */
      .formio-dialog {
        z-index: 10000 !important;
        background: rgb(0 0 0 / 0.4) !important;
        backdrop-filter: blur(2px);
      }

      /* Lock body scroll when dialog is open */
      body:has(.formio-dialog) {
        overflow: hidden !important;
      }

      /* Dialog container — wider to fit tabs + preview panel */
      .formio-dialog .formio-dialog-content {
        background: white !important;
        border-radius: 0.75rem !important;
        max-width: 860px !important;
        width: 90vw !important;
        box-shadow: 0 20px 60px -12px rgb(0 0 0 / 0.25) !important;
        border: 1px solid rgb(9 9 11 / 0.05) !important;
        padding: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        font-family: ui-sans-serif, system-ui, sans-serif !important;
        max-height: 85vh !important;
      }

      /* Component title header area */
      .formio-dialog .formio-dialog-content > .row:first-child,
      .formio-dialog .formio-dialog-content > div:first-child {
        padding: 20px 24px 0 !important;
      }

      /* Component type heading */
      .formio-dialog .component-edit-header,
      .formio-dialog .formio-dialog-content > .row:first-child h4,
      .formio-dialog .formio-dialog-content h4 {
        font-size: 1rem !important;
        font-weight: 600 !important;
        color: #18181b !important;
        margin: 0 0 12px !important;
        padding: 0 !important;
      }

      /* Hide the broken Help button */
      .formio-dialog .formio-dialog-content .help-button,
      .formio-dialog .formio-dialog-content a[href*="help"],
      .formio-dialog .formio-dialog-content .pull-right:has(i.fa-question-circle),
      .formio-dialog .formio-dialog-content > .row:first-child .pull-right {
        display: none !important;
      }

      /* Close X button */
      .formio-dialog-close {
        top: 16px !important;
        right: 16px !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 0.375rem !important;
        background: transparent !important;
        color: #71717a !important;
        font-size: 1.25rem !important;
        transition: all 0.15s ease !important;
      }

      .formio-dialog-close:hover {
        background: #f4f4f5 !important;
        color: #18181b !important;
      }

      /* Tab navigation (Display, Data, Validation, API, etc.) */
      .formio-dialog .nav-tabs,
      .formio-dialog .formio-component-tabs > .card > .card-header > .nav-tabs {
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 0 !important;
        border-bottom: 1px solid rgb(9 9 11 / 0.07) !important;
        padding: 0 24px !important;
        margin: 0 !important;
        background: #fafafa !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
      }

      .formio-dialog .nav-tabs::-webkit-scrollbar {
        display: none !important;
      }

      .formio-dialog .nav-tabs .nav-item,
      .formio-dialog .nav-tabs li {
        list-style: none !important;
        margin: 0 !important;
      }

      .formio-dialog .nav-tabs .nav-link,
      .formio-dialog .nav-tabs li a {
        display: block !important;
        padding: 10px 14px !important;
        font-size: 0.8125rem !important;
        font-weight: 500 !important;
        color: #71717a !important;
        text-decoration: none !important;
        border: none !important;
        border-bottom: 2px solid transparent !important;
        background: transparent !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        white-space: nowrap !important;
      }

      .formio-dialog .nav-tabs .nav-link:hover,
      .formio-dialog .nav-tabs li a:hover {
        color: #18181b !important;
        background: transparent !important;
      }

      .formio-dialog .nav-tabs .nav-link.active,
      .formio-dialog .nav-tabs li.active a,
      .formio-dialog .nav-tabs li a.active {
        color: #18181b !important;
        border-bottom-color: #18181b !important;
        background: transparent !important;
      }

      /* Tab content area */
      .formio-dialog .tab-content,
      .formio-dialog .card-body {
        padding: 20px 24px !important;
        background: white !important;
      }

      /* Preview panel styling */
      .formio-dialog .component-preview {
        border-left: 1px solid rgb(9 9 11 / 0.07) !important;
        background: #fafafa !important;
        padding: 16px !important;
      }

      /* Labels in dialog */
      .formio-dialog label,
      .formio-dialog .control-label,
      .formio-dialog .col-form-label {
        font-size: 0.8125rem !important;
        font-weight: 600 !important;
        color: #18181b !important;
        margin-bottom: 4px !important;
        display: block !important;
      }

      /* Help icons (tooltip triggers) */
      .formio-dialog .fa-question-sign,
      .formio-dialog .fa-question-circle {
        color: #a1a1aa !important;
        font-size: 0.75rem !important;
        margin-left: 4px !important;
        cursor: help !important;
      }

      /* Text inputs, textareas, selects in dialog */
      .formio-dialog input[type="text"],
      .formio-dialog input[type="number"],
      .formio-dialog input[type="email"],
      .formio-dialog input[type="url"],
      .formio-dialog input[type="password"],
      .formio-dialog textarea,
      .formio-dialog select,
      .formio-dialog .form-control {
        width: 100% !important;
        padding: 7px 11px !important;
        font-size: 0.875rem !important;
        line-height: 1.5 !important;
        color: #18181b !important;
        background: white !important;
        border: 1px solid rgb(9 9 11 / 0.1) !important;
        border-radius: 0.5rem !important;
        outline: none !important;
        transition: border-color 0.15s ease !important;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.04) !important;
      }

      .formio-dialog input:focus,
      .formio-dialog textarea:focus,
      .formio-dialog select:focus,
      .formio-dialog .form-control:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 2px rgb(59 130 246 / 0.12) !important;
      }

      .formio-dialog textarea {
        min-height: 60px !important;
        resize: vertical !important;
      }

      /* Select dropdowns */
      .formio-dialog .choices__inner,
      .formio-dialog .formio-choices .form-control {
        border: 1px solid rgb(9 9 11 / 0.1) !important;
        border-radius: 0.5rem !important;
        background: white !important;
        min-height: 36px !important;
        padding: 4px 8px !important;
      }

      /* Checkboxes in dialog */
      .formio-dialog input[type="checkbox"] {
        width: 16px !important;
        height: 16px !important;
        border-radius: 0.25rem !important;
        accent-color: #18181b !important;
        margin-right: 6px !important;
        vertical-align: middle !important;
        cursor: pointer !important;
        padding: 0 !important;
        box-shadow: none !important;
      }

      .formio-dialog .checkbox label,
      .formio-dialog .form-check-label {
        font-weight: 500 !important;
        font-size: 0.8125rem !important;
        color: #3f3f46 !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        cursor: pointer !important;
      }

      /* Form groups spacing */
      .formio-dialog .form-group {
        margin-bottom: 16px !important;
      }

      /* Required asterisk */
      .formio-dialog .field-required::after {
        color: #ef4444 !important;
      }

      /* ACE editor / code editor areas */
      .formio-dialog .ace_editor {
        border-radius: 0.5rem !important;
        border: 1px solid rgb(9 9 11 / 0.1) !important;
      }

      /* Dialog footer / action buttons area */
      .formio-dialog .formio-dialog-content > .row:last-child,
      .formio-dialog .component-edit-container > .row:last-child {
        padding: 16px 24px !important;
        border-top: 1px solid rgb(9 9 11 / 0.07) !important;
        background: #fafafa !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 8px !important;
      }

      /* Save / Cancel / Remove buttons in dialog */
      .formio-dialog .btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 7px 16px !important;
        font-size: 0.8125rem !important;
        font-weight: 500 !important;
        border-radius: 0.5rem !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        border: 1px solid transparent !important;
        line-height: 1.4 !important;
      }

      .formio-dialog .btn-primary,
      .formio-dialog .btn-success {
        background: #18181b !important;
        color: white !important;
        border-color: #18181b !important;
      }

      .formio-dialog .btn-primary:hover,
      .formio-dialog .btn-success:hover {
        background: #27272a !important;
      }

      .formio-dialog .btn-default,
      .formio-dialog .btn-secondary {
        background: white !important;
        color: #3f3f46 !important;
        border-color: rgb(9 9 11 / 0.1) !important;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.04) !important;
      }

      .formio-dialog .btn-default:hover,
      .formio-dialog .btn-secondary:hover {
        background: #f4f4f5 !important;
      }

      .formio-dialog .btn-danger {
        background: white !important;
        color: #dc2626 !important;
        border-color: rgb(220 38 38 / 0.2) !important;
      }

      .formio-dialog .btn-danger:hover {
        background: #fef2f2 !important;
        border-color: rgb(220 38 38 / 0.3) !important;
      }

      /* Panels inside dialog (e.g. well, fieldset previews) */
      .formio-dialog .card,
      .formio-dialog .panel {
        border: 1px solid rgb(9 9 11 / 0.07) !important;
        border-radius: 0.5rem !important;
        box-shadow: none !important;
        background: white !important;
      }

      .formio-dialog .card-header,
      .formio-dialog .panel-heading {
        background: #fafafa !important;
        border-bottom: 1px solid rgb(9 9 11 / 0.05) !important;
        padding: 10px 16px !important;
        font-weight: 600 !important;
        font-size: 0.8125rem !important;
        color: #18181b !important;
      }

      /* Well sections */
      .formio-dialog .well {
        background: #f8fafc !important;
        border: 1px solid rgb(9 9 11 / 0.05) !important;
        border-radius: 0.5rem !important;
        padding: 12px 16px !important;
        box-shadow: none !important;
      }

      /* Help text / descriptions */
      .formio-dialog .help-block,
      .formio-dialog .form-text {
        font-size: 0.75rem !important;
        color: #a1a1aa !important;
        margin-top: 4px !important;
      }

      /* Table in dialog (e.g. data tab value lists) */
      .formio-dialog table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      .formio-dialog table th {
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        color: #71717a !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        padding: 8px 12px !important;
        border-bottom: 1px solid rgb(9 9 11 / 0.07) !important;
        text-align: left !important;
      }

      .formio-dialog table td {
        padding: 8px 12px !important;
        border-bottom: 1px solid rgb(9 9 11 / 0.04) !important;
        font-size: 0.8125rem !important;
        color: #3f3f46 !important;
      }

      /* Alert/info boxes in dialog */
      .formio-dialog .alert-info {
        background: #f0f9ff !important;
        border: 1px solid #bae6fd !important;
        border-radius: 0.5rem !important;
        color: #0c4a6e !important;
        padding: 10px 14px !important;
        font-size: 0.8125rem !important;
      }

      .formio-dialog .alert-warning {
        background: #fffbeb !important;
        border: 1px solid #fde68a !important;
        border-radius: 0.5rem !important;
        color: #92400e !important;
        padding: 10px 14px !important;
        font-size: 0.8125rem !important;
      }

      /* ===================================
       * Preview Modal Styling
       * =================================== */

      #preview-container {
        background: #ffffff !important;
        color: #18181b !important;
      }

      #preview-container .formio-form {
        background: #ffffff !important;
      }

      #preview-container .form-group {
        margin-bottom: 1.5rem;
      }

      #preview-container label {
        display: block !important;
        margin-bottom: 0.5rem !important;
        font-weight: 500 !important;
        color: #3f3f46 !important;
        font-size: 0.875rem !important;
      }

      #preview-container input[type="text"],
      #preview-container input[type="number"],
      #preview-container input[type="email"],
      #preview-container input[type="tel"],
      #preview-container select,
      #preview-container textarea {
        display: block !important;
        width: 100% !important;
        padding: 0.5rem 0.75rem !important;
        font-size: 0.875rem !important;
        line-height: 1.5 !important;
        color: #18181b !important;
        background-color: #ffffff !important;
        border: 1px solid rgb(9 9 11 / 0.1) !important;
        border-radius: 0.5rem !important;
        transition: border-color 0.15s ease !important;
      }

      #preview-container input:focus,
      #preview-container select:focus,
      #preview-container textarea:focus {
        outline: none !important;
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 2px rgb(59 130 246 / 0.15) !important;
      }

      #preview-container .btn {
        display: inline-block !important;
        padding: 0.5rem 1.25rem !important;
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        line-height: 1.5 !important;
        text-align: center !important;
        border-radius: 0.5rem !important;
        border: 1px solid transparent !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
      }

      #preview-container .btn-primary {
        color: #ffffff !important;
        background-color: #18181b !important;
        border-color: #18181b !important;
      }

      #preview-container .btn-primary:hover {
        background-color: #27272a !important;
      }

      #preview-container .row {
        display: flex !important;
        flex-wrap: wrap !important;
        margin-right: -0.75rem !important;
        margin-left: -0.75rem !important;
      }

      #preview-container .col,
      #preview-container [class*="col-"] {
        position: relative !important;
        width: 100% !important;
        padding-right: 0.75rem !important;
        padding-left: 0.75rem !important;
      }

      #preview-container .col-xs-3 { flex: 0 0 25% !important; max-width: 25% !important; }
      #preview-container .col-xs-4 { flex: 0 0 33.333333% !important; max-width: 33.333333% !important; }
      #preview-container .col-xs-5 { flex: 0 0 41.666667% !important; max-width: 41.666667% !important; }

      /* Required asterisk */
      .field-required::after {
        color: #ef4444 !important;
      }

      /* Drag placeholder */
      .formio-builder .ui-sortable-placeholder {
        background: rgb(59 130 246 / 0.05) !important;
        border: 2px dashed rgb(59 130 246 / 0.25) !important;
        border-radius: 0.75rem !important;
        min-height: 48px !important;
      }

      /* Form.io default "Drag and Drop" text in formarea */
      .formarea > .formio-drop-zone,
      .formarea > div > .formio-drop-zone {
        color: #a1a1aa !important;
        font-size: 0.875rem !important;
      }

      .dark .formarea > .formio-drop-zone,
      .dark .formarea > div > .formio-drop-zone {
        color: #52525b !important;
      }
    </style>

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
                Form Builder: ${data.display_name}
              </h1>
              <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">
                <span class="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20">
                  ${data.name}
                </span>
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              id="preview-btn"
              type="button"
              class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>

            <button
              id="save-btn"
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3 py-1.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Save Form
            </button>

            <a
              href="/forms/${data.name}"
              target="_blank"
              class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
              title="Open public form in new tab"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Public Form
            </a>

            <a
              href="/admin/forms/${data.id}/submissions"
              class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Submissions
            </a>
          </div>
        </div>
      </div>

      <!-- Display Type Toggle -->
      <div class="mb-6 flex items-center gap-3">
        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Display:</span>
        <div class="flex gap-1">
          <button
            id="display-form-btn"
            class="display-type-btn active inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
            data-display="form"
          >
            Single Page
          </button>
          <button
            id="display-wizard-btn"
            class="display-type-btn inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
            data-display="wizard"
          >
            Multi-Page Wizard
          </button>
        </div>
        <span class="text-xs text-zinc-500 dark:text-zinc-400" id="wizard-hint" style="display: none;">
          Use <strong>Panel</strong> components (Layout tab) for each page
        </span>
      </div>

      <!-- Success/Error Messages -->
      <div id="notification-container"></div>

      <!-- Loading State -->
      <div id="builder-loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <svg class="animate-spin h-12 w-12 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-4 text-zinc-500 dark:text-zinc-400">Loading Form Builder...</p>
        </div>
      </div>

      <!-- Form.io Builder Container -->
      <div id="builder-container" style="display: none;"></div>

      <!-- Preview Modal -->
      <div id="preview-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div class="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
            <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Form Preview</h2>
            <button
              id="close-preview-btn"
              type="button"
              class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-zinc-800">
            <div id="preview-container" class="bg-white rounded-lg p-6 shadow-sm"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form.io CSS -->
    <link rel="stylesheet" href="https://cdn.form.io/formiojs/formio.full.min.css">

    <!-- Google Maps API will be loaded dynamically based on component configuration -->

    <!-- Form.io JS -->
    <script src="https://cdn.form.io/formiojs/formio.full.min.js"></script>
    
    <!-- Turnstile Component Registration -->
    <script>
${getTurnstileComponentScript()}
    </script>

    <!-- Builder Integration Script -->
    <script>
      (function() {
        const formId = '${data.id}';
        const existingSchema = ${JSON.stringify(formioSchema)};
        const GOOGLE_MAPS_API_KEY = '${googleMapsApiKey}'; // Global fallback
        let builder;
        let hasUnsavedChanges = false;

        // Configure Form.io
        Formio.setBaseUrl('https://api.form.io');

        // Show notification helper
        function showNotification(message, type = 'info') {
          const container = document.getElementById('notification-container');
          const colors = {
            success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
            error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
            info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
          };

          const notification = document.createElement('div');
          notification.className = \`mb-4 rounded-lg p-4 border \${colors[type] || colors.info}\`;
          notification.innerHTML = \`
            <div class="flex items-center">
              <svg class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
              </svg>
              <p class="text-sm">\${message}</p>
            </div>
          \`;

          container.appendChild(notification);

          // Auto-remove after 5 seconds
          setTimeout(() => {
            notification.remove();
          }, 5000);
        }

        // Confirmation dialog helper (Catalyst-styled)
        function showConfirmDialog(title, message, onConfirm) {
          // Create backdrop
          var backdrop = document.createElement('div');
          backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:50000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)';

          // Create dialog card
          var dialog = document.createElement('div');
          dialog.style.cssText = 'background:white;border-radius:0.75rem;max-width:400px;width:90%;box-shadow:0 20px 60px -12px rgba(0,0,0,0.25);border:1px solid rgba(9,9,11,0.05);overflow:hidden;font-family:ui-sans-serif,system-ui,sans-serif';

          // Header
          var header = document.createElement('div');
          header.style.cssText = 'padding:20px 24px 0';
          var h3 = document.createElement('h3');
          h3.style.cssText = 'font-size:1rem;font-weight:600;color:#18181b;margin:0';
          h3.textContent = title;
          header.appendChild(h3);
          dialog.appendChild(header);

          // Body
          var body = document.createElement('div');
          body.style.cssText = 'padding:12px 24px 20px';
          var p = document.createElement('p');
          p.style.cssText = 'font-size:0.875rem;color:#71717a;margin:0;line-height:1.5';
          p.textContent = message;
          body.appendChild(p);
          dialog.appendChild(body);

          // Footer with buttons
          var footer = document.createElement('div');
          footer.style.cssText = 'padding:16px 24px;border-top:1px solid rgba(9,9,11,0.07);background:#fafafa;display:flex;justify-content:flex-end;gap:8px';

          var cancelBtn = document.createElement('button');
          cancelBtn.style.cssText = 'padding:7px 16px;font-size:0.8125rem;font-weight:500;border-radius:0.5rem;border:1px solid rgba(9,9,11,0.1);background:white;color:#3f3f46;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.04)';
          cancelBtn.textContent = 'Cancel';

          var confirmBtn = document.createElement('button');
          confirmBtn.style.cssText = 'padding:7px 16px;font-size:0.8125rem;font-weight:500;border-radius:0.5rem;border:1px solid transparent;background:#dc2626;color:white;cursor:pointer';
          confirmBtn.textContent = 'Remove';

          cancelBtn.addEventListener('click', function() {
            backdrop.remove();
          });

          confirmBtn.addEventListener('click', function() {
            backdrop.remove();
            onConfirm();
          });

          // Close on backdrop click
          backdrop.addEventListener('click', function(e) {
            if (e.target === backdrop) backdrop.remove();
          });

          // Close on Escape
          var escHandler = function(e) {
            if (e.key === 'Escape') {
              backdrop.remove();
              document.removeEventListener('keydown', escHandler);
            }
          };
          document.addEventListener('keydown', escHandler);

          footer.appendChild(cancelBtn);
          footer.appendChild(confirmBtn);
          dialog.appendChild(footer);
          backdrop.appendChild(dialog);
          document.body.appendChild(backdrop);

          // Focus the cancel button by default (safer)
          cancelBtn.focus();
        }

        // Initialize Form.io Builder
        async function initBuilder() {
          try {
            // Show builder container, hide loading
            document.getElementById('builder-loading').classList.add('hidden');
            document.getElementById('builder-container').style.display = 'block';

            // Get display type from schema or default to 'form'
            const currentDisplay = existingSchema.display || 'form';
            
            // Update toggle buttons
            updateDisplayToggle(currentDisplay);

            // Builder options - Configure component groups
            const builderOptions = {
              display: currentDisplay, // Set display type (form or wizard)
              builder: {
                // Layout components - explicitly configure
                layout: {
                  title: 'Layout',
                  weight: 0,
                  components: {
                    panel: true,
                    table: true,
                    tabs: true,
                    well: true,
                    columns: true,
                    fieldset: true,
                    content: true,
                    htmlelement: true
                  }
                },
                // Remove premium/licensed components
                premium: {
                  title: 'Premium',
                  default: false,
                  weight: 50,
                  components: {
                    // Keep open-source components
                    file: true,        // Open source, just needs storage
                    signature: true,   // Open source
                    // Hide premium components that require license
                    form: false,       // Nested forms - requires license
                    custom: false,     // Custom components - requires license
                    resource: false    // Resource - requires Form.io backend
                  }
                },
                advanced: {
                  // Customize advanced components
                  title: 'Advanced',
                  weight: 20,
                  components: {
                    // Keep all open-source advanced components
                    email: true,
                    url: true,
                    phoneNumber: true,
                    tags: true,
                    address: {
                      schema: {
                        map: {
                          key: GOOGLE_MAPS_API_KEY || '' // Default API key if available
                        }
                      }
                    },
                    datetime: true,
                    day: true,
                    time: true,
                    currency: true,
                    survey: true,
                    signature: true,
                    // Remove reCAPTCHA - you have Turnstile
                    recaptcha: false
                  }
                }
              }
            };

            // Create builder with Turnstile configuration
            Formio.builder(
              document.getElementById('builder-container'),
              existingSchema,
              {
                ...builderOptions,
                turnstileSiteKey: '${turnstileSiteKey}'
              }
            ).then(function(form) {
              builder = form;
              console.log('Form.io Builder initialized successfully');

              // Intercept component removal with confirmation dialog
              var originalRemoveComponent = builder.removeComponent.bind(builder);
              builder.removeComponent = function(component, parent, original) {
                var label = (component.component && component.component.label) || component.key || 'this component';
                showConfirmDialog(
                  'Remove Component',
                  'Are you sure you want to remove "' + label + '"? This cannot be undone.',
                  function() {
                    originalRemoveComponent(component, parent, original);
                  }
                );
              };

              // Listen for changes
              builder.on('change', function(schema) {
                hasUnsavedChanges = true;

                // Update save button text
                var saveBtn = document.getElementById('save-btn');
                if (saveBtn && !saveBtn.textContent.includes('*')) {
                  var icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  icon.setAttribute('class', 'w-4 h-4 mr-2');
                  icon.setAttribute('fill', 'none');
                  icon.setAttribute('stroke', 'currentColor');
                  icon.setAttribute('viewBox', '0 0 24 24');
                  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  path.setAttribute('stroke-linecap', 'round');
                  path.setAttribute('stroke-linejoin', 'round');
                  path.setAttribute('stroke-width', '2');
                  path.setAttribute('d', 'M5 13l4 4L19 7');
                  icon.appendChild(path);
                  saveBtn.textContent = '';
                  saveBtn.appendChild(icon);
                  saveBtn.appendChild(document.createTextNode('Save Form *'));
                }
              });

              console.log('Form.io Builder ready for use');
            }).catch(function(error) {
              console.error('Error initializing Form.io Builder:', error);
              showNotification('Failed to initialize form builder: ' + error.message, 'error');
            });
          } catch (error) {
            console.error('Error initializing Form.io Builder:', error);
            showNotification('Failed to initialize form builder: ' + error.message, 'error');
          }
        }

        // Display type toggle functionality
        function updateDisplayToggle(displayType) {
          const formBtn = document.getElementById('display-form-btn');
          const wizardBtn = document.getElementById('display-wizard-btn');
          const wizardHint = document.getElementById('wizard-hint');
          
          if (!formBtn || !wizardBtn || !wizardHint) return; // Safety check
          
          if (displayType === 'wizard') {
            formBtn.classList.remove('active');
            wizardBtn.classList.add('active');
            wizardHint.style.display = 'inline';
          } else {
            formBtn.classList.add('active');
            wizardBtn.classList.remove('active');
            wizardHint.style.display = 'none';
          }
        }

        // Setup event listeners
        function setupEventListeners() {
          // Display type toggle handlers
          const formBtn = document.getElementById('display-form-btn');
          const wizardBtn = document.getElementById('display-wizard-btn');
          
          if (formBtn) {
            formBtn.addEventListener('click', async () => {
              if (builder) {
                const schema = builder.schema;
                schema.display = 'form';
                await reinitializeBuilder(schema);
                updateDisplayToggle('form');
                hasUnsavedChanges = true;
              }
            });
          }

          if (wizardBtn) {
            wizardBtn.addEventListener('click', async () => {
              if (builder) {
                const schema = builder.schema;
                schema.display = 'wizard';
                await reinitializeBuilder(schema);
                updateDisplayToggle('wizard');
                hasUnsavedChanges = true;
                
                // Show helpful message
                showNotification('Wizard mode enabled! Use Panel components from the Layout tab to create pages.', 'info');
              }
            });
          }

          // Save button handler
          const saveBtn = document.getElementById('save-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              if (!builder) {
                showNotification('Builder not initialized', 'error');
                return;
              }

              try {
                const schema = builder.schema;
                const saveBtn = document.getElementById('save-btn');
                
                // Disable button during save
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...';

                const response = await fetch(\`/admin/forms/\${formId}\`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    formio_schema: schema
                  })
                });

                if (response.ok) {
                  hasUnsavedChanges = false;
                  showNotification('Form saved successfully!', 'success');
                  saveBtn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Save Form';
                } else {
                  const error = await response.json();
                  showNotification('Failed to save form: ' + (error.error || 'Unknown error'), 'error');
                }
              } catch (error) {
                console.error('Save error:', error);
                showNotification('Failed to save form: ' + error.message, 'error');
              } finally {
                const saveBtn = document.getElementById('save-btn');
                saveBtn.disabled = false;
              }
            });
          }

          // Preview button handler
          const previewBtn = document.getElementById('preview-btn');
          if (previewBtn) {
            previewBtn.addEventListener('click', async () => {
              if (!builder) {
                showNotification('Builder not initialized', 'error');
                return;
              }

              try {
                const schema = builder.schema;
                const modal = document.getElementById('preview-modal');
                const container = document.getElementById('preview-container');
                
                // Clear previous preview
                container.innerHTML = '';
                
                // Create preview form
                await Formio.createForm(container, schema);
                
                // Show modal
                modal.classList.remove('hidden');
              } catch (error) {
                console.error('Preview error:', error);
                showNotification('Failed to create preview: ' + error.message, 'error');
              }
            });
          }

          // Close preview modal
          const closePreviewBtn = document.getElementById('close-preview-btn');
          if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => {
              document.getElementById('preview-modal').classList.add('hidden');
            });
          }

          // Close modal on backdrop click
          const previewModal = document.getElementById('preview-modal');
          if (previewModal) {
            previewModal.addEventListener('click', (e) => {
              if (e.target.id === 'preview-modal') {
                document.getElementById('preview-modal').classList.add('hidden');
              }
            });
          }

          // Warn about unsaved changes
          window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
              e.preventDefault();
              e.returnValue = '';
            }
          });
          
          // Custom collapse handler (replaces Bootstrap JS)
          document.addEventListener('click', function(e) {
            const button = e.target.closest('[data-toggle="collapse"]');
            if (!button) return;
            
            const targetId = button.getAttribute('data-target');
            if (!targetId) return;
            
            const target = document.querySelector(targetId);
            if (!target) return;
            
            e.preventDefault();
            
            if (target.classList.contains('show')) {
              target.classList.remove('show');
            } else {
              const parent = button.getAttribute('data-parent');
              if (parent) {
                const siblings = document.querySelectorAll(parent + ' .collapse.show');
                siblings.forEach(function(sibling) {
                  if (sibling !== target) {
                    sibling.classList.remove('show');
                  }
                });
              }
              target.classList.add('show');
            }
          });
        }

        // Reinitialize builder with new display type
        async function reinitializeBuilder(schema) {
          if (builder) {
            builder.destroy();
          }
          
          const builderOptions = {
            display: schema.display || 'form',
            builder: {
              layout: {
                title: 'Layout',
                weight: 0,
                components: {
                  panel: true,
                  table: true,
                  tabs: true,
                  well: true,
                  columns: true,
                  fieldset: true,
                  content: true,
                  htmlelement: true
                }
              },
              premium: {
                title: 'Premium',
                default: false,
                weight: 50,
                components: {
                  file: true,
                  signature: true,
                  form: false,
                  custom: false,
                  resource: false
                }
              },
              advanced: {
                title: 'Advanced',
                weight: 20,
                components: {
                  email: true,
                  url: true,
                  phoneNumber: true,
                  tags: true,
                  address: {
                    schema: {
                      map: {
                        key: GOOGLE_MAPS_API_KEY || ''
                      }
                    }
                  },
                  datetime: true,
                  day: true,
                  time: true,
                  currency: true,
                  survey: true,
                  signature: true,
                  recaptcha: false
                }
              }
            }
          };
          
          builder = await Formio.builder(
            document.getElementById('builder-container'),
            schema,
            {
              ...builderOptions,
              turnstileSiteKey: '${turnstileSiteKey}'
            }
          );

          // Re-apply delete confirmation hook
          var originalRemove = builder.removeComponent.bind(builder);
          builder.removeComponent = function(component, parent, original) {
            var label = (component.component && component.component.label) || component.key || 'this component';
            showConfirmDialog(
              'Remove Component',
              'Are you sure you want to remove "' + label + '"? This cannot be undone.',
              function() {
                originalRemove(component, parent, original);
              }
            );
          };

          builder.on('change', function(updatedSchema) {
            hasUnsavedChanges = true;
            var saveBtn = document.getElementById('save-btn');
            if (saveBtn && !saveBtn.textContent.includes('*')) {
              saveBtn.textContent = 'Save Form *';
            }
          });
        }

        // Initialize when DOM and Formio are ready
        function waitForFormio() {
          if (typeof Formio === 'undefined') {
            console.log('Waiting for Form.io to load...');
            setTimeout(waitForFormio, 100);
            return;
          }
          
          console.log('Form.io loaded, initializing builder...');
          setupEventListeners(); // Setup all event listeners first
          initBuilder();
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', waitForFormio);
        } else {
          waitForFormio();
        }
      })();
    </script>
  `

  const layoutData: AdminLayoutCatalystData = {
    title: `Form Builder: ${data.display_name}`,
    content: pageContent,
    user: data.user,
    version: data.version
  }

  return renderAdminLayoutCatalyst(layoutData)
}
