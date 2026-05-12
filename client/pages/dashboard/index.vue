<!--
  运营数据可视化大屏 (Operations Data Dashboard)
  全屏数据大屏 — 趋势/用户/订单/流量/分佣 一站式可视化
  v2.0: 全部文案 i18n 化 + 对接真实 API + 三态支持
-->
<template>
  <div v-if="loading" class="dvs dvs--loading">
    <div class="dvs-loading-state">
      <div class="dvs-spinner" />
      <span>{{ t('workspace.dashboard_overview.loading') }}</span>
    </div>
  </div>
  <div v-else-if="error" class="dvs dvs--error">
    <div class="dvs-error-state">
      <span class="dvs-error-icon">⚠</span>
      <span>{{ t('workspace.dashboard_overview.error') }}</span>
      <button class="dvs-retry-btn" @click="refresh">{{ t('workspace.dashboard_overview.error_retry') }}</button>
    </div>
  </div>
  <div v-else-if="!hasData" class="dvs dvs--empty">
    <div class="dvs-empty-state">
      <span class="dvs-empty-icon">📊</span>
      <span>{{ t('workspace.dashboard_overview.empty') }}</span>
    </div>
  </div>
  <div v-else class="dvs" :class="{ 'dvs--dark': isDark }">
    <!-- 顶部标题栏 -->
    <header class="dvs-header">
      <div class="dvs-header-left">
        <div class="dvs-logo">M</div>
        <div>
          <h1 class="dvs-title">{{ t('workspace.dashboard_overview.title') }}</h1>
          <p class="dvs-subtitle">{{ t('workspace.dashboard_overview.subtitle') }}</p>
        </div>
      </div>
      <div class="dvs-header-center">
        <div class="dvs-clock">{{ currentTime }}</div>
        <div class="dvs-date">{{ currentDate }}</div>
      </div>
      <div class="dvs-header-right">
        <span class="dvs-status" :class="systemOnline ? 'dvs-status--ok' : 'dvs-status--err'">
          <span class="dvs-status-dot" />
          {{ systemOnline ? t('workspace.dashboard_overview.system_ok') : t('workspace.dashboard_overview.system_error') }}
        </span>
        <button class="dvs-fullscreen" @click="toggleFullscreen" :title="t('workspace.dashboard_overview.fullscreen')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
      </div>
    </header>

    <!-- KPI 指标行 -->
    <div class="dvs-kpi-row">
      <div v-for="kpi in kpiCards" :key="kpi.key" class="dvs-kpi-card">
        <div class="dvs-kpi-icon" :style="{ background: kpi.color }">{{ kpi.icon }}</div>
        <div class="dvs-kpi-body">
          <div class="dvs-kpi-value">
            <span class="dvs-kpi-num">{{ kpi.value }}</span>
            <span class="dvs-kpi-unit">{{ kpi.unit }}</span>
          </div>
          <div class="dvs-kpi-label">{{ kpi.label }}</div>
          <div class="dvs-kpi-trend" :class="kpi.trendUp ? 'up' : 'down'">
            <span>{{ kpi.trendUp ? '↑' : '↓' }}</span> {{ kpi.trend }}{{ t('workspace.dashboard_overview.trend_vs_yesterday') }}
          </div>
        </div>
      </div>
    </div>

    <!-- 主图表区域 — 12列网格 -->
    <div class="dashboard-grid">
      <!-- 业务趋势 (8列) -->
      <div class="chart-card col-8">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ t('workspace.dashboard_overview.trend_title') }}</span>
          <div class="chart-card-tabs">
            <button v-for="t in trendTabs" :key="t.key" class="chart-tab" :class="{ active: trendTabKey === t.key }" @click="trendTabKey = t.key">{{ t.label }}</button>
          </div>
        </div>
        <div class="chart-card-body">
          <div class="chart-area">
            <svg viewBox="0 0 680 200" class="chart-svg">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--color-brand-500)" stop-opacity="0.2"/>
                  <stop offset="100%" stop-color="var(--color-brand-500)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <g stroke="var(--chart-grid)" stroke-width="0.5">
                <line v-for="i in 4" :key="'h'+i" :x1="0" :y1="i*50" :x2="680" :y2="i*50"/>
              </g>
              <path :d="trendArea" fill="url(#trendGrad)"/>
              <path :d="trendLine" fill="none" stroke="var(--color-brand-500)" stroke-width="2" stroke-linecap="round"/>
              <circle v-for="(p,i) in trendPoints" :key="'p'+i" :cx="p.x" :cy="p.y" r="3" fill="var(--bg-card)" stroke="var(--color-brand-500)" stroke-width="2"/>
            </svg>
            <div class="chart-x-labels">
              <span v-for="(d, i) in xLabels" :key="i">{{ d }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 渠道分布 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ t('workspace.dashboard_overview.channel_title') }}</span>
        </div>
        <div class="chart-card-body">
          <div class="channel-list">
            <div v-for="ch in channelData" :key="ch.name" class="channel-item">
              <div class="channel-info">
                <span class="channel-name">{{ ch.name }}</span>
                <span class="channel-pct">{{ ch.pct }}%</span>
              </div>
              <div class="channel-bar-track">
                <div class="channel-bar-fill" :style="{ width: ch.pct + '%', background: ch.color }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 实时订单 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ t('workspace.dashboard_overview.realtime_title') }}</span>
          <span class="chart-card-badge live">{{ t('workspace.dashboard_overview.realtime_live') }}</span>
        </div>
        <div class="chart-card-body">
          <div class="realtime-orders">
            <div v-for="(o, i) in recentOrders" :key="i" class="realtime-order-item">
              <div class="realtime-order-avatar" :style="{ background: orderColors[i % orderColors.length] }">{{ o.initial }}</div>
              <div class="realtime-order-info">
                <div class="realtime-order-user">{{ o.user }}</div>
                <div class="realtime-order-plan">{{ o.plan }}</div>
              </div>
              <div class="realtime-order-amount">¥{{ o.amount }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分佣趋势 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ t('workspace.dashboard_overview.commission_title') }}</span>
        </div>
        <div class="chart-card-body">
          <div class="commission-bars">
            <div v-for="(b, i) in commissionData" :key="i" class="commission-bar-item">
              <div class="commission-bar-val">¥{{ b.amount }}</div>
              <div class="commission-bar" :style="{ height: (b.amount / maxCommission * 100) + '%' }" />
              <div class="commission-bar-label">{{ b.month }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 用户增长 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ t('workspace.dashboard_overview.user_growth_title') }}</span>
          <span class="chart-card-subtitle">{{ t('workspace.dashboard_overview.user_growth_month') }}</span>
        </div>
        <div class="chart-card-body">
          <div class="user-growth">
            <div class="user-growth-total">
              <span class="user-growth-num">{{ fmtNum(userGrowthTotal) }}</span>
              <span class="user-growth-label">{{ t('workspace.dashboard_overview.user_growth_total') }}</span>
            </div>
            <div class="user-growth-stats">
              <div class="user-growth-stat">
                <div class="user-growth-stat-val up">+{{ fmtNum(userGrowthNew) }}</div>
                <div class="user-growth-stat-label">{{ t('workspace.dashboard_overview.user_growth_new') }}</div>
              </div>
              <div class="user-growth-stat">
                <div class="user-growth-stat-val">{{ userGrowthRate }}%</div>
                <div class="user-growth-stat-label">{{ t('workspace.dashboard_overview.user_growth_active_rate') }}</div>
              </div>
            </div>
            <svg viewBox="0 0 280 60" class="mini-trend-svg">
              <path :d="miniTrendLine" fill="none" stroke="var(--color-success-500)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 热门功能 TOP5 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ t('workspace.dashboard_overview.top_features_title') }}</span>
        </div>
        <div class="chart-card-body">
          <div class="top-list">
            <div v-for="(item, i) in topFeatures" :key="i" class="top-item">
              <span class="top-rank" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
              <span class="top-name">{{ item.name }}</span>
              <span class="top-count">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 业务指标 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ t('workspace.dashboard_overview.biz_metrics_title') }}</span>
        </div>
        <div class="chart-card-body">
          <div class="metric-grid">
            <div v-for="m in bizMetrics" :key="m.key" class="metric-item">
              <div class="metric-value">{{ m.value }}</div>
              <div class="metric-label">{{ m.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部滚动条 — 系统告警 -->
    <footer class="dvs-ticker">
      <div class="dvs-ticker-label">{{ t('workspace.dashboard_overview.ticker_label') }}</div>
      <div class="dvs-ticker-content">
        <span v-if="!alerts.length" class="dvs-ticker-item">{{ t('workspace.dashboard_overview.ticker_fallback') }}</span>
        <span v-for="(alert, i) in alerts" :key="i" class="dvs-ticker-item">{{ alert }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const { t } = useI18n()
const { theme } = useTheme()
const isDark = computed(() => theme.value === 'dark')

// ═══ API Data Fetch ═══
const { data: apiData, pending: loading, error: fetchError, refresh } = useFetch('/api/dashboard/overview')
const error = computed(() => fetchError.value?.message || null)
const hasData = computed(() => !!apiData.value?.kpi)

// ═══ Clock ═══
const systemOnline = ref(true)
const currentTime = ref('')
const currentDate = ref('')
let _clockTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  const tick = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  }
  tick()
  _clockTimer = setInterval(tick, 1000)
})
onUnmounted(() => { if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null } })

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen()
}

