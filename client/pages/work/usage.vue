<template>
  <NuxtLayout name="workspace">
    <div class="usage-dashboard">
      <header class="page-header">
        <h1>用量仪表盘</h1>
        <button class="refresh-btn" :class="{ spinning: loading }" :disabled="loading" @click="fetchAll">刷新</button>
      </header>

      <div v-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="retry-btn" @click="fetchAll">重试</button>
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
            <h3>按模型用量分布</h3>
            <div ref="modelChartRef" class="chart-box"/>
          </div>
          <div class="chart-card" style="flex:1">
            <h3>按任务类型分布</h3>
            <div ref="typeChartRef" class="chart-box"/>
          </div>
        </section>

        <section class="recent-section">
          <h3>最近使用记录</h3>
          <table class="table">
            <thead><tr><th>时间</th><th>模型</th><th>任务</th><th>状态</th><th>耗时</th></tr></thead>
            <tbody>
              <tr v-if="recent.length===0"><td colspan="5" class="empty">暂无使用记录</td></tr>
              <tr v-for="item in recent" :key="item.id">
                <td class="time">{{ formatTime(item.timestamp) }}</td>
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
import * as echarts from 'echarts'



const loading = ref(false); const error = ref('')
const modelChartRef = ref<HTMLDivElement>(); const typeChartRef = ref<HTMLDivElement>()
let modelChart: any = null; let typeChart: any = null

const stats = reactive({ aiTotal: 0, creditBalance: 0, creditUsed: 0, planName: '', resetDate: '' })
const byModel = reactive<Record<string,number>>({})
const byType = reactive<Record<string,number>>({})
const recent = ref<any[]>([])

const statCards = computed(() => [
  { label: 'AI 调用总次数', value: stats.aiTotal, sub: '', highlight: true },
  { label: '剩余积分', value: stats.creditBalance, sub: '', highlight: false },
  { label: '已用积分', value: stats.creditUsed, sub: '', highlight: false },
  { label: '当前套餐', value: stats.planName, sub: stats.resetDate ? `下月 ${stats.resetDate} 重置` : '', highlight: false },
])

function formatTime(ts: string) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.getMonth()+1+'/'+d.getDate()+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')
}

function initChart(el: HTMLDivElement | undefined) {
  if (!el) return null
  const instance = echarts.init(el)
  return instance
}

async function fetchAll() {
  loading.value = true; error.value = ''
  try {
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
      stats.planName = c?.planName || '免费版'
      stats.resetDate = c?.resetDate || ''
    }
    if (taskR?.code === 200) {
      recent.value = (taskR.data?.list || []).map((t:any) => ({
        id: t.id, timestamp: t.created_at, model: t.model_name || '-',
        taskType: t.task_type || '-', status: t.status || 'pending', duration_ms: t.duration_ms || 0,
      }))
    }

    nextTick(() => {
      const mKeys = Object.keys(byModel), mValues = Object.values(byModel)
      if (modelChartRef.value) {
        if (modelChart) modelChart.dispose()
        modelChart = initChart(modelChartRef.value)
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
        typeChart = initChart(typeChartRef.value)
        if (typeChart && tKeys.length) typeChart.setOption({
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: tKeys, axisLabel: { fontSize: 10, rotate: 20 } },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: tValues, itemStyle: { color: '#7C3AED', borderRadius: [4,4,0,0] }, barMaxWidth: 40 }],
        })
      }
    })
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally { loading.value = false }
}

onMounted(() => fetchAll())
onUnmounted(() => { modelChart?.dispose(); typeChart?.dispose() })
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
.badge.done { background: #DCFCE7; color: #16A34A; }
.badge.processing { background: #DBEAFE; color: #2563EB; }
.badge.pending { background: #FEF3C7; color: #D97706; }
.badge.fail { background: #FEE2E2; color: #DC2626; }
.mono { font-family: monospace; font-size: 12px; color: var(--text-muted); }
.time { color: var(--text-muted); font-size: 12px; }
.error-state { text-align: center; padding: 60px 20px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; }
</style>
