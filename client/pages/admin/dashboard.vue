<template>
  <AdminLayout>
    <PageHeader :title="$t('admin_dashboard.page_title')">
      <template #actions>
        <button class="refresh-btn" :class="{ spinning: loading }" :disabled="loading" @click="fetchAll">↻ {{ $t('admin_dashboard.refresh') }}</button>
      </template>
    </PageHeader>

    <template v-if="loading">
      <div class="stats-grid">
        <div v-for="i in 5" :key="i" class="stat-card-skel pulse" />
      </div>
      <div class="charts-grid">
        <div v-for="i in 3" :key="i" class="chart-card-skel pulse" />
      </div>
    </template>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchAll">{{ $t('admin_dashboard.retry') }}</button>
    </div>

    <template v-else>
      <div class="stats-grid">
        <StatsCard :value="stats.userCount ?? '-'" :label="$t('admin_dashboard.registered_users')" />
        <StatsCard :value="stats.taskCount ?? '-'" :label="$t('admin_dashboard.total_tasks')" />
        <StatsCard :value="stats.todayTaskCount ?? '-'" :label="$t('admin_dashboard.today_tasks')" />
        <StatsCard :value="stats.paidUserCount ?? '-'" :label="$t('admin_dashboard.paid_users')" />
        <StatsCard :value="'¥' + (stats.totalRevenue?.toFixed(2) ?? '-')" :label="$t('admin_dashboard.total_revenue')" color="#67c23a" />
        <StatsCard :value="stats.todayActiveUsers ?? '-'" :label="$t('admin_dashboard.today_active')" />
        <StatsCard :value="'¥' + (stats.todayCost?.toFixed(2) ?? '-')" :label="$t('admin_dashboard.today_cost')" color="#f56c6c" />
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>{{ $t('admin_dashboard.chart_7d_tasks') }}</h3>
          <div ref="taskChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>{{ $t('admin_dashboard.chart_7d_users') }}</h3>
          <div ref="userChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>{{ $t('admin_dashboard.chart_7d_revenue') }}</h3>
          <div ref="revenueChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>{{ $t('admin_dashboard.chart_task_dist') }}</h3>
          <div ref="pieChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>{{ $t('admin_dashboard.chart_top5') }}</h3>
          <div ref="barChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>{{ $t('admin_dashboard.chart_model_dist') }}</h3>
          <div ref="modelChart" class="chart-box" />
        </div>
      </div>

      <div class="recent-section">
        <h3>{{ $t('admin_dashboard.recent_tasks') }}</h3>
        <table class="table">
          <thead><tr><th>{{ $t('admin_dashboard.col_task_id') }}</th><th>{{ $t('admin_dashboard.col_user') }}</th><th>{{ $t('admin_dashboard.col_type') }}</th><th>{{ $t('admin_dashboard.col_status') }}</th><th>{{ $t('admin_dashboard.col_time') }}</th></tr></thead>
          <tbody>
            <tr v-for="t in recentTasks" :key="t.id">
              <td class="mono">{{ t.id?.slice(0, 8) }}</td>
              <td>{{ t.username }}</td>
              <td>{{ t.task_type }}</td>
              <td><StatusBadge :variant="statusVariant(t.status)" size="sm" dot>{{ statusLabel(t.status) }}</StatusBadge></td>
              <td class="time">{{ t.create_time?.slice(0, 16) }}</td>
            </tr>
            <tr v-if="!recentTasks.length"><td colspan="5" class="empty">{{ $t('admin_dashboard.no_data_text') }}</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </AdminLayout>
</template>

<script setup lang="ts">

import PageHeader from '~/components/shared/PageHeader.vue'
import StatsCard from '~/components/shared/StatsCard.vue'
import StatusBadge from '~/components/shared/StatusBadge.vue'

let echarts: any = null
async function _loadEcharts() {
  if (echarts) return
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  core.use([
    charts.LineChart, charts.PieChart, charts.BarChart,
    components.TitleComponent, components.TooltipComponent, components.LegendComponent, components.GridComponent,
    renderers.CanvasRenderer,
  ])
  echarts = core
}

const { t } = useI18n()

const stats = ref<any>({})
const recentTasks = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const taskChart = ref<HTMLDivElement>()
const userChart = ref<HTMLDivElement>()
const revenueChart = ref<HTMLDivElement>()
const pieChart = ref<HTMLDivElement>()
const barChart = ref<HTMLDivElement>()
const modelChart = ref<HTMLDivElement>()

