<template>
  <div class="page">
    <div class="page-header"><h1>订单详情</h1><button class="btn-cancel" @click="router.back()">返回</button></div>
    <div class="card" v-if="order">
      <h3>订单信息</h3>
      <div class="detail-grid">
        <div><label>订单号</label><span>{{ order.order_no || order.id }}</span></div>
        <div><label>状态</label><span :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span></div>
        <div><label>金额</label><span>¥{{ order.amount || '0.00' }}</span></div>
        <div><label>下单时间</label><span>{{ formatDate(order.created_at) }}</span></div>
        <div><label>客户</label><span>{{ order.customer_name || '-' }}</span></div>
        <div><label>手机号</label><span>{{ order.customer_phone || '-' }}</span></div>
        <div><label>邮箱</label><span>{{ order.customer_email || '-' }}</span></div>
      </div>
    </div>
    <p v-else-if="loadError" class="empty">加载失败 <button class="btn-cancel" @click="loadOrder">重试</button></p>
    <p v-else class="empty">加载中...</p>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'enterprise' });
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
const router = useRouter(); const route = useRoute(); const order = ref(null); const loadError = ref(false);
async function loadOrder() {
  loadError.value = false;
  try {
    const r = await $fetch(`/api/enterprise/commerce/${route.params.id}`, { credentials: 'include' });
    if (r.code === 200) order.value = r.data; else loadError.value = true;
  } catch (e) { console.debug('loadOrder', e); loadError.value = true; }
}
onMounted(loadOrder);
function statusClass(s) { return { pending: 'status-warn', paid: 'status-ok', processing: 'status-info', completed: 'status-ok', refunded: 'status-err', cancelled: 'status-err' }[s] || ''; }
function statusLabel(s) { return { pending: '待支付', paid: '已支付', processing: '处理中', completed: '已完成', refunded: '已退款', cancelled: '已取消' }[s] || s; }
function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '-'; }
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-grid div { display: flex; flex-direction: column; }
.detail-grid label { font-size: 12px; color: #999; margin-bottom: 4px; }
.detail-grid span { font-size: 16px; color: #333; }
</style>
