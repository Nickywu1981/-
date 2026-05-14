<!-- 财务端 — 订单流水 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('finance.orders.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('finance.orders.subtitle') }}</p>
      </div>
      <div class="page-header-actions">
        <select v-model="filter" class="select-sm">
          <option value="all">{{ $t('finance.orders.filter_all') }}</option><option value="paid">{{ $t('finance.orders.filter_paid') }}</option><option value="refund">{{ $t('finance.orders.filter_refund') }}</option>
        </select>
        <button class="btn btn-secondary btn-sm">{{ $t('finance.orders.export_btn') }}</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">1,283</div><div class="stat-card-label">{{ $t('finance.orders.stat_total_orders') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">¥68,420</div><div class="stat-card-label">{{ $t('finance.orders.stat_total_amount') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">94.2%</div><div class="stat-card-label">{{ $t('finance.orders.stat_success_rate') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">¥45</div><div class="stat-card-label">{{ $t('finance.orders.stat_avg_order') }}</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>{{ $t('finance.orders.col_order_no') }}</th><th>{{ $t('finance.orders.col_user') }}</th><th>{{ $t('finance.orders.col_product') }}</th><th>{{ $t('finance.orders.col_amount') }}</th><th>{{ $t('finance.orders.col_channel') }}</th><th>{{ $t('finance.orders.col_time') }}</th><th>{{ $t('finance.orders.col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td><code>{{ o.orderNo }}</code></td><td>{{ o.user }}</td><td>{{ o.product }}</td>
            <td>¥{{ o.amount }}</td><td>{{ o.channel }}</td><td>{{ o.time }}</td>
            <td><span class="badge" :class="o.status === 'paid' ? 'badge-success' : o.status === 'refund' ? 'badge-danger' : 'badge-warning'">{{ $t(o.statusKey) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'business-ops', middleware: ['auth'] })
const filter = ref('all')

const orders = reactive([
  { id: 1, orderNo: 'ORD20260510001', user: '张**', product: '月卡会员', amount: 29, channel: '微信支付', time: '2026-05-10 14:30', status: 'paid', statusKey: 'finance.orders.status_paid' },
  { id: 2, orderNo: 'ORD20260509002', user: '李**', product: '季卡会员', amount: 69, channel: '支付宝', time: '2026-05-09 10:15', status: 'paid', statusKey: 'finance.orders.status_paid' },
  { id: 3, orderNo: 'ORD20260508003', user: '王**', product: '挪车码', amount: 19.9, channel: '微信支付', time: '2026-05-08 09:00', status: 'refund', statusKey: 'finance.orders.status_refunded' },
])
</script>
