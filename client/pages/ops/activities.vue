<!-- 运营端 — 活动管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('ops.activities_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('ops.activities_subtitle', { n: activeCampaigns }) }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showCreate = true">{{ $t('ops.activities_btn_add') }}</button>
      </div>
    </div>

    <div class="dashboard-grid" style="margin-top:var(--space-6)">
      <div v-for="c in campaigns" :key="c.id" class="chart-card col-4">
        <div class="chart-card-header">
          <span class="chart-card-title">{{ c.name }}</span>
          <span class="badge" :class="'badge-' + c.statusType">{{ c.status }}</span>
        </div>
        <div class="chart-card-body">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <div><small style="color:var(--text-tertiary)">{{ $t('ops.activities_label_participants') }}</small><br><strong>{{ c.participants }}</strong></div>
            <div><small style="color:var(--text-tertiary)">{{ $t('ops.activities_label_conversion') }}</small><br><strong>{{ c.conversion }}</strong></div>
            <div><small style="color:var(--text-tertiary)">{{ $t('ops.activities_label_new_customers') }}</small><br><strong>{{ c.newCustomers }}</strong></div>
          </div>
          <div class="progress-bar"><div class="progress-fill" :style="{width:c.progress}"></div></div>
          <small style="color:var(--text-tertiary)">{{ c.dateRange }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const showCreate = ref(false)
const activeCampaigns = ref(3)
const campaigns = [
  { id: 1, name: '五一电商节拉新活动', participants: '2,480', conversion: '18.5%', newCustomers: '458', progress: '75%', dateRange: '2026-05-01 ~ 2026-05-15', status: '进行中', statusType: 'success' },
  { id: 2, name: '推荐返佣双倍季', participants: '1,850', conversion: '22.3%', newCustomers: '412', progress: '60%', dateRange: '2026-04-15 ~ 2026-06-15', status: '进行中', statusType: 'success' },
  { id: 3, name: '新用户首单立减', participants: '980', conversion: '15.8%', newCustomers: '155', progress: '40%', dateRange: '2026-05-01 ~ 2026-05-31', status: '已结束', statusType: 'neutral' },
]
definePageMeta({ layout: 'business-ops', middleware: ['auth'] })
</script>
