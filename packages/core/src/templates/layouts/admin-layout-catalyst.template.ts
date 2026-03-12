import { HtmlEscapedString } from "hono/utils/html";
import { renderLogo } from "../components/logo.template";
import { getVersionDisplay } from "../../utils/version";
import {
  icon,
  LayoutDashboard,
  Layers,
  ClipboardList,
  CircleHelp,
  FileText,
  Image,
  Users,
  Plug,
  HardDrive,
  Database,
  Settings,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Rocket,
  BarChart3,
  Sun,
  Moon,
} from "../icons";

// Catalyst Checkbox Component (HTML implementation)
export interface CatalystCheckboxProps {
  id: string;
  name: string;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  color?:
    | "dark/zinc"
    | "dark/white"
    | "white"
    | "dark"
    | "zinc"
    | "blue"
    | "green"
    | "red";
  className?: string;
}

export function renderCatalystCheckbox(props: CatalystCheckboxProps): string {
  const {
    id,
    name,
    checked = false,
    disabled = false,
    label,
    description,
    color = "dark/zinc",
    className = "",
  } = props;

  const colorConfig = {
    "dark/zinc": {
      bg: "#18181b",
      border: "#09090b",
      check: "#ffffff",
      darkBg: "#52525b",
    },
    "dark/white": {
      bg: "#18181b",
      border: "#09090b",
      check: "#ffffff",
      darkBg: "#ffffff",
      darkCheck: "#18181b",
    },
    white: { bg: "#ffffff", border: "#09090b", check: "#18181b" },
    dark: { bg: "#18181b", border: "#09090b", check: "#ffffff" },
    zinc: { bg: "#52525b", border: "#3f3f46", check: "#ffffff" },
    blue: { bg: "#2563eb", border: "#1d4ed8", check: "#ffffff" },
    green: { bg: "#16a34a", border: "#15803d", check: "#ffffff" },
    red: { bg: "#dc2626", border: "#b91c1c", check: "#ffffff" },
  };

  const _config = colorConfig[color] || colorConfig["dark/zinc"];

  const colorClasses = {
    "dark/zinc":
      "peer-checked:bg-zinc-900 peer-checked:before:bg-zinc-900 dark:peer-checked:bg-zinc-600",
    "dark/white":
      "peer-checked:bg-zinc-900 peer-checked:before:bg-zinc-900 dark:peer-checked:bg-white",
    white: "peer-checked:bg-white peer-checked:before:bg-white",
    dark: "peer-checked:bg-zinc-900 peer-checked:before:bg-zinc-900",
    zinc: "peer-checked:bg-zinc-600 peer-checked:before:bg-zinc-600",
    blue: "peer-checked:bg-blue-600 peer-checked:before:bg-blue-600",
    green: "peer-checked:bg-green-600 peer-checked:before:bg-green-600",
    red: "peer-checked:bg-red-600 peer-checked:before:bg-red-600",
  };

  const checkColor =
    color === "dark/white" ? "dark:text-zinc-900" : "text-white";

  const baseClasses = `
    relative isolate flex w-4 h-4 items-center justify-center rounded-[0.3125rem]
    before:absolute before:inset-0 before:-z-10 before:rounded-[calc(0.3125rem-1px)] before:bg-white before:shadow-sm
    dark:before:hidden
    dark:bg-white/5
    border border-zinc-950/15 peer-checked:border-transparent
    dark:border-white/15 dark:peer-checked:border-white/5
    peer-focus:outline peer-focus:outline-2 peer-focus:outline-offset-2 peer-focus:outline-blue-500
    peer-disabled:opacity-50
    peer-disabled:border-zinc-950/25 peer-disabled:bg-zinc-950/5
    dark:peer-disabled:border-white/20 dark:peer-disabled:bg-white/2.5
  `
    .trim()
    .replace(/\s+/g, " ");

  const checkIconClasses = `
    w-4 h-4 opacity-0 peer-checked:opacity-100 pointer-events-none
  `
    .trim()
    .replace(/\s+/g, " ");

  if (description) {
    // Field layout with description
    return `
      <div class="grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[1rem_1fr] ${className}">
        <div class="col-start-1 row-start-1 mt-0.75 sm:mt-1">
          <input
            type="checkbox"
            id="${id}"
            name="${name}"
            ${checked ? "checked" : ""}
            ${disabled ? "disabled" : ""}
            class="peer sr-only"
          />
          <label for="${id}" class="inline-flex cursor-pointer">
            <span class="${baseClasses} ${colorClasses[color] || colorClasses["dark/zinc"]}">
              <svg class="${checkIconClasses} ${checkColor}" viewBox="0 0 14 14" fill="none" stroke="currentColor">
                <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </label>
        </div>
        ${label ? `<label for="${id}" class="col-start-2 row-start-1 text-sm/6 font-medium text-zinc-950 dark:text-white cursor-pointer">${label}</label>` : ""}
        ${description ? `<p class="col-start-2 row-start-2 text-sm/6 text-zinc-500 dark:text-zinc-400">${description}</p>` : ""}
      </div>
    `;
  } else {
    // Simple checkbox with optional label
    return `
      <label class="inline-flex items-center gap-3 cursor-pointer ${className}">
        <input
          type="checkbox"
          id="${id}"
          name="${name}"
          ${checked ? "checked" : ""}
          ${disabled ? "disabled" : ""}
          class="peer sr-only"
        />
        <span class="${baseClasses} ${colorClasses[color] || colorClasses["dark/zinc"]}">
          <svg class="${checkIconClasses} ${checkColor}" viewBox="0 0 14 14" fill="none" stroke="currentColor">
            <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        ${label ? `<span class="text-sm/6 font-medium text-zinc-950 dark:text-white">${label}</span>` : ""}
      </label>
    `;
  }
}

