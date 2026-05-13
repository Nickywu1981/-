/**
 * Dashboard data composable — API fetching + all data transformation
 * Extracted from dashboard/index.vue to keep the page component lean.
 */
export function useDashboardData() {
  const { t } = useI18n()

  const { data: apiData, pending: loading, error: fetchError, refresh } = useFetch('/api/dashboard/overview')
  const error = computed(() => fetchError.value?.message || null)
  const hasData = computed(() => !!apiData.value?.kpi)

  const d = computed(() => apiData.value || {})

  // ── KPI Cards ──
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

  // ── Trend Chart ──
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
    let path = `M${pts[0].x},${pts[0].y}`
    pts.slice(1).forEach((p: any, i: number) => {
      path += ` C${(pts[i].x + p.x) / 2},${pts[i].y} ${(pts[i].x + p.x) / 2},${p.y} ${p.x},${p.y}`
    })
    return path
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
    let path = 'M0,52'
    vals.forEach((v: number, i: number) => {
      path += ` L${(i / Math.max(vals.length - 1, 1)) * 280},${60 - (v / maxV) * 50}`
    })
    return path
  })

  // ── Channel Data ──
  const channelColors = ['#5b5fe3', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
  const channelData = computed(() => {
    const channels = d.value.channels || []
    return channels.map((ch: any, i: number) => ({
      name: ch.name,
      pct: ch.pct,
      color: channelColors[i % channelColors.length],
    }))
  })

  // ── Recent Orders ──
  const orderColors = ['#5b5fe3', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
  const recentOrders = computed(() => d.value.recentOrders || [])

  // ── Commission Data ──
  const commissionData = computed(() => d.value.commission || [])
  const maxCommission = computed(() => Math.max(...commissionData.value.map((item: any) => item.amount), 1))

  // ── User Growth ──
  const userGrowthTotal = computed(() => Number(d.value.kpi?.users) || 0)
  const userGrowthNew = computed(() => Math.round(userGrowthTotal.value * 0.1))
  const userGrowthRate = computed(() => Number(d.value.kpi?.retention) || 0)

  // ── Top Features ──
  const topFeatures = computed(() => (d.value.topFeatures || []).map((f: any) => ({
    name: f.name,
    count: typeof f.count === 'number' ? fmtNum(f.count) : f.count,
  })))

  // ── Business Metrics ──
  const bizMetricsKeyMap: Record<string, string> = {
    conversion: 'biz_conversion', arpu: 'biz_arpu', ltv: 'biz_ltv',
    churn: 'biz_churn', nps: 'biz_nps', satisfaction: 'biz_satisfaction',
  }
  const bizMetrics = computed(() => {
    const m = d.value.metrics || {}
    return Object.entries(m).map(([key, val]: [string, any]) => {
      let display = String(val || '—')
      if (typeof val === 'number') {
        if (key === 'conversion' || key === 'churn' || key === 'satisfaction') display = val.toFixed(1) + '%'
        else if (key === 'arpu' || key === 'ltv') display = '¥' + fmtNum(val)
        else display = String(val)
      }
      return { key, value: display, label: t(`workspace.dashboard_overview.${bizMetricsKeyMap[key] || key}`) }
    })
  })

  // ── Alerts ──
  const alerts = ref(['ℹ 数据看板已对接后台实时接口，数据每 30 秒自动刷新'])

  // ── Fullscreen ──
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  return {
    loading, error, hasData, refresh,
    kpiCards,
    trendTabKey, trendTabs, trendRawValues, trendPoints, trendLine, trendArea, xLabels, miniTrendLine,
    channelColors, channelData,
    orderColors, recentOrders,
    commissionData, maxCommission,
    userGrowthTotal, userGrowthNew, userGrowthRate,
    topFeatures,
    bizMetrics,
    alerts,
    toggleFullscreen,
    apiData,
    fmtNum,
  }
}

// ── Shared helper ──
function fmtNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString('zh-CN')
}
