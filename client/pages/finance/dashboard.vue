<!-- 财务后台仪表盘 -->
<template>
  <div class="pg">
    <PageHeader :title="$t('finance.dashboard.title')" :subtitle="$t('finance.dashboard.subtitle')">
      <template #actions>
        <select class="select" style="width:140px;">
          <option>{{ $t('finance.dashboard.period_month') }}</option><option>{{ $t('finance.dashboard.period_last_month') }}</option><option>{{ $t('finance.dashboard.period_quarter') }}</option><option>{{ $t('finance.dashboard.period_year') }}</option>
        </select>
        <button class="btn btn-gradient btn-sm">{{ $t('finance.dashboard.export_btn') }}</button>
      </template>
    </PageHeader>

    <div class="stat-grid">
      <StatsCard v-for="kpi in kpis" :key="kpi.key" :value="kpi.value" :label="$t(kpi.labelKey)" :trend="kpi.change" :trend-up="kpi.up" />
    </div>

    <div class="dashboard-grid" style="margin-top: var(--space-6)">
      <div class="chart-card col-8">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('finance.dashboard.chart_income_trend') }}</span></div>
        <div class="chart-card-body" style="min-height:260px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">{{ $t('finance.dashboard.chart_income_placeholder') }}</div>
      </div>
      <div class="chart-card col-4">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('finance.dashboard.chart_income_breakdown') }}</span></div>
        <div class="chart-card-body" style="min-height:260px;">
          <div v-for="s in sources" :key="s.nameKey" style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;">
            <span>{{ $t(s.nameKey) }}</span><span style="font-weight:500;">¥{{ s.amount }}</span>
          </div>
          <hr class="divider" />
          <div style="display:flex;justify-content:space-between;font-weight:600;font-size:14px;"><span>{{ $t('finance.dashboard.total_label') }}</span><span>¥{{ totalIncome }}</span></div>
        </div>
      </div>
      <div class="chart-card col-12">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ $t('finance.dashboard.recent_transactions') }}</span>
          <NuxtLink to="/finance/orders" class="btn btn-ghost btn-sm">{{ $t('finance.dashboard.all_orders') }}</NuxtLink>
        </div>
        <div class="chart-card-body" style="padding:0">
          <div class="table-container" style="border:none;border-radius:0">
            <table class="data-table">
              <thead><tr><th>{{ $t('finance.dashboard.col_order_no') }}</th><th>{{ $t('finance.dashboard.col_user') }}</th><th>{{ $t('finance.dashboard.col_type') }}</th><th>{{ $t('finance.dashboard.col_amount') }}</th><th>{{ $t('finance.dashboard.col_commission') }}</th><th>{{ $t('finance.dashboard.col_time') }}</th><th>{{ $t('finance.dashboard.col_status') }}</th></tr></thead>
              <tbody>
                <tr v-for="o in transactions" :key="o.id">
                  <td style="font-family:var(--font-mono);font-size:12px;">{{ o.id }}</td>
                  <td>{{ o.user }}</td>
                  <td>{{ o.type }}</td>
                  <td class="text-right">¥{{ o.amount }}</td>
                  <td class="text-right">¥{{ o.commission }}</td>
                  <td>{{ o.time }}</td>
                  <td><span class="badge" :class="'badge-' + o.statusType">{{ $t(o.statusKey) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '~/components/shared/PageHeader.vue'
import StatsCard from '~/components/shared/StatsCard.vue'

const kpis = [
  { key: 'revenue', value: '¥1,284,960', labelKey: 'finance.dashboard.kpi_revenue', change: '+12.5%', up: true },
  { key: 'commission', value: '¥96,372', labelKey: 'finance.dashboard.kpi_commission', change: '+8.3%', up: false },
  { key: 'orders', value: '8,429', labelKey: 'finance.dashboard.kpi_orders', change: '+15.2%', up: true },
  { key: 'arpu', value: '¥218', label: 'ARPU', change: '+3.1%', up: true },
]

const sources = [
  { nameKey: 'finance.dashboard.income_plan', amount: '892,400' },
  { nameKey: 'finance.dashboard.income_credits', amount: '284,960' },
  { nameKey: 'finance.dashboard.income_api', amount: '72,600' },
  { nameKey: 'finance.dashboard.income_other', amount: '35,000' },
]
const totalIncome = computed(() => sources.reduce((s, i) => s + parseInt(i.amount.replace(',','')), 0).toLocaleString())

const transactions = [
  { id: 'ORD-20260511-001', user: '杭州潮牌', type: '企业版年', amount: '29,980', commission: '5,996', time: '2026-05-11 14:32', statusKey: 'finance.dashboard.status_completed', statusType: 'success' },
  { id: 'ORD-20260511-002', user: '深圳美妆', type: '专业版年', amount: '8,999', commission: '1,800', time: '2026-05-11 13:15', statusKey: 'finance.dashboard.status_completed', statusType: 'success' },
  { id: 'ORD-20260511-003', user: '广州服饰', type: '积分充值', amount: '500', commission: '0', time: '2026-05-11 12:08', statusKey: 'finance.dashboard.status_pending', statusType: 'warning' },
  { id: 'ORD-20260510-004', user: '义乌小商品', type: '基础版月', amount: '299', commission: '60', time: '2026-05-10 18:45', statusKey: 'finance.dashboard.status_refunded', statusType: 'danger' },
]

definePageMeta({ layout: 'finance', middleware: ['auth'] })
</script>
