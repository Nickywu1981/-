<!-- 财务端 — 发票管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('finance.invoices.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('finance.invoices.subtitle', { n: pendingCount }) }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showApply = true">{{ $t('finance.invoices.apply_btn') }}</button>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">{{ $t('finance.invoices.record_title') }}</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>{{ $t('finance.invoices.col_no') }}</th><th>{{ $t('finance.invoices.col_title') }}</th><th>{{ $t('finance.invoices.col_amount') }}</th><th>{{ $t('finance.invoices.col_type') }}</th><th>{{ $t('finance.invoices.col_date') }}</th><th>{{ $t('finance.invoices.col_status') }}</th></tr></thead>
            <tbody>
              <tr v-for="inv in invoices" :key="inv.id">
                <td>{{ inv.id }}</td><td>{{ inv.title }}</td><td>¥{{ inv.amount }}</td><td>{{ inv.invoiceType }}</td><td>{{ inv.date }}</td>
                <td><span class="badge" :class="'badge-' + inv.statusType">{{ $t(inv.statusKey) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const pendingCount = ref(2)
const showApply = ref(false)
const invoices = [
  { id: 'IV20260501001', title: '杭州潮牌电商科技有限公司', amount: '29,980', invoiceType: '增值税专用发票', date: '2026-05-08', statusKey: 'finance.invoices.status_issued', statusType: 'success' },
  { id: 'IV20260501002', title: '深圳美妆工作室', amount: '8,999', invoiceType: '增值税普通发票', date: '2026-05-07', statusKey: 'finance.invoices.status_issued', statusType: 'success' },
  { id: 'IV20260510001', title: '广州服饰批发有限公司', amount: '29,980', invoiceType: '增值税专用发票', date: '2026-05-10', statusKey: 'finance.invoices.status_pending', statusType: 'warning' },
]
definePageMeta({ layout: 'business-ops', middleware: ['auth'] })
</script>