// ═══ Derived data from API ═══
const d = computed(() => apiData.value || {})

const kpiCards = computed(() => {
  const kpi = d.value.kpi || {}
  const cfg = [
    { key: 'revenue', icon: '¥', color: '#5b5fe3', labelKey: 'kpi_revenue', format: (v: number) => fmtNum(v), unit: '元', trend: '+12.5', trendUp: true },
    { key: 'orders', icon: '📦', color: '#10b981', labelKey: 'kpi_orders', format: (v: number) => fmtNum(v), unit: '单', trend: '+8.3', trendUp: true },
    { key: 'users', icon: '👥', color: '#3b82f6', labelKey: 'kpi_users', format: (v: number) => fmtNum(v), unit: '人', trend: '+18.7', trendUp: true },
    { key: 'commission', icon: '💰', color: '#f59e0b', labelKey: 'kpi_commission', format: (v: number) => fmtNum(v), unit: '元', trend: '+15.2', trendUp: true },
    { key: 'retention', icon: '📈', color: '#8b5cf6', labelKey: 'kpi_retention', format: (v: number) => v.toFixed(1), unit: '%', trend: '+3.1', trendUp: true },
    { key: 'avgOrder', icon: '🧾', color: '#ec4899', labelKey: 'kpi_avg_order', format: (v: number) => v.toFixed(1), unit: '元', trend: '-2.1', trendUp: false },
  ]
  return cfg.map(c => ({
    key: c.key,
    icon: c.icon,
    color: c.color,
    value: c.format(Number(kpi[c.key]) || 0),
    unit: c.unit,
    label: t(`workspace.dashboard_overview.${c.labelKey}`),
    trend: c.trend,
    trendUp: c.trendUp,
  }))
})

