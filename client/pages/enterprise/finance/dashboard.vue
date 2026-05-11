<template>
  <div class="finance-dashboard">
    <h1 class="page-title">财务总览</h1>

    <div v-if="loading" class="loading-spin">加载中...</div>
    <div v-else-if="loadError" class="error-msg">{{ loadError }} <button class="btn-text" @click="loadData">重试</button></div>
    <div v-else>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">账户余额</div>
        <div class="stat-value highlight">¥{{ fmt(dashboard.balance) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">累计收入</div>
        <div class="stat-value">¥{{ fmt(dashboard.totalRevenue) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">近30天收入</div>
        <div class="stat-value">¥{{ fmt(dashboard.monthRevenue) }}</div>
      </div>
      <div class="stat-card" v-if="isAgent">
        <div class="stat-label">累计提现</div>
        <div class="stat-value">¥{{ fmt(dashboard.totalWithdrawn) }}</div>
      </div>
    </div>

    <!-- 代理端专有: 佣金概览 -->
    <div class="section" v-if="isAgent && dashboard.earnings">
      <h2>佣金概览</h2>
      <div class="commission-grid">
        <div class="comm-item"><span class="label">累计佣金</span><strong>¥{{ fmt(dashboard.earnings.totalEarnings) }}</strong></div>
        <div class="comm-item"><span class="label">已结算</span><strong class="green">¥{{ fmt(dashboard.earnings.settled) }}</strong></div>
        <div class="comm-item"><span class="label">待结算</span><strong class="orange">¥{{ fmt(dashboard.earnings.pending) }}</strong></div>
        <div class="comm-item"><span class="label">已提现</span><strong>¥{{ fmt(dashboard.earnings.withdrawn) }}</strong></div>
        <div class="comm-item"><span class="label">待审核提现</span><strong class="blue">¥{{ fmt(dashboard.pendingWithdrawal) }}</strong></div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="section">
      <h2>快捷操作</h2>
      <div class="quick-actions">
        <NuxtLink to="/enterprise/finance/ledger" class="action-card">
          <span class="icon">📋</span> 账户流水
        </NuxtLink>
        <NuxtLink to="/enterprise/finance/settlement" class="action-card">
          <span class="icon">📊</span> 结算记录
        </NuxtLink>
        <NuxtLink v-if="isAgent" to="/enterprise/finance/earnings" class="action-card">
          <span class="icon">💰</span> 佣金收益
        </NuxtLink>
        <NuxtLink v-if="isAgent" to="/enterprise/finance/withdrawal" class="action-card">
          <span class="icon">🏦</span> 提现管理
        </NuxtLink>
        <NuxtLink to="/enterprise/finance/bank-accounts" class="action-card">
          <span class="icon">💳</span> 收款账户
        </NuxtLink>
      </div>
    </div>
  </div>

<script setup>
import { ref, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';
const api = useApi();
const toast = useToast();

const loading = ref(true);
const loadError = ref('');
const dashboard = ref({ balance: 0, totalRevenue: 0, monthRevenue: 0, totalWithdrawn: 0 });
const isAgent = ref(false);

async function loadData() {
  loading.value = true; loadError.value = '';
  try {
    const data = await api.get('/enterprise/finance/dashboard');
    dashboard.value = data;
    isAgent.value = !!data.earnings;
  } catch (e) { loadError.value = '财务数据加载失败，请刷新重试'; }
  finally { loading.value = false; }
}

onMounted(() => loadData());

function fmt(n) { return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }); }

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 24px; color: #1a1a2e; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.stat-value { font-size: 26px; font-weight: 700; color: #1a1a2e; }
.stat-value.highlight { color: #667eea; }

.section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.section h2 { font-size: 16px; margin: 0 0 16px; color: #333; }

.commission-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
.comm-item { text-align: center; }
.comm-item .label { display: block; font-size: 13px; color: #888; margin-bottom: 6px; }
.comm-item strong { font-size: 20px; }
.comm-item .green { color: #27ae60; }
.comm-item .orange { color: #f39c12; }
.comm-item .blue { color: #1a73e8; }

.quick-actions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.action-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: #f8f9fb; border-radius: 12px; text-decoration: none; color: #333; transition: all 0.2s; }
.action-card:hover { background: #eef0ff; color: #667eea; }
.action-card .icon { font-size: 28px; }
</style>
