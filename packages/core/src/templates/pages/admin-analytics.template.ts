import {
  AdminLayoutData,
  renderAdminLayout,
} from '../layouts/admin-layout-v2.template'

export interface AnalyticsPageData {
  user?: {
    name: string
    email: string
    role: string
  }
  version?: string
  dynamicMenuItems?: Array<{ label: string; path: string; icon: string }>
}

export function renderAnalyticsPage(data: AnalyticsPageData): string {
  const pageContent = `
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Analytics</h1>
        <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Privacy-first visitor analytics — no cookies, no personal data stored</p>
      </div>
      <div class="mt-4 sm:mt-0 flex items-center gap-x-3">
        <select id="period-select" onchange="changePeriod(this.value)" class="rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600">
          <option value="7d">Last 7 days</option>
          <option value="30d" selected>Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>
    </div>

    <!-- Overview Stats -->
    <div id="overview-stats" class="mb-8"
      hx-get="/admin/analytics/overview-html?period=30d"
      hx-trigger="load"
      hx-swap="innerHTML">
      ${renderOverviewSkeleton()}
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-8">
      <!-- Visitors Over Time (2/3 width) -->
      <div class="xl:col-span-2">
        <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
          <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
            <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Visitors Over Time</h3>
          </div>
          <div class="px-6 py-6">
            <canvas id="visitors-chart" class="w-full" style="height: 300px;"></canvas>
          </div>
        </div>
      </div>

      <!-- Top Pages (1/3 width) -->
      <div class="xl:col-span-1">
        <div id="top-pages" class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 h-full"
          hx-get="/admin/analytics/top-pages-html?period=30d"
          hx-trigger="load"
          hx-swap="innerHTML">
          ${renderTableSkeleton('Top Pages')}
        </div>
      </div>
    </div>

    <!-- Second Row -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
      <!-- Referrers -->
      <div id="referrers"
        hx-get="/admin/analytics/referrers-html?period=30d"
        hx-trigger="load"
        hx-swap="innerHTML">
        ${renderTableSkeleton('Top Referrers')}
      </div>

      <!-- Countries -->
      <div id="countries"
        hx-get="/admin/analytics/countries-html?period=30d"
        hx-trigger="load"
        hx-swap="innerHTML">
        ${renderTableSkeleton('Top Countries')}
      </div>

      <!-- Devices -->
      <div id="devices"
        hx-get="/admin/analytics/devices-html?period=30d"
        hx-trigger="load"
        hx-swap="innerHTML">
        ${renderTableSkeleton('Devices')}
      </div>
    </div>

    <!-- Third Row -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
      <!-- Exit Links -->
      <div id="exit-links"
        hx-get="/admin/analytics/exit-links-html?period=30d"
        hx-trigger="load"
        hx-swap="innerHTML">
        ${renderTableSkeleton('Exit Links')}
      </div>

      <!-- Device Names -->
      <div id="device-names"
        hx-get="/admin/analytics/device-names-html?period=30d"
        hx-trigger="load"
        hx-swap="innerHTML">
        ${renderTableSkeleton('Mobile Devices')}
      </div>
    </div>

    <script>
      let visitorsChart = null;
      let currentPeriod = '30d';

      function changePeriod(period) {
        currentPeriod = period;
        // Reload all HTMX sections
        htmx.ajax('GET', '/admin/analytics/overview-html?period=' + period, '#overview-stats');
        htmx.ajax('GET', '/admin/analytics/top-pages-html?period=' + period, '#top-pages');
        htmx.ajax('GET', '/admin/analytics/referrers-html?period=' + period, '#referrers');
        htmx.ajax('GET', '/admin/analytics/countries-html?period=' + period, '#countries');
        htmx.ajax('GET', '/admin/analytics/devices-html?period=' + period, '#devices');
        htmx.ajax('GET', '/admin/analytics/exit-links-html?period=' + period, '#exit-links');
        htmx.ajax('GET', '/admin/analytics/device-names-html?period=' + period, '#device-names');
        // Reload chart
        loadVisitorsChart(period);
      }

      async function loadVisitorsChart(period) {
        try {
          const resp = await fetch('/api/analytics/timeseries?period=' + period, {
            credentials: 'include'
          });
          const data = await resp.json();

          const ctx = document.getElementById('visitors-chart');
          if (!ctx) return;

          const isDark = document.documentElement.classList.contains('dark');

          if (visitorsChart) {
            visitorsChart.destroy();
          }

          const labels = data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          });

          visitorsChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Page Views',
                  data: data.map(d => d.views),
                  borderColor: 'rgb(37, 99, 235)',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                  pointRadius: data.length > 30 ? 0 : 3,
                  pointHoverRadius: 4,
                },
                {
                  label: 'Unique Visitors',
                  data: data.map(d => d.visitors),
                  borderColor: 'rgb(16, 185, 129)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                  pointRadius: data.length > 30 ? 0 : 3,
                  pointHoverRadius: 4,
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                intersect: false,
                mode: 'index',
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'top',
                  labels: {
                    color: isDark ? 'rgb(161, 161, 170)' : 'rgb(113, 113, 122)',
                    usePointStyle: true,
                    pointStyle: 'circle',
                  }
                },
                tooltip: {
                  backgroundColor: isDark ? 'rgb(39, 39, 42)' : 'rgb(255, 255, 255)',
                  titleColor: isDark ? 'rgb(255, 255, 255)' : 'rgb(9, 9, 11)',
                  bodyColor: isDark ? 'rgb(161, 161, 170)' : 'rgb(113, 113, 122)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(9, 9, 11, 0.05)',
                  borderWidth: 1,
                  padding: 12,
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  border: { display: false },
                  grid: {
                    color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  },
                  ticks: {
                    color: isDark ? 'rgb(161, 161, 170)' : 'rgb(113, 113, 122)',
                    precision: 0,
                  }
                },
                x: {
                  border: { display: false },
                  grid: { display: false },
                  ticks: {
                    color: isDark ? 'rgb(161, 161, 170)' : 'rgb(113, 113, 122)',
                    maxTicksLimit: 10,
                  }
                }
              }
            }
          });
        } catch (e) {
          console.error('[Analytics] Chart error:', e);
        }
      }

      // Load chart on page load
      document.addEventListener('DOMContentLoaded', () => loadVisitorsChart('30d'));
    </script>
  `

  const layoutData: AdminLayoutData = {
    title: 'Analytics',
    pageTitle: 'Analytics',
    currentPath: '/admin/analytics',
    user: data.user,
    version: data.version,
    content: pageContent,
    dynamicMenuItems: data.dynamicMenuItems,
  }

  return renderAdminLayout(layoutData)
}

