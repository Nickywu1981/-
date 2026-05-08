<template>
  <AdminLayout>
    <div class="page-header">
      <h2>数据看板</h2>
      <button class="refresh-btn" :class="{ spinning: loading }" :disabled="loading" @click="fetchAll">↻ 刷新</button>
    </div>

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
      <button class="retry-btn" @click="fetchAll">重试</button>
    </div>

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.userCount ?? '-' }}</span>
          <span class="stat-label">注册用户</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.taskCount ?? '-' }}</span>
          <span class="stat-label">任务总数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.todayTaskCount ?? '-' }}</span>
          <span class="stat-label">今日任务</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.paidUserCount ?? '-' }}</span>
          <span class="stat-label">付费用户</span>
        </div>
        <div class="stat-card highlight">
          <span class="stat-value">¥{{ stats.totalRevenue?.toFixed(2) ?? '-' }}</span>
          <span class="stat-label">总收入</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.todayActiveUsers ?? '-' }}</span>
          <span class="stat-label">今日活跃</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">¥{{ stats.todayCost?.toFixed(2) ?? '-' }}</span>
          <span class="stat-label">今日模型成本</span>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>7日任务趋势</h3>
          <div ref="taskChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>7日用户增长</h3>
          <div ref="userChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>7日收入 (¥)</h3>
          <div ref="revenueChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>任务类型分布</h3>
          <div ref="pieChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>热门功能 TOP5</h3>
          <div ref="barChart" class="chart-box" />
        </div>
        <div class="chart-card">
          <h3>模型用量分布</h3>
          <div ref="modelChart" class="chart-box" />
        </div>
      </div>

      <div class="recent-section">
        <h3>最近任务</h3>
        <table class="table">
          <thead><tr><th>任务ID</th><th>用户</th><th>类型</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="t in recentTasks" :key="t.id">
              <td class="mono">{{ t.id?.slice(0, 8) }}</td>
              <td>{{ t.username }}</td>
              <td>{{ t.task_type }}</td>
              <td><span class="badge" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span></td>
              <td class="time">{{ t.create_time?.slice(0, 16) }}</td>
            </tr>
            <tr v-if="!recentTasks.length"><td colspan="5" class="empty">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </AdminLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import * as echarts from 'echarts/core';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer]);

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

function statusClass(s: number) { return { 0: 'pending', 1: 'processing', 2: 'done', 3: 'fail' }[s] || '' }
function statusLabel(s: number) { return { 0: '排队', 1: '处理中', 2: '完成', 3: '失败' }[s] || '' }

function initChart(el: HTMLDivElement | undefined): echarts.ECharts | null {
  if (!el || typeof window === 'undefined') return null
  const instance = echarts.init(el)
  charts.push(instance)
  return instance
}

function renderLineChart(el: HTMLDivElement | undefined, data: { date: string; value: number }[], color: string) {
  const chart = initChart(el)
  if (!chart) return
  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb', textStyle: { color: '#333', fontSize: 12 } },
    grid: { left: 40, right: 16, top: 8, bottom: 24 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.slice(5)),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { fontSize: 11, color: '#999' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { fontSize: 11, color: '#999' },
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

function renderPieChart(el: HTMLDivElement | undefined, data: { label: string; value: number; color: string }[]) {
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

function renderBarChart(el: HTMLDivElement | undefined, data: { label: string; value: number }[]) {
  const chart = initChart(el)
  if (!chart) return
  const barColors = ['#3B82F6', '#22C55E', '#F59E0B', '#7C3AED', '#EC4899']
  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb', textStyle: { color: '#333', fontSize: 12 }, axisPointer: { type: 'shadow' } },
    grid: { left: 80, right: 16, top: 8, bottom: 24 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#999' } },
    yAxis: { type: 'category', data: data.map(d => d.label), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { fontSize: 11, color: '#999' } },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({ value: d.value, itemStyle: { color: barColors[i % barColors.length], borderRadius: [0, 4, 4, 0] } })),
      barWidth: 18,
    }],
  })
}

