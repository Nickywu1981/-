<!-- 企业端 — 财务看板（统一设计系统 v3.0） -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('enterprise.finance.dashboard.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('enterprise.finance.dashboard.subtitle') }}</p>
      </div>
      <div class="page-header-actions">
        <NuxtLink to="/enterprise/finance/ledger" class="btn btn-sm btn-secondary">{{ $t('enterprise.finance.dashboard.ledgerLink') }}</NuxtLink>
        <NuxtLink to="/enterprise/finance/bank-accounts" class="btn btn-sm btn-gradient">{{ $t('enterprise.finance.dashboard.bankLink') }}</NuxtLink>
      </div>
    </div>

    <!-- ═══ 加载 / 错误 ═══ -->
    <div v-if="loading" class="empty-state">
      <div class="spinner" style="width:32px;height:32px;border:3px solid var(--border-light);border-top-color:var(--color-brand-600);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div class="empty-state-title" style="margin-top:16px;">{{ $t('enterprise.common.loading') }}</div>
    </div>
    <div v-else-if="loadError" class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">{{ $t('enterprise.finance.dashboard.loadError') }}</div>
      <div class="empty-state-desc">{{ loadError }}</div>
      <button class="btn btn-primary btn-sm" style="margin-top:16px;" @click="loadData">{{ $t('enterprise.common.retry') }}</button>
    </div>

    <template v-else>
      <!-- ═══ KPI 统计卡片 ═══ -->
      <div class="stat-grid" style="margin-bottom: var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.accountBalance') }}</div>
          <div class="stat-card-value" style="color: var(--color-brand-600);">¥{{ fmtMoney(dashboard.balance) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.totalRevenue') }}</div>
          <div class="stat-card-value">¥{{ fmtMoney(dashboard.totalRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.revenue30d') }}</div>
          <div class="stat-card-value">¥{{ fmtMoney(dashboard.monthRevenue) }}</div>
        </div>
        <div v-if="isAgent" class="stat-card">
          <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.totalWithdrawal') }}</div>
          <div class="stat-card-value">¥{{ fmtMoney(dashboard.totalWithdrawn) }}</div>
        </div>
      </div>

      <!-- ═══ 佣金概览（代理端） ═══ -->
      <div v-if="isAgent && dashboard.earnings" class="card" style="margin-bottom: var(--space-5);">
        <h2 style="font-size:var(--text-lg);font-weight:var(--font-medium);margin:0 0 16px;">{{ $t('enterprise.finance.dashboard.commissionOverview') }}</h2>
        <div class="stat-grid">
          <div style="text-align:center">
            <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.totalCommission') }}</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--text-primary);">¥{{ fmtMoney(dashboard.earnings.totalEarnings) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.settled') }}</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--color-success-500);">¥{{ fmtMoney(dashboard.earnings.settled) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.pendingSettle') }}</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--color-warning-500);">¥{{ fmtMoney(dashboard.earnings.pending) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.withdrawn') }}</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--text-primary);">¥{{ fmtMoney(dashboard.earnings.withdrawn) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">{{ $t('enterprise.finance.dashboard.pendingReview') }}</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--color-info-500);">¥{{ fmtMoney(dashboard.pendingWithdrawal) }}</div>
          </div>
        </div>
      </div>

      <!-- ═══ 快捷入口 ═══ -->
      <div class="card">
        <h2 style="font-size:var(--text-lg);font-weight:var(--font-medium);margin:0 0 16px;">{{ $t('enterprise.finance.dashboard.quickActions') }}</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-3);">
          <NuxtLink to="/enterprise/finance/ledger" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">📋 {{ $t('enterprise.finance.dashboard.ledgerLink') }}</NuxtLink>
          <NuxtLink to="/enterprise/finance/settlement" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">📊 {{ $t('enterprise.finance.dashboard.settlementLink') }}</NuxtLink>
          <NuxtLink v-if="isAgent" to="/enterprise/finance/earnings" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">💰 {{ $t('enterprise.finance.dashboard.earningsLink') }}</NuxtLink>
          <NuxtLink v-if="isAgent" to="/enterprise/finance/withdrawal" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">🏦 {{ $t('enterprise.finance.dashboard.withdrawalLink') }}</NuxtLink>
          <NuxtLink to="/enterprise/finance/bank-accounts" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">💳 {{ $t('enterprise.finance.dashboard.bankLink') }}</NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { fmtMoney } from '~/utils/format';
const { t } = useI18n()
const loading = ref(true)
const loadError = ref('')
const dashboard = ref({ balance: 0, totalRevenue: 0, monthRevenue: 0, totalWithdrawn: 0 })
const isAgent = ref(false)

async function loadData() {
  loading.value = true; loadError.value = ''
  try {
    const data = await $fetch('/api/enterprise/finance/dashboard')
    dashboard.value = data as any
    isAgent.value = !!(data as any).earnings
  } catch (e: unknown) {
    loadError.value = e?.message || t('enterprise.finance.dashboard.requestFailed')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())

definePageMeta({ layout: 'user-workspace' })
</script>
