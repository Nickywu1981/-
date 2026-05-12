<!--
  运营数据可视化大屏 (Operations Data Dashboard)
  全屏数据大屏 — 趋势/用户/订单/流量/分佣 一站式可视化
-->
<template>
  <div class="dvs" :class="{ 'dvs--dark': isDark }">
    <!-- 顶部标题栏 -->
    <header class="dvs-header">
      <div class="dvs-header-left">
        <div class="dvs-logo">M</div>
        <div>
          <h1 class="dvs-title">Movio AI 运营数据大屏</h1>
          <p class="dvs-subtitle">Real-time Operations Dashboard</p>
        </div>
      </div>
      <div class="dvs-header-center">
        <div class="dvs-clock">{{ currentTime }}</div>
        <div class="dvs-date">{{ currentDate }}</div>
      </div>
      <div class="dvs-header-right">
        <span class="dvs-status" :class="systemOnline ? 'dvs-status--ok' : 'dvs-status--err'">
          <span class="dvs-status-dot" />
          {{ systemOnline ? '系统正常' : '系统异常' }}
        </span>
        <button class="dvs-fullscreen" @click="toggleFullscreen" title="全屏">
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
            <span ref="kpiRefs" class="dvs-kpi-num">{{ kpi.value }}</span>
            <span class="dvs-kpi-unit">{{ kpi.unit }}</span>
          </div>
          <div class="dvs-kpi-label">{{ kpi.label }}</div>
          <div class="dvs-kpi-trend" :class="kpi.trendUp ? 'up' : 'down'">
            <span>{{ kpi.trendUp ? '↑' : '↓' }}</span> {{ kpi.trend }}% vs 昨日
          </div>
        </div>
      </div>
    </div>

    <!-- 主图表区域 — 12列网格 -->
    <div class="dashboard-grid">
      <!-- 业务趋势 (8列) -->
      <div class="chart-card col-8">
        <div class="chart-card-header">
          <span class="chart-card-title">业务趋势 (近30天)</span>
          <div class="chart-card-tabs">
            <button v-for="t in ['订单量','收入','用户']" :key="t" class="chart-tab" :class="{ active: trendTab === t }" @click="trendTab = t">{{ t }}</button>
          </div>
        </div>
        <div class="chart-card-body">
          <div class="chart-area">
            <!-- SVG 模拟折线图 -->
            <svg viewBox="0 0 680 200" class="chart-svg">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--color-brand-500)" stop-opacity="0.2"/>
                  <stop offset="100%" stop-color="var(--color-brand-500)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <!-- 网格 -->
              <g stroke="var(--chart-grid)" stroke-width="0.5">
                <line v-for="i in 4" :key="'h'+i" :x1="0" :y1="i*50" :x2="680" :y2="i*50"/>
              </g>
              <!-- 面积填充 -->
              <path :d="trendArea" fill="url(#trendGrad)"/>
              <!-- 折线 -->
              <path :d="trendLine" fill="none" stroke="var(--color-brand-500)" stroke-width="2" stroke-linecap="round"/>
              <!-- 数据点 -->
              <circle v-for="(p,i) in trendPoints" :key="'p'+i" :cx="p.x" :cy="p.y" r="3" fill="#fff" stroke="var(--color-brand-500)" stroke-width="2"/>
            </svg>
            <!-- 横轴标签 -->
            <div class="chart-x-labels">
              <span v-for="d in xLabels" :key="d">{{ d }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 渠道分布 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">流量渠道分布</span>
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
          <span class="chart-card-title">实时订单流</span>
          <span class="chart-card-badge live">LIVE</span>
        </div>
        <div class="chart-card-body">
          <div class="realtime-orders">
            <div v-for="(o, i) in recentOrders" :key="i" class="realtime-order-item">
              <div class="realtime-order-avatar" :style="{ background: o.color }">{{ o.initial }}</div>
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
          <span class="chart-card-title">分佣收入趋势</span>
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
          <span class="chart-card-title">用户增长</span>
          <span class="chart-card-subtitle">本月</span>
        </div>
        <div class="chart-card-body">
          <div class="user-growth">
            <div class="user-growth-total">
              <span class="user-growth-num">12,847</span>
              <span class="user-growth-label">总注册用户</span>
            </div>
            <div class="user-growth-stats">
              <div class="user-growth-stat">
                <div class="user-growth-stat-val up">+1,284</div>
                <div class="user-growth-stat-label">本月新增</div>
              </div>
              <div class="user-growth-stat">
                <div class="user-growth-stat-val">68.5%</div>
                <div class="user-growth-stat-label">月活跃率</div>
              </div>
            </div>
            <!-- SVG 迷你趋势 -->
            <svg viewBox="0 0 280 60" class="mini-trend-svg">
              <path :d="miniTrendLine" fill="none" stroke="var(--color-success-500)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 热门功能 TOP5 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">热门功能 TOP5</span>
        </div>
        <div class="chart-card-body">
          <div class="top-list">
            <div v-for="(item, i) in topFeatures" :key="i" class="top-item">
              <span class="top-rank" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
              <span class="top-name">{{ item.name }}</span>
              <span class="top-count">{{ item.count }}次</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 业务指标 (4列) -->
      <div class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">核心业务指标</span>
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

    <!-- 底部滚动条 — 实时告警 -->
    <footer class="dvs-ticker">
      <div class="dvs-ticker-label">系统告警</div>
      <div class="dvs-ticker-content">
        <span v-for="alert in alerts" :key="alert" class="dvs-ticker-item">{{ alert }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { theme } = useTheme()
const isDark = computed(() => theme.value === 'dark')
const systemOnline = ref(true)
const trendTab = ref('订单量')
const currentTime = ref('')
const currentDate = ref('')

// Clock
onMounted(() => {
  const tick = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  }
  tick()
  setInterval(tick, 1000)
})

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen()
}

