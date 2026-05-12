<!-- 代理端 — 佣金明细 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">佣金明细</h1>
        <p class="page-header-subtitle">实时分润明细、历史收益趋势</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary btn-sm">导出报表</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-value">¥8,420</div>
        <div class="stat-card-label">本月佣金</div>
        <div class="stat-card-trend up">↑ 12% vs 上月</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">¥52,180</div>
        <div class="stat-card-label">累计佣金</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">¥3,150</div>
        <div class="stat-card-label">待结算</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">¥5,270</div>
        <div class="stat-card-label">已提现</div>
      </div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>时间</th><th>来源客户</th><th>业务类型</th><th>订单金额</th><th>分润比例</th><th>佣金</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="c in commissions" :key="c.id">
            <td>{{ c.time }}</td>
            <td>{{ c.customer }}</td>
            <td>{{ c.type }}</td>
            <td>¥{{ c.amount }}</td>
            <td>{{ c.rate }}%</td>
            <td><strong>¥{{ c.commission }}</strong></td>
            <td><span class="badge" :class="c.settled ? 'badge-success' : 'badge-warning'">{{ c.settled ? '已结算' : '待结算' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'agent', middleware: ['auth'] })

const commissions = reactive([
  { id: 1, time: '2026-05-10', customer: '张**', type: '会员套餐', amount: 299, rate: 30, commission: 89.7, settled: true },
  { id: 2, time: '2026-05-09', customer: '李**', type: '挪车码', amount: 19.9, rate: 20, commission: 3.98, settled: true },
  { id: 3, time: '2026-05-08', customer: '王**', type: 'AI 图片', amount: 49, rate: 30, commission: 14.7, settled: false },
])
</script>