// ============================================================================
// HTMX HTML Fragment Renderers
// ============================================================================

function renderOverviewSkeleton(): string {
  return `
    <div>
      <dl class="mt-5 grid grid-cols-1 divide-zinc-950/5 dark:divide-white/10 overflow-hidden rounded-lg bg-white dark:bg-zinc-800/75 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        ${Array(3).fill(0).map(() => `
          <div class="px-4 py-5 sm:p-6 animate-pulse">
            <div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3"></div>
            <div class="h-8 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          </div>
        `).join('')}
      </dl>
    </div>
  `
}

export function renderOverviewStats(stats: {
  pageViews: number
  uniqueVisitors: number
  uniquePages: number
  growth: { pageViews: number; visitors: number }
}): string {
  const cards = [
    {
      title: 'Page Views',
      value: stats.pageViews.toLocaleString(),
      change: stats.growth.pageViews,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Unique Visitors',
      value: stats.uniqueVisitors.toLocaleString(),
      change: stats.growth.visitors,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Pages Visited',
      value: stats.uniquePages.toLocaleString(),
      change: 0,
      color: 'text-purple-600 dark:text-purple-400',
    },
  ]

  return `
    <div>
      <dl class="grid grid-cols-1 divide-zinc-950/5 dark:divide-white/10 overflow-hidden rounded-lg bg-white dark:bg-zinc-800/75 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        ${cards.map(card => `
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-500 dark:text-zinc-100">${card.title}</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold ${card.color}">
                ${card.value}
              </div>
              ${card.change !== 0 ? `
                <div class="inline-flex items-baseline rounded-full ${card.change > 0 ? 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-400/10 text-red-600 dark:text-red-400'} px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                    ${card.change > 0
                      ? '<path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" />'
                      : '<path d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" />'
                    }
                  </svg>
                  ${Math.abs(card.change).toFixed(1)}%
                </div>
              ` : ''}
            </dd>
          </div>
        `).join('')}
      </dl>
    </div>
  `
}

