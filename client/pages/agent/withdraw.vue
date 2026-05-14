<!-- 代理端 — 提现申请 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('agent.withdraw.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('agent.withdraw.subtitle', { balance }) }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showDrawer = true">{{ $t('agent.withdraw.apply_btn') }}</button>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">{{ $t('agent.withdraw.record_title') }}</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>{{ $t('agent.withdraw.col_id') }}</th><th>{{ $t('agent.withdraw.col_amount') }}</th><th>{{ $t('agent.withdraw.col_account') }}</th><th>{{ $t('agent.withdraw.col_date') }}</th><th>{{ $t('agent.withdraw.col_status') }}</th></tr></thead>
            <tbody>
              <tr v-for="r in records" :key="r.id">
                <td>{{ r.id }}</td><td>¥{{ r.amount }}</td><td>{{ r.account }}</td><td>{{ r.date }}</td>
                <td><span class="badge" :class="'badge-' + r.statusType">{{ $t(r.statusKey) }}</span></td>
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
  { id: 'W20260501', amount: '12,000', account: '招商银行 6225****8891', date: '2026-05-01', statusType: 'success', statusKey: 'agent.withdraw.status_arrived' },
  { id: 'W20260415', amount: '8,500', account: '招商银行 6225****8891', date: '2026-04-15', statusType: 'success', statusKey: 'agent.withdraw.status_arrived' },
  { id: 'W20260510', amount: '15,000', account: '招商银行 6225****8891', date: '2026-05-10', statusType: 'warning', statusKey: 'agent.withdraw.status_reviewing' },
]
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
