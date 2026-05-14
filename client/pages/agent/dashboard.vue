<!-- 代理端仪表盘 -->
<template>
  <div class="pg">
    <PageHeader :title="$t('agent.dashboard.title')" :subtitle="$t('agent.dashboard.subtitle', { name: agentName })">
      <template #actions>
        <button class="btn btn-secondary btn-sm">{{ $t('agent.dashboard.export_btn') }}</button>
        <button class="btn btn-gradient btn-sm">{{ $t('agent.dashboard.promote_btn') }}</button>
      </template>
    </PageHeader>

    <!-- KPI -->
    <div class="stat-grid">
      <StatsCard v-for="kpi in kpis" :key="kpi.key" :value="kpi.value" :label="$t(kpi.labelKey)" :trend="$t('agent.dashboard.trend_vs_last_month', { change: kpi.change })" :trend-up="kpi.up" />
    </div>

    <!-- 图表 + 列表 -->
    <div class="dashboard-grid chart-section">
      <!-- 佣金趋势 -->
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('agent.dashboard.chart_commission_trend') }}</span></div>
        <div class="chart-card-body chart-placeholder">
          {{ $t('agent.dashboard.chart_placeholder') }}
        </div>
      </div>
      <!-- 客户增长 -->
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('agent.dashboard.chart_customer_growth') }}</span></div>
        <div class="chart-card-body chart-placeholder">
          {{ $t('agent.dashboard.chart_placeholder') }}
        </div>
      </div>
      <!-- 近期客户 -->
      <div class="chart-card col-12">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ $t('agent.dashboard.recent_customers') }}</span>
          <NuxtLink to="/agent/customers" class="btn btn-ghost btn-sm">{{ $t('agent.dashboard.view_all') }}</NuxtLink>
        </div>
        <div class="chart-card-body no-pad">
          <div class="table-container table-clean">
            <table class="data-table">
              <thead><tr><th>{{ $t('agent.dashboard.col_customer') }}</th><th>{{ $t('agent.dashboard.col_plan') }}</th><th>{{ $t('agent.dashboard.col_spent') }}</th><th>{{ $t('agent.dashboard.col_commission') }}</th><th>{{ $t('agent.dashboard.col_date') }}</th><th>{{ $t('agent.dashboard.col_status') }}</th></tr></thead>
              <tbody>
                <tr v-for="c in customers" :key="c.name">
                  <td>{{ c.name }}</td><td>{{ c.plan }}</td><td>¥{{ c.spent }}</td><td>¥{{ c.commission }}</td><td>{{ c.date }}</td>
                  <td><span class="badge" :class="'badge-' + c.statusType">{{ $t(c.statusKey) }}</span></td>
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

const agentName = ref('张代理')

const kpis = [
  { key: 'commission', value: '¥96,372', labelKey: 'agent.dashboard.kpi_commission', change: '+15.2%', up: true },
  { key: 'customers', value: '328', labelKey: 'agent.dashboard.kpi_customers', change: '+12.8%', up: true },
  { key: 'orders', value: '1,245', labelKey: 'agent.dashboard.kpi_orders', change: '+8.3%', up: true },
  { key: 'rate', value: '18.5%', labelKey: 'agent.dashboard.kpi_rate', change: '-1.2%', up: false },
]

const customers = [
  { name: '杭州潮牌电商', plan: '企业版', spent: '29,980', commission: '5,996', date: '2026-05-08', statusKey: 'agent.team.status_active', statusType: 'success' },
  { name: '深圳美妆工作室', plan: '专业版年卡', spent: '8,999', commission: '1,800', date: '2026-05-06', statusKey: 'agent.team.status_active', statusType: 'success' },
  { name: '广州服饰批发', plan: '企业版', spent: '29,980', commission: '5,996', date: '2026-05-03', statusKey: 'agent.team.status_paused', statusType: 'warning' },
  { name: '义乌小商品城', plan: '基础版', spent: '1,499', commission: '300', date: '2026-04-28', statusKey: 'agent.team.status_active', statusType: 'success' },
  { name: '成都食品电商', plan: '专业版季卡', spent: '2,999', commission: '600', date: '2026-04-25', statusKey: 'agent.team.status_paused', statusType: 'neutral' },
]

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.chart-section { margin-top: var(--space-6); }
.chart-placeholder { min-height: 240px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); }
.no-pad { padding: 0; }
.table-clean { border: none; border-radius: 0; }
</style>
