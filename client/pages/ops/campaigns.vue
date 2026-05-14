<!-- 运营端 — 营销活动 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('ops.campaigns_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('ops.campaigns_subtitle') }}</p>
      </div>
      <button class="btn btn-gradient btn-sm">{{ $t('ops.campaigns_btn_add') }}</button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">8</div><div class="stat-card-label">{{ $t('ops.campaigns_stat_active') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">3,240</div><div class="stat-card-label">{{ $t('ops.campaigns_stat_participants') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">¥12,580</div><div class="stat-card-label">{{ $t('ops.campaigns_stat_revenue') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">16.8%</div><div class="stat-card-label">{{ $t('ops.campaigns_stat_avg_rate') }}</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>{{ $t('ops.campaigns_col_name') }}</th><th>{{ $t('ops.campaigns_col_type') }}</th><th>{{ $t('ops.campaigns_col_start') }}</th><th>{{ $t('ops.campaigns_col_end') }}</th><th>{{ $t('ops.campaigns_col_participants') }}</th><th>{{ $t('ops.campaigns_col_revenue') }}</th><th>{{ $t('ops.campaigns_col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="c in campaigns" :key="c.id">
            <td><strong>{{ c.name }}</strong></td><td>{{ c.type }}</td><td>{{ c.start }}</td><td>{{ c.end }}</td>
            <td>{{ c.participants }}</td><td>¥{{ c.revenue.toLocaleString() }}</td>
            <td><span class="badge" :class="c.active ? 'badge-success' : 'badge-secondary'">{{ c.active ? $t('ops.campaigns_status_active') : $t('ops.campaigns_status_ended') }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'business-ops', middleware: ['auth'] })

const campaigns = reactive([
  { id: 1, name: '五一会员特惠', type: '促销', start: '2026-05-01', end: '2026-05-15', participants: 1240, revenue: 5800, active: true },
  { id: 2, name: '推荐有礼', type: '裂变拉新', start: '2026-04-15', end: '2026-06-15', participants: 820, revenue: 3420, active: true },
  { id: 3, name: '新春优惠券', type: '优惠券', start: '2026-01-20', end: '2026-02-28', participants: 1180, revenue: 3360, active: false },
])
</script>
