<!-- 财务端 — 对账管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('reconciliation.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('reconciliation.monthDiff', { amount: diff }) }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary btn-sm">{{ $t('reconciliation.export') }}</button>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-6)">
      <div class="stat-card"><div class="stat-card-value">{{ $t('reconciliation.monthIncomeAmount') }}</div><div class="stat-card-label">{{ $t('reconciliation.monthIncome') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">{{ $t('reconciliation.monthExpenseAmount') }}</div><div class="stat-card-label">{{ $t('reconciliation.monthExpense') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">98.7%</div><div class="stat-card-label">{{ $t('reconciliation.reconciliationRate') }}</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">{{ $t('reconciliation.flowTitle') }}</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr>
              <th>{{ $t('reconciliation.serialNo') }}</th>
              <th>{{ $t('reconciliation.type') }}</th>
              <th>{{ $t('reconciliation.amount') }}</th>
              <th>{{ $t('reconciliation.counterparty') }}</th>
              <th>{{ $t('reconciliation.time') }}</th>
              <th>{{ $t('reconciliation.status') }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in flows" :key="r.id">
                <td>{{ r.id }}</td><td>{{ flowTypeLabel(r.type) }}</td><td>¥{{ r.amount }}</td><td>{{ r.counterparty }}</td><td>{{ r.date }}</td>
                <td><span class="badge" :class="'badge-' + r.statusType">{{ flowStatusLabel(r.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const diff = ref('1,250.00')

const flowTypeKeys: Record<string, string> = {
  '订单收入': 'reconciliation.typeOrderIncome',
  '佣金支出': 'reconciliation.typeCommissionExpense',
  '退款': 'reconciliation.typeRefund',
}
const flowStatusKeys: Record<string, string> = {
  '已对账': 'reconciliation.statusReconciled',
  '待处理': 'reconciliation.statusPending',
}

function flowTypeLabel(ty: string) { return flowTypeKeys[ty] ? t(flowTypeKeys[ty]) : ty }
function flowStatusLabel(st: string) { return flowStatusKeys[st] ? t(flowStatusKeys[st]) : st }

const flows = [
  { id: 'L2026050801', type: '订单收入', amount: '29,980', counterparty: '杭州潮牌电商', date: '2026-05-08', status: '已对账', statusType: 'success' },
  { id: 'L2026050802', type: '佣金支出', amount: '5,996', counterparty: '代理-张代理', date: '2026-05-08', status: '已对账', statusType: 'success' },
  { id: 'L2026050901', type: '退款', amount: '1,499', counterparty: '义乌小商品城', date: '2026-05-09', status: '待处理', statusType: 'warning' },
]
definePageMeta({ layout: 'finance', middleware: ['auth'] })
</script>
