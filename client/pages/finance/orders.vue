<!-- 财务端 — 订单流水 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">订单流水</h1>
        <p class="page-header-subtitle">全部交易订单、支付状态、退款记录</p>
      </div>
      <div class="page-header-actions">
        <select v-model="filter" class="select-sm">
          <option value="all">全部</option><option value="paid">已支付</option><option value="refund">已退款</option>
        </select>
        <button class="btn btn-secondary btn-sm">导出</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">1,283</div><div class="stat-card-label">总订单</div></div>
      <div class="stat-card"><div class="stat-card-value">¥68,420</div><div class="stat-card-label">总金额</div></div>
      <div class="stat-card"><div class="stat-card-value">94.2%</div><div class="stat-card-label">支付成功率</div></div>
      <div class="stat-card"><div class="stat-card-value">¥45</div><div class="stat-card-label">客单价</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>订单号</th><th>用户</th><th>商品</th><th>金额</th><th>支付方式</th><th>时间</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td><code>{{ o.orderNo }}</code></td><td>{{ o.user }}</td><td>{{ o.product }}</td>
            <td>¥{{ o.amount }}</td><td>{{ o.channel }}</td><td>{{ o.time }}</td>
            <td><span class="badge" :class="o.status === 'paid' ? 'badge-success' : o.status === 'refund' ? 'badge-danger' : 'badge-warning'">{{ o.statusLabel }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'finance', middleware: ['auth'] })
const filter = ref('all')

const orders = reactive([
  { id: 1, orderNo: 'ORD20260510001', user: '张**', product: '月卡会员', amount: 29, channel: '微信支付', time: '2026-05-10 14:30', status: 'paid', statusLabel: '已支付' },
  { id: 2, orderNo: 'ORD20260509002', user: '李**', product: '季卡会员', amount: 69, channel: '支付宝', time: '2026-05-09 10:15', status: 'paid', statusLabel: '已支付' },
  { id: 3, orderNo: 'ORD20260508003', user: '王**', product: '挪车码', amount: 19.9, channel: '微信支付', time: '2026-05-08 09:00', status: 'refund', statusLabel: '已退款' },
])
</script>
