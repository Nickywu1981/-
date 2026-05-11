<template>
  <div class="distribution-page">
    <div class="page-header"><h1>推广分销</h1></div>

    <div v-if="loading" class="empty">加载中...</div>

    <template v-else>
    <!-- 概览卡片 -->
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ inviteCode }}</div><div class="stat-label">我的邀请码</div></div>
      <div class="stat-card"><div class="stat-num">{{ balance.available || '0.00' }}</div><div class="stat-label">佣金余额 (元)</div></div>
      <div class="stat-card"><div class="stat-num">{{ team.length }}</div><div class="stat-label">团队人数</div></div>
      <div class="stat-card"><div class="stat-num">{{ balance.totalEarned || '0.00' }}</div><div class="stat-label">累计收益 (元)</div></div>
    </div>

    <!-- 我的团队 -->
    <div class="card">
      <h3>我的团队</h3>
      <table class="data-table" v-if="team.length">
        <thead><tr><th>成员</th><th>手机号</th><th>加入时间</th><th>贡献佣金</th><th>层级</th></tr></thead>
        <tbody>
          <tr v-for="m in team" :key="m.id">
            <td>{{ m.nickname || m.username }}</td>
            <td>{{ m.phone || '-' }}</td>
            <td>{{ formatDate(m.joined_at) }}</td>
            <td>{{ m.commission || '0.00' }}</td>
            <td>{{ m.level === 1 ? '一级' : '二级' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无团队成员，快去推广吧！</p>
    </div>

    <!-- 佣金流水 -->
    <div class="card">
      <h3>佣金流水</h3>
      <table class="data-table" v-if="history.list?.length">
        <thead><tr><th>时间</th><th>类型</th><th>金额</th><th>来源</th></tr></thead>
        <tbody>
          <tr v-for="h in history.list" :key="h.id">
            <td>{{ formatDate(h.created_at) }}</td>
            <td>{{ h.type === 'commission' ? '分销佣金' : h.type === 'withdraw' ? '提现' : h.type }}</td>
            <td :class="h.amount > 0 ? 'text-green' : ''">{{ h.amount > 0 ? '+' : '' }}{{ h.amount }}</td>
            <td>{{ h.source || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无佣金流水</p>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

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
  } catch (e) { console.debug('loadInviteCode', e); }
}
async function loadTeam() {
  try {
    const r = await $fetch('/api/distribution/team', { credentials: 'include' });
    team.value = r.data?.list || [];
  } catch (e) { /* ignore */ }
}
async function loadBalance() {
  try {
    const r = await $fetch('/api/distribution/balance', { credentials: 'include' });
    balance.value = r.data || {};
  } catch (e) { /* ignore */ }
}
async function loadHistory() {
  try {
    const r = await $fetch('/api/distribution/history', { credentials: 'include' });
    history.value = r.data || { list: [] };
  } catch (e) { /* ignore */ }
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
</script>
