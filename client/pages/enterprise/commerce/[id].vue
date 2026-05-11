<template>
  <div class="page">
    <div class="page-header"><h1>{{ $t('enterprise.commerce.detail.title') }}</h1><button class="btn-cancel" @click="router.back()">{{ $t('enterprise.common.back') }}</button></div>
    <div class="card" v-if="order">
      <h3>{{ $t('enterprise.commerce.detail.orderInfo') }}</h3>
      <div class="detail-grid">
        <div><label>{{ $t('enterprise.commerce.detail.orderNo') }}</label><span>{{ order.order_no || order.id }}</span></div>
        <div><label>{{ $t('enterprise.commerce.detail.status') }}</label><span :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span></div>
        <div><label>{{ $t('enterprise.commerce.detail.amount') }}</label><span>¥{{ order.amount || '0.00' }}</span></div>
        <div><label>{{ $t('enterprise.commerce.detail.createdAt') }}</label><span>{{ formatDateTimeLocale(order.created_at) }}</span></div>
        <div><label>{{ $t('enterprise.commerce.detail.customer') }}</label><span>{{ order.customer_name || '-' }}</span></div>
        <div><label>{{ $t('enterprise.commerce.detail.phone') }}</label><span>{{ order.customer_phone || '-' }}</span></div>
        <div><label>{{ $t('enterprise.commerce.detail.email') }}</label><span>{{ order.customer_email || '-' }}</span></div>
      </div>
    </div>
    <p v-else-if="loadError" class="empty">{{ $t('enterprise.common.loadError') }} <button class="btn-cancel" @click="loadOrder">{{ $t('enterprise.common.retry') }}</button></p>
    <p v-else class="empty">{{ $t('enterprise.common.loading') }}</p>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'enterprise' });
import { formatDateTimeLocale } from '~/utils/format';
const { t } = useI18n()
const router = useRouter(); const route = useRoute(); const order = ref(null); const loadError = ref(false);
async function loadOrder() {
  loadError.value = false;
  try {
    const r = await $fetch(`/api/enterprise/commerce/${route.params.id}`, { credentials: 'include' });
    if (r.code === 200) order.value = r.data; else loadError.value = true;
  } catch (e) { if (import.meta.dev) console.debug('loadOrder', e); loadError.value = true; }
}
onMounted(loadOrder);
function statusClass(s) { return { pending: 'status-warn', paid: 'status-ok', processing: 'status-info', completed: 'status-ok', refunded: 'status-err', cancelled: 'status-err' }[s] || ''; }
function statusLabel(s) { return { pending: t('enterprise.commerce.index.statusPendingPay'), paid: t('enterprise.commerce.index.statusPaid'), processing: t('enterprise.commerce.index.statusProcessing'), completed: t('enterprise.commerce.index.statusCompleted'), refunded: t('enterprise.commerce.index.statusRefunded'), cancelled: t('enterprise.commerce.index.statusCancelled') }[s] || s; }
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-grid div { display: flex; flex-direction: column; }
.detail-grid label { font-size: 12px; color: #999; margin-bottom: 4px; }
.detail-grid span { font-size: 16px; color: #333; }
</style>
