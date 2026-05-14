<!-- 代理端 — 佣金明细 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('agent.commission.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('agent.commission.subtitle') }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary btn-sm">{{ $t('agent.commission.export_btn') }}</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-card-value">¥8,420</div>
        <div class="stat-card-label">{{ $t('agent.commission.stat_month') }}</div>
        <div class="stat-card-trend up">{{ $t('agent.commission.trend_vs_last_month') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">¥52,180</div>
        <div class="stat-card-label">{{ $t('agent.commission.stat_total') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">¥3,150</div>
        <div class="stat-card-label">{{ $t('agent.commission.stat_pending') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">¥5,270</div>
        <div class="stat-card-label">{{ $t('agent.commission.stat_withdrawn') }}</div>
      </div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>{{ $t('agent.commission.col_time') }}</th><th>{{ $t('agent.commission.col_customer') }}</th><th>{{ $t('agent.commission.col_type') }}</th><th>{{ $t('agent.commission.col_amount') }}</th><th>{{ $t('agent.commission.col_rate') }}</th><th>{{ $t('agent.commission.col_commission') }}</th><th>{{ $t('agent.commission.col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="c in commissions" :key="c.id">
            <td>{{ c.time }}</td>
            <td>{{ c.customer }}</td>
            <td>{{ c.type }}</td>
            <td>¥{{ c.amount }}</td>
            <td>{{ c.rate }}%</td>
            <td><strong>¥{{ c.commission }}</strong></td>
            <td><span class="badge" :class="c.settled ? 'badge-success' : 'badge-warning'">{{ c.settled ? $t('agent.commission.status_settled') : $t('agent.commission.status_pending') }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const commissions = reactive([
  { id: 1, time: '2026-05-10', customer: '张**', type: '会员套餐', amount: 299, rate: 30, commission: 89.7, settled: true },
  { id: 2, time: '2026-05-09', customer: '李**', type: '挪车码', amount: 19.9, rate: 20, commission: 3.98, settled: true },
  { id: 3, time: '2026-05-08', customer: '王**', type: 'AI 图片', amount: 49, rate: 30, commission: 14.7, settled: false },
])
</script>
