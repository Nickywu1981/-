<!-- 代理端 — 分销管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('agent.distribution.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('agent.distribution.subtitle') }}</p>
      </div>
      <button class="btn btn-gradient btn-sm" @click="showInvite = true">{{ $t('agent.distribution.invite_btn') }}</button>
    </div>

    <div class="stat-grid">
      <div v-for="s in stats" :key="s.labelKey" class="stat-card">
        <div class="stat-card-value">{{ s.value }}</div>
        <div class="stat-card-label">{{ $t(s.labelKey) }}</div>
      </div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>{{ $t('agent.distribution.col_name') }}</th><th>{{ $t('agent.distribution.col_level') }}</th><th>{{ $t('agent.distribution.col_rate') }}</th><th>{{ $t('agent.distribution.col_customers') }}</th><th>{{ $t('agent.distribution.col_commission') }}</th><th>{{ $t('agent.distribution.col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="a in agents" :key="a.id">
            <td><strong>{{ a.name }}</strong></td>
            <td><span class="badge" :class="'tier-' + a.level">{{ $t(a.levelKey) }}</span></td>
            <td>{{ a.rate }}%</td>
            <td>{{ a.customerCount }}</td>
            <td>¥{{ a.totalCommission.toLocaleString() }}</td>
            <td><span class="badge" :class="a.active ? 'badge-success' : 'badge-warning'">{{ a.active ? $t('agent.distribution.status_enabled') : $t('agent.distribution.status_paused') }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const stats = reactive([
  { labelKey: 'agent.distribution.stat_active', value: 12 },
  { labelKey: 'agent.distribution.stat_review', value: 3 },
  { labelKey: 'agent.distribution.stat_new_month', value: 5 },
  { labelKey: 'agent.distribution.stat_total_payout', value: '¥45,820' },
])

const agents = reactive([
  { id: 1, name: '华东代理中心', level: 1, levelKey: 'agent.distribution.level_gold', rate: 30, customerCount: 256, totalCommission: 28900, active: true },
  { id: 2, name: '华南分销站', level: 2, levelKey: 'agent.distribution.level_silver', rate: 20, customerCount: 134, totalCommission: 12400, active: true },
  { id: 3, name: '西南推广点', level: 3, levelKey: 'agent.distribution.level_bronze', rate: 10, customerCount: 67, totalCommission: 4520, active: false },
])

const showInvite = ref(false)
</script>
