<template>
  <div class="distribution-page">
    <div class="page-header"><h1>{{ $t('enterprise.distribution.index.title') }}</h1></div>

    <div v-if="loading" class="empty">{{ $t('enterprise.common.loading') }}</div>

    <template v-else>
    <!-- 概览卡片 -->
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ inviteCode }}</div><div class="stat-label">{{ $t('enterprise.distribution.index.myInviteCode') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ balance.available || '0.00' }}</div><div class="stat-label">{{ $t('enterprise.distribution.index.commissionBalance') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ team.length }}</div><div class="stat-label">{{ $t('enterprise.distribution.index.teamSize') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ balance.totalEarned || '0.00' }}</div><div class="stat-label">{{ $t('enterprise.distribution.index.totalEarnings') }}</div></div>
    </div>

    <!-- 我的团队 -->
    <div class="card">
      <h3>{{ $t('enterprise.distribution.index.myTeam') }}</h3>
      <table class="data-table" v-if="team.length">
        <thead><tr><th>{{ $t('enterprise.distribution.index.member') }}</th><th>{{ $t('enterprise.distribution.index.phone') }}</th><th>{{ $t('enterprise.distribution.index.joinTime') }}</th><th>{{ $t('enterprise.distribution.index.contributedCommission') }}</th><th>{{ $t('enterprise.distribution.index.level') }}</th></tr></thead>
        <tbody>
          <tr v-for="m in team" :key="m.id">
            <td>{{ m.nickname || m.username }}</td>
            <td>{{ m.phone || '-' }}</td>
            <td>{{ formatDateLocale(m.joined_at) }}</td>
            <td>{{ m.commission || '0.00' }}</td>
            <td>{{ m.level === 1 ? $t('enterprise.distribution.index.level1') : $t('enterprise.distribution.index.level2') }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">{{ $t('enterprise.distribution.index.noTeam') }}</p>
    </div>

    <!-- 佣金流水 -->
    <div class="card">
      <h3>{{ $t('enterprise.distribution.index.commissionLog') }}</h3>
      <table class="data-table" v-if="history.list?.length">
        <thead><tr><th>{{ $t('enterprise.distribution.index.time') }}</th><th>{{ $t('enterprise.distribution.index.type') }}</th><th>{{ $t('enterprise.distribution.index.amount') }}</th><th>{{ $t('enterprise.distribution.index.source') }}</th></tr></thead>
        <tbody>
          <tr v-for="h in history.list" :key="h.id">
            <td>{{ formatDateLocale(h.created_at) }}</td>
            <td>{{ h.type === 'commission' ? $t('enterprise.distribution.index.typeCommission') : h.type === 'withdraw' ? $t('enterprise.distribution.index.typeWithdraw') : h.type }}</td>
            <td :class="h.amount > 0 ? 'text-green' : ''">{{ h.amount > 0 ? '+' : '' }}{{ h.amount }}</td>
            <td>{{ h.source || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">{{ $t('enterprise.distribution.index.noLog') }}</p>
    </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'enterprise' });
import { formatDateLocale } from '~/utils/format';

const inviteCode = ref('');
const team = ref([]);
const balance = ref({});
const history = ref({ list: [] });
const loading = ref(true);

onMounted(async () => {
  await Promise.all([loadInviteCode(), loadTeam(), loadBalance(), loadHistory()]);
  loading.value = false;
});

async function loadInviteCode() {
  try {
    const r = await $fetch('/api/distribution/invite-code', { credentials: 'include' });
    inviteCode.value = r.data?.code || '-';
  } catch (e) { if (import.meta.dev) console.debug('loadInviteCode', e); }
}
async function loadTeam() {
  try {
    const r = await $fetch('/api/distribution/team', { credentials: 'include' });
    team.value = r.data?.list || [];
  } catch (e) { if (import.meta.dev) console.error('loadTeam:', e) }
}
async function loadBalance() {
  try {
    const r = await $fetch('/api/distribution/balance', { credentials: 'include' });
    balance.value = r.data || {};
  } catch (e) { if (import.meta.dev) console.error('loadBalance:', e) }
}
async function loadHistory() {
  try {
    const r = await $fetch('/api/distribution/history', { credentials: 'include' });
    history.value = r.data || { list: [] };
  } catch (e) { if (import.meta.dev) console.error('loadHistory:', e) }
}
</script>
