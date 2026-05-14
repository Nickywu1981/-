<!-- 网关中台仪表盘 -->
<template>
  <div class="pg">
    <PageHeader :title="$t('gateway.dashboard_title')" :subtitle="$t('gateway.dashboard_subtitle')" />

    <div class="stat-grid">
      <StatsCard v-for="kpi in kpis" :key="kpi.key" :value="kpi.value" :label="kpi.label" />
    </div>

    <div class="dashboard-grid" style="margin-top: var(--space-6)">
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('gateway.dashboard_chart_qps') }}</span></div>
        <div class="chart-card-body" style="min-height: 220px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">{{ $t('gateway.dashboard_placeholder_qps') }}</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('gateway.dashboard_chart_latency') }}</span></div>
        <div class="chart-card-body" style="min-height: 220px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">{{ $t('gateway.dashboard_placeholder_latency') }}</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('gateway.dashboard_chart_health') }}</span></div>
        <div class="chart-card-body">
          <div v-for="s in services" :key="s.name" style="display:flex;align-items:center;gap:8px;padding:6px 0;">
            <span :style="{width:8,height:8,borderRadius:'50%',background:s.healthy?'var(--color-success-500)':'var(--color-danger-500)',flexShrink:0}" />
            <span style="flex:1;font-size:13px;">{{ s.name }}</span>
            <span class="badge" :class="s.healthy ? 'badge-success' : 'badge-danger'">{{ s.healthy ? $t('gateway.dashboard_status_normal') : $t('gateway.dashboard_status_abnormal') }}</span>
            <span style="font-size:12px;color:var(--text-tertiary);">{{ s.latency }}ms</span>
          </div>
        </div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('gateway.dashboard_chart_rate_limit') }}</span></div>
        <div class="chart-card-body">
          <div v-for="r in rateLimits" :key="r.time" style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;">
            <span>{{ r.route }}</span><span style="color:var(--color-warning-500);">{{ $t('gateway.dashboard_rate_count', { n: r.count }) }}</span><span style="color:var(--text-tertiary);font-size:12px;">{{ r.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '~/components/shared/PageHeader.vue'
import StatsCard from '~/components/shared/StatsCard.vue'

const { t } = useI18n()
const kpis = [
  { key: 'qps', value: '18,420', label: t('gateway.dashboard_kpi_qps') },
  { key: 'latency', value: '42ms', label: t('gateway.dashboard_kpi_latency') },
  { key: 'routes', value: '56', label: t('gateway.dashboard_kpi_routes') },
  { key: 'health', value: '99.97%', label: t('gateway.dashboard_kpi_health') },
]

const services = [
  { name: '用户服务 (user-svc)', healthy: true, latency: 12 },
  { name: '订单服务 (order-svc)', healthy: true, latency: 28 },
  { name: 'AI 推理服务 (ai-svc)', healthy: true, latency: 156 },
  { name: '支付服务 (pay-svc)', healthy: true, latency: 18 },
  { name: '通知服务 (notify-svc)', healthy: false, latency: 0 },
]
const rateLimits = [{ route: '/api/ai/generate', count: 245, time: '14:32' }, { route: '/api/user/profile', count: 89, time: '14:28' }, { route: '/api/work/create', count: 67, time: '14:15' }]

definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>
