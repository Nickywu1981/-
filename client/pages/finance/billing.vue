<!-- 财务端 — 账单管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">账单管理</h1>
        <p class="page-header-subtitle">周期性账单、对账记录、结算单</p>
      </div>
      <button class="btn btn-gradient btn-sm">生成月度账单</button>
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>账单周期</th><th>总订单数</th><th>总金额</th><th>佣金支出</th><th>净收入</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="b in bills" :key="b.id">
            <td><strong>{{ b.period }}</strong></td><td>{{ b.orderCount }}</td>
            <td>¥{{ b.totalAmount.toLocaleString() }}</td><td>¥{{ b.commission.toLocaleString() }}</td>
            <td><strong>¥{{ b.netIncome.toLocaleString() }}</strong></td>
            <td><span class="badge" :class="b.settled ? 'badge-success' : 'badge-warning'">{{ b.settled ? '已结算' : '待结算' }}</span></td>
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
