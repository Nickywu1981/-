<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-icon">{{ icon }}</div>
      <h1 class="error-code">{{ code }}</h1>
      <h2 class="error-title">{{ title }}</h2>
      <p class="error-desc">{{ desc }}</p>
      <div class="error-actions">
        <button class="btn-back" @click="goBack">{{ backLabel }}</button>
        <NuxtLink to="/" class="btn-home">{{ $t('error.home_btn') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ErrorProps { error?: { statusCode?: number; message?: string } }
const props = defineProps<ErrorProps>();
const error = props.error || {};

const { t } = useI18n()

const states = computed(() => ({
  404: {
    icon: '🔍',
    title: t('error.404_title'),
    desc: t('error.404_desc'),
    back: t('error.back_prev'),
  },
  403: {
    icon: '🔒',
    title: t('error.403_title'),
    desc: t('error.403_desc'),
    back: t('error.back_prev'),
  },
  500: {
    icon: '⚙️',
    title: t('error.500_title'),
    desc: t('error.500_desc'),
    back: t('error.refresh_page'),
  },
}));

const code = computed(() => error?.statusCode || 404);
const s = computed(() => states[code.value] || states[404]);
const icon = computed(() => s.value.icon);
const title = computed(() => s.value.title);
const desc = computed(() => s.value.desc);
const backLabel = computed(() => s.value.back);

function goBack() {
  if (!process.client) return
  if (code.value === 500) location.reload();
  else window.history.back();
}
definePageMeta({ layout: 'default' })
</script>

<style scoped>
.error-page {
  min-height: calc(100vh - 140px);
  display: flex; align-items: center; justify-content: center;
  padding: 40px 16px;
}
.error-card {
  text-align: center; max-width: 420px;
}
.error-icon { font-size: 64px; margin-bottom: 16px; }
.error-code { font-size: 72px; font-weight: 800; color: var(--border-light); margin: 0; line-height: 1; }
.error-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 8px 0 12px; }
.error-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 28px; }
.error-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn-back {
  padding: 10px 28px; border: 1px solid var(--border-light); border-radius: 8px;
  background: var(--bg-card); font-size: 14px; cursor: pointer; color: var(--text-secondary);
}
.btn-back:hover { background: var(--bg-hover); border-color: var(--text-muted); }
.btn-home {
  padding: 10px 28px; border-radius: 8px; background: var(--brand-gradient);
  color: var(--text-on-brand); font-size: 14px; text-decoration: none; display: inline-block; font-weight: 600;
  transition: opacity var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
}
.btn-home:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
</style>
