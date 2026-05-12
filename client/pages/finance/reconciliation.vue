<!-- 财务端 — 对账管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">收支对账</h1>
        <p class="page-header-subtitle">本月差额 ¥{{ diff }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary btn-sm">导出对账单</button>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-6)">
      <div class="stat-card"><div class="stat-card-value">¥458,920</div><div class="stat-card-label">本月收入</div></div>
      <div class="stat-card"><div class="stat-card-value">¥312,450</div><div class="stat-card-label">本月支出</div></div>
      <div class="stat-card"><div class="stat-card-value">98.7%</div><div class="stat-card-label">对账率</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">对账流水</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>流水号</th><th>类型</th><th>金额</th><th>对方</th><th>时间</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="r in flows" :key="r.id">
                <td>{{ r.id }}</td><td>{{ r.type }}</td><td>¥{{ r.amount }}</td><td>{{ r.counterparty }}</td><td>{{ r.date }}</td>
                <td><span class="badge" :class="'badge-' + r.statusType">{{ r.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const diff = ref('1,250.00')
const flows = [
  { id: 'L2026050801', type: '订单收入', amount: '29,980', counterparty: '杭州潮牌电商', date: '2026-05-08', status: '已对账', statusType: 'success' },
  { id: 'L2026050802', type: '佣金支出', amount: '5,996', counterparty: '代理-张代理', date: '2026-05-08', status: '已对账', statusType: 'success' },
  { id: 'L2026050901', type: '退款', amount: '1,499', counterparty: '义乌小商品城', date: '2026-05-09', status: '待处理', statusType: 'warning' },
]
definePageMeta({ layout: 'finance', middleware: ['auth'] })
</script>
