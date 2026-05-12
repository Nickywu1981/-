<!-- 代理端仪表盘 -->
<template>
  <div class="pg">
    <PageHeader title="代理看板" :subtitle="agentName + ' — 欢迎回来'">
      <template #actions>
        <button class="btn btn-secondary btn-sm">导出报表</button>
        <button class="btn btn-gradient btn-sm">推广链接</button>
      </template>
    </PageHeader>

    <!-- KPI -->
    <div class="stat-grid">
      <StatsCard v-for="kpi in kpis" :key="kpi.key" :value="kpi.value" :label="kpi.label" :trend="kpi.change + ' vs 上月'" :trend-up="kpi.up" />
    </div>

    <!-- 图表 + 列表 -->
    <div class="dashboard-grid" style="margin-top: var(--space-6)">
      <!-- 佣金趋势 -->
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">佣金收入趋势</span></div>
        <div class="chart-card-body" style="min-height: 240px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">
          📈 图表区域 — 待接入 ECharts / Chart.js
        </div>
      </div>
      <!-- 客户增长 -->
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">客户增长</span></div>
        <div class="chart-card-body" style="min-height: 240px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">
          📈 图表区域 — 待接入 ECharts / Chart.js
        </div>
      </div>
      <!-- 近期客户 -->
      <div class="chart-card col-12">
        <div class="chart-card-header">
          <span class="chart-card-title">近期客户</span>
          <NuxtLink to="/agent/customers" class="btn btn-ghost btn-sm">查看全部</NuxtLink>
        </div>
        <div class="chart-card-body" style="padding: 0">
          <div class="table-container" style="border: none; border-radius: 0">
            <table class="data-table">
              <thead><tr><th>客户名称</th><th>套餐</th><th>消费金额</th><th>佣金</th><th>注册时间</th><th>状态</th></tr></thead>
              <tbody>
                <tr v-for="c in customers" :key="c.name">
                  <td>{{ c.name }}</td><td>{{ c.plan }}</td><td>¥{{ c.spent }}</td><td>¥{{ c.commission }}</td><td>{{ c.date }}</td>
                  <td><span class="badge" :class="'badge-' + c.statusType">{{ c.status }}</span></td>
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
  { key: 'commission', value: '¥96,372', label: '累计佣金', change: '+15.2%', up: true },
  { key: 'customers', value: '328', label: '直接客户', change: '+12.8%', up: true },
  { key: 'orders', value: '1,245', label: '成交订单', change: '+8.3%', up: true },
  { key: 'rate', value: '18.5%', label: '平均佣金率', change: '-1.2%', up: false },
]

const customers = [
  { name: '杭州潮牌电商', plan: '企业版', spent: '29,980', commission: '5,996', date: '2026-05-08', status: '活跃', statusType: 'success' },
  { name: '深圳美妆工作室', plan: '专业版年卡', spent: '8,999', commission: '1,800', date: '2026-05-06', status: '活跃', statusType: 'success' },
  { name: '广州服饰批发', plan: '企业版', spent: '29,980', commission: '5,996', date: '2026-05-03', status: '待激活', statusType: 'warning' },
  { name: '义乌小商品城', plan: '基础版', spent: '1,499', commission: '300', date: '2026-04-28', status: '活跃', statusType: 'success' },
  { name: '成都食品电商', plan: '专业版季卡', spent: '2,999', commission: '600', date: '2026-04-25', status: '已过期', statusType: 'neutral' },
]

definePageMeta({ layout: 'agent' })
</script>
