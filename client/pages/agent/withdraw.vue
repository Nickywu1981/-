<!-- 代理端 — 提现申请 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">提现申请</h1>
        <p class="page-header-subtitle">可提余额 ¥{{ balance }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showDrawer = true">+ 申请提现</button>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">提现记录</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>申请编号</th><th>金额</th><th>账户</th><th>申请时间</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="r in records" :key="r.id">
                <td>{{ r.id }}</td><td>¥{{ r.amount }}</td><td>{{ r.account }}</td><td>{{ r.date }}</td>
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
const balance = ref('48,320.00')
const showDrawer = ref(false)
const records = [
  { id: 'W20260501', amount: '12,000', account: '招商银行 6225****8891', date: '2026-05-01', status: '已到账', statusType: 'success' },
  { id: 'W20260415', amount: '8,500', account: '招商银行 6225****8891', date: '2026-04-15', status: '已到账', statusType: 'success' },
  { id: 'W20260510', amount: '15,000', account: '招商银行 6225****8891', date: '2026-05-10', status: '审核中', statusType: 'warning' },
]
definePageMeta({ layout: 'agent', middleware: ['auth'] })
</script>
