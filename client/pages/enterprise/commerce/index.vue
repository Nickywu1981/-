<template>
  <div class="commerce-page">
    <div class="page-header"><h1>商品订单</h1></div>

    <!-- 概览卡片 -->
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ summary.total_orders || 0 }}</div><div class="stat-label">总订单</div></div>
      <div class="stat-card"><div class="stat-num">¥{{ summary.total_revenue || '0.00' }}</div><div class="stat-label">总营收</div></div>
      <div class="stat-card"><div class="stat-num">{{ summary.pending_count || 0 }}</div><div class="stat-label">待处理</div></div>
      <div class="stat-card"><div class="stat-num">¥{{ summary.total_refund || '0.00' }}</div><div class="stat-label">退款总额</div></div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="filters.status" @change="loadOrders" class="input">
        <option value="">全部状态</option>
        <option value="pending">待支付</option>
        <option value="paid">已支付</option>
        <option value="processing">处理中</option>
        <option value="completed">已完成</option>
        <option value="refunded">已退款</option>
        <option value="cancelled">已取消</option>
      </select>
      <input v-model="filters.keyword" placeholder="搜索订单号/客户名/手机号" @change="debounceSearch" class="input" />
    </div>

    <!-- 订单列表 -->
    <div v-if="loading" class="loading-spin">加载中...</div>
    <table class="data-table" v-else-if="orders.list?.length">
      <thead><tr><th>订单号</th><th>客户</th><th>金额</th><th>状态</th><th>下单时间</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="o in orders.list" :key="o.id">
          <td>{{ o.order_no || o.id }}</td>
          <td>{{ o.customer_name || '-' }}<br/><small>{{ o.customer_phone || '' }}</small></td>
          <td>¥{{ o.amount || '0.00' }}</td>
          <td><span :class="statusClass(o.status)">{{ statusLabel(o.status) }}</span></td>
          <td>{{ formatDate(o.created_at) }}</td>
          <td><button class="btn-sm" @click="router.push(`/enterprise/commerce/${o.id}`)">详情</button></td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading" class="empty">暂无订单</p>

    <div class="pagination" v-if="orders.total > orders.pageSize">
      <button :disabled="orders.page <= 1" @click="loadOrders(orders.page - 1)">上一页</button>
      <span>第 {{ orders.page }} / {{ Math.ceil(orders.total / orders.pageSize) }} 页</span>
      <button :disabled="orders.page >= Math.ceil(orders.total / orders.pageSize)" @click="loadOrders(orders.page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useToast } from '~/composables/useToast';

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
  } catch (e) { toast.error('订单列表加载失败'); }
}
async function loadSummary() {
  try {
    const r = await $fetch('/api/enterprise/commerce/stats/summary', { credentials: 'include' });
    if (r.code === 200) summary.value = r.data;
  } catch (e) { toast.error('数据概览加载失败'); }
}
function debounceSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadOrders(), 400); }
function statusClass(s) { return { pending: 'status-warn', paid: 'status-ok', processing: 'status-info', completed: 'status-ok', refunded: 'status-err', cancelled: 'status-err' }[s] || ''; }
function statusLabel(s) { return { pending: '待支付', paid: '已支付', processing: '处理中', completed: '已完成', refunded: '已退款', cancelled: '已取消' }[s] || s; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.filter-bar .input { max-width: 200px; }
</style>