export interface AdminLayoutCatalystData {
  title: string;
  pageTitle?: string;
  currentPath?: string;
  version?: string;
  enableExperimentalFeatures?: boolean;
  user?: {
    name: string;
    email: string;
    role: string;
  };
  scripts?: string[];
  styles?: string[];
  content: string | HtmlEscapedString;
  dynamicMenuItems?: Array<{
    label: string;
    slug: string;
    collectionId: string;
    icon: string;
  }>;
}

export function renderAdminLayoutCatalyst(
  data: AdminLayoutCatalystData
): string {
  if (!data.version) data.version = getVersionDisplay();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - Flare CMS Admin</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">

  <!-- Dark mode init (before any rendering to prevent FOUC) -->
  <script>
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  </script>

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
            }
          }
        }
      }
    }
  </script>

  <!-- Additional Styles -->
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

    /* Custom scrollbar - light mode */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #f4f4f5;
    }

    ::-webkit-scrollbar-thumb {
      background: #d4d4d8;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #a1a1aa;
    }

    /* Custom scrollbar - dark mode */
    .dark ::-webkit-scrollbar-track {
      background: #27272a;
    }

    .dark ::-webkit-scrollbar-thumb {
      background: #52525b;
    }

    .dark ::-webkit-scrollbar-thumb:hover {
      background: #71717a;
    }

    /* Alpine.js cloak */
    [x-cloak] { display: none !important; }

    /* Smooth transitions */
    * {
      transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
  </style>

  <!-- Scripts -->
  <script src="https://unpkg.com/htmx.org@2.0.3"></script>
  <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

  <!-- CSRF: Auto-attach token to all HTMX and fetch requests -->
  <script>
    function getCsrfToken() {
      var cookie = document.cookie.split('; ')
        .find(function(row) { return row.startsWith('csrf_token='); });
      return cookie ? cookie.substring(cookie.indexOf('=') + 1) : '';
    }

    document.addEventListener('htmx:configRequest', function(event) {
      var token = getCsrfToken();
      if (token) {
        event.detail.headers['X-CSRF-Token'] = token;
      }
    });

    (function() {
      var originalFetch = window.fetch;
      window.fetch = function(url, options) {
        options = options || {};
        var method = (options.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
          options.headers = options.headers || {};
          if (options.headers instanceof Headers) {
            if (!options.headers.has('X-CSRF-Token')) {
              options.headers.set('X-CSRF-Token', getCsrfToken());
            }
          } else if (!Array.isArray(options.headers) && !options.headers['X-CSRF-Token']) {
            options.headers['X-CSRF-Token'] = getCsrfToken();
          }
        }
        return originalFetch.call(this, url, options);
      };
    })();

    // Inject _csrf hidden field into regular form submissions (non-HTMX)
    document.addEventListener('submit', function(event) {
      var form = event.target;
      if (!form || !form.tagName || form.tagName !== 'FORM') return;
      var method = (form.method || 'GET').toUpperCase();
      if (method === 'GET') return;
      if (form.hasAttribute('hx-post') || form.hasAttribute('hx-put') ||
          form.hasAttribute('hx-delete') || form.hasAttribute('hx-patch')) return;
      if (!form.querySelector('input[name="_csrf"]')) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_csrf';
        input.value = getCsrfToken();
        form.appendChild(input);
      }
    });
  </script>

  ${
    data.styles
      ? data.styles
          .map((style) => `<link rel="stylesheet" href="${style}">`)
          .join("\n  ")
      : ""
  }
  ${
    data.scripts
      ? data.scripts
          .map((script) => `<script src="${script}"></script>`)
          .join("\n  ")
      : ""
  }
