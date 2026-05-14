<!-- 财务端 — 分佣明细 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('finance.commission_detail.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('finance.commission_detail.subtitle') }}</p>
      </div>
      <div class="page-header-actions">
        <select v-model="month" class="select-sm">
          <option value="2026-05">2026-05</option><option value="2026-04">2026-04</option><option value="2026-03">2026-03</option>
        </select>
        <button class="btn btn-secondary btn-sm">{{ $t('finance.commission_detail.batch_pay_btn') }}</button>
      </div>
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>{{ $t('finance.commission_detail.col_agent') }}</th><th>{{ $t('finance.commission_detail.col_level') }}</th><th>{{ $t('finance.commission_detail.col_orders') }}</th><th>{{ $t('finance.commission_detail.col_revenue') }}</th><th>{{ $t('finance.commission_detail.col_rate') }}</th><th>{{ $t('finance.commission_detail.col_commission') }}</th><th>{{ $t('finance.commission_detail.col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="d in details" :key="d.id">
            <td>{{ d.agent }}</td><td>{{ d.level }}</td><td>{{ d.orders }}</td>
            <td>¥{{ d.revenue.toLocaleString() }}</td><td>{{ d.rate }}%</td>
            <td><strong>¥{{ d.commission.toLocaleString() }}</strong></td>
            <td><span class="badge" :class="d.paid ? 'badge-success' : 'badge-warning'">{{ d.paid ? $t('finance.commission_detail.status_paid') : $t('finance.commission_detail.status_pending') }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'business-ops', middleware: ['auth'] })
const month = ref('2026-05')

const details = reactive([
  { id: 1, agent: '华东代理中心', level: '金牌', orders: 156, revenue: 12480, rate: 30, commission: 3744, paid: true },
  { id: 2, agent: '华南分销站', level: '银牌', orders: 89, revenue: 5340, rate: 20, commission: 1068, paid: false },
])
</script>
