<template>
  <div class="commerce-page">
    <div class="page-header"><h1>{{ $t('enterprise.commerce.index.title') }}</h1></div>

    <!-- 概览卡片 -->
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ summary.total_orders || 0 }}</div><div class="stat-label">{{ $t('enterprise.commerce.index.totalOrders') }}</div></div>
      <div class="stat-card"><div class="stat-num">¥{{ summary.total_revenue || '0.00' }}</div><div class="stat-label">{{ $t('enterprise.commerce.index.totalRevenue') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ summary.pending_count || 0 }}</div><div class="stat-label">{{ $t('enterprise.commerce.index.pendingOrders') }}</div></div>
      <div class="stat-card"><div class="stat-num">¥{{ summary.total_refund || '0.00' }}</div><div class="stat-label">{{ $t('enterprise.commerce.index.totalRefund') }}</div></div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="filters.status" @change="loadOrders" class="input">
        <option value="">{{ $t('enterprise.commerce.index.allStatus') }}</option>
        <option value="pending">{{ $t('enterprise.commerce.index.statusPendingPay') }}</option>
        <option value="paid">{{ $t('enterprise.commerce.index.statusPaid') }}</option>
        <option value="processing">{{ $t('enterprise.commerce.index.statusProcessing') }}</option>
        <option value="completed">{{ $t('enterprise.commerce.index.statusCompleted') }}</option>
        <option value="refunded">{{ $t('enterprise.commerce.index.statusRefunded') }}</option>
        <option value="cancelled">{{ $t('enterprise.commerce.index.statusCancelled') }}</option>
      </select>
      <input v-model="filters.keyword" :placeholder="$t('enterprise.commerce.index.searchPlaceholder')" @change="debounceSearch" class="input" />
    </div>

    <!-- 订单列表 -->
    <div v-if="loading" class="loading-spin">{{ $t('enterprise.common.loading') }}</div>
    <table class="data-table" v-else-if="orders.list?.length">
      <thead><tr><th>{{ $t('enterprise.commerce.index.orderNo') }}</th><th>{{ $t('enterprise.commerce.index.customer') }}</th><th>{{ $t('enterprise.commerce.index.amount') }}</th><th>{{ $t('enterprise.commerce.index.status') }}</th><th>{{ $t('enterprise.commerce.index.createdAt') }}</th><th>{{ $t('enterprise.commerce.index.actions') }}</th></tr></thead>
      <tbody>
        <tr v-for="o in orders.list" :key="o.id">
          <td>{{ o.order_no || o.id }}</td>
          <td>{{ o.customer_name || '-' }}<br/><small>{{ o.customer_phone || '' }}</small></td>
          <td>¥{{ o.amount || '0.00' }}</td>
          <td><span :class="statusClass(o.status)">{{ statusLabel(o.status) }}</span></td>
          <td>{{ formatDateLocale(o.created_at) }}</td>
          <td><button class="btn-sm" @click="router.push(`/enterprise/commerce/${o.id}`)">{{ $t('enterprise.commerce.index.detail') }}</button></td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading" class="empty">{{ $t('enterprise.commerce.index.noData') }}</p>

    <div class="pagination" v-if="orders.total > orders.pageSize">
      <button :disabled="orders.page <= 1" @click="loadOrders(orders.page - 1)">{{ $t('enterprise.common.prevPage') }}</button>
      <span>{{ $t('enterprise.common.pageOf', { page: orders.page, total: Math.ceil(orders.total / orders.pageSize) }) }}</span>
      <button :disabled="orders.page >= Math.ceil(orders.total / orders.pageSize)" @click="loadOrders(orders.page + 1)">{{ $t('enterprise.common.nextPage') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'enterprise' });
import { formatDateLocale } from '~/utils/format';

const { t } = useI18n()
const toast = useToast()
const router = useRouter();
const loading = ref(true);
const orders = reactive({ list: [], total: 0, page: 1, pageSize: 20 });
const summary = ref({});
const filters = reactive({ status: '', keyword: '' });
let searchTimer: ReturnType<typeof setTimeout>;

onMounted(async () => { await Promise.all([loadOrders(), loadSummary()]); loading.value = false; });
onUnmounted(() => { clearTimeout(searchTimer); });

async function loadOrders(page = 1) {
  orders.page = page;
  const q = new URLSearchParams({ page, pageSize: orders.pageSize });
  if (filters.status) q.set('status', filters.status);
  if (filters.keyword) q.set('keyword', filters.keyword);
  try {
    const r = await $fetch(`/api/enterprise/commerce?${q}`, { credentials: 'include' });
    if (r.code === 200) Object.assign(orders, r.data);
  } catch (e) { toast.error(t('enterprise.commerce.index.loadFailed')); }
}
async function loadSummary() {
  try {
    const r = await $fetch('/api/enterprise/commerce/stats/summary', { credentials: 'include' });
    if (r.code === 200) summary.value = r.data;
  } catch (e) { toast.error(t('enterprise.commerce.index.statsLoadFailed')); }
}
function debounceSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadOrders(), 400); }
function statusClass(s) { return { pending: 'status-warn', paid: 'status-ok', processing: 'status-info', completed: 'status-ok', refunded: 'status-err', cancelled: 'status-err' }[s] || ''; }
function statusLabel(s) { return { pending: t('enterprise.commerce.index.statusPendingPay'), paid: t('enterprise.commerce.index.statusPaid'), processing: t('enterprise.commerce.index.statusProcessing'), completed: t('enterprise.commerce.index.statusCompleted'), refunded: t('enterprise.commerce.index.statusRefunded'), cancelled: t('enterprise.commerce.index.statusCancelled') }[s] || s; }
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.filter-bar .input { max-width: 200px; }
</style>
