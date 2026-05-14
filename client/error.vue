<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-code">{{ error?.statusCode || '404' }}</div>
      <h1 class="error-title">{{ title }}</h1>
      <p class="error-desc">{{ description }}</p>
      <div class="error-actions">
        <button class="btn-back" @click="handleBack">{{ $t('error.back_prev') }}</button>
        <NuxtLink to="/" class="btn-home">{{ $t('error.home_btn') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error?: any }>();
const { $t } = useNuxtApp();

const title = computed(() => {
  const code = props.error?.statusCode;
  if (code === 404) return $t('error.404_title');
  if (code === 403) return $t('error.403_title');
  if (code === 500) return $t('error.500_title');
  return $t('error.fallback_title');
});

const description = computed(() => {
  const code = props.error?.statusCode;
  if (code === 404) return $t('error.404_desc');
  if (code === 403) return $t('error.403_desc');
  if (code === 500) return $t('error.500_desc');
  return $t('error.fallback_desc');
});

function handleBack() {
  if (import.meta.client && window.history.length > 1) {
    window.history.back();
  } else {
    navigateTo('/');
  }
}
</script>

<style scoped>
.error-page { display: flex; align-items: center; justify-content: center; min-height: 80vh; padding: 24px; }
.error-card { text-align: center; max-width: 480px; }
.error-code { font-size: 96px; font-weight: 800; color: var(--border-light); line-height: 1; margin-bottom: 8px; }
.error-title { font-size: 22px; color: var(--text-primary); margin-bottom: 12px; font-weight: 600; }
.error-desc { font-size: 14px; color: var(--text-muted); margin-bottom: 32px; }
.error-actions { display: flex; justify-content: center; gap: 16px; }
.btn-back { padding: 10px 32px; background: var(--bg-card); color: var(--brand); border: 1px solid var(--brand); border-radius: var(--radius-md); font-size: 15px; cursor: pointer; transition: background var(--transition-fast); }
.btn-back:hover { background: var(--brand-light); }
.btn-home { padding: 10px 32px; background: var(--brand-gradient); color: #fff; border-radius: var(--radius-md); font-size: 15px; text-decoration: none; display: inline-block; transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
.btn-home:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(var(--brand-rgb), 0.3); }
</style>
