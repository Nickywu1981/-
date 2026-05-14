<!-- 运营端 — 运营报表 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('ops.reports_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('ops.reports_subtitle') }}</p>
      </div>
      <button class="btn btn-secondary btn-sm">{{ $t('ops.reports_btn_export') }}</button>
    </div>

    <div class="card" style="margin-top:0">
      <div class="chart-card-header"><span class="chart-card-title">{{ $t('ops.reports_chart_title') }}</span></div>
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
        <thead><tr><th>{{ $t('ops.reports_col_date') }}</th><th>{{ $t('ops.reports_col_new_users') }}</th><th>{{ $t('ops.reports_col_active_users') }}</th><th>{{ $t('ops.reports_col_orders') }}</th><th>{{ $t('ops.reports_col_revenue') }}</th><th>{{ $t('ops.reports_col_conversion') }}</th></tr></thead>
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
definePageMeta({ layout: 'business-ops', middleware: ['auth'] })

const { t } = useI18n()
const metrics = reactive([
  { label: t('ops.reports_metric_dau'), value: '1,842', change: '8.5%', up: true },
  { label: t('ops.reports_metric_new_reg'), value: '126', change: '12%', up: true },
  { label: t('ops.reports_metric_orders'), value: '342', change: '3.2%', up: false },
  { label: t('ops.reports_metric_revenue'), value: '¥8,420', change: '15%', up: true },
])

const dailyReports = reactive([
  { date: '2026-05-11', newUsers: 126, activeUsers: 1842, orders: 342, revenue: 8420, conversion: 18.6 },
  { date: '2026-05-10', newUsers: 118, activeUsers: 1790, orders: 328, revenue: 7980, conversion: 18.3 },
  { date: '2026-05-09', newUsers: 132, activeUsers: 1825, orders: 356, revenue: 9120, conversion: 19.5 },
])
</script>
