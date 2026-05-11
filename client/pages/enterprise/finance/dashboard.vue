<!-- 企业端 — 财务看板（统一设计系统 v3.0） -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">财务看板</h1>
        <p class="page-header-subtitle">企业财务数据总览</p>
      </div>
      <div class="page-header-actions">
        <NuxtLink to="/enterprise/finance/ledger" class="btn btn-sm btn-secondary">账户流水</NuxtLink>
        <NuxtLink to="/enterprise/finance/bank-accounts" class="btn btn-sm btn-gradient">收款账户</NuxtLink>
      </div>
    </div>

    <!-- ═══ 加载 / 错误 ═══ -->
    <div v-if="loading" class="empty-state">
      <div class="spinner" style="width:32px;height:32px;border:3px solid var(--border-light);border-top-color:var(--color-brand-600);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div class="empty-state-title" style="margin-top:16px;">加载中...</div>
    </div>
    <div v-else-if="loadError" class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">财务数据加载失败</div>
      <div class="empty-state-desc">{{ loadError }}</div>
      <button class="btn btn-primary btn-sm" style="margin-top:16px;" @click="loadData">重试</button>
    </div>

    <template v-else>
      <!-- ═══ KPI 统计卡片 ═══ -->
      <div class="stat-grid" style="margin-bottom: var(--space-6);">
        <div class="stat-card">
          <div class="stat-card-label">账户余额</div>
          <div class="stat-card-value" style="color: var(--color-brand-600);">¥{{ fmt(dashboard.balance) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">累计收入</div>
          <div class="stat-card-value">¥{{ fmt(dashboard.totalRevenue) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">近 30 天收入</div>
          <div class="stat-card-value">¥{{ fmt(dashboard.monthRevenue) }}</div>
        </div>
        <div v-if="isAgent" class="stat-card">
          <div class="stat-card-label">累计提现</div>
          <div class="stat-card-value">¥{{ fmt(dashboard.totalWithdrawn) }}</div>
        </div>
      </div>

      <!-- ═══ 佣金概览（代理端） ═══ -->
      <div v-if="isAgent && dashboard.earnings" class="card" style="margin-bottom: var(--space-5);">
        <h2 style="font-size:var(--text-lg);font-weight:var(--font-medium);margin:0 0 16px;">佣金概览</h2>
        <div class="stat-grid">
          <div style="text-align:center">
            <div class="stat-card-label">累计佣金</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--text-primary);">¥{{ fmt(dashboard.earnings.totalEarnings) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">已结算</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--color-success-500);">¥{{ fmt(dashboard.earnings.settled) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">待结算</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--color-warning-500);">¥{{ fmt(dashboard.earnings.pending) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">已提现</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--text-primary);">¥{{ fmt(dashboard.earnings.withdrawn) }}</div>
          </div>
          <div style="text-align:center">
            <div class="stat-card-label">待审核提现</div>
            <div style="font-size:var(--text-2xl);font-weight:var(--font-semibold);color:var(--color-info-500);">¥{{ fmt(dashboard.pendingWithdrawal) }}</div>
          </div>
        </div>
      </div>

      <!-- ═══ 快捷入口 ═══ -->
      <div class="card">
        <h2 style="font-size:var(--text-lg);font-weight:var(--font-medium);margin:0 0 16px;">快捷操作</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-3);">
          <NuxtLink to="/enterprise/finance/ledger" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">📋 账户流水</NuxtLink>
          <NuxtLink to="/enterprise/finance/settlement" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">📊 结算记录</NuxtLink>
          <NuxtLink v-if="isAgent" to="/enterprise/finance/earnings" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">💰 佣金收益</NuxtLink>
          <NuxtLink v-if="isAgent" to="/enterprise/finance/withdrawal" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">🏦 提现管理</NuxtLink>
          <NuxtLink to="/enterprise/finance/bank-accounts" class="btn btn-secondary" style="height:48px;justify-content:flex-start;padding:0 16px;">💳 收款账户</NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
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
  } catch (e: any) {
    loadError.value = e?.message || '请求失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())

function fmt(n: number | string) {
  return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

definePageMeta({ layout: 'enterprise' })
</script>
