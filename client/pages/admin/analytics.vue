<template>
  <AdminLayout>
    <h2 class="ptitle">数据统计分析</h2>
    <LoadingSkeleton v-if="loading" type="table" :rows="4" :cols="4" />
    <template v-else-if="stats">
      <div class="stats-row">
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.userCount) }}</span><span class="stat-lbl">总用户数</span></div>
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.taskCount) }}</span><span class="stat-lbl">总任务数</span></div>
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.todayTaskCount) }}</span><span class="stat-lbl">今日任务</span></div>
        <div class="stat-card"><span class="stat-val">{{ fmtNum(stats.paidUserCount) }}</span><span class="stat-lbl">付费用户</span></div>
        <div class="stat-card"><span class="stat-val">&yen;{{ fmtNum(stats.totalRevenue) }}</span><span class="stat-lbl">总收入</span></div>
      </div>
      <div class="chart-grid">
        <div class="chart-box"><h3>任务趋势 (7天)</h3><canvas id="chartTasks" height="200"></canvas></div>
        <div class="chart-box"><h3>用户增长 (7天)</h3><canvas id="chartUsers" height="200"></canvas></div>
        <div class="chart-box"><h3>收入趋势 (7天)</h3><canvas id="chartRevenue" height="200"></canvas></div>
      </div>
    </template>
    <div v-else class="empty">加载统计数据失败</div>
  </AdminLayout>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const loading = ref(true), stats = ref<any>(null)

function fmtNum(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n || 0) }
const toast = useToast()

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/admin/stats', { credentials: 'include' })
    if (data?.code === 200) stats.value = data.data
  } catch(e: any) { toast.error(e.data?.msg || '加载失败') }
  loading.value = false
})

watch(stats, (val) => {
  if (!val?.trends) return
  nextTick(() => {
    const colors = { tasks: '#7C3AED', users: '#3B82F6', revenue: '#10B981' }
    ;[['chartTasks', val.trends.tasks, colors.tasks], ['chartUsers', val.trends.users, colors.users], ['chartRevenue', val.trends.revenue, colors.revenue]].forEach(([id, data, color]) => {
      const canvas = document.getElementById(id as string)
      if (!canvas || !data) return
      const labels = data.map((d: any) => d.date?.slice(5) || '')
      const values = data.map((d: any) => d.value || 0)
      new (window as any).Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } },
        },
      })
    })
  })
})
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.stats-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px 24px; min-width: 130px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.stat-val { font-size: 24px; font-weight: 700; color: var(--brand); }
.stat-lbl { font-size: 13px; color: var(--text-muted); }
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-box { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; }
.chart-box h3 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.empty { text-align: center; color: var(--text-muted); padding: 60px; }
@media (max-width: 768px) {
  .chart-grid { grid-template-columns: 1fr; }
  .stat-card { min-width: 100px; padding: 14px; }
}
</style>
