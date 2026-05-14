<template>
  <div class="page">
    <div class="page-header"><h1>{{ $t('enterprise.distribution.dashboard.title') }}</h1></div>
    <div v-if="loading" class="empty">{{ $t('enterprise.common.loading') }}</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="loadStats">{{ $t('enterprise.common.retry') }}</button></div>
    <template v-else>
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ stats.clicks || 0 }}</div><div class="stat-label">{{ $t('enterprise.distribution.dashboard.totalClicks') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ stats.registers || 0 }}</div><div class="stat-label">{{ $t('enterprise.distribution.dashboard.registrations') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ stats.rate ?? '0' }}%</div><div class="stat-label">{{ $t('enterprise.distribution.dashboard.conversionRate') }}</div></div>
    </div>
    <div class="card"><h3>{{ $t('enterprise.distribution.dashboard.dailyTrend') }}</h3><p class="empty">{{ $t('enterprise.distribution.dashboard.collectingData') }}</p></div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'user-workspace' });
const { t } = useI18n();
const stats = ref({});
const loading = ref(true);
const error = ref('');

async function loadStats() {
  loading.value = true; error.value = '';
  try {
    const r = await $fetch('/api/distribution/stats', { credentials: 'include' });
    if (r.code === 200) stats.value = r.data || {};
  } catch (e) { error.value = e?.data?.msg || t('enterprise.distribution.dashboard.loadError'); }
  finally { loading.value = false; }
}
onMounted(loadStats);
</script>
