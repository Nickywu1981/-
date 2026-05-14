<!-- 代理端 — 团队管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('agent.team.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('agent.team.subtitle', { n: members.length }) }}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showInvite = true">{{ $t('agent.team.invite_btn') }}</button>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">{{ $t('agent.team.member_title') }}</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>{{ $t('agent.team.col_member') }}</th><th>{{ $t('agent.team.col_role') }}</th><th>{{ $t('agent.team.col_customers') }}</th><th>{{ $t('agent.team.col_commission') }}</th><th>{{ $t('agent.team.col_joined') }}</th><th>{{ $t('agent.team.col_status') }}</th></tr></thead>
            <tbody>
              <tr v-for="m in members" :key="m.name">
                <td><strong>{{ m.name }}</strong><br><small style="color:var(--text-tertiary)">{{ m.email }}</small></td>
                <td>{{ $t(m.roleKey) }}</td><td>{{ m.customers }}</td><td>¥{{ m.commission }}</td><td>{{ m.joined }}</td>
                <td><span class="badge" :class="'badge-' + m.statusType">{{ $t(m.statusKey) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const showInvite = ref(false)
const members = [
  { name: '李明', email: 'liming@example.com', roleKey: 'agent.team.role_channel_mgr', customers: 128, commission: '48,200', joined: '2024-09-01', statusKey: 'agent.team.status_active', statusType: 'success' },
  { name: '王芳', email: 'wangfang@example.com', roleKey: 'agent.team.role_sales_rep', customers: 56, commission: '18,900', joined: '2025-02-15', statusKey: 'agent.team.status_active', statusType: 'success' },
  { name: '赵强', email: 'zhaoqiang@example.com', roleKey: 'agent.team.role_sales_rep', customers: 32, commission: '9,100', joined: '2025-11-01', statusKey: 'agent.team.status_paused', statusType: 'warning' },
]
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>