let charts: echarts.ECharts[] = []
const toast = useToast()

const statusVariant = (s: number) => ['info','warning','success','danger'][s] || 'default'
const statusLabel = (s: number) => [t('admin_dashboard.status_queued'), t('admin_dashboard.status_processing'), t('admin_dashboard.status_done'), t('admin_dashboard.status_failed')][s] || ''

async function initChart(el: HTMLDivElement | undefined): Promise<any> {
  if (!el || typeof window === 'undefined') return null
  await _loadEcharts()
  const instance = echarts.init(el)
  charts.push(instance)
  return instance
}

async function renderLineChart(el: HTMLDivElement | undefined, data: { date: string; value: number }[], color: string) {
  const chart = await initChart(el)
  if (!chart) return
  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb', textStyle: { color: '#333', fontSize: 12 } },
    grid: { left: 40, right: 16, top: 8, bottom: 24 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date?.slice(5) || ''),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { fontSize: 11, color: '#767676' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { fontSize: 11, color: '#767676' },
    },
    series: [{
      type: 'line',
      data: data.map(d => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: color + '33' },
        { offset: 1, color: color + '05' },
      ])},
    }],
  })
}

async function renderPieChart(el: HTMLDivElement | undefined, data: { label: string; value: number; color: string }[]) {
  const chart = initChart(el)
  if (!chart) return
  const pieColors = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#7C3AED', '#EC4899', '#06B6D4', '#84CC16']
  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e5e7eb', textStyle: { color: '#333', fontSize: 12 } },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: '#666' } },
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['50%', '48%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.map((d, i) => ({
        value: d.value,
        name: d.label,
        itemStyle: { color: d.color || pieColors[i % pieColors.length] },
      })),
    }],
  })
}

async function renderBarChart(el: HTMLDivElement | undefined, data: { label: string; value: number }[]) {
  const chart = initChart(el)
  if (!chart) return
  const barColors = ['#3B82F6', '#22C55E', '#F59E0B', '#7C3AED', '#EC4899']
  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb', textStyle: { color: '#333', fontSize: 12 }, axisPointer: { type: 'shadow' } },
    grid: { left: 80, right: 16, top: 8, bottom: 24 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#767676' } },
    yAxis: { type: 'category', data: data.map(d => d.label), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 11, color: '#767676' } },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({ value: d.value, itemStyle: { color: barColors[i % barColors.length], borderRadius: [0, 4, 4, 0] } })),
      barWidth: 18,
    }],
  })
}

async function renderModelChart(el: HTMLDivElement | undefined, data: { label: string; value: number; color: string }[]) {
  const chart = initChart(el)
  if (!chart) return
  const colors = ['#7C3AED', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899']
  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#e5e7eb', textStyle: { color: '#333', fontSize: 12 } },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: '#666' } },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '48%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 10, color: '#666' },
      data: data.map((d, i) => ({
        value: d.value,
        name: d.label,
        itemStyle: { color: d.color || colors[i % colors.length] },
      })),
    }],
  })
}

function disposeCharts() {
  charts.forEach(c => c.dispose())
  charts = []
}