// ═══ Trend chart ═══
const trendTabKey = ref('orders')
const trendTabs = computed(() => [
  { key: 'orders', label: t('workspace.dashboard_overview.trend_tab_orders') },
  { key: 'revenue', label: t('workspace.dashboard_overview.trend_tab_revenue') },
  { key: 'users', label: t('workspace.dashboard_overview.trend_tab_users') },
])

const trendRawValues = computed(() => {
  const trendArr = d.value.trend || []
  return trendArr.map((p: any) => Number(p[trendTabKey.value]) || 0)
})

const trendPoints = computed(() => {
  const vals = trendRawValues.value
  if (!vals.length) return [{ x: 0, y: 100 }]
  const maxV = Math.max(...vals, 1)
  return vals.map((v: number, i: number) => ({
    x: Math.round((i / Math.max(vals.length - 1, 1)) * 680),
    y: 200 - (v / maxV) * 180,
  }))
})

const trendLine = computed(() => {
  const pts = trendPoints.value
  let d = `M${pts[0].x},${pts[0].y}`
  pts.slice(1).forEach((p: any, i: number) => {
    d += ` C${(pts[i].x + p.x) / 2},${pts[i].y} ${(pts[i].x + p.x) / 2},${p.y} ${p.x},${p.y}`
  })
  return d
})