// KPI Cards
const kpiCards = [
  { key: 'revenue', icon: '¥', color: '#6b70ff', value: '1,284,960', unit: '元', label: '总营收 (GMV)', trend: '+12.5', trendUp: true },
  { key: 'orders', icon: '📦', color: '#10b981', value: '8,429', unit: '单', label: '总订单数', trend: '+8.3', trendUp: true },
  { key: 'users', icon: '👥', color: '#3b82f6', value: '12,847', unit: '人', label: '注册用户', trend: '+18.7', trendUp: true },
  { key: 'commission', icon: '💰', color: '#f59e0b', value: '96,372', unit: '元', label: '分佣总额', trend: '+15.2', trendUp: true },
  { key: 'retention', icon: '📈', color: '#8b5cf6', value: '68.5', unit: '%', label: '月留存率', trend: '+3.1', trendUp: true },
  { key: 'avgOrder', icon: '🧾', color: '#ec4899', value: '152.4', unit: '元', label: '客单价', trend: '-2.1', trendUp: false },
]

// Trend chart data
const trendPointsRaw = [40, 55, 48, 62, 75, 68, 80, 95, 88, 105, 120, 98, 115, 130, 125, 140, 155, 145, 160, 170, 165, 180, 175, 190, 185, 195, 188, 200, 195, 190]
const xLabels = ['1日','4日','7日','10日','13日','16日','19日','22日','25日','28日']

const trendPoints = computed(() => {
  const scale = trendTab.value === '收入' ? 1.2 : trendTab.value === '用户' ? 0.8 : 1
  return trendPointsRaw.map((v, i) => ({
    x: Math.round((i / (trendPointsRaw.length - 1)) * 680),
    y: 200 - (v * scale / 200) * 180
  }))
})

const trendLine = computed(() => {
  let d = `M${trendPoints.value[0].x},${trendPoints.value[0].y}`
  trendPoints.value.slice(1).forEach((p, i) => {
    d += ` C${(trendPoints.value[i].x + p.x) / 2},${trendPoints.value[i].y} ${(trendPoints.value[i].x + p.x) / 2},${p.y} ${p.x},${p.y}`
  })
  return d
})

