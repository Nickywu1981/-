<template>
  <NuxtLayout name="workspace">
    <div class="usage-dashboard">
      <header class="page-header">
        <h1>{{ $t('work_pages.usage.title') }}</h1>
        <button class="refresh-btn" :class="{ spinning: loading }" :disabled="loading" @click="fetchAll">{{ $t('work_pages.usage.refresh') }}</button>
      </header>

      <div v-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="retry-btn" @click="fetchAll">{{ $t('work_pages.usage.retry') }}</button>
      </div>

      <template v-else>
        <section class="stats-grid">
          <div v-for="s in statCards" :key="s.label" class="stat-card" :class="{ highlight: s.highlight }">
            <span class="stat-value">{{ s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
            <span v-if="s.sub" class="stat-sub">{{ s.sub }}</span>
          </div>
        </section>

        <section class="chart-section">
          <div class="chart-card" style="flex:2">
            <h3>{{ $t('work_pages.usage.chart_by_model') }}</h3>
            <div ref="modelChartRef" class="chart-box"/>
          </div>
          <div class="chart-card" style="flex:1">
            <h3>{{ $t('work_pages.usage.chart_by_type') }}</h3>
            <div ref="typeChartRef" class="chart-box"/>
          </div>
        </section>

        <section class="recent-section">
          <h3>{{ $t('work_pages.usage.recent_title') }}</h3>
          <table class="table">
            <thead><tr><th>{{ $t('work_pages.usage.th_time') }}</th><th>{{ $t('work_pages.usage.th_model') }}</th><th>{{ $t('work_pages.usage.th_task') }}</th><th>{{ $t('work_pages.usage.th_status') }}</th><th>{{ $t('work_pages.usage.th_duration') }}</th></tr></thead>
            <tbody>
              <tr v-if="recent.length===0"><td colspan="5" class="empty">{{ $t('work_pages.usage.empty_records') }}</td></tr>
              <tr v-for="item in recent" :key="item.id">
                <td class="time">{{ formatDateTime(item.timestamp) }}</td>
                <td class="mono">{{ item.model }}</td>
                <td>{{ item.taskType }}</td>
                <td><span class="badge" :class="item.status">{{ item.status }}</span></td>
                <td>{{ item.duration_ms }}ms</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'
const { t } = useI18n()

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
    charts.PieChart, charts.BarChart,
    components.TooltipComponent, components.GridComponent,
    renderers.CanvasRenderer,
  ])
  echarts = core
}

const loading = ref(false); const error = ref('')
const modelChartRef = ref<HTMLDivElement>(); const typeChartRef = ref<HTMLDivElement>()
let modelChart: any = null; let typeChart: any = null

const stats = reactive({ aiTotal: 0, creditBalance: 0, creditUsed: 0, planName: '', resetDate: '' })
const byModel = reactive<Record<string,number>>({})
const byType = reactive<Record<string,number>>({})
const recent = ref<any[]>([])

const statCards = computed(() => [
  { label: t('work_pages.usage.stat_ai_total'), value: stats.aiTotal, sub: '', highlight: true },
  { label: t('work_pages.usage.stat_credit_balance'), value: stats.creditBalance, sub: '', highlight: false },
  { label: t('work_pages.usage.stat_credit_used'), value: stats.creditUsed, sub: '', highlight: false },
  { label: t('work_pages.usage.stat_plan'), value: stats.planName || t('work_pages.usage.plan_free'), sub: stats.resetDate ? t('work_pages.usage.plan_reset_prefix') + stats.resetDate + t('work_pages.usage.plan_reset_suffix') : '', highlight: false },
])

async function initChart(el: HTMLDivElement | undefined) {
  if (!el) return null
  await _loadEcharts()
  const instance = echarts.init(el)
  return instance
}

async function fetchAll() {
  loading.value = true; error.value = ''
  try {
    await _loadEcharts()
    const [aiR, creditR, taskR]: any[] = await Promise.all([
      $fetch('/api/ai-dispatch/stats'),
      $fetch('/api/credits/balance'),
      $fetch('/api/tasks/my-works?page=1&pageSize=10'),
    ])
    if (aiR?.success) {
      stats.aiTotal = aiR.data?.total || 0
      Object.assign(byModel, aiR.data?.byModel || {})
      Object.assign(byType, aiR.data?.byType || {})
    }
    if (creditR?.code === 200) {
      const c = creditR.data
      stats.creditBalance = c?.balance ?? 0
      stats.creditUsed = c?.used ?? 0
      stats.planName = c?.planName || ''
      stats.resetDate = c?.resetDate || ''
    }
    if (taskR?.code === 200) {
      recent.value = (taskR.data?.list || []).map((t:any) => ({
        id: t.id, timestamp: t.created_at, model: t.model_name || '-',
        taskType: t.task_type || '-', status: t.status || 'pending', duration_ms: t.duration_ms || 0,
      }))
    }

    nextTick(async () => {
      const mKeys = Object.keys(byModel), mValues = Object.values(byModel)
      if (modelChartRef.value) {
        if (modelChart) modelChart.dispose()
        modelChart = await initChart(modelChartRef.value)
        if (modelChart && mKeys.length) modelChart.setOption({
          tooltip: { trigger: 'item' },
          series: [{ type: 'pie', radius: ['40%','65%'], center: ['50%','50%'],
            data: mKeys.map((k,i) => ({ name: k, value: mValues[i] })),
            label: { formatter: '{b}\n{d}%', fontSize: 11 } }],
        })
      }
      const tKeys = Object.keys(byType), tValues = Object.values(byType)
      if (typeChartRef.value) {
        if (typeChart) typeChart.dispose()
        typeChart = await initChart(typeChartRef.value)
        if (typeChart && tKeys.length) typeChart.setOption({
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: tKeys, axisLabel: { fontSize: 10, rotate: 20 } },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: tValues, itemStyle: { color: '#7C3AED', borderRadius: [4,4,0,0] }, barMaxWidth: 40 }],
        })
      }
    })
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('work_pages.usage.error_load_failed')
  } finally { loading.value = false }
}

onMounted(() => fetchAll())
onUnmounted(() => { modelChart?.dispose(); typeChart?.dispose() })
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
h1 { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.refresh-btn { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.refresh-btn:hover { border-color: var(--brand); color: var(--brand); }
.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; text-align: center; }
.stat-card.highlight { border-color: var(--brand); background: var(--brand-light); }
.stat-value { font-size: 26px; font-weight: 700; color: var(--text-primary); display: block; }
.stat-label { font-size: 13px; color: var(--text-secondary); display: block; margin-top: 4px; }
.stat-sub { font-size: 11px; color: var(--text-muted); display: block; margin-top: 2px; }
.chart-section { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.chart-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; min-width: 260px; }
.chart-card h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.chart-box { width: 100%; height: 220px; }
.recent-section { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; overflow-x: auto; }
.recent-section h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--border-light); color: var(--text-secondary); font-weight: 600; }
.table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); color: var(--text-primary); }
.empty { text-align: center; color: var(--text-muted); padding: 20px; }
.badge { padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 500; }
.badge.done { background: var(--success-light); color: #16A34A; }
.badge.processing { background: var(--info-bg); color: #2563EB; }
.badge.pending { background: var(--warning-border); color: #D97706; }
.badge.fail { background: var(--danger-light); color: var(--danger); }
.mono { font-family: monospace; font-size: 12px; color: var(--text-muted); }
.time { color: var(--text-muted); font-size: 12px; }
.error-state { text-align: center; padding: 60px 20px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; }
</style>
