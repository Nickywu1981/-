<template>
  <div class="reports-page">
    <div class="page-header"><h1>数据报表</h1></div>

    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">¥{{ summary.total_revenue || '0.00' }}</div><div class="stat-label">本期营收</div></div>
      <div class="stat-card"><div class="stat-num">{{ summary.total_orders || 0 }}</div><div class="stat-label">总订单数</div></div>
      <div class="stat-card"><div class="stat-num">{{ summary.customerCount || 0 }}</div><div class="stat-label">客户数</div></div>
    </div>

    <div class="card">
      <h3>每日经营统计</h3>
      <table class="data-table" v-if="dailyStats.length">
        <thead><tr><th>日期</th><th>订单数</th><th>营收</th><th>退款</th><th>净收入</th></tr></thead>
        <tbody>
          <tr v-for="d in dailyStats" :key="d.date">
            <td>{{ d.date }}</td>
            <td>{{ d.orders }}</td>
            <td>¥{{ d.revenue }}</td>
            <td>¥{{ d.refund }}</td>
            <td>¥{{ d.net }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const summary = ref({});
const dailyStats = ref([]);

onMounted(async () => {
  await Promise.all([loadSummary(), loadDaily()]);
});

async function loadSummary() {
  try {
    const r = await $fetch('/api/enterprise/commerce/stats/summary', { credentials: 'include' });
    if (r.code === 200) summary.value = r.data;
  } catch (e) { /* ignore */ }
}
async function loadDaily() {
  try {
    const r = await $fetch('/api/analytics/trend', { credentials: 'include' });
    if (r.code === 200) dailyStats.value = r.data?.list || r.data || [];
  } catch (e) { /* ignore */ }
}
</script>