</head>
<body class="min-h-screen bg-slate-50 dark:bg-zinc-900">
  <div class="relative isolate flex min-h-svh w-full max-lg:flex-col lg:bg-zinc-100 dark:lg:bg-zinc-950">
    <!-- Sidebar on desktop -->
    <div class="fixed inset-y-0 left-0 w-64 max-lg:hidden">
      ${renderCatalystSidebar(
        data.currentPath,
        data.user,
        data.dynamicMenuItems,
        false,
        data.version,
        data.enableExperimentalFeatures
      )}
    </div>

    <!-- Mobile sidebar (hidden by default) -->
    <div id="mobile-sidebar-overlay" class="fixed inset-0 bg-black/30 lg:hidden hidden z-40" onclick="closeMobileSidebar()"></div>
    <div id="mobile-sidebar" class="fixed inset-y-0 left-0 w-80 transform -translate-x-full transition-transform duration-300 ease-in-out lg:hidden z-50">
      ${renderCatalystSidebar(
        data.currentPath,
        data.user,
        data.dynamicMenuItems,
        true,
        data.version,
        data.enableExperimentalFeatures
      )}
    </div>

    <!-- Main content area -->
    <main class="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pr-2 lg:pl-64">
      <!-- Mobile header with menu toggle -->
      <header class="flex items-center px-4 py-2.5 lg:hidden border-b border-zinc-950/5 dark:border-white/5">
        <button onclick="openMobileSidebar()" class="relative flex items-center justify-center rounded-lg p-2 text-zinc-950 hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/5" aria-label="Open navigation">
          ${icon(Menu, 'h-5 w-5')}
        </button>
        <div class="ml-4 flex-1 text-zinc-900 dark:text-white">
          ${renderLogo({ size: "sm", showText: true, href: "/admin" })}
        </div>
      </header>

      <!-- Content -->
      <div class="grow p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-sm lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
        ${data.content}
      </div>
    </main>
  </div>

  <!-- Notification Container -->
  <div id="notification-container" class="fixed top-4 right-4 z-50 space-y-2"></div>

  <!-- Migration Warning Banner (hidden by default) -->
  <div id="migration-banner" class="hidden fixed top-0 left-0 right-0 z-50 bg-amber-500 dark:bg-amber-600 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between flex-wrap">
        <div class="flex items-center flex-1">
          <span class="flex p-2 rounded-lg bg-amber-600 dark:bg-amber-700">
            ${icon(AlertTriangle, 'h-5 w-5 text-white')}
          </span>
          <div class="ml-3">
            <p class="text-sm font-medium text-white">
              <span id="migration-count"></span> pending database migration(s) detected
            </p>
            <p class="text-xs text-amber-100 dark:text-amber-200 mt-1">
              Run: <code class="bg-amber-700 dark:bg-amber-800 px-2 py-0.5 rounded font-mono text-white">wrangler d1 migrations apply DB --local</code>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/admin/settings/migrations" class="text-xs font-semibold text-white hover:text-amber-100 underline">
            View Details
          </a>
          <button onclick="closeMigrationBanner()" class="p-1 rounded-md text-white hover:bg-amber-600 dark:hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-white">
            ${icon(X, 'h-5 w-5')}
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Mobile sidebar toggle
    function openMobileSidebar() {
      const sidebar = document.getElementById('mobile-sidebar');
      const overlay = document.getElementById('mobile-sidebar-overlay');
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    }

    function closeMobileSidebar() {
      const sidebar = document.getElementById('mobile-sidebar');
      const overlay = document.getElementById('mobile-sidebar-overlay');
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }

    // User dropdown toggle
    function toggleUserDropdown() {
      const dropDowns = document.querySelectorAll('.userDropdown');
      dropDowns.forEach(dropdown => {
        dropdown.classList.toggle('hidden');
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
      const dropdown = document.getElementById('userDropdown');
      const button = event.target.closest('[data-user-menu]');
      if (!button && dropdown && !dropdown.contains(event.target)) {
        dropdown.classList.add('hidden');
      }
    });

    // Show notification
    function showNotification(message, type = 'info') {
      const container = document.getElementById('notification-container');
      const notification = document.createElement('div');
      const colors = {
        success: 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-green-600/20 dark:ring-green-500/20',
        error: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-red-600/20 dark:ring-red-500/20',
        warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-600/20 dark:ring-amber-500/20',
        info: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-600/20 dark:ring-blue-500/20'
      };

      notification.className = \`rounded-lg p-4 ring-1 \${colors[type] || colors.info} max-w-sm shadow-lg\`;
      notification.innerHTML = \`
        <div class="flex items-center justify-between">
          <span class="text-sm">\${message}</span>
          <button onclick="this.parentElement.parentElement.remove()" class="ml-4 hover:opacity-70">
            ${icon(X, 'w-4 h-4')}
          </button>
        </div>
      \`;

      container.appendChild(notification);

      // Auto remove after 5 seconds
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 5000);
    }

    // Show URL-based notifications (e.g. from requireRole redirect)
    (function() {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const message = params.get('message');
      const type = params.get('type') || (error ? 'error' : 'success');
      const text = error || message;
      if (text) {
        showNotification(text, type);
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        url.searchParams.delete('message');
        url.searchParams.delete('type');
        window.history.replaceState({}, '', url.pathname + url.hash);
      }
    })();

    // Dark mode toggle
    function toggleDarkMode() {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
    }

    // Migration banner functions
    function closeMigrationBanner() {
      const banner = document.getElementById('migration-banner');
      if (banner) {
        banner.classList.add('hidden');
        // Store in session storage so it doesn't show again during this session
        sessionStorage.setItem('migrationBannerDismissed', 'true');
      }
    }

    // Check for pending migrations on page load
    async function checkPendingMigrations() {
      // Don't check if user dismissed the banner in this session
      if (sessionStorage.getItem('migrationBannerDismissed') === 'true') {
        return;
      }

      try {
        const response = await fetch('/admin/api/migrations/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.pendingMigrations > 0) {
            const banner = document.getElementById('migration-banner');
            const countElement = document.getElementById('migration-count');
            if (banner && countElement) {
              countElement.textContent = data.data.pendingMigrations;
              banner.classList.remove('hidden');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check migration status:', error);
      }
    }

    // Check for pending migrations when the page loads
    document.addEventListener('DOMContentLoaded', checkPendingMigrations);
  </script>

  <!-- Deploy Modal -->
  <div id="deploy-modal" class="hidden fixed inset-0 z-50">
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onclick="closeDeployModal()"></div>
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <div class="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-zinc-950/5 dark:ring-white/10 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 class="text-lg font-semibold text-zinc-950 dark:text-white">Deploy Site</h2>
            <p id="deploy-subtitle" class="text-sm text-zinc-500 dark:text-zinc-400">Review changes before deploying</p>
          </div>
          <button onclick="closeDeployModal()" class="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div id="deploy-body" class="flex-1 overflow-y-auto px-6 py-4">
          <div class="flex items-center justify-center py-8">
            <div class="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600"></div>
            <span class="ml-3 text-sm text-zinc-500">Loading changes...</span>
          </div>
        </div>
        <div id="deploy-footer" class="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div id="deploy-status" class="text-sm text-zinc-500 dark:text-zinc-400"></div>
          <div class="flex gap-3">
            <button onclick="closeDeployModal()" class="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
            <button id="deploy-confirm-btn" onclick="triggerDeploy()" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Deploy Now</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Deploy Setup Modal -->
  <div id="deploy-setup-modal" class="hidden fixed inset-0 z-50">
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onclick="closeDeploySetup()"></div>
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <div class="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-zinc-950/5 dark:ring-white/10">
        <div class="px-6 py-5">
          <h2 class="text-lg font-semibold text-zinc-950 dark:text-white mb-2">Configure GitHub Deploy</h2>
          <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Deploy triggers a GitHub Actions workflow that builds and deploys your site. Enter your repo and a personal access token with <code class="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">repo</code> scope.
          </p>
          <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">GitHub Repository</label>
          <input id="deploy-repo-input" type="text" placeholder="owner/repo" class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 mb-3" />
          <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">GitHub Token</label>
          <input id="deploy-token-input" type="password" placeholder="ghp_..." class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400" />
          <p class="text-xs text-zinc-400 mt-1">Token is stored securely in your CMS database.</p>
          <div class="flex justify-end gap-3 mt-4">
            <button onclick="closeDeploySetup()" class="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
            <button onclick="saveDeploySettings()" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Deploy feature
    async function checkPendingDeploy() {
      try {
        const res = await fetch('/admin/deploy/api/pending-count');
        const data = await res.json();
        const badge = document.getElementById('deploy-badge');
        if (badge && data.count > 0) {
          badge.textContent = data.count;
          badge.classList.remove('hidden');
        } else if (badge) {
          badge.classList.add('hidden');
        }
      } catch (e) { /* silent */ }
    }

    async function openDeployModal() {
      try {
        const settingsRes = await fetch('/admin/deploy/api/settings');
        const settings = await settingsRes.json();
        if (!settings.hasToken || !settings.githubRepo) {
          document.getElementById('deploy-setup-modal').classList.remove('hidden');
          document.getElementById('deploy-repo-input').focus();
          return;
        }
      } catch (e) { return; }

      document.getElementById('deploy-modal').classList.remove('hidden');
      const body = document.getElementById('deploy-body');
      const subtitle = document.getElementById('deploy-subtitle');
      const confirmBtn = document.getElementById('deploy-confirm-btn');
      const status = document.getElementById('deploy-status');

      // Reset state
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deploy Now';
      confirmBtn.className = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

      try {
        const res = await fetch('/admin/deploy/api/pending');
        const data = await res.json();

        if (data.count === 0) {
          subtitle.textContent = 'No pending changes';
          body.textContent = '';
          const msg = document.createElement('div');
          msg.className = 'py-8 text-center';
          const p = document.createElement('p');
          p.className = 'text-zinc-500 dark:text-zinc-400';
          p.textContent = 'All content is up to date. Nothing to deploy.';
          msg.appendChild(p);
          body.appendChild(msg);
          confirmBtn.disabled = true;
          status.textContent = data.lastDeployedAt ? 'Last deployed: ' + new Date(data.lastDeployedAt).toLocaleString() : '';
        } else {
          subtitle.textContent = data.count + ' change' + (data.count === 1 ? '' : 's') + ' pending';
          confirmBtn.disabled = false;
          status.textContent = data.lastDeployedAt ? 'Last deployed: ' + new Date(data.lastDeployedAt).toLocaleString() : 'Never deployed';

          const groups = {};
          for (const item of data.pending) {
            const col = item.collection_name || 'Unknown';
            if (!groups[col]) groups[col] = [];
            groups[col].push(item);
          }

          body.textContent = '';
          for (const [collection, items] of Object.entries(groups)) {
            const section = document.createElement('div');
            section.className = 'mb-4';

            const heading = document.createElement('h3');
            heading.className = 'text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2';
            heading.textContent = collection + ' (' + items.length + ')';
            section.appendChild(heading);

            const list = document.createElement('div');
            list.className = 'space-y-1';

            for (const item of items) {
              const link = document.createElement('a');
              link.href = '/admin/content/' + item.id + '/edit';
              link.className = 'flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group';

              const info = document.createElement('div');
              info.className = 'min-w-0';

              const title = document.createElement('p');
              title.className = 'text-sm font-medium text-zinc-950 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400';
              title.textContent = item.title;

              const time = document.createElement('p');
              time.className = 'text-xs text-zinc-500 dark:text-zinc-400';
              time.textContent = new Date(item.updated_at).toLocaleString();

              info.appendChild(title);
              info.appendChild(time);

              const badge = document.createElement('span');
              badge.className = 'text-xs font-medium ml-3 shrink-0 ' + (item.status === 'published' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400');
              badge.textContent = item.status;

              link.appendChild(info);
              link.appendChild(badge);
              list.appendChild(link);
            }

            section.appendChild(list);
            body.appendChild(section);
          }
        }
      } catch (e) {
        body.textContent = '';
        const err = document.createElement('div');
        err.className = 'py-8 text-center text-red-500';
        err.textContent = 'Failed to load changes';
        body.appendChild(err);
      }
    }

    function closeDeployModal() {
      document.getElementById('deploy-modal').classList.add('hidden');
    }

    function closeDeploySetup() {
      document.getElementById('deploy-setup-modal').classList.add('hidden');
    }

    async function saveDeploySettings() {
      const repo = document.getElementById('deploy-repo-input').value.trim();
      const token = document.getElementById('deploy-token-input').value.trim();
      if (!repo || !token) { alert('Both fields are required'); return; }
      try {
        await fetch('/admin/deploy/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ githubRepo: repo, githubToken: token })
        });
        closeDeploySetup();
        openDeployModal();
      } catch (e) {
        alert('Failed to save deploy settings');
      }
    }

    async function triggerDeploy() {
      const btn = document.getElementById('deploy-confirm-btn');
      const status = document.getElementById('deploy-status');
      btn.disabled = true;
      btn.textContent = 'Deploying...';
      status.textContent = 'Triggering build...';
      try {
        const res = await fetch('/admin/deploy/api/trigger', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          status.textContent = 'Build triggered via GitHub Actions! Site will be live in ~60 seconds.';
          btn.textContent = 'Deployed';
          btn.className = 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
          const badge = document.getElementById('deploy-badge');
          if (badge) badge.classList.add('hidden');
          setTimeout(closeDeployModal, 3000);
        } else {
          status.textContent = data.error || 'Deploy failed';
          btn.textContent = 'Deploy Now';
          btn.disabled = false;
        }
      } catch (e) {
        status.textContent = 'Network error';
        btn.textContent = 'Deploy Now';
        btn.disabled = false;
      }
    }

    document.addEventListener('DOMContentLoaded', checkPendingDeploy);
  </script>
</body>
</html>`;
}

function renderCatalystSidebar(
  currentPath: string = "",
  user?: any,
  dynamicMenuItems?: Array<{ label: string; slug: string; collectionId: string; icon: string }>,
  isMobile: boolean = false,
  version?: string,
  _enableExperimentalFeatures?: boolean
): string {
  // --- Helper: render a single nav link ---
  const navLink = (item: { label: string; path: string; iconHtml: string }, isActive: boolean) => `
    <span class="relative">
      ${isActive ? `<span class="absolute inset-y-2 -left-4 w-0.5 rounded-full bg-blue-600 dark:bg-blue-500"></span>` : ''}
      <a
        href="${item.path}"
        class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm/5 font-medium ${
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
            : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5'
        }"
        ${isActive ? 'data-current="true"' : ''}
      >
        <span class="shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}">${item.iconHtml}</span>
        <span class="truncate">${item.label}</span>
      </a>
    </span>
  `

  // --- Helper: render a collection nav item with Alpine.js flyout ---
  const collectionNavItem = (item: { label: string; slug: string; collectionId: string; icon: string }) => {
    const contentPath = `/admin/content?collection=${item.collectionId}`
    const isActive = currentPath === contentPath || currentPath?.includes(`collection=${item.collectionId}`) || currentPath?.includes(`model=${item.slug}`)
    return `
    <div x-data="{ open: false }" class="relative">
      <span class="relative">
        ${isActive ? `<span class="absolute inset-y-2 -left-4 w-0.5 rounded-full bg-blue-600 dark:bg-blue-500"></span>` : ''}
        <button
          @click="open = !open"
          class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm/5 font-medium ${
            isActive
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
              : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5'
          }"
        >
          <span class="shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}">${item.icon}</span>
          <span class="flex-1 truncate">${item.label}</span>
          <span class="shrink-0 text-zinc-400" :class="open ? 'rotate-90' : ''">${icon(ChevronRight, 'h-3.5 w-3.5 transition-transform')}</span>
        </button>
      </span>
      <div x-show="open" x-cloak class="ml-8 mt-0.5 flex flex-col gap-0.5">
        <a href="/admin/content?collection=${item.collectionId}" class="rounded-lg px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200">All ${item.label}</a>
        <a href="/admin/content/new?collection=${item.collectionId}" class="rounded-lg px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200">Add New</a>
      </div>
    </div>
    `
  }

  // --- Helper: section header ---
  const sectionHeader = (label: string) => `
    <div class="px-2 pt-4 pb-1">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">${label}</p>
    </div>
  `

  // --- Check active states ---
  const isActivePath = (path: string) =>
    currentPath === path || (path !== '/admin' && currentPath?.startsWith(path))

  // --- Build sidebar sections ---

  // Dashboard (top, no section header)
  const dashboardItem = navLink(
    { label: 'Dashboard', path: '/admin', iconHtml: icon(LayoutDashboard, 'h-5 w-5') },
    currentPath === '/admin' || currentPath === '/admin/dashboard'
  )

  // --- Role-based visibility ---
  const userRole = user?.role || 'viewer'
  const isAdmin = userRole === 'admin'
  const isEditorOrAbove = isAdmin || userRole === 'editor'

  // CONTENT section: dynamic collections + Content (all) + Media
  const hasCollections = dynamicMenuItems && dynamicMenuItems.length > 0
  const collectionItems = hasCollections
    ? dynamicMenuItems!.map(item => collectionNavItem(item)).join('')
    : ''
  const contentAllItem = navLink(
    { label: 'Content', path: '/admin/content', iconHtml: icon(FileText, 'h-5 w-5') },
    isActivePath('/admin/content') && !currentPath?.includes('collection=')
  )
  const mediaItem = navLink(
    { label: 'Media', path: '/admin/media', iconHtml: icon(Image, 'h-5 w-5') },
    isActivePath('/admin/media')
  )

  // Analytics (between content and system)
  const analyticsItem = navLink(
    { label: 'Analytics', path: '/admin/analytics', iconHtml: icon(BarChart3, 'h-5 w-5') },
    isActivePath('/admin/analytics')
  )

  // SYSTEM section — filtered by role
  // Admin-only: Users, Collections, Plugins, Cache, Migrations
  // Editor+: Forms, FAQs
  const systemItemsList: Array<{ label: string; path: string; iconHtml: string }> = []
  if (isAdmin) {
    systemItemsList.push({ label: 'Users', path: '/admin/users', iconHtml: icon(Users, 'h-5 w-5') })
    systemItemsList.push({ label: 'Collections', path: '/admin/collections', iconHtml: icon(Layers, 'h-5 w-5') })
  }
  if (isEditorOrAbove) {
    systemItemsList.push({ label: 'Forms', path: '/admin/forms', iconHtml: icon(ClipboardList, 'h-5 w-5') })
    systemItemsList.push({ label: 'FAQs', path: '/admin/faq', iconHtml: icon(CircleHelp, 'h-5 w-5') })
  }
  if (isAdmin) {
    systemItemsList.push({ label: 'Plugins', path: '/admin/plugins', iconHtml: icon(Plug, 'h-5 w-5') })
    systemItemsList.push({ label: 'Cache', path: '/admin/cache', iconHtml: icon(HardDrive, 'h-5 w-5') })
    systemItemsList.push({ label: 'Migrations', path: '/admin/schema-migrations', iconHtml: icon(Database, 'h-5 w-5') })
  }
  const systemItems = systemItemsList.map(item => navLink(item, isActivePath(item.path))).join('')

  // Deploy button (admin only, pinned bottom)
  const deployItem = isAdmin ? `
    <button
      onclick="openDeployModal()"
      class="relative flex w-full items-center gap-3 rounded-lg p-2 text-left text-base/6 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5 sm:text-sm/5 transition-colors"
    >
      ${icon(Rocket, 'h-5 w-5 shrink-0')}
      <span>Deploy</span>
      <span id="deploy-badge" class="ml-auto hidden min-w-[20px] rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white"></span>
    </button>
  ` : ''

  // Settings (admin only, pinned bottom)
  const settingsItem = isAdmin ? navLink(
    { label: 'Settings', path: '/admin/settings', iconHtml: icon(Settings, 'h-5 w-5') },
    isActivePath('/admin/settings')
  ) : ''

  // Close button for mobile
  const closeButton = isMobile ? `
    <div class="-mb-3 px-4 pt-3">
      <button onclick="closeMobileSidebar()" class="relative flex w-full items-center gap-3 rounded-lg p-2 text-left text-base/6 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/5 sm:text-sm/5" aria-label="Close navigation">
        ${icon(X, 'h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500')}
        <span>Close menu</span>
      </button>
    </div>
  ` : ''

  return `
    <nav class="flex h-full min-h-0 flex-col bg-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10 ${
      isMobile ? 'is-mobile rounded-lg p-2 m-2' : ''
    }">
      ${closeButton}

      <!-- Sidebar Header -->
      <div class="relative flex flex-col items-center justify-center border-b border-zinc-200 px-4 py-6 dark:border-zinc-800 text-zinc-900 dark:text-white">
        ${renderLogo({ size: 'lg', showText: true, showVersion: false, href: '/admin' })}
        ${version ? `<span class="absolute bottom-2 right-4 text-[10px] text-zinc-400 dark:text-zinc-500">${version}</span>` : ''}
      </div>

      <!-- Sidebar Body -->
      <div class="flex flex-1 flex-col overflow-y-auto px-4 pb-4">
        <!-- Dashboard -->
        <div class="flex flex-col gap-0.5 pt-2">
          ${dashboardItem}
        </div>

        <!-- CONTENT -->
        ${sectionHeader('Content')}
        <div class="flex flex-col gap-0.5">
          ${collectionItems}
          ${contentAllItem}
          ${mediaItem}
        </div>

        <!-- ANALYTICS -->
        <div class="flex flex-col gap-0.5 pt-2">
          ${analyticsItem}
        </div>

        <!-- SYSTEM -->
        ${systemItemsList.length > 0 ? `
          ${sectionHeader('System')}
          <div class="flex flex-col gap-0.5">
            ${systemItems}
          </div>
        ` : ''}
      </div>

      <!-- Deploy + Settings (Bottom, admin only) -->
      ${isAdmin ? `
        <div class="border-t border-zinc-200 px-4 py-2 dark:border-zinc-800 flex flex-col gap-0.5">
          ${deployItem}
          ${settingsItem}
        </div>
      ` : ''}


      <!-- Sidebar Footer (User) -->
      ${user ? `
        <div class="flex flex-col border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div class="relative">
            <button
              data-user-menu
              onclick="toggleUserDropdown()"
              class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm/5 font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <span class="text-xs font-semibold">${(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
              </div>
              <span class="flex-1 truncate">${user.name || user.email || 'User'}</span>
              ${icon(ChevronDown, 'h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500')}
            </button>

            <!-- User Dropdown -->
            <div class="userDropdown hidden absolute bottom-full mb-2 left-0 right-0 mx-2 rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700 z-50">
              <div class="p-2">
                <div class="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                  <p class="text-sm font-medium text-zinc-900 dark:text-white">${user.name || user.email || 'User'}</p>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">${user.email || ''}</p>
                </div>
                <a href="/admin/profile" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5">
                  ${icon(User, 'h-4 w-4')}
                  My Profile
                </a>
                <button onclick="toggleDarkMode()" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5">
                  <span class="dark:hidden">${icon(Moon, 'h-4 w-4')}</span>
                  <span class="hidden dark:inline">${icon(Sun, 'h-4 w-4')}</span>
                  <span class="dark:hidden">Dark Mode</span>
                  <span class="hidden dark:inline">Light Mode</span>
                </button>
                <a href="/auth/logout" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                  ${icon(LogOut, 'h-4 w-4')}
                  Sign Out
                </a>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </nav>
  `
}