async function fetchAll() {
  loading.value = true; error.value = ''
  try {
    const [s, tResult]: any[] = await Promise.allSettled([
      $fetch('/api/admin/stats', { credentials: 'include' }),
      $fetch('/api/admin/tasks?pageSize=8', { credentials: 'include' }),
    ])
    const sVal = s.status === 'fulfilled' ? s.value : null
    const tVal = tResult.status === 'fulfilled' ? tResult.value : null

    if (sVal?.code === 200) {
      stats.value = sVal.data
      const trends = sVal.data?.trends
      disposeCharts()
      nextTick(async () => {
        await renderLineChart(taskChart.value, trends?.tasks || [], '#3B82F6')
        await renderLineChart(userChart.value, trends?.users || [], '#22C55E')
        await renderLineChart(revenueChart.value, trends?.revenue || [], '#7C3AED')
        await renderPieChart(pieChart.value, sVal.data?.taskDistribution || [
          { label: t('admin_dashboard.fb_main_image'), value: 35, color: '#3B82F6' },
          { label: t('admin_dashboard.fb_scene'), value: 18, color: '#22C55E' },
          { label: t('admin_dashboard.fb_video'), value: 22, color: '#F59E0B' },
          { label: t('admin_dashboard.fb_detail'), value: 12, color: '#7C3AED' },
          { label: t('admin_dashboard.fb_other'), value: 13, color: '#EC4899' },
        ])
        await renderBarChart(barChart.value, sVal.data?.popularFeatures || [
          { label: t('admin_dashboard.fb_smart_cutout'), value: 128 },
          { label: t('admin_dashboard.fb_scene_gen'), value: 96 },
          { label: t('admin_dashboard.fb_video_gen'), value: 74 },
          { label: t('admin_dashboard.fb_image_refine'), value: 58 },
          { label: t('admin_dashboard.fb_white_bg'), value: 43 },
        ])
        await renderModelChart(modelChart.value, sVal.data?.modelUsage || [
          { label: 'GPT-4o', value: 45, color: '#7C3AED' },
          { label: 'Claude', value: 25, color: '#3B82F6' },
          { label: 'SD XL', value: 20, color: '#22C55E' },
          { label: t('admin_dashboard.fb_other_model'), value: 10, color: '#F59E0B' },
        ])
      })
    } else {
      throw new Error(sVal?.msg || t('admin_dashboard.stats_load_fail'))
    }
    if (tVal?.code === 200) { recentTasks.value = tVal.data?.list || [] }
    else { throw new Error(tVal?.msg || t('admin_dashboard.tasks_load_fail')) }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('admin_dashboard.load_failed')
    toast.error(error.value)
  } finally { loading.value = false }
}

const handleResize = () => charts.forEach(c => c.resize());
onMounted(() => {
  fetchAll()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
/* ================================================
   ADMIN DASHBOARD — 与 workspace 一脉相承
   ================================================ */
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px;
}
.page-header h2 {
  font-size: 20px; font-weight: 600; color: var(--text-primary);
  letter-spacing: -0.03em;
}
.refresh-btn {
  padding: 7px 16px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--bg-card); color: var(--text-secondary); cursor: pointer;
  font-size: 13px; transition: background 0.15s, color 0.15s;
}
.refresh-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.refresh-btn.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---- 统计卡片 ---- */
.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 12px; margin-bottom: 24px;
}
.stat-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
  padding: 20px 16px; text-align: center;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.stat-card:hover { border-color: var(--border); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.stat-card.highlight {
  border-color: var(--text-primary); background: var(--bg-secondary);
}
.stat-value { font-size: 26px; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 2px; }
.stat-label { font-size: 12px; color: var(--text-muted); }

.stat-card-skel { height: 96px; border-radius: 10px; background: var(--skeleton-bg); }
.chart-card-skel { height: 220px; border-radius: 10px; background: var(--skeleton-bg); }

h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }

/* ---- 图表 ---- */
.charts-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px; margin-bottom: 24px;
}
.chart-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
  padding: 20px; overflow: hidden;
}
.chart-box { width: 100%; height: 220px; }

/* ---- 错误/加载 ---- */
.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 40px; }
.error-state p { color: var(--text-muted); margin: 8px 0 16px; font-size: 14px; }
.retry-btn {
  padding: 8px 20px; background: var(--brand); color: var(--text-on-brand);
  border: none; border-radius: 8px; cursor: pointer; font-size: 13px;
  transition: opacity 0.15s;
}
.retry-btn:hover { opacity: 0.85; }

/* ---- 最近任务 ---- */
.recent-section {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
  padding: 20px; overflow-x: auto;
}
.table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.table th {
  text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--border);
  color: var(--text-muted); font-weight: 500; font-size: 12px;
}
.table td { padding: 10px 12px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
tr:hover td { background: var(--bg-secondary); }

.mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: var(--text-muted); }
.time { color: var(--text-muted); }
.empty { text-align: center; color: var(--text-muted); padding: 32px; }
.badge { padding: 3px 10px; border-radius: 5px; font-size: 11px; font-weight: 500; }
.badge.pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.badge.processing { background: var(--status-processing-bg); color: var(--status-processing-text); }
.badge.done { background: var(--status-done-bg); color: var(--status-done-text); }
.badge.fail { background: var(--status-fail-bg); color: var(--status-fail-text); }
.pulse { animation: sk-pulse 1.5s ease-in-out infinite; }
@keyframes sk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-card { padding: 14px 10px; }
  .stat-value { font-size: 20px; }
  .page-header h2 { font-size: 17px; }
  .charts-grid { grid-template-columns: 1fr; }
}
</style>
