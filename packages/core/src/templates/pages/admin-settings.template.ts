import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../layouts/admin-layout-catalyst.template'
import { renderConfirmationDialog, getConfirmationDialogScript } from '../components/confirmation-dialog.template'

export interface SettingsPageData {
  user?: {
    name: string
    email: string
    role: string
  }
  settings?: {
    general?: GeneralSettings
    appearance?: AppearanceSettings
    security?: SecuritySettings
    notifications?: NotificationSettings
    storage?: StorageSettings
    migrations?: MigrationSettings
    databaseTools?: DatabaseToolsSettings
  }
  activeTab?: string
  version?: string
}

export interface GeneralSettings {
  siteName: string
  siteDescription: string
  adminEmail: string
  timezone: string
  language: string
  maintenanceMode: boolean
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  logoUrl: string
  favicon: string
  customCSS: string
}

export interface SecuritySettings {
  idleTimeout: number
  sessionDuration: number
  allowRememberMe: boolean
  rememberMeDuration: number
  maxSessions: number
  idleWarningMinutes: number
  minPasswordLength: number
  requireUppercase: boolean
  requireNumbers: boolean
  requireSymbols: boolean
  passwordExpiryDays: number
  maxFailedAttempts: number
  lockoutDuration: number
  ipWhitelist: string[]
}

export interface NotificationSettings {
  emailNotifications: boolean
  contentUpdates: boolean
  systemAlerts: boolean
  userRegistrations: boolean
  emailFrequency: 'immediate' | 'daily' | 'weekly'
}

export interface StorageSettings {
  maxFileSize: number
  allowedFileTypes: string[]
  storageProvider: 'local' | 'cloudflare' | 's3'
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  retentionPeriod: number
}

export interface MigrationSettings {
  totalMigrations: number
  appliedMigrations: number
  pendingMigrations: number
  lastApplied?: string
  migrations: Array<{
    id: string
    name: string
    filename: string
    description?: string
    applied: boolean
    appliedAt?: string
    size?: number
  }>
}

export interface DatabaseToolsSettings {
  totalTables: number
  totalRows: number
  lastBackup?: string
  databaseSize?: string
  tables: Array<{
    name: string
    rowCount: number
  }>
}