const trendArea = computed(() => trendLine.value + ` L${trendPoints.value[trendPoints.value.length - 1].x},200 L${trendPoints.value[0].x},200 Z`)

const miniTrendLine = computed(() => {
  const pts = [20, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 50, 48, 52]
  let d = 'M0,52'
  pts.forEach((v, i) => d += ` L${(i / (pts.length - 1)) * 280},${60 - v}`)
  return d
})

const channelData = [
  { name: '直接访问', pct: 35, color: '#6b70ff' },
  { name: '搜索引擎', pct: 28, color: '#3b82f6' },
  { name: '社媒推广', pct: 20, color: '#10b981' },
  { name: '代理分销', pct: 12, color: '#f59e0b' },
  { name: '其他', pct: 5, color: '#8b5cf6' },
]

const recentOrders = [
  { user: '张**', plan: '专业版年卡', amount: '2,999', initial: '张', color: '#6b70ff' },
  { user: '李**', plan: '企业版', amount: '9,999', initial: '李', color: '#10b981' },
  { user: '王**', plan: '基础版月卡', amount: '299', initial: '王', color: '#3b82f6' },
  { user: '赵**', plan: '专业版季卡', amount: '899', initial: '赵', color: '#f59e0b' },
  { user: '陈**', plan: '代理版', amount: '19,999', initial: '陈', color: '#8b5cf6' },
]

const commissionData = [
  { month: '1月', amount: 3200 },
  { month: '2月', amount: 4500 },
  { month: '3月', amount: 3800 },
  { month: '4月', amount: 6200 },
  { month: '5月', amount: 5100 },
  { month: '6月', amount: 7800 },
]
const maxCommission = computed(() => Math.max(...commissionData.map(d => d.amount)))

const topFeatures = [
  { name: 'AI 商品图生成', count: '3,421' },
  { name: '智能抠图去背景', count: '2,891' },
  { name: '短视频生成', count: '2,345' },
  { name: '电商详情图', count: '1,987' },
  { name: '数字人视频', count: '1,654' },
]

const bizMetrics = [
  { key: 'conversion', value: '4.8%', label: '付费转化率' },
  { key: 'arpu', value: '¥218', label: 'ARPU' },
  { key: 'ltv', value: '¥1,850', label: 'LTV' },
  { key: 'churn', value: '2.3%', label: '月流失率' },
  { key: 'nps', value: '72', label: 'NPS 评分' },
  { key: 'satisfaction', value: '96%', label: '服务满意度' },
]