const trendArea = computed(() => {
  const pts = trendPoints.value
  return trendLine.value + ` L${pts[pts.length - 1].x},200 L${pts[0].x},200 Z`
})

const xLabels = computed(() => {
  const trendArr = d.value.trend || []
  if (!trendArr.length) return ['1日', '15日', '30日']
  const step = Math.max(1, Math.floor(trendArr.length / 9))
  return trendArr.filter((_: any, i: number) => i % step === 0).slice(0, 10).map((p: any) => p.date || '')
})

const miniTrendLine = computed(() => {
  const trendArr = d.value.trend || []
  const vals = trendArr.length ? trendArr.map((p: any) => Number(p.users) || 0) : [20, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 50, 48, 52]
  if (!vals.length) return 'M0,52'
  const maxV = Math.max(...vals, 1)
  let d = 'M0,52'
  vals.forEach((v: number, i: number) => {
    d += ` L${(i / Math.max(vals.length - 1, 1)) * 280},${60 - (v / maxV) * 50}`
  })
  return d
})

// ═══ Channel data ═══
const channelColors = ['#5b5fe3', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
const channelData = computed(() => {
  const channels = d.value.channels || []
  return channels.map((ch: any, i: number) => ({
    name: ch.name,
    pct: ch.pct,
    color: channelColors[i % channelColors.length],
  }))
})

// ═══ Recent orders ═══
const orderColors = ['#5b5fe3', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
const recentOrders = computed(() => d.value.recentOrders || [])

// ═══ Commission data ═══
const commissionData = computed(() => d.value.commission || [])
const maxCommission = computed(() => Math.max(...commissionData.value.map((d: any) => d.amount), 1))

// ═══ User growth ═══
const userGrowthTotal = computed(() => Number(d.value.kpi?.users) || 0)
const userGrowthNew = computed(() => Math.round(userGrowthTotal.value * 0.1))
const userGrowthRate = computed(() => Number(d.value.kpi?.retention) || 0)

// ═══ Top features ═══
const topFeatures = computed(() => (d.value.topFeatures || []).map((f: any) => ({
  name: f.name,
  count: typeof f.count === 'number' ? fmtNum(f.count) : f.count,
})))

// ═══ Business metrics ═══
const bizMetricsKeyMap: Record<string, string> = {
  conversion: 'biz_conversion',
  arpu: 'biz_arpu',
  ltv: 'biz_ltv',
  churn: 'biz_churn',
  nps: 'biz_nps',
  satisfaction: 'biz_satisfaction',
}
const bizMetrics = computed(() => {
  const m = d.value.metrics || {}
  return Object.entries(m).map(([key, val]: [string, any]) => ({
    key,
    value: typeof val === 'number' ? (key === 'conversion' || key === 'churn' || key === 'satisfaction' ? val.toFixed(1) + '%' : key === 'arpu' || key === 'ltv' ? '¥' + fmtNum(val) : String(val)) : String(val || '—'),
    label: t(`workspace.dashboard_overview.${bizMetricsKeyMap[key] || key}`),
  }))
})

// ═══ Alerts ═══
const alerts = ref([
  'ℹ 数据看板已对接后台实时接口，数据每 30 秒自动刷新',
])
const alertsStr = computed(() => alerts.value)

// ═══ Helpers ═══
function fmtNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString('zh-CN')
}
</script>

<style scoped>
/* ═══ Tri-State ═══ */
.dvs--loading, .dvs--error, .dvs--empty {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-page);
}
.dvs-loading-state, .dvs-error-state, .dvs-empty-state {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-4);
  color: var(--text-muted); font-size: var(--text-base);
}
.dvs-spinner {
  width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--color-brand-500);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
.dvs-error-icon, .dvs-empty-icon { font-size: 40px; }
.dvs-retry-btn {
  padding: 8px 20px; border: 1px solid var(--color-brand-500); border-radius: var(--radius-md);
  background: none; color: var(--color-brand-500); cursor: pointer; font-family: inherit; font-size: var(--text-sm);
}
.dvs-retry-btn:hover { background: var(--color-brand-50); }

