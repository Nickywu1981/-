<!-- 网关端 — 配额管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">配额管理</h1>
        <p class="page-header-subtitle">总分配 {{ totalQuota }} Token</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showAllocate = true">+ 分配配额</button>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-6)">
      <div class="stat-card"><div class="stat-card-value">12M</div><div class="stat-card-label">总配额</div></div>
      <div class="stat-card"><div class="stat-card-value">3.2M</div><div class="stat-card-label">已使用</div></div>
      <div class="stat-card"><div class="stat-card-value">26.7%</div><div class="stat-card-label">使用率</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">租户配额</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>租户</th><th>配额</th><th>已用</th><th>使用率</th><th>到期日</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="q in quotas" :key="q.tenant">
                <td>{{ q.tenant }}</td><td>{{ q.quota }}</td><td>{{ q.used }}</td>
                <td><div style="display:flex;align-items:center;gap:8px"><div class="progress-bar" style="flex:1"><div class="progress-fill" :style="{width:q.pct}"></div></div>{{ q.pct }}</div></td>
                <td>{{ q.expiry }}</td>
                <td><span class="badge" :class="'badge-' + q.statusType">{{ q.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const totalQuota = ref('12,000,000')
const showAllocate = ref(false)
const quotas = [
  { tenant: '杭州潮牌电商', quota: '5M', used: '1.8M', pct: '36%', expiry: '2027-05-01', status: '正常', statusType: 'success' },
  { tenant: '深圳美妆工作室', quota: '2M', used: '0.6M', pct: '30%', expiry: '2027-03-15', status: '正常', statusType: 'success' },
  { tenant: '广州服饰批发', quota: '3M', used: '2.5M', pct: '83%', expiry: '2026-12-01', status: '配额不足', statusType: 'danger' },
]
definePageMeta({ layout: 'gateway', middleware: ['auth'] })
</script>
