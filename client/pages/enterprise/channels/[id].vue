<template>
  <div class="page">
    <div class="page-header"><h1>{{ $t('enterprise.channels.detail.title') }}</h1><button class="btn-cancel" @click="router.back()">{{ $t('enterprise.common.back') }}</button></div>
    <div class="card" v-if="channel">
      <h3>{{ $t('enterprise.channels.detail.channelInfo') }}</h3>
      <div class="detail-grid">
        <div><label>{{ $t('enterprise.channels.detail.agentName') }}</label><span>{{ channel.child_name }}</span></div>
        <div><label>{{ $t('enterprise.channels.detail.code') }}</label><span>{{ channel.child_code }}</span></div>
        <div><label>{{ $t('enterprise.channels.detail.level') }}</label><span>{{ channel.level === 1 ? $t('enterprise.channels.index.direct') : $t('enterprise.channels.index.level2') }}</span></div>
        <div><label>{{ $t('enterprise.channels.detail.status') }}</label><span :style="statusStyle(channel.status)">{{ statusLabel(channel.status) }}</span></div>
        <div><label>{{ $t('enterprise.channels.detail.contact') }}</label><span>{{ channel.contact_name }}</span></div>
        <div><label>{{ $t('enterprise.channels.detail.contactPhone') }}</label><span>{{ channel.contact_phone }}</span></div>
        <div><label>{{ $t('enterprise.channels.detail.applyTime') }}</label><span>{{ formatDateTimeLocale(channel.applied_at) }}</span></div>
        <div><label>{{ $t('enterprise.channels.detail.commissionRate') }}</label><span>{{ channel.commission_rate || '-' }}%</span></div>
      </div>
    </div>
    <p v-else-if="loadError" class="empty">{{ $t('enterprise.common.loadError') }} <button class="btn-cancel" @click="loadChannel">{{ $t('enterprise.common.retry') }}</button></p>
    <p v-else class="empty">{{ $t('enterprise.common.loading') }}</p>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'enterprise' });
import { formatDateTimeLocale } from '~/utils/format';
const { t } = useI18n();
const router = useRouter(); const route = useRoute(); const channel = ref(null); const loadError = ref(false);
async function loadChannel() {
  loadError.value = false;
  try {
    const r = await $fetch(`/api/enterprise/channel/relations/${route.params.id}`, { credentials: 'include' });
    if (r.code === 200) channel.value = r.data; else loadError.value = true;
  } catch (e) { if (import.meta.dev) console.debug('loadChannel', e); loadError.value = true; }
}
onMounted(loadChannel);
function statusLabel(s) { return { pending: t('enterprise.common.statusPending'), active: t('enterprise.common.statusActive'), rejected: t('enterprise.common.statusRejected'), suspended: t('enterprise.common.statusSuspended') }[s] || s; }
function statusStyle(s) { return { pending: { color: 'var(--color-warning, #f59e0b)' }, active: { color: 'var(--color-success, #10b981)' }, rejected: { color: 'var(--danger)' }, suspended: { color: 'var(--color-warning, #f59e0b)' } }[s] || {}; }
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-grid div { display: flex; flex-direction: column; }
.detail-grid label { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.detail-grid span { font-size: 16px; color: var(--text-primary); }
</style>
