<template>
  <div class="reports-page">
    <div class="page-header">
      <h1>数据报表</h1>
      <div class="header-actions">
        <div class="period-tabs">
          <button :class="{ active: period === 'daily' }" @click="switchPeriod('daily')">日</button>
          <button :class="{ active: period === 'weekly' }" @click="switchPeriod('weekly')">周</button>
          <button :class="{ active: period === 'monthly' }" @click="switchPeriod('monthly')">月</button>
        </div>
        <button class="btn-primary" @click="exportReport">导出报表</button>
      </div>
    </div>

    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">&yen;{{ summary.total_revenue || '0.00' }}</div><div class="stat-label">本期营收</div></div>
      <div class="stat-card"><div class="stat-num">{{ summary.total_orders || 0 }}</div><div class="stat-label">总订单数</div></div>
      <div class="stat-card"><div class="stat-num">{{ summary.customerCount || 0 }}</div><div class="stat-label">客户数</div></div>
      <div class="stat-card"><div class="stat-num">&yen;{{ summary.total_refund || '0.00' }}</div><div class="stat-label">退款总额</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>{{ periodLabel }}经营统计</h3>
        <div class="date-range">
          <input type="date" v-model="dateRange.start" @change="loadData" class="input input-sm" />
          <span>至</span>
          <input type="date" v-model="dateRange.end" @change="loadData" class="input input-sm" />
        </div>
      </div>
      <table class="data-table" v-if="stats.length">
        <thead><tr><th>日期</th><th>订单数</th><th>营收</th><th>退款</th><th>净收入</th></tr></thead>
        <tbody>
          <tr v-for="d in stats" :key="d.date">
            <td>{{ d.date }}</td>
            <td>{{ d.orders }}</td>
            <td>&yen;{{ d.revenue }}</td>
            <td>&yen;{{ d.refund }}</td>
            <td class="text-green">&yen;{{ d.net }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">暂无数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const period = ref('daily');
const summary = ref({});
const stats = ref([]);
const dateRange = ref({ start: '', end: '' });

const periodLabel = computed(() => ({ daily: '每日', weekly: '每周', monthly: '每月' }[period.value] || '每日'));

onMounted(() => {
  const now = new Date();
  dateRange.value.end = now.toISOString().slice(0, 10);
  now.setDate(now.getDate() - 30);
  dateRange.value.start = now.toISOString().slice(0, 10);
  loadData();
});

async function loadData() {
  await Promise.all([loadSummary(), loadStats()]);
}

async function loadSummary() {
  try {
    const q = new URLSearchParams();
    if (dateRange.value.start) q.set('startDate', dateRange.value.start);
    if (dateRange.value.end) q.set('endDate', dateRange.value.end);
    const r = await $fetch(`/api/enterprise/commerce/stats/summary?${q}`, { credentials: 'include' });
    if (r.code === 200) summary.value = r.data;
  } catch (e) { console.error(e); }
}

async function loadStats() {
  try {
    const q = new URLSearchParams({ period: period.value });
    if (dateRange.value.start) q.set('startDate', dateRange.value.start);
    if (dateRange.value.end) q.set('endDate', dateRange.value.end);
    const r = await $fetch(`/api/analytics/trend?${q}`, { credentials: 'include' });
    if (r.code === 200) stats.value = r.data?.list || r.data || [];
  } catch (e) { console.error(e); }
}

function switchPeriod(p) { period.value = p; loadStats(); }

function exportReport() {
  const csv = [['日期', '订单数', '营收', '退款', '净收入']]
    .concat(stats.value.map(d => [d.date, d.orders, d.revenue, d.refund, d.net]))
    .map(row => row.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `report_${dateRange.value.start}_${dateRange.value.end}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.header-actions { display: flex; gap: 16px; align-items: center; }
.period-tabs { display: flex; border-radius: 6px; overflow: hidden; border: 1px solid #d9d9d9; }
.period-tabs button { padding: 6px 16px; border: none; background: #fff; cursor: pointer; font-size: 14px; }
.period-tabs button.active { background: #1a73e8; color: #fff; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.card-header h3 { margin: 0; }
.date-range { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.input-sm { width: 150px; padding: 4px 8px; font-size: 13px; }
.text-green { color: #16a34a; font-weight: 500; }
</style>