function renderModelChart(el: HTMLDivElement | undefined, data: { label: string; value: number; color: string }[]) {
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
    const [s, t]: any[] = await Promise.all([
      $fetch('/api/admin/stats'),
      $fetch('/api/admin/tasks?pageSize=8'),
    ])

    if (s?.code === 200) {
      stats.value = s.data
      const trends = s.data?.trends
      disposeCharts()
      nextTick(() => {
        renderLineChart(taskChart.value, trends?.tasks || [], '#3B82F6')
        renderLineChart(userChart.value, trends?.users || [], '#22C55E')
        renderLineChart(revenueChart.value, trends?.revenue || [], '#7C3AED')
        renderPieChart(pieChart.value, s.data?.taskDistribution || [
          { label: '主图', value: 35, color: '#3B82F6' },
          { label: '场景', value: 18, color: '#22C55E' },
          { label: '视频', value: 22, color: '#F59E0B' },
          { label: '详情页', value: 12, color: '#7C3AED' },
          { label: '其他', value: 13, color: '#EC4899' },
        ])
        renderBarChart(barChart.value, s.data?.popularFeatures || [
          { label: '智能抠图', value: 128 },
          { label: '场景生成', value: 96 },
          { label: '视频生成', value: 74 },
          { label: '图片精修', value: 58 },
          { label: '白底图', value: 43 },
        ])
        renderModelChart(modelChart.value, s.data?.modelUsage || [
          { label: 'GPT-4o', value: 45, color: '#7C3AED' },
          { label: 'Claude', value: 25, color: '#3B82F6' },
          { label: 'SD XL', value: 20, color: '#22C55E' },
          { label: '其他', value: 10, color: '#F59E0B' },
        ])
      })
    } else {
      throw new Error(s?.msg || '获取统计数据失败')
    }
    if (t?.code === 200) { recentTasks.value = t.data?.list || [] }
    else { throw new Error(t?.msg || '获取任务列表失败') }
  } catch (e: any) {
    error.value = e.message || '加载失败，请稍后重试'
    toast.error(error.value)
  } finally { loading.value = false }
}

onMounted(() => {
  fetchAll()
  window.addEventListener('resize', () => charts.forEach(c => c.resize()))
})

onUnmounted(() => {
  window.removeEventListener('resize', () => charts.forEach(c => c.resize()))
  disposeCharts()
})
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.refresh-btn { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.refresh-btn:hover { border-color: var(--brand); color: var(--brand); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-btn.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: var(--card-padding); text-align: center; transition: border-color var(--transition-fast); }
.stat-card:hover { border-color: var(--input-focus-border); }
.stat-card.highlight { border-color: var(--brand); background: var(--brand-light); }
.stat-value { font-size: 28px; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 4px; }
.stat-label { font-size: 13px; color: var(--text-secondary); }

.stat-card-skel { height: 100px; border-radius: var(--radius-lg); background: var(--skeleton-bg); }
.chart-card-skel { height: 220px; border-radius: var(--radius-lg); background: var(--skeleton-bg); }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
.chart-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; overflow: hidden; }
.chart-box { width: 100%; height: 220px; }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; font-size: 14px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }

.recent-section { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.table th { text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--border-light); color: var(--text-secondary); font-weight: 600; }
.table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); color: var(--text-primary); }
tr:hover td { background: var(--table-row-hover); }

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .stat-card { padding: 16px; }
  .stat-value { font-size: 22px; }
  h2 { font-size: 18px; }
  .charts-grid { grid-template-columns: 1fr; }
}
.mono { font-family: monospace; font-size: 12px; color: var(--text-muted); }
.time { color: var(--text-muted); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }
.badge { padding: 2px 10px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); font-weight: 500; }
.badge.pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.badge.processing { background: var(--status-processing-bg); color: var(--status-processing-text); }
.badge.done { background: var(--status-done-bg); color: var(--status-done-text); }
.badge.fail { background: var(--status-fail-bg); color: var(--status-fail-text); }
.pulse { animation: sk-pulse 1.5s ease-in-out infinite; }
@keyframes sk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
</style>
