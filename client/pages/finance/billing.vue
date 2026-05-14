<!-- 财务端 — 账单管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('finance.billing.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('finance.billing.subtitle') }}</p>
      </div>
      <button class="btn btn-gradient btn-sm">{{ $t('finance.billing.generate_btn') }}</button>
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>{{ $t('finance.billing.col_period') }}</th><th>{{ $t('finance.billing.col_orders') }}</th><th>{{ $t('finance.billing.col_amount') }}</th><th>{{ $t('finance.billing.col_commission') }}</th><th>{{ $t('finance.billing.col_net') }}</th><th>{{ $t('finance.billing.col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="b in bills" :key="b.id">
            <td><strong>{{ b.period }}</strong></td><td>{{ b.orderCount }}</td>
            <td>¥{{ b.totalAmount.toLocaleString() }}</td><td>¥{{ b.commission.toLocaleString() }}</td>
            <td><strong>¥{{ b.netIncome.toLocaleString() }}</strong></td>
            <td><span class="badge" :class="b.settled ? 'badge-success' : 'badge-warning'">{{ b.settled ? $t('finance.billing.status_settled') : $t('finance.billing.status_pending') }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'finance', middleware: ['auth'] })

const bills = reactive([
  { id: 1, period: '2026-04', orderCount: 412, totalAmount: 23450, commission: 3520, netIncome: 19930, settled: true },
  { id: 2, period: '2026-03', orderCount: 389, totalAmount: 21890, commission: 3280, netIncome: 18610, settled: true },
  { id: 3, period: '2026-05', orderCount: 482, totalAmount: 28080, commission: 4210, netIncome: 23870, settled: false },
])
</script>
