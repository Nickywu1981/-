<!-- 网关端 — 配额管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('gateway.quota_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('gateway.quota_subtitle', { n: totalQuota }) }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showAllocate = true">{{ $t('gateway.quota_btn_allocate') }}</button>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-6)">
      <div class="stat-card"><div class="stat-card-value">12M</div><div class="stat-card-label">{{ $t('gateway.quota_stat_total') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">3.2M</div><div class="stat-card-label">{{ $t('gateway.quota_stat_used') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">26.7%</div><div class="stat-card-label">{{ $t('gateway.quota_stat_rate') }}</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">{{ $t('gateway.quota_chart_title') }}</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>{{ $t('gateway.quota_col_tenant') }}</th><th>{{ $t('gateway.quota_col_quota') }}</th><th>{{ $t('gateway.quota_col_used') }}</th><th>{{ $t('gateway.quota_col_rate') }}</th><th>{{ $t('gateway.quota_col_expiry') }}</th><th>{{ $t('gateway.quota_col_status') }}</th></tr></thead>
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
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>