const alerts = [
  '⚠ 网关 QPS 峰值已触发限流阈值 (20,000/s) — 自动扩容中',
  '✅ 财务结算任务已完成 — 本期应结算 28.6万元',
  '⚠ 短信通道 2 延迟升高 — 已自动切换至备用通道',
  'ℹ 新版本 v3.2.1 灰度发布中 — 当前覆盖率 15%',
]
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
/* ═══ 大屏容器 ═══ */
.dvs {
  min-height: 100vh; background: #080c18; color: #e8eaf0;
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
  justify-content: center; font-size: 22px; font-weight: var(--font-bold); color: #fff;
}
.dvs-title { font-size: var(--text-3xl); font-weight: var(--font-bold); margin: 0; letter-spacing: -0.02em; }
.dvs-subtitle { font-size: var(--text-sm); color: #5d6380; margin: 2px 0 0; }
.dvs-header-center { text-align: center; }
.dvs-clock { font-size: var(--text-3xl); font-weight: var(--font-bold); font-variant-numeric: tabular-nums; }
.dvs-date { font-size: var(--text-sm); color: #5d6380; margin-top: 2px; }
.dvs-header-right { display: flex; align-items: center; gap: var(--space-4); }
.dvs-status { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
.dvs-status--ok { color: var(--color-success-500); }
.dvs-status--err { color: var(--color-danger-500); }
.dvs-status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
.dvs-fullscreen {
  width: 36px; height: 36px; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm);
  background: none; color: #5d6380; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.dvs-fullscreen:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

/* ═══ KPI Row ═══ */
.dvs-kpi-row {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.dvs-kpi-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg); padding: var(--space-5);
  display: flex; gap: var(--space-4);
  backdrop-filter: blur(8px); transition: all var(--transition-base);
}
.dvs-kpi-card:hover { border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); }
.dvs-kpi-icon {
  width: 44px; height: 44px; border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: #fff; flex-shrink: 0;
}
.dvs-kpi-body { flex: 1; }
.dvs-kpi-value { display: flex; align-items: baseline; gap: 4px; }
.dvs-kpi-num { font-size: var(--text-3xl); font-weight: var(--font-bold); font-variant-numeric: tabular-nums; }
.dvs-kpi-unit { font-size: var(--text-sm); color: #5d6380; }
.dvs-kpi-label { font-size: var(--text-xs); color: #5d6380; margin-top: 2px; }
.dvs-kpi-trend { font-size: var(--text-xs); margin-top: var(--space-1); }
.dvs-kpi-trend.up { color: var(--color-success-500); }
.dvs-kpi-trend.down { color: var(--color-danger-500); }

/* ═══ Chart Cards ═══ */
.chart-card {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg); overflow: hidden;
}
.chart-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-5); border-bottom: 1px solid rgba(255,255,255,0.06);
}
.chart-card-title { font-size: var(--text-base); font-weight: var(--font-medium); }
.chart-card-subtitle { font-size: var(--text-xs); color: #5d6380; }
.chart-card-body { padding: var(--space-5); }

/* Chart tabs */
.chart-card-tabs { display: flex; gap: 2px; background: rgba(255,255,255,0.04); border-radius: var(--radius-sm); padding: 2px; }
.chart-tab {
  padding: 4px 12px; border: none; border-radius: var(--radius-xs);
  background: none; color: #5d6380; font-size: var(--text-xs); cursor: pointer;
  transition: all var(--transition-fast); font-family: var(--font-sans);
}
.chart-tab.active { background: var(--color-brand-500); color: #fff; }

/* Chart SVG */
.chart-area { position: relative; }
.chart-svg { width: 100%; height: 200px; }
.chart-x-labels {
  display: flex; justify-content: space-between; padding: 8px 0 0;
  font-size: var(--text-xs); color: #5d6380;
}

/* ═══ Channel List ═══ */
.channel-list { display: flex; flex-direction: column; gap: var(--space-3); }
.channel-item { }
.channel-info { display: flex; justify-content: space-between; font-size: var(--text-sm); margin-bottom: 6px; }
.channel-name { color: #8b90a5; }
.channel-pct { font-weight: var(--font-medium); }
.channel-bar-track {
  height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden;
}
.channel-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease-out; }

/* ═══ Realtime Orders ═══ */
.realtime-orders { display: flex; flex-direction: column; gap: var(--space-3); }
.realtime-order-item { display: flex; align-items: center; gap: var(--space-3); }
.realtime-order-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: #fff; font-weight: var(--font-medium); flex-shrink: 0;
}
.realtime-order-info { flex: 1; }
.realtime-order-user { font-size: var(--text-sm); }
.realtime-order-plan { font-size: var(--text-xs); color: #5d6380; }
.realtime-order-amount { font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--color-success-500); }

/* Live badge */
.chart-card-badge.live {
  font-size: 10px; padding: 2px 8px; border-radius: var(--radius-xs);
  background: rgba(239,68,68,0.15); color: #ef4444; font-weight: var(--font-bold);
  animation: pulse 2s infinite;
}

/* ═══ Commission Bars ═══ */
.commission-bars {
  display: flex; align-items: flex-end; justify-content: space-between;
  height: 180px; gap: var(--space-2);
}
.commission-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.commission-bar-val { font-size: var(--text-xs); color: #5d6380; }
.commission-bar {
  width: 100%; max-width: 40px; border-radius: 4px 4px 0 0;
  background: var(--gradient-brand); min-height: 8px; transition: height 0.6s ease-out;
}
.commission-bar-label { font-size: var(--text-xs); color: #5d6380; }

/* ═══ User Growth ═══ */
.user-growth { text-align: center; }
.user-growth-total { margin-bottom: var(--space-4); }
.user-growth-num { font-size: var(--text-4xl); font-weight: var(--font-bold); display: block; }
.user-growth-label { font-size: var(--text-sm); color: #5d6380; margin-top: 2px; }
.user-growth-stats { display: flex; gap: var(--space-4); margin-bottom: var(--space-4); }
.user-growth-stat { flex: 1; }
.user-growth-stat-val { font-size: var(--text-lg); font-weight: var(--font-semibold); }
.user-growth-stat-val.up { color: var(--color-success-500); }
.user-growth-stat-label { font-size: var(--text-xs); color: #5d6380; margin-top: 2px; }
.mini-trend-svg { width: 100%; height: 60px; }

/* ═══ Top List ═══ */
.top-list { display: flex; flex-direction: column; gap: var(--space-2); }
.top-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; }
.top-rank {
  width: 24px; height: 24px; border-radius: var(--radius-xs);
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-xs); font-weight: var(--font-bold);
  background: rgba(255,255,255,0.06); color: #5d6380;
}
.top-rank.rank-1 { background: #f59e0b; color: #fff; }
.top-rank.rank-2 { background: #8b90a5; color: #fff; }
.top-rank.rank-3 { background: #a0724a; color: #fff; }
.top-name { flex: 1; font-size: var(--text-sm); }
.top-count { font-size: var(--text-sm); color: #5d6380; }

/* ═══ Metrics Grid ═══ */
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.metric-item { text-align: center; padding: var(--space-3); }
.metric-value { font-size: var(--text-xl); font-weight: var(--font-bold); }
.metric-label { font-size: var(--text-xs); color: #5d6380; margin-top: var(--space-1); }

/* ═══ Ticker ═══ */
.dvs-ticker {
  display: flex; align-items: center; gap: var(--space-4);
  margin-top: var(--space-6); padding: var(--space-3) var(--space-4);
  background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15);
  border-radius: var(--radius-md); overflow: hidden;
}
.dvs-ticker-label {
  font-size: var(--text-xs); font-weight: var(--font-semibold);
  color: #f59e0b; white-space: nowrap; flex-shrink: 0;
}
.dvs-ticker-content { flex: 1; overflow: hidden; }
.dvs-ticker-item {
  display: inline-block; font-size: var(--text-sm); color: #8b90a5;
  padding-right: 48px; animation: tickerScroll 30s linear infinite; white-space: nowrap;
}
@keyframes tickerScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* ═══ Grid ═══ */
.dashboard-grid {
  display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--space-4);
}
.col-3 { grid-column: span 3; }
.col-4 { grid-column: span 4; }
.col-6 { grid-column: span 6; }
.col-8 { grid-column: span 8; }
.col-12 { grid-column: span 12; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1400px) {
  .dvs-kpi-row { grid-template-columns: repeat(3, 1fr); }
  .dashboard-grid { grid-template-columns: repeat(6, 1fr); }
  .col-3, .col-4 { grid-column: span 3; }
  .col-6, .col-8, .col-12 { grid-column: span 6; }
}
@media (max-width: 767px) {
  .dvs { padding: var(--space-4); }
  .dvs-kpi-row { grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
  .dvs-kpi-card { padding: var(--space-3); }
  .dvs-kpi-num { font-size: var(--text-xl); }
  .dashboard-grid { grid-template-columns: 1fr; }
  .col-3, .col-4, .col-6, .col-8, .col-12 { grid-column: span 1; }
  .dvs-header { flex-direction: column; text-align: center; }
  .dvs-title { font-size: var(--text-xl); }
  .dvs-clock { font-size: var(--text-xl); }
}
</style>
