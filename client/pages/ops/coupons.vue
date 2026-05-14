<!-- 运营端 — 优惠券管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('ops.coupons_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('ops.coupons_subtitle') }}</p>
      </div>
      <button class="btn btn-gradient btn-sm">{{ $t('ops.coupons_btn_add') }}</button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">15</div><div class="stat-card-label">{{ $t('ops.coupons_stat_templates') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">4,820</div><div class="stat-card-label">{{ $t('ops.coupons_stat_issued') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">1,256</div><div class="stat-card-label">{{ $t('ops.coupons_stat_redeemed') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">26.1%</div><div class="stat-card-label">{{ $t('ops.coupons_stat_rate') }}</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>{{ $t('ops.coupons_col_name') }}</th><th>{{ $t('ops.coupons_col_type') }}</th><th>{{ $t('ops.coupons_col_value') }}</th><th>{{ $t('ops.coupons_col_issued') }}</th><th>{{ $t('ops.coupons_col_redeemed') }}</th><th>{{ $t('ops.coupons_col_rate') }}</th><th>{{ $t('ops.coupons_col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="c in coupons" :key="c.id">
            <td><strong>{{ c.name }}</strong></td><td>{{ c.type }}</td><td>¥{{ c.value }}</td>
            <td>{{ c.issued }}</td><td>{{ c.redeemed }}</td>
            <td>{{ c.rate }}%</td>
            <td><span class="badge badge-success">{{ c.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'ops', middleware: ['auth'] })

const coupons = reactive([
  { id: 1, name: '新用户专享券', type: '满减', value: 10, issued: 2400, redeemed: 720, rate: 30, status: '生效中' },
  { id: 2, name: '会员月卡折扣', type: '折扣', value: 20, issued: 1200, redeemed: 380, rate: 31.7, status: '生效中' },
  { id: 3, name: '限时免费体验', type: '免费', value: 29, issued: 500, redeemed: 156, rate: 31.2, status: '已下架' },
])
</script>