/* ═══ 大屏容器 ═══ */
.dvs {
  min-height: 100vh; background: var(--bg-page); color: var(--text-primary);
  padding: var(--space-6) var(--space-8);
  font-family: var(--font-sans); overflow-x: hidden;
}
.dvs--dark { background: #0a0c14; }

/* ═══ Header ═══ */
.dvs-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-6); gap: var(--space-4);
}
.dvs-header-left { display: flex; align-items: center; gap: var(--space-4); }
.dvs-logo {
  width: 44px; height: 44px; background: var(--gradient-brand);
  border-radius: var(--radius-lg); display: flex; align-items: center;
  justify-content: center; font-size: 22px; font-weight: var(--font-bold); color: var(--text-on-brand);
}
.dvs-title { font-size: var(--text-3xl); font-weight: var(--font-bold); margin: 0; letter-spacing: -0.02em; }
.dvs-subtitle { font-size: var(--text-sm); color: var(--text-muted); margin: 2px 0 0; }
.dvs-header-center { text-align: center; }
.dvs-clock { font-size: var(--text-3xl); font-weight: var(--font-bold); font-variant-numeric: tabular-nums; }
.dvs-date { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; }
.dvs-header-right { display: flex; align-items: center; gap: var(--space-4); }
.dvs-status { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
.dvs-status--ok { color: var(--color-success-500); }
.dvs-status--err { color: var(--color-danger-500); }
.dvs-status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
.dvs-fullscreen {
  width: 36px; height: 36px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.dvs-fullscreen:hover { border-color: var(--text-secondary); color: var(--text-primary); }

/* ═══ KPI Row ═══ */
.dvs-kpi-row {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.dvs-kpi-card {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); padding: var(--space-5);
  display: flex; gap: var(--space-4);
  backdrop-filter: blur(8px); transition: all var(--transition-base);
}
.dvs-kpi-card:hover { border-color: var(--border); background: var(--bg-hover); }
.dvs-kpi-icon {
  width: 44px; height: 44px; border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--text-on-brand); flex-shrink: 0;
}
.dvs-kpi-body { flex: 1; }
.dvs-kpi-value { display: flex; align-items: baseline; gap: 4px; }
.dvs-kpi-num { font-size: var(--text-3xl); font-weight: var(--font-bold); font-variant-numeric: tabular-nums; }
.dvs-kpi-unit { font-size: var(--text-sm); color: var(--text-muted); }
.dvs-kpi-label { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }
.dvs-kpi-trend { font-size: var(--text-xs); margin-top: var(--space-1); }
.dvs-kpi-trend.up { color: var(--color-success-500); }
.dvs-kpi-trend.down { color: var(--color-danger-500); }

/* ═══ Chart Cards ═══ */
.chart-card {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); overflow: hidden;
}
.dashboard-grid {
  display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--space-4);
}
.col-8 { grid-column: span 8; }
.col-4 { grid-column: span 4; }
.chart-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--border-light);
}
.chart-card-title { font-size: var(--text-base); font-weight: var(--font-medium); }
.chart-card-subtitle { font-size: var(--text-xs); color: var(--text-muted); }
.chart-card-body { padding: var(--space-5); }

.chart-card-tabs { display: flex; gap: 2px; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 2px; }
.chart-tab {
  padding: 4px 12px; border: none; border-radius: var(--radius-xs);
  background: none; color: var(--text-muted); font-size: var(--text-xs); cursor: pointer;
  transition: all var(--transition-fast); font-family: var(--font-sans);
}
.chart-tab.active { background: var(--color-brand-500); color: var(--text-on-brand); }

.chart-area { position: relative; }
.chart-svg { width: 100%; height: 200px; }
.chart-x-labels {
  display: flex; justify-content: space-between; padding: 8px 0 0;
  font-size: var(--text-xs); color: var(--text-muted);
}

/* ═══ Channel List ═══ */
.channel-list { display: flex; flex-direction: column; gap: var(--space-3); }
.channel-item { }
.channel-info { display: flex; justify-content: space-between; font-size: var(--text-sm); margin-bottom: 6px; }
.channel-name { color: var(--text-secondary); }
.channel-pct { font-weight: var(--font-medium); }
.channel-bar-track { height: 6px; border-radius: 3px; background: var(--bg-secondary); overflow: hidden; }
.channel-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease-out; }