export function renderSettingsPage(data: SettingsPageData): string {
  const activeTab = data.activeTab || 'general'
  
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Settings</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage your application settings and preferences</p>
        </div>
      </div>

      <!-- Settings Navigation Tabs -->
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 mb-6 overflow-hidden">
        <div class="border-b border-zinc-950/5 dark:border-white/10">
          <nav class="flex overflow-x-auto" role="tablist">
            ${renderTabButton('general', 'General', 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', activeTab)}
            ${renderTabButton('appearance', 'Appearance', 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z', activeTab)}
            ${renderTabButton('security', 'Security', 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', activeTab)}
            ${renderTabButton('notifications', 'Notifications', 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', activeTab)}
            ${renderTabButton('storage', 'Storage', 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', activeTab)}
            ${renderTabButton('migrations', 'Migrations', 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4', activeTab)}
            ${renderTabButton('database-tools', 'Database Tools', 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01', activeTab)}
          </nav>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
        <div id="settings-content" class="p-8">
          ${renderTabContent(activeTab, data.settings)}
        </div>
      </div>
    </div>

    <script>
      // Initialize tab-specific features on page load
      const currentTab = '${activeTab}';

      async function saveGeneralSettings() {
        // Collect all form data from general settings
        const formData = new FormData();

        // Get all form inputs in the settings content area
        document.querySelectorAll('#settings-content input, #settings-content select, #settings-content textarea').forEach(input => {
          if (input.type === 'checkbox') {
            formData.append(input.name, input.checked ? 'true' : 'false');
          } else if (input.name) {
            formData.append(input.name, input.value);
          }
        });

        // Show loading state
        const saveBtn = document.querySelector('button[onclick="saveGeneralSettings()"]');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<svg class="animate-spin -ml-0.5 mr-1.5 h-5 w-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Saving...';
        saveBtn.disabled = true;

        try {
          const response = await fetch('/admin/settings/general', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (result.success) {
            showNotification(result.message || 'Settings saved successfully!', 'success');
          } else {
            showNotification(result.error || 'Failed to save settings', 'error');
          }
        } catch (error) {
          console.error('Error saving settings:', error);
          showNotification('Failed to save settings. Please try again.', 'error');
        } finally {
          saveBtn.innerHTML = originalText;
          saveBtn.disabled = false;
        }
      }

      async function saveAppearanceSettings() {
        var formData = new FormData();
        var container = document.getElementById('settings-content');

        var themeRadio = container.querySelector('input[name="theme"]:checked');
        if (themeRadio) formData.append('theme', themeRadio.value);

        container.querySelectorAll('input[type="url"], input[type="color"], textarea').forEach(function(el) {
          if (el.name) formData.append(el.name, el.value);
        });

        var colorPicker = container.querySelector('input[name="primaryColor"]');
        if (colorPicker) formData.set('primaryColor', colorPicker.value);

        var saveBtn = document.querySelector('button[onclick="saveAppearanceSettings()"]');
        var originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
          var response = await fetch('/admin/settings/appearance', { method: 'POST', body: formData });
          var result = await response.json();
          showNotification(result.success ? (result.message || 'Appearance settings saved!') : (result.error || 'Failed to save settings'), result.success ? 'success' : 'error');
        } catch (error) {
          console.error('Error saving appearance settings:', error);
          showNotification('Failed to save settings. Please try again.', 'error');
        } finally {
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        }
      }

      async function saveNotificationSettings() {
        var formData = new FormData();
        var container = document.getElementById('settings-content');

        container.querySelectorAll('input[type="checkbox"]').forEach(function(el) {
          formData.append(el.name, el.checked ? 'true' : 'false');
        });
        container.querySelectorAll('select').forEach(function(el) {
          if (el.name) formData.append(el.name, el.value);
        });

        var saveBtn = document.querySelector('button[onclick="saveNotificationSettings()"]');
        var originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
          var response = await fetch('/admin/settings/notifications', { method: 'POST', body: formData });
          var result = await response.json();
          showNotification(result.success ? (result.message || 'Notification settings saved!') : (result.error || 'Failed to save settings'), result.success ? 'success' : 'error');
        } catch (error) {
          console.error('Error saving notification settings:', error);
          showNotification('Failed to save settings. Please try again.', 'error');
        } finally {
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        }
      }

      async function saveStorageSettings() {
        var formData = new FormData();
        var container = document.getElementById('settings-content');

        container.querySelectorAll('input[type="number"], select, textarea').forEach(function(el) {
          if (el.name) formData.append(el.name, el.value);
        });

        var saveBtn = document.querySelector('button[onclick="saveStorageSettings()"]');
        var originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
          var response = await fetch('/admin/settings/storage', { method: 'POST', body: formData });
          var result = await response.json();
          showNotification(result.success ? (result.message || 'Storage settings saved!') : (result.error || 'Failed to save settings'), result.success ? 'success' : 'error');
        } catch (error) {
          console.error('Error saving storage settings:', error);
          showNotification('Failed to save settings. Please try again.', 'error');
        } finally {
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        }
      }

      // Migration functions
      window.refreshMigrationStatus = async function() {
        try {
          const response = await fetch('/admin/settings/api/migrations/status');
          const result = await response.json();
          
          if (result.success) {
            updateMigrationUI(result.data);
          } else {
            console.error('Failed to refresh migration status');
          }
        } catch (error) {
          console.error('Error loading migration status:', error);
        }
      };

      window.runPendingMigrations = async function() {
        const btn = document.getElementById('run-migrations-btn');
        if (!btn || btn.disabled) return;

        showConfirmDialog('run-migrations-confirm');
      };

      window.performRunMigrations = async function() {
        const btn = document.getElementById('run-migrations-btn');
        if (!btn) return;

        btn.disabled = true;
        btn.innerHTML = 'Running...';

        try {
          const response = await fetch('/admin/settings/api/migrations/run', {
            method: 'POST'
          });
          const result = await response.json();

          if (result.success) {
            alert(result.message);
            setTimeout(() => window.refreshMigrationStatus(), 1000);
          } else {
            alert(result.error || 'Failed to run migrations');
          }
        } catch (error) {
          alert('Error running migrations');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Run Pending';
        }
      };

      window.validateSchema = async function() {
        try {
          const response = await fetch('/admin/settings/api/migrations/validate');
          const result = await response.json();
          
          if (result.success) {
            if (result.data.valid) {
              alert('Database schema is valid');
            } else {
              alert(\`Schema validation failed: \${result.data.issues.join(', ')}\`);
            }
          } else {
            alert('Failed to validate schema');
          }
        } catch (error) {
          alert('Error validating schema');
        }
      };

      window.updateMigrationUI = function(data) {
        const totalEl = document.getElementById('total-migrations');
        const appliedEl = document.getElementById('applied-migrations');
        const pendingEl = document.getElementById('pending-migrations');
        
        if (totalEl) totalEl.textContent = data.totalMigrations;
        if (appliedEl) appliedEl.textContent = data.appliedMigrations;
        if (pendingEl) pendingEl.textContent = data.pendingMigrations;
        
        const runBtn = document.getElementById('run-migrations-btn');
        if (runBtn) {
          runBtn.disabled = data.pendingMigrations === 0;
        }
        
        // Update migrations list
        const listContainer = document.getElementById('migrations-list');
        if (listContainer && data.migrations && data.migrations.length > 0) {
          listContainer.innerHTML = data.migrations.map(migration => \`
            <div class="px-6 py-4 flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    \${migration.applied 
                      ? '<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                      : '<svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                    }
                  </div>
                  <div>
                    <h5 class="text-white font-medium">\${migration.name}</h5>
                    <p class="text-sm text-gray-300">\${migration.filename}</p>
                    \${migration.description ? \`<p class="text-xs text-gray-400 mt-1">\${migration.description}</p>\` : ''}
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-4 text-sm">
                \${migration.size ? \`<span class="text-gray-400">\${(migration.size / 1024).toFixed(1)} KB</span>\` : ''}
                <span class="px-2 py-1 rounded-full text-xs font-medium \${
                  migration.applied 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }">
                  \${migration.applied ? 'Applied' : 'Pending'}
                </span>
                \${migration.appliedAt ? \`<span class="text-gray-400">\${new Date(migration.appliedAt).toLocaleDateString()}</span>\` : ''}
              </div>
            </div>
          \`).join('');
        }
      };
      
      // Auto-load migrations when switching to that tab
      function initializeMigrations() {
        if (currentTab === 'migrations') {
          setTimeout(window.refreshMigrationStatus, 500);
        }
      }
      
      // Database Tools functions
      window.refreshDatabaseStats = async function() {
        try {
          const response = await fetch('/admin/settings/api/database-tools/stats');
          const result = await response.json();
          
          if (result.success) {
            updateDatabaseToolsUI(result.data);
          } else {
            console.error('Failed to refresh database stats');
          }
        } catch (error) {
          console.error('Error loading database stats:', error);
        }
      };

      window.createDatabaseBackup = async function() {
        const btn = document.getElementById('create-backup-btn');
        if (!btn) return;
        
        btn.disabled = true;
        btn.innerHTML = 'Creating Backup...';
        
        try {
          const response = await fetch('/admin/settings/api/database-tools/backup', {
            method: 'POST'
          });
          const result = await response.json();
          
          if (result.success) {
            alert(result.message);
            setTimeout(() => window.refreshDatabaseStats(), 1000);
          } else {
            alert(result.error || 'Failed to create backup');
          }
        } catch (error) {
          alert('Error creating backup');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Create Backup';
        }
      };

      window.truncateDatabase = async function() {
        // Show dangerous operation warning
        const confirmText = prompt(
          'WARNING: This will delete ALL data except your admin account!\\n\\n' +
          'This action CANNOT be undone!\\n\\n' +
          'Type "TRUNCATE ALL DATA" to confirm:'
        );
        
        if (confirmText !== 'TRUNCATE ALL DATA') {
          alert('Operation cancelled. Confirmation text did not match.');
          return;
        }
        
        const btn = document.getElementById('truncate-db-btn');
        if (!btn) return;
        
        btn.disabled = true;
        btn.innerHTML = 'Truncating...';
        
        try {
          const response = await fetch('/admin/settings/api/database-tools/truncate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              confirmText: confirmText
            })
          });
          const result = await response.json();
          
          if (result.success) {
            alert(result.message + '\\n\\nTables cleared: ' + result.data.tablesCleared.join(', '));
            setTimeout(() => {
              window.refreshDatabaseStats();
              // Optionally reload page to refresh all data
              window.location.reload();
            }, 2000);
          } else {
            alert(result.error || 'Failed to truncate database');
          }
        } catch (error) {
          alert('Error truncating database');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Truncate All Data';
        }
      };

      window.validateDatabase = async function() {
        try {
          const response = await fetch('/admin/settings/api/database-tools/validate');
          const result = await response.json();
          
          if (result.success) {
            if (result.data.valid) {
              alert('Database validation passed. No issues found.');
            } else {
              alert('Database validation failed:\\n\\n' + result.data.issues.join('\\n'));
            }
          } else {
            alert('Failed to validate database');
          }
        } catch (error) {
          alert('Error validating database');
        }
      };

      window.updateDatabaseToolsUI = function(data) {
        const totalTablesEl = document.getElementById('total-tables');
        const totalRowsEl = document.getElementById('total-rows');
        const tablesListEl = document.getElementById('tables-list');

        if (totalTablesEl) totalTablesEl.textContent = data.tables.length;
        if (totalRowsEl) totalRowsEl.textContent = data.totalRows.toLocaleString();

        if (tablesListEl && data.tables && data.tables.length > 0) {
          tablesListEl.innerHTML = data.tables.map(table => \`
            <a
              href="/admin/database-tools/tables/\${table.name}"
              class="flex items-center justify-between py-3 px-4 rounded-lg bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 cursor-pointer transition-colors ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 no-underline"
            >
              <div class="flex items-center space-x-3">
                <svg class="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                <span class="text-zinc-950 dark:text-white font-medium">\${table.name}</span>
              </div>
              <div class="flex items-center space-x-3">
                <span class="text-zinc-500 dark:text-zinc-400 text-sm">\${table.rowCount.toLocaleString()} rows</span>
                <svg class="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          \`).join('');
        }
      };

      // Auto-load tab-specific data after all functions are defined
      if (currentTab === 'migrations') {
        setTimeout(window.refreshMigrationStatus, 500);
      }

      if (currentTab === 'database-tools') {
        setTimeout(window.refreshDatabaseStats, 500);
      }
    </script>

    <!-- Confirmation Dialogs -->
    ${renderConfirmationDialog({
      id: 'run-migrations-confirm',
      title: 'Run Migrations',
      message: 'Are you sure you want to run pending migrations? This action cannot be undone.',
      confirmText: 'Run Migrations',
      cancelText: 'Cancel',
      iconColor: 'blue',
      confirmClass: 'bg-blue-500 hover:bg-blue-400',
      onConfirm: 'performRunMigrations()'
    })}

    ${getConfirmationDialogScript()}
  `

  const layoutData: AdminLayoutCatalystData = {
    title: 'Settings',
    pageTitle: 'Settings',
    currentPath: '/admin/settings',
    user: data.user,
    version: data.version,
    content: pageContent
  }

  return renderAdminLayoutCatalyst(layoutData)
}

function renderTabButton(tabId: string, label: string, iconPath: string, activeTab: string): string {
  const isActive = activeTab === tabId
  const baseClasses = 'flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap no-underline'
  const activeClasses = isActive
    ? 'border-zinc-950 dark:border-white text-zinc-950 dark:text-white'
    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'

  return `
    <a
      href="/admin/settings/${tabId}"
      data-tab="${tabId}"
      class="${baseClasses} ${activeClasses}"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
      </svg>
      <span>${label}</span>
    </a>
  `
}

function renderTabContent(activeTab: string, settings?: SettingsPageData['settings']): string {
  switch (activeTab) {
    case 'general':
      return renderGeneralSettings(settings?.general)
    case 'appearance':
      return renderAppearanceSettings(settings?.appearance)
    case 'security':
      return renderSecuritySettings(settings?.security)
    case 'notifications':
      return renderNotificationSettings(settings?.notifications)
    case 'storage':
      return renderStorageSettings(settings?.storage)
    case 'migrations':
      return renderMigrationSettings(settings?.migrations)
    case 'database-tools':
      return renderDatabaseToolsSettings(settings?.databaseTools)
    default:
      return renderGeneralSettings(settings?.general)
  }
}

function renderGeneralSettings(settings?: GeneralSettings): string {
  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-lg/7 font-semibold text-zinc-950 dark:text-white">General Settings</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Configure basic application settings and preferences.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Site Name</label>
            <input
              type="text"
              name="siteName"
              value="${settings?.siteName || 'Flare CMS'}"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
              placeholder="Enter site name"
            />
          </div>

          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Admin Email</label>
            <input
              type="email"
              name="adminEmail"
              value="${settings?.adminEmail || 'admin@example.com'}"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Timezone</label>
            <select
              name="timezone"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="UTC" ${settings?.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
              <option value="America/New_York" ${settings?.timezone === 'America/New_York' ? 'selected' : ''}>Eastern Time</option>
              <option value="America/Chicago" ${settings?.timezone === 'America/Chicago' ? 'selected' : ''}>Central Time</option>
              <option value="America/Denver" ${settings?.timezone === 'America/Denver' ? 'selected' : ''}>Mountain Time</option>
              <option value="America/Los_Angeles" ${settings?.timezone === 'America/Los_Angeles' ? 'selected' : ''}>Pacific Time</option>
            </select>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Site Description</label>
            <textarea
              name="siteDescription"
              rows="3"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
              placeholder="Describe your site..."
            >${settings?.siteDescription || ''}</textarea>
          </div>

          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Language</label>
            <select
              name="language"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="en" ${settings?.language === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${settings?.language === 'es' ? 'selected' : ''}>Spanish</option>
              <option value="fr" ${settings?.language === 'fr' ? 'selected' : ''}>French</option>
              <option value="de" ${settings?.language === 'de' ? 'selected' : ''}>German</option>
            </select>
          </div>
          
          <!-- Trash Retention -->
          <div>
            <label for="trashRetentionDays" class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Trash Retention</label>
            <p class="text-sm/6 text-zinc-500 dark:text-zinc-400 mb-2">How long deleted content stays in trash before auto-purge. Set to "Keep Forever" to disable auto-purge.</p>
            <select
              id="trashRetentionDays"
              name="trashRetentionDays"
              class="block w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="0" ${settings?.trashRetentionDays === 0 ? 'selected' : ''}>Keep Forever</option>
              <option value="7" ${settings?.trashRetentionDays === 7 ? 'selected' : ''}>7 days</option>
              <option value="14" ${settings?.trashRetentionDays === 14 ? 'selected' : ''}>14 days</option>
              <option value="30" ${!settings || settings?.trashRetentionDays === 30 ? 'selected' : ''}>30 days (default)</option>
              <option value="60" ${settings?.trashRetentionDays === 60 ? 'selected' : ''}>60 days</option>
              <option value="90" ${settings?.trashRetentionDays === 90 ? 'selected' : ''}>90 days</option>
            </select>
          </div>

          <div class="flex gap-3">
            <div class="flex h-6 shrink-0 items-center">
              <div class="group grid size-4 grid-cols-1">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  name="maintenanceMode"
                  ${settings?.maintenanceMode ? 'checked' : ''}
                  class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                />
                <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                  <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                  <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                </svg>
              </div>
            </div>
            <div class="text-sm/6">
              <label for="maintenanceMode" class="font-medium text-zinc-950 dark:text-white">
                Enable maintenance mode
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="mt-8 pt-6 border-t border-zinc-950/5 dark:border-white/10 flex justify-end">
        <button
          onclick="saveGeneralSettings()"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>
  `
}

function renderAppearanceSettings(settings?: AppearanceSettings): string {
  const inputClass = 'w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500'

  return `
    <div class="space-y-8">
      <div>
        <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Appearance Settings</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Customize the look and feel of your admin panel.</p>
      </div>

      <!-- Theme -->
      <div class="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Theme</label>
          <div class="grid grid-cols-3 gap-3">
            <label class="flex items-center gap-2 p-3 rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors">
              <input type="radio" name="theme" value="light" ${settings?.theme === 'light' ? 'checked' : ''} class="text-indigo-500 focus:ring-indigo-500" />
              <span class="text-sm text-zinc-950 dark:text-white">Light</span>
            </label>
            <label class="flex items-center gap-2 p-3 rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors">
              <input type="radio" name="theme" value="dark" ${settings?.theme === 'dark' || !settings?.theme ? 'checked' : ''} class="text-indigo-500 focus:ring-indigo-500" />
              <span class="text-sm text-zinc-950 dark:text-white">Dark</span>
            </label>
            <label class="flex items-center gap-2 p-3 rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors">
              <input type="radio" name="theme" value="auto" ${settings?.theme === 'auto' ? 'checked' : ''} class="text-indigo-500 focus:ring-indigo-500" />
              <span class="text-sm text-zinc-950 dark:text-white">Auto</span>
            </label>
          </div>
        </div>

        <!-- Primary Color -->
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Primary Color</label>
          <div class="flex items-center gap-3">
            <input type="color" id="primaryColorPicker" name="primaryColor" value="${settings?.primaryColor || '#465FFF'}" class="w-12 h-10 rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 cursor-pointer" oninput="document.getElementById('primaryColorText').value = this.value" />
            <input type="text" id="primaryColorText" value="${settings?.primaryColor || '#465FFF'}" class="${inputClass}" placeholder="#465FFF" oninput="document.getElementById('primaryColorPicker').value = this.value" />
          </div>
        </div>
      </div>

      <!-- Logo & Favicon -->
      <div class="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Logo URL</label>
          <input type="url" name="logoUrl" value="${settings?.logoUrl || ''}" class="${inputClass}" placeholder="https://example.com/logo.png" />
        </div>
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Favicon URL</label>
          <input type="url" name="favicon" value="${settings?.favicon || ''}" class="${inputClass}" placeholder="https://example.com/favicon.ico" />
        </div>
      </div>

      <!-- Custom CSS -->
      <div>
        <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Custom CSS</label>
        <textarea name="customCSS" rows="6" class="${inputClass} font-mono" placeholder="/* Add your custom CSS here */">${settings?.customCSS || ''}</textarea>
        <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Injected into the admin layout. Use with caution.</p>
      </div>

      <!-- Save Button -->
      <div class="mt-8 pt-6 border-t border-zinc-950/5 dark:border-white/10 flex justify-end">
        <button
          onclick="saveAppearanceSettings()"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>
  `
}

function renderSecuritySettings(settings?: SecuritySettings): string {
  const selectClass = 'w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
  const checkboxClass = 'col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'
  const checkSvg = `<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" /></svg>`

  function selectOption(value: string | number, label: string, current: any): string {
    return `<option value="${value}" ${String(current) === String(value) ? 'selected' : ''}>${label}</option>`
  }

  function checkbox(id: string, name: string, label: string, checked: boolean): string {
    return `
      <div class="flex gap-3">
        <div class="flex h-6 shrink-0 items-center">
          <div class="group grid size-4 grid-cols-1">
            <input type="checkbox" id="${id}" name="${name}" ${checked ? 'checked' : ''} class="${checkboxClass}" />
            ${checkSvg}
          </div>
        </div>
        <div class="text-sm/6">
          <label for="${id}" class="font-medium text-zinc-950 dark:text-white">${label}</label>
        </div>
      </div>`
  }

  return `
    <div class="space-y-8">
      <div>
        <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Security Settings</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Configure session behavior, password rules, and login protection. Changes take effect immediately for new sessions.</p>
      </div>

      <!-- Session Settings -->
      <div class="rounded-xl bg-white dark:bg-zinc-800/50 p-6 ring-1 ring-zinc-950/5 dark:ring-white/10">
        <h4 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-1">Session</h4>
        <p class="text-sm/6 text-zinc-500 dark:text-zinc-400 mb-6">Control how long users stay logged in and what happens when they're inactive.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <label for="idleTimeout" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Idle Timeout</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Auto-logout after this period of no mouse, keyboard, or scroll activity. Protects against unattended sessions (e.g. laptop left open at a coffee shop).</p>
            <select id="idleTimeout" name="idleTimeout" class="${selectClass}">
              ${selectOption(0, 'Disabled', settings?.idleTimeout)}
              ${selectOption(5, '5 minutes', settings?.idleTimeout)}
              ${selectOption(10, '10 minutes', settings?.idleTimeout)}
              ${selectOption(15, '15 minutes', settings?.idleTimeout)}
              ${selectOption(30, '30 minutes (default)', settings?.idleTimeout)}
              ${selectOption(60, '1 hour', settings?.idleTimeout)}
              ${selectOption(120, '2 hours', settings?.idleTimeout)}
            </select>
          </div>

          <div>
            <label for="sessionDuration" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Session Duration</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Maximum time before users must log in again, even if active. A shorter duration limits the window if a session token is compromised.</p>
            <select id="sessionDuration" name="sessionDuration" class="${selectClass}">
              ${selectOption(1, '1 hour', settings?.sessionDuration)}
              ${selectOption(4, '4 hours', settings?.sessionDuration)}
              ${selectOption(8, '8 hours (work day)', settings?.sessionDuration)}
              ${selectOption(12, '12 hours', settings?.sessionDuration)}
              ${selectOption(24, '24 hours (default)', settings?.sessionDuration)}
              ${selectOption(48, '2 days', settings?.sessionDuration)}
              ${selectOption(168, '7 days', settings?.sessionDuration)}
            </select>
          </div>

          <div>
            <label for="idleWarningMinutes" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Idle Warning</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Show a "Session expiring" warning this many minutes before the idle timeout triggers. Gives users a chance to stay logged in.</p>
            <select id="idleWarningMinutes" name="idleWarningMinutes" class="${selectClass}">
              ${selectOption(1, '1 minute before', settings?.idleWarningMinutes)}
              ${selectOption(2, '2 minutes before', settings?.idleWarningMinutes)}
              ${selectOption(5, '5 minutes before (default)', settings?.idleWarningMinutes)}
              ${selectOption(10, '10 minutes before', settings?.idleWarningMinutes)}
            </select>
          </div>

          <div>
            <label for="maxSessions" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Max Sessions Per User</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Limit how many devices can be logged in at once. Set to 1 for high-security environments where a new login should kill previous sessions.</p>
            <select id="maxSessions" name="maxSessions" class="${selectClass}">
              ${selectOption(0, 'Unlimited (default)', settings?.maxSessions)}
              ${selectOption(1, '1 device only', settings?.maxSessions)}
              ${selectOption(2, '2 devices', settings?.maxSessions)}
              ${selectOption(3, '3 devices', settings?.maxSessions)}
              ${selectOption(5, '5 devices', settings?.maxSessions)}
              ${selectOption(10, '10 devices', settings?.maxSessions)}
            </select>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-zinc-950/5 dark:border-white/10 space-y-4">
          ${checkbox('allowRememberMe', 'allowRememberMe', 'Allow "Remember me" on login page', settings?.allowRememberMe ?? true)}

          <div id="rememberMeOptions" class="${settings?.allowRememberMe === false ? 'hidden' : ''} ml-7">
            <label for="rememberMeDuration" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Remember Me Duration</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">When checked, the session lasts this long instead of the normal session duration. Disable this for high-security environments like law firms.</p>
            <select id="rememberMeDuration" name="rememberMeDuration" class="${selectClass} max-w-xs">
              ${selectOption(7, '7 days', settings?.rememberMeDuration)}
              ${selectOption(14, '14 days', settings?.rememberMeDuration)}
              ${selectOption(30, '30 days (default)', settings?.rememberMeDuration)}
              ${selectOption(60, '60 days', settings?.rememberMeDuration)}
              ${selectOption(90, '90 days', settings?.rememberMeDuration)}
            </select>
          </div>
        </div>
      </div>

      <!-- Password Settings -->
      <div class="rounded-xl bg-white dark:bg-zinc-800/50 p-6 ring-1 ring-zinc-950/5 dark:ring-white/10">
        <h4 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-1">Password Rules</h4>
        <p class="text-sm/6 text-zinc-500 dark:text-zinc-400 mb-6">Set minimum requirements for user passwords. Stronger rules protect against brute-force and credential-stuffing attacks.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <label for="minPasswordLength" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Minimum Length</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Longer passwords are exponentially harder to crack. NIST recommends at least 8 characters.</p>
            <input
              type="number"
              id="minPasswordLength"
              name="minPasswordLength"
              value="${settings?.minPasswordLength ?? 8}"
              min="6"
              max="128"
              class="${selectClass} max-w-32"
            />
          </div>

          <div>
            <label for="passwordExpiryDays" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Password Expiry</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Force users to change their password periodically. Common in compliance-heavy industries like legal and healthcare.</p>
            <select id="passwordExpiryDays" name="passwordExpiryDays" class="${selectClass}">
              ${selectOption(0, 'Never (default)', settings?.passwordExpiryDays)}
              ${selectOption(30, '30 days', settings?.passwordExpiryDays)}
              ${selectOption(60, '60 days', settings?.passwordExpiryDays)}
              ${selectOption(90, '90 days', settings?.passwordExpiryDays)}
              ${selectOption(180, '6 months', settings?.passwordExpiryDays)}
              ${selectOption(365, '1 year', settings?.passwordExpiryDays)}
            </select>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-zinc-950/5 dark:border-white/10">
          <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-3">Character Requirements</label>
          <div class="space-y-3">
            ${checkbox('requireUppercase', 'requireUppercase', 'Require uppercase letters (A-Z)', settings?.requireUppercase ?? true)}
            ${checkbox('requireNumbers', 'requireNumbers', 'Require numbers (0-9)', settings?.requireNumbers ?? true)}
            ${checkbox('requireSymbols', 'requireSymbols', 'Require symbols (!@#$%)', settings?.requireSymbols ?? false)}
          </div>
        </div>
      </div>

      <!-- Login Protection -->
      <div class="rounded-xl bg-white dark:bg-zinc-800/50 p-6 ring-1 ring-zinc-950/5 dark:ring-white/10">
        <h4 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-1">Login Protection</h4>
        <p class="text-sm/6 text-zinc-500 dark:text-zinc-400 mb-6">Prevent brute-force attacks by locking accounts after repeated failed login attempts.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <label for="maxFailedAttempts" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Max Failed Attempts</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Lock the account after this many consecutive failed login attempts. The counter resets after a successful login.</p>
            <select id="maxFailedAttempts" name="maxFailedAttempts" class="${selectClass}">
              ${selectOption(3, '3 attempts', settings?.maxFailedAttempts)}
              ${selectOption(5, '5 attempts (default)', settings?.maxFailedAttempts)}
              ${selectOption(10, '10 attempts', settings?.maxFailedAttempts)}
              ${selectOption(15, '15 attempts', settings?.maxFailedAttempts)}
              ${selectOption(20, '20 attempts', settings?.maxFailedAttempts)}
            </select>
          </div>

          <div>
            <label for="lockoutDuration" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Lockout Duration</label>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">How long the account stays locked after exceeding failed attempts. An admin can manually unlock before this expires.</p>
            <select id="lockoutDuration" name="lockoutDuration" class="${selectClass}">
              ${selectOption(5, '5 minutes', settings?.lockoutDuration)}
              ${selectOption(15, '15 minutes (default)', settings?.lockoutDuration)}
              ${selectOption(30, '30 minutes', settings?.lockoutDuration)}
              ${selectOption(60, '1 hour', settings?.lockoutDuration)}
            </select>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-zinc-950/5 dark:border-white/10">
          <label for="ipWhitelist" class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">IP Whitelist</label>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Restrict admin access to specific IP addresses. Leave empty to allow access from anywhere. One IP per line.</p>
          <textarea
            id="ipWhitelist"
            name="ipWhitelist"
            rows="3"
            class="${selectClass}"
            placeholder="192.168.1.1&#10;10.0.0.0/8"
          >${settings?.ipWhitelist?.join('\n') || ''}</textarea>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <button
          id="securitySaveBtn"
          onclick="saveSecuritySettings()"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-900 dark:bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 dark:hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors"
        >
          <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>

    <script>
      // Toggle remember me options visibility
      document.getElementById('allowRememberMe')?.addEventListener('change', function() {
        document.getElementById('rememberMeOptions').classList.toggle('hidden', !this.checked);
      });

      async function saveSecuritySettings() {
        const formData = new FormData();
        const container = document.getElementById('settings-content');

        container.querySelectorAll('select, input[type="number"]').forEach(function(el) {
          if (el.name) formData.append(el.name, el.value);
        });
        container.querySelectorAll('input[type="checkbox"]').forEach(function(el) {
          formData.append(el.name, el.checked ? 'true' : 'false');
        });
        var ipField = container.querySelector('textarea[name="ipWhitelist"]');
        if (ipField) formData.append('ipWhitelist', ipField.value);

        var saveBtn = document.getElementById('securitySaveBtn');
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
          var response = await fetch('/admin/settings/security', { method: 'POST', body: formData });
          var result = await response.json();
          if (result.success) {
            showNotification(result.message || 'Security settings saved!', 'success');
          } else {
            showNotification(result.error || 'Failed to save settings', 'error');
          }
        } catch (error) {
          console.error('Error saving security settings:', error);
          showNotification('Failed to save settings. Please try again.', 'error');
        } finally {
          saveBtn.textContent = 'Save Changes';
          saveBtn.disabled = false;
        }
      }
    </script>
  `
}

function renderNotificationSettings(settings?: NotificationSettings): string {
  const selectClass = 'w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
  const checkboxClass = 'col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'
  const checkSvg = `<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"><path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" /></svg>`

  function checkbox(id: string, name: string, label: string, description: string, checked: boolean): string {
    return `
      <div class="flex gap-3">
        <div class="flex h-6 shrink-0 items-center">
          <div class="group grid size-4 grid-cols-1">
            <input type="checkbox" id="${id}" name="${name}" ${checked ? 'checked' : ''} class="${checkboxClass}" />
            ${checkSvg}
          </div>
        </div>
        <div class="text-sm/6">
          <label for="${id}" class="font-medium text-zinc-950 dark:text-white">${label}</label>
          <p class="text-zinc-500 dark:text-zinc-400">${description}</p>
        </div>
      </div>`
  }

  return `
    <div class="space-y-8">
      <div>
        <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Notification Settings</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Configure how and when you receive notifications. Requires an email provider plugin (e.g. Resend) to deliver emails.</p>
      </div>

      <!-- Email Notifications -->
      <div>
        <h4 class="text-sm/6 font-semibold text-zinc-950 dark:text-white mb-4">Email Notifications</h4>
        <div class="space-y-5">
          ${checkbox('emailNotifications', 'emailNotifications', 'Enable email notifications', 'Master toggle for all email notifications', settings?.emailNotifications ?? true)}
          ${checkbox('contentUpdates', 'contentUpdates', 'Content updates', 'Notify when content is created, updated, or published', settings?.contentUpdates ?? true)}
          ${checkbox('systemAlerts', 'systemAlerts', 'System alerts', 'Notify on errors, failed migrations, or security events', settings?.systemAlerts ?? true)}
          ${checkbox('userRegistrations', 'userRegistrations', 'New user registrations', 'Notify when a new user registers an account', settings?.userRegistrations ?? false)}
        </div>
      </div>

      <!-- Email Frequency -->
      <div class="max-w-sm">
        <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Email Frequency</label>
        <select name="emailFrequency" class="${selectClass}">
          <option value="immediate" ${settings?.emailFrequency === 'immediate' ? 'selected' : ''}>Immediate</option>
          <option value="daily" ${settings?.emailFrequency === 'daily' ? 'selected' : ''}>Daily Digest</option>
          <option value="weekly" ${settings?.emailFrequency === 'weekly' ? 'selected' : ''}>Weekly Digest</option>
        </select>
        <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Critical system alerts are always sent immediately regardless of this setting.</p>
      </div>

      <!-- Save Button -->
      <div class="mt-8 pt-6 border-t border-zinc-950/5 dark:border-white/10 flex justify-end">
        <button
          onclick="saveNotificationSettings()"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>
  `
}

function renderStorageSettings(settings?: StorageSettings): string {
  const inputClass = 'w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500'
  const selectClass = 'w-full rounded-lg border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'

  return `
    <div class="space-y-8">
      <div>
        <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Storage Settings</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Configure file upload limits, allowed types, and backup preferences.</p>
      </div>

      <div class="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <!-- Max File Size -->
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Max File Size (MB)</label>
          <input type="number" name="maxFileSize" value="${settings?.maxFileSize || 10}" min="1" max="100" class="${inputClass}" />
          <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Maximum upload size per file (1-100 MB)</p>
        </div>

        <!-- Storage Provider -->
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Storage Provider</label>
          <select name="storageProvider" class="${selectClass}">
            <option value="cloudflare" ${settings?.storageProvider === 'cloudflare' ? 'selected' : ''}>Cloudflare R2</option>
            <option value="s3" ${settings?.storageProvider === 's3' ? 'selected' : ''}>Amazon S3</option>
            <option value="local" ${settings?.storageProvider === 'local' ? 'selected' : ''}>Local Storage</option>
          </select>
        </div>

        <!-- Backup Frequency -->
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Backup Frequency</label>
          <select name="backupFrequency" class="${selectClass}">
            <option value="daily" ${settings?.backupFrequency === 'daily' ? 'selected' : ''}>Daily</option>
            <option value="weekly" ${settings?.backupFrequency === 'weekly' ? 'selected' : ''}>Weekly</option>
            <option value="monthly" ${settings?.backupFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
          </select>
          <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">D1 automatic backups are managed by Cloudflare</p>
        </div>

        <!-- Retention Period -->
        <div>
          <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Backup Retention (days)</label>
          <input type="number" name="retentionPeriod" value="${settings?.retentionPeriod || 30}" min="7" max="365" class="${inputClass}" />
        </div>
      </div>

      <!-- Allowed File Types -->
      <div>
        <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Allowed File Types</label>
        <textarea name="allowedFileTypes" rows="2" class="${inputClass}" placeholder="jpg, jpeg, png, gif, webp, svg, pdf, docx">${settings?.allowedFileTypes?.join(', ') || 'jpg, jpeg, png, gif, webp, svg, pdf, docx'}</textarea>
        <p class="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Comma-separated list of allowed file extensions for media uploads</p>
      </div>

      <!-- Save Button -->
      <div class="mt-8 pt-6 border-t border-zinc-950/5 dark:border-white/10 flex justify-end">
        <button
          onclick="saveStorageSettings()"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>
  `
}

function renderMigrationSettings(settings?: MigrationSettings): string {
  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Database Migrations</h3>
        <p class="text-gray-300 mb-6">View and manage database migrations to keep your schema up to date.</p>
      </div>
      
      <!-- Migration Status Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="backdrop-blur-md bg-blue-500/20 rounded-lg border border-blue-500/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-300">Total Migrations</p>
              <p id="total-migrations" class="text-2xl font-bold text-white">${settings?.totalMigrations || '0'}</p>
            </div>
            <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
            </svg>
          </div>
        </div>
        
        <div class="backdrop-blur-md bg-green-500/20 rounded-lg border border-green-500/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-green-300">Applied</p>
              <p id="applied-migrations" class="text-2xl font-bold text-white">${settings?.appliedMigrations || '0'}</p>
            </div>
            <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        
        <div class="backdrop-blur-md bg-orange-500/20 rounded-lg border border-orange-500/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-orange-300">Pending</p>
              <p id="pending-migrations" class="text-2xl font-bold text-white">${settings?.pendingMigrations || '0'}</p>
            </div>
            <svg class="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Migration Actions -->
      <div class="flex items-center space-x-4 mb-6">
        <button 
          onclick="window.refreshMigrationStatus()"
          class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh Status
        </button>
        
        <button 
          onclick="window.runPendingMigrations()"
          id="run-migrations-btn"
          class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          ${(settings?.pendingMigrations || 0) === 0 ? 'disabled' : ''}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4.586a1 1 0 00.293.707l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1"/>
          </svg>
          Run Pending
        </button>

        <button 
          onclick="window.validateSchema()" 
          class="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Validate Schema
        </button>
      </div>

      <!-- Migrations List -->
      <div class="backdrop-blur-md bg-white/10 rounded-lg border border-white/20 overflow-hidden">
        <div class="px-6 py-4 border-b border-white/10">
          <h4 class="text-lg font-medium text-white">Migration History</h4>
          <p class="text-sm text-gray-300 mt-1">List of all available database migrations</p>
        </div>
        
        <div id="migrations-list" class="divide-y divide-white/10">
          <div class="px-6 py-8 text-center">
            <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
            </svg>
            <p class="text-gray-300">Loading migration status...</p>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Load migration status when tab becomes active
      if (typeof refreshMigrationStatus === 'undefined') {
        window.refreshMigrationStatus = async function() {
          try {
            const response = await fetch('/admin/settings/api/migrations/status');
            const result = await response.json();
            
            if (result.success) {
              updateMigrationUI(result.data);
            } else {
              console.error('Failed to refresh migration status');
            }
          } catch (error) {
            console.error('Error loading migration status:', error);
          }
        };

        window.runPendingMigrations = async function() {
          const btn = document.getElementById('run-migrations-btn');
          if (!btn || btn.disabled) return;

          showConfirmDialog('run-migrations-confirm');
        };

        window.performRunMigrations = async function() {
          const btn = document.getElementById('run-migrations-btn');
          if (!btn) return;

          btn.disabled = true;
          btn.innerHTML = 'Running...';

          try {
            const response = await fetch('/admin/settings/api/migrations/run', {
              method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
              alert(result.message);
              setTimeout(() => window.refreshMigrationStatus(), 1000);
            } else {
              alert(result.error || 'Failed to run migrations');
            }
          } catch (error) {
            alert('Error running migrations');
          } finally {
            btn.disabled = false;
            btn.innerHTML = 'Run Pending';
          }
        };

        window.validateSchema = async function() {
          try {
            const response = await fetch('/admin/settings/api/migrations/validate');
            const result = await response.json();
            
            if (result.success) {
              if (result.data.valid) {
                alert('Database schema is valid');
              } else {
                alert(\`Schema validation failed: \${result.data.issues.join(', ')}\`);
              }
            } else {
              alert('Failed to validate schema');
            }
          } catch (error) {
            alert('Error validating schema');
          }
        };

        window.updateMigrationUI = function(data) {
          const totalEl = document.getElementById('total-migrations');
          const appliedEl = document.getElementById('applied-migrations');
          const pendingEl = document.getElementById('pending-migrations');
          
          if (totalEl) totalEl.textContent = data.totalMigrations;
          if (appliedEl) appliedEl.textContent = data.appliedMigrations;
          if (pendingEl) pendingEl.textContent = data.pendingMigrations;
          
          const runBtn = document.getElementById('run-migrations-btn');
          if (runBtn) {
            runBtn.disabled = data.pendingMigrations === 0;
          }
          
          // Update migrations list
          const listContainer = document.getElementById('migrations-list');
          if (listContainer && data.migrations && data.migrations.length > 0) {
            listContainer.innerHTML = data.migrations.map(migration => \`
              <div class="px-6 py-4 flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      \${migration.applied 
                        ? '<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                        : '<svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                      }
                    </div>
                    <div>
                      <h5 class="text-white font-medium">\${migration.name}</h5>
                      <p class="text-sm text-gray-300">\${migration.filename}</p>
                      \${migration.description ? \`<p class="text-xs text-gray-400 mt-1">\${migration.description}</p>\` : ''}
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center space-x-4 text-sm">
                  \${migration.size ? \`<span class="text-gray-400">\${(migration.size / 1024).toFixed(1)} KB</span>\` : ''}
                  <span class="px-2 py-1 rounded-full text-xs font-medium \${
                    migration.applied 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }">
                    \${migration.applied ? 'Applied' : 'Pending'}
                  </span>
                  \${migration.appliedAt ? \`<span class="text-gray-400">\${new Date(migration.appliedAt).toLocaleDateString()}</span>\` : ''}
                </div>
              </div>
            \`).join('');
          }
        };
      }
      
      // Auto-load when tab becomes active
      if (currentTab === 'migrations') {
        setTimeout(refreshMigrationStatus, 500);
      }
    </script>
  `
}

function renderDatabaseToolsSettings(settings?: DatabaseToolsSettings): string {
  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-lg/7 font-semibold text-zinc-950 dark:text-white">Database Tools</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage database operations including backup, restore, and maintenance.</p>
      </div>

      <!-- Database Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="rounded-lg bg-white dark:bg-white/5 p-6 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm/6 font-medium text-zinc-500 dark:text-zinc-400">Total Tables</p>
              <p id="total-tables" class="mt-2 text-3xl/8 font-semibold text-zinc-950 dark:text-white">${settings?.totalTables || '0'}</p>
            </div>
            <div class="rounded-lg bg-indigo-500/10 p-3">
              <svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white dark:bg-white/5 p-6 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm/6 font-medium text-zinc-500 dark:text-zinc-400">Total Rows</p>
              <p id="total-rows" class="mt-2 text-3xl/8 font-semibold text-zinc-950 dark:text-white">${settings?.totalRows?.toLocaleString() || '0'}</p>
            </div>
            <div class="rounded-lg bg-green-500/10 p-3">
              <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Database Operations -->
      <div class="space-y-4">
        <!-- Safe Operations -->
        <div class="rounded-lg bg-white dark:bg-white/5 p-6 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10">
          <h4 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-4">Safe Operations</h4>
          <div class="flex flex-wrap gap-3">
            <button
              onclick="window.refreshDatabaseStats()"
              class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
            >
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh Stats
            </button>

            <button
              onclick="window.createDatabaseBackup()"
              id="create-backup-btn"
              class="inline-flex items-center justify-center rounded-lg bg-indigo-600 dark:bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors shadow-sm"
            >
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Create Backup
            </button>

            <button
              onclick="window.validateDatabase()"
              class="inline-flex items-center justify-center rounded-lg bg-green-600 dark:bg-green-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 dark:hover:bg-green-400 transition-colors shadow-sm"
            >
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Validate Database
            </button>
          </div>
        </div>
      </div>

      <!-- Tables List -->
      <div class="rounded-lg bg-white dark:bg-white/5 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 overflow-hidden">
        <div class="px-6 py-4 border-b border-zinc-950/10 dark:border-white/10">
          <h4 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Database Tables</h4>
          <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Click on a table to view its data</p>
        </div>

        <div id="tables-list" class="p-6 space-y-2">
          <div class="text-center py-8">
            <svg class="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            <p class="text-zinc-500 dark:text-zinc-400">Loading database statistics...</p>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="rounded-lg bg-red-50 dark:bg-red-950/20 p-6 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/30">
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <div class="flex-1">
            <h4 class="text-base/7 font-semibold text-red-900 dark:text-red-400">Danger Zone</h4>
            <p class="mt-1 text-sm/6 text-red-700 dark:text-red-300">
              These operations are destructive and cannot be undone.
              <strong>Your admin account will be preserved</strong>, but all other data will be permanently deleted.
            </p>
            <div class="mt-4">
              <button
                onclick="window.truncateDatabase()"
                id="truncate-db-btn"
                class="inline-flex items-center justify-center rounded-lg bg-red-600 dark:bg-red-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 dark:hover:bg-red-400 transition-colors shadow-sm"
              >
                <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Truncate All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}