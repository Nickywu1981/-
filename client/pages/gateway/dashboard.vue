<!-- 网关中台仪表盘 -->
<template>
  <div class="pg">
    <PageHeader title="网关看板" subtitle="API 网关运行状态实时监控" />

    <div class="stat-grid">
      <StatsCard v-for="kpi in kpis" :key="kpi.key" :value="kpi.value" :label="kpi.label" />
    </div>

    <div class="dashboard-grid" style="margin-top: var(--space-6)">
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">QPS 流量</span></div>
        <div class="chart-card-body" style="min-height: 220px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">📈 QPS 时序图 — 待接入</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">响应时间分布</span></div>
        <div class="chart-card-body" style="min-height: 220px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);">📊 延迟分布图 — 待接入</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">上游服务健康度</span></div>
        <div class="chart-card-body">
          <div v-for="s in services" :key="s.name" style="display:flex;align-items:center;gap:8px;padding:6px 0;">
            <span :style="{width:8,height:8,borderRadius:'50%',background:s.healthy?'var(--color-success-500)':'var(--color-danger-500)',flexShrink:0}" />
            <span style="flex:1;font-size:13px;">{{ s.name }}</span>
            <span class="badge" :class="s.healthy ? 'badge-success' : 'badge-danger'">{{ s.healthy ? '正常' : '异常' }}</span>
            <span style="font-size:12px;color:var(--text-tertiary);">{{ s.latency }}ms</span>
          </div>
        </div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">限流触发记录</span></div>
        <div class="chart-card-body">
          <div v-for="r in rateLimits" :key="r.time" style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;">
            <span>{{ r.route }}</span><span style="color:var(--color-warning-500);">{{ r.count }}次</span><span style="color:var(--text-tertiary);font-size:12px;">{{ r.time }}</span>
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
  { key: 'qps', value: '18,420', label: '当前 QPS' },
  { key: 'latency', value: '42ms', label: '平均延迟' },
  { key: 'routes', value: '56', label: '活跃路由' },
  { key: 'health', value: '99.97%', label: '网关可用率' },
]

const services = [
  { name: '用户服务 (user-svc)', healthy: true, latency: 12 },
  { name: '订单服务 (order-svc)', healthy: true, latency: 28 },
  { name: 'AI 推理服务 (ai-svc)', healthy: true, latency: 156 },
  { name: '支付服务 (pay-svc)', healthy: true, latency: 18 },
  { name: '通知服务 (notify-svc)', healthy: false, latency: 0 },
]
const rateLimits = [{ route: '/api/ai/generate', count: 245, time: '14:32' }, { route: '/api/user/profile', count: 89, time: '14:28' }, { route: '/api/work/create', count: 67, time: '14:15' }]

definePageMeta({ layout: 'gateway' })
</script>