export function renderTopPagesHtml(pages: Array<{ path: string; views: number; visitors: number }>): string {
  return `
    <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
      <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Top Pages</h3>
    </div>
    <div class="px-6 py-4">
      ${pages.length === 0 ? renderEmptyState('No page views yet') : `
        <table class="min-w-full">
          <thead>
            <tr>
              <th class="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-3">Page</th>
              <th class="text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-3">Views</th>
              <th class="text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-3">Visitors</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-950/5 dark:divide-white/5">
            ${pages.map(page => `
              <tr>
                <td class="py-2.5 text-sm text-zinc-950 dark:text-white truncate max-w-[200px]" title="${page.path}">${page.path}</td>
                <td class="py-2.5 text-sm text-zinc-500 dark:text-zinc-400 text-right tabular-nums">${page.views.toLocaleString()}</td>
                <td class="py-2.5 text-sm text-zinc-500 dark:text-zinc-400 text-right tabular-nums">${page.visitors.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  `
}

export function renderReferrersHtml(referrers: Array<{ source: string; views: number; visitors: number }>): string {
  /** Clean referrer URL to readable domain/path */
  const cleanReferrer = (raw: string): string => {
    if (!raw || raw === 'Direct') return 'Direct / Typed URL'
    try {
      const url = new URL(raw)
      const domain = url.hostname.replace(/^www\./, '')
      // If it's just the homepage, show domain only
      if (url.pathname === '/' || url.pathname === '') return domain
      return domain + url.pathname
    } catch {
      return raw
    }
  }

  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Top Referrers</h3>
      </div>
      <div class="px-6 py-4">
        ${referrers.length === 0 ? renderEmptyState('No referrer data yet') : `
          <ul class="space-y-3">
            ${referrers.map(ref => `
              <li class="flex items-center justify-between">
                <span class="text-sm text-zinc-950 dark:text-white truncate max-w-[180px]" title="${ref.source}">${cleanReferrer(ref.source)}</span>
                <span class="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">${ref.views.toLocaleString()}</span>
              </li>
            `).join('')}
          </ul>
        `}
      </div>
    </div>
  `
}

export function renderCountriesHtml(countries: Array<{ country: string; views: number; visitors: number }>): string {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Top Countries</h3>
      </div>
      <div class="px-6 py-4">
        ${countries.length === 0 ? renderEmptyState('No country data yet') : `
          <ul class="space-y-3">
            ${countries.map(c => `
              <li class="flex items-center justify-between">
                <span class="text-sm text-zinc-950 dark:text-white">${countryFlag(c.country)} ${c.country}</span>
                <span class="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">${c.visitors.toLocaleString()} visitors</span>
              </li>
            `).join('')}
          </ul>
        `}
      </div>
    </div>
  `
}

export function renderDevicesHtml(data: {
  devices: Array<{ device: string; count: number }>
  browsers: Array<{ browser: string; count: number }>
  os: Array<{ os: string; count: number }>
}): string {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Devices</h3>
      </div>
      <div class="px-6 py-4 space-y-6">
        ${data.devices.length === 0 ? renderEmptyState('No device data yet') : `
          <!-- Device Types -->
          <div>
            <h4 class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Device Type</h4>
            ${renderBarChart(data.devices.map(d => ({ label: capitalize(d.device), value: d.count })))}
          </div>

          <!-- Browsers -->
          <div>
            <h4 class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Browser</h4>
            ${renderBarChart(data.browsers.map(b => ({ label: b.browser, value: b.count })))}
          </div>

          <!-- OS -->
          <div>
            <h4 class="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Operating System</h4>
            ${renderBarChart(data.os.map(o => ({ label: o.os, value: o.count })))}
          </div>
        `}
      </div>
    </div>
  `
}

// ============================================================================
// Shared Helpers
// ============================================================================

function renderTableSkeleton(title: string): string {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 animate-pulse">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <div class="h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
      </div>
      <div class="px-6 py-4 space-y-4">
        ${Array(5).fill(0).map(() => `
          <div class="flex justify-between">
            <div class="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            <div class="h-4 w-12 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function renderEmptyState(message: string): string {
  return `
    <div class="py-8 text-center">
      <svg class="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
      </svg>
      <p class="mt-4 text-sm text-zinc-500 dark:text-zinc-400">${message}</p>
      <p class="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Add the &lt;FlareAnalytics /&gt; component to your site to start tracking</p>
    </div>
  `
}

function renderBarChart(items: Array<{ label: string; value: number }>): string {
  const max = Math.max(...items.map(i => i.value), 1)
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500']

  return `
    <div class="space-y-2">
      ${items.map((item, i) => {
        const pct = (item.value / max * 100).toFixed(1)
        return `
          <div class="flex items-center gap-3">
            <span class="text-sm text-zinc-950 dark:text-white w-20 truncate">${item.label}</span>
            <div class="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div class="${colors[i % colors.length]} h-full rounded-full" style="width: ${pct}%"></div>
            </div>
            <span class="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-12 text-right">${item.value.toLocaleString()}</span>
          </div>
        `
      }).join('')}
    </div>
  `
}

export function renderExitLinksHtml(links: Array<{ destination: string; clicks: number }>): string {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Exit Links</h3>
        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Where visitors go when they leave your site</p>
      </div>
      <div class="px-6 py-4">
        ${links.length === 0 ? renderEmptyState('No exit clicks tracked yet') : `
          <table class="min-w-full">
            <thead>
              <tr>
                <th class="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-3">Destination</th>
                <th class="text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-3">Clicks</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-950/5 dark:divide-white/5">
              ${links.map(link => `
                <tr>
                  <td class="py-2.5 text-sm text-zinc-950 dark:text-white truncate max-w-[280px]" title="${link.destination}">
                    <span class="inline-flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                      </svg>
                      ${link.destination}
                    </span>
                  </td>
                  <td class="py-2.5 text-sm text-zinc-500 dark:text-zinc-400 text-right tabular-nums">${link.clicks.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `
}

export function renderDeviceNamesHtml(devices: Array<{ name: string; count: number }>): string {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Mobile Devices</h3>
        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">iPhone vs Android vs Desktop breakdown</p>
      </div>
      <div class="px-6 py-4">
        ${devices.length === 0 ? renderEmptyState('No device data yet') : renderBarChart(
          devices.map(d => ({ label: d.name, value: d.count }))
        )}
      </div>
    </div>
  `
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Convert country code to flag emoji */
function countryFlag(code: string): string {
  if (!code || code === 'Unknown' || code.length !== 2) return ''
  const offset = 127397
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => c.charCodeAt(0) + offset)
  )
}