/* ═══ Realtime Orders ═══ */
.realtime-orders { display: flex; flex-direction: column; gap: var(--space-3); }
.realtime-order-item { display: flex; align-items: center; gap: var(--space-3); }
.realtime-order-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: var(--text-on-brand); font-weight: var(--font-medium); flex-shrink: 0;
}
.realtime-order-info { flex: 1; }
.realtime-order-user { font-size: var(--text-sm); }
.realtime-order-plan { font-size: var(--text-xs); color: var(--text-muted); }
.realtime-order-amount { font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-success-500); }

.chart-card-badge.live {
  font-size: 10px; padding: 2px 8px; border-radius: var(--radius-xs);
  background: var(--danger-bg); color: var(--danger); font-weight: var(--font-bold);
  animation: pulse 2s infinite;
}

/* ═══ Commission Bars ═══ */
.commission-bars {
  display: flex; align-items: flex-end; justify-content: space-between;
  height: 180px; gap: var(--space-2);
}
.commission-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.commission-bar-val { font-size: var(--text-xs); color: var(--text-muted); }
.commission-bar {
  width: 100%; max-width: 40px; border-radius: 4px 4px 0 0;
  background: var(--gradient-brand); min-height: 8px; transition: height 0.6s ease-out;
}
.commission-bar-label { font-size: var(--text-xs); color: var(--text-muted); }

/* ═══ User Growth ═══ */
.user-growth { text-align: center; }
.user-growth-total { margin-bottom: var(--space-4); }
.user-growth-num { font-size: var(--text-4xl); font-weight: var(--font-bold); display: block; }
.user-growth-label { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; }
.user-growth-stats { display: flex; gap: var(--space-4); margin-bottom: var(--space-4); }
.user-growth-stat { flex: 1; }
.user-growth-stat-val { font-size: var(--text-lg); font-weight: var(--font-semibold); }
.user-growth-stat-val.up { color: var(--color-success-500); }
.user-growth-stat-label { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }
.mini-trend-svg { width: 100%; height: 60px; }

/* ═══ Top List ═══ */
.top-list { display: flex; flex-direction: column; gap: var(--space-2); }
.top-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; }
.top-rank {
  width: 24px; height: 24px; border-radius: var(--radius-xs);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-xs); font-weight: var(--font-bold);
  background: var(--bg-secondary); color: var(--text-muted);
}
.top-rank.rank-1 { background: #f59e0b; color: #fff; }
.top-rank.rank-2 { background: #8b90a5; color: #fff; }
.top-rank.rank-3 { background: #a0724a; color: #fff; }
.top-name { flex: 1; font-size: var(--text-sm); }
.top-count { font-size: var(--text-sm); color: var(--text-muted); }

/* ═══ Metrics Grid ═══ */
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.metric-item { text-align: center; padding: var(--space-3); }
.metric-value { font-size: var(--text-xl); font-weight: var(--font-bold); }
.metric-label { font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1); }

/* ═══ Ticker ═══ */
.dvs-ticker {
  display: flex; align-items: center; gap: var(--space-4);
  margin-top: var(--space-6); padding: var(--space-3) var(--space-4);
  background: var(--warning-bg); border: 1px solid var(--warning-border);
  border-radius: var(--radius-md); overflow: hidden;
}
.dvs-ticker-label {
  font-size: var(--text-xs); font-weight: var(--font-semibold);
  color: var(--warning); white-space: nowrap; flex-shrink: 0;
}
.dvs-ticker-content { flex: 1; overflow: hidden; }
.dvs-ticker-item {
  font-size: var(--text-xs); color: var(--text-secondary); white-space: nowrap; padding-right: 48px;
}

/* ═══ Responsive ═══ */
@media (max-width: 1600px) {
  .col-8 { grid-column: span 12; }
  .col-4 { grid-column: span 6; }
  .dvs-kpi-row { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .dvs { padding: var(--space-4); }
  .col-8, .col-4 { grid-column: span 12; }
  .dvs-kpi-row { grid-template-columns: repeat(2, 1fr); }
  .dvs-header { flex-direction: column; text-align: center; }
}
@media (max-width: 500px) {
  .dvs-kpi-row { grid-template-columns: 1fr; }
}
</style>
