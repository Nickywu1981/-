<!-- 运营端 — 运营报表 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">运营报表</h1>
        <p class="page-header-subtitle">日周月运营数据、用户增长、业务转化趋势</p>
      </div>
      <button class="btn btn-secondary btn-sm">导出报表</button>
    </div>

    <div class="card" style="margin-top:0">
      <div class="chart-card-header"><span class="chart-card-title">本周核心指标</span></div>
      <div class="stat-grid" style="margin-top: var(--space-2)">
        <div v-for="m in metrics" :key="m.label" class="stat-card">
          <div class="stat-card-value">{{ m.value }}</div>
          <div class="stat-card-label">{{ m.label }}</div>
          <div class="stat-card-trend" :class="m.up ? 'up' : 'down'">{{ m.up ? '↑' : '↓' }} {{ m.change }}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>日期</th><th>新增用户</th><th>活跃用户</th><th>订单量</th><th>收入</th><th>转化率</th></tr></thead>
        <tbody>
          <tr v-for="r in dailyReports" :key="r.date">
            <td>{{ r.date }}</td><td>{{ r.newUsers }}</td><td>{{ r.activeUsers }}</td><td>{{ r.orders }}</td>
            <td>¥{{ r.revenue.toLocaleString() }}</td><td>{{ r.conversion }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'ops', middleware: ['auth'] })

const metrics = reactive([
  { label: '日活用户', value: '1,842', change: '8.5%', up: true },
  { label: '新增注册', value: '126', change: '12%', up: true },
  { label: '订单量', value: '342', change: '3.2%', up: false },
  { label: '收入', value: '¥8,420', change: '15%', up: true },
])

const dailyReports = reactive([
  { date: '2026-05-11', newUsers: 126, activeUsers: 1842, orders: 342, revenue: 8420, conversion: 18.6 },
  { date: '2026-05-10', newUsers: 118, activeUsers: 1790, orders: 328, revenue: 7980, conversion: 18.3 },
  { date: '2026-05-09', newUsers: 132, activeUsers: 1825, orders: 356, revenue: 9120, conversion: 19.5 },
])
</script>
