<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('admin_analytics.数据统计分析') }}</h2>
    <LoadingSkeleton v-if="loading" type="table" :rows="4" :cols="4" />
    <template v-else-if="stats">
      <div class="stats-row">
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.userCount) }}</span><span class="stat-lbl">{{ $t('admin_analytics.总用户数') }}</span></div>
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.taskCount) }}</span><span class="stat-lbl">{{ $t('admin_analytics.总任务数') }}</span></div>
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.todayTaskCount) }}</span><span class="stat-lbl">{{ $t('admin_analytics.今日任务') }}</span></div>
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.paidUserCount) }}</span><span class="stat-lbl">{{ $t('admin_analytics.付费用户') }}</span></div>
        <div class="stat-card"><span class="stat-val">&yen;{{ fmtNum(stats.totalRevenue) }}</span><span class="stat-lbl">{{ $t('admin_analytics.总收入') }}</span></div>
      </div>
      <div class="chart-grid">
        <div class="chart-box"><h3>{{ $t('admin_analytics.任务趋势_7天') }}</h3><VChart v-if="taskOption" :option="taskOption" autoresize /></div>
        <div class="chart-box"><h3>{{ $t('admin_analytics.用户增长_7天') }}</h3><VChart v-if="userOption" :option="userOption" autoresize /></div>
        <div class="chart-box"><h3>{{ $t('admin_analytics.收入趋势_7天') }}</h3><VChart v-if="revenueOption" :option="revenueOption" autoresize /></div>
      </div>
    </template>
    <div v-else class="empty">加载统计数据{{ $t('common.failed') }}</div>
  </AdminLayout>
</template>

<script setup lang="ts">const { t } = useI18n()
import { fmtNum } from '@/utils/format'

let VChart: any = null

async function _loadVChart() {
  if (VChart) return
  const [vChartModule, core, charts, components, renderers] = await Promise.all([
    import('vue-echarts'),
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])
  core.use([
    charts.BarChart,
    components.GridComponent, components.TooltipComponent,
    renderers.CanvasRenderer,
  ])
  VChart = vChartModule.default || vChartModule
}


const loading = ref(true), stats = ref<any>(null)
const toast = useToast()


onMounted(async () => {
  try {
    await _loadVChart()
    const data: any = await $fetch('/api/admin/stats', { credentials: 'include' })
    if (data?.code === 200) stats.value = data.data
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.loadFail')) }
  loading.value = false
})

function makeOption(data: any[], color: string) {
  if (!data?.length) return null
  return {
    grid: { top: 8, right: 8, bottom: 24, left: 36 },
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: data.map((d: any) => d.date?.slice(5) || ''),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    series: [{
      type: 'bar',
      data: data.map((d: any) => d.value || 0),
      itemStyle: { color, borderRadius: [4, 4, 0, 0] },
    }],
  }
}

const taskOption = computed(() => stats.value?.trends?.tasks ? makeOption(stats.value.trends.tasks, '#5b5fe3') : null)
const userOption = computed(() => stats.value?.trends?.users ? makeOption(stats.value.trends.users, '#3B82F6') : null)
const revenueOption = computed(() => stats.value?.trends?.revenue ? makeOption(stats.value.trends.revenue, '#10B981') : null)
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.stats-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px 24px; min-width: 130px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.stat-val { font-size: 24px; font-weight: 700; color: var(--brand); }
.stat-lbl { font-size: 13px; color: var(--text-muted); }
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-box { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; min-height: 260px; }
.chart-box h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.empty { text-align: center; color: var(--text-muted); padding: 60px; }
@media (max-width: 768px) {
  .chart-grid { grid-template-columns: 1fr; }
  .stat-card { min-width: 100px; padding: 14px; }
}
</style>
