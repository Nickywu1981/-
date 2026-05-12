<!-- 财务端 — 分佣明细 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">分佣明细</h1>
        <p class="page-header-subtitle">代理分佣记录、打款状态</p>
      </div>
      <div class="page-header-actions">
        <select v-model="month" class="select-sm">
          <option value="2026-05">2026-05</option><option value="2026-04">2026-04</option><option value="2026-03">2026-03</option>
        </select>
        <button class="btn btn-secondary btn-sm">批量打款</button>
      </div>
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>代理</th><th>等级</th><th>订单数</th><th>业绩金额</th><th>分润比例</th><th>佣金</th><th>打款状态</th></tr></thead>
        <tbody>
          <tr v-for="d in details" :key="d.id">
            <td>{{ d.agent }}</td><td>{{ d.level }}</td><td>{{ d.orders }}</td>
            <td>¥{{ d.revenue.toLocaleString() }}</td><td>{{ d.rate }}%</td>
            <td><strong>¥{{ d.commission.toLocaleString() }}</strong></td>
            <td><span class="badge" :class="d.paid ? 'badge-success' : 'badge-warning'">{{ d.paid ? '已打款' : '待打款' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'finance', middleware: ['auth'] })
const month = ref('2026-05')

const details = reactive([
  { id: 1, agent: '华东代理中心', level: '金牌', orders: 156, revenue: 12480, rate: 30, commission: 3744, paid: true },
  { id: 2, agent: '华南分销站', level: '银牌', orders: 89, revenue: 5340, rate: 20, commission: 1068, paid: false },
])
</script>
