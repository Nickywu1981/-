<!-- Movio AI v8.0 — redirect to creation center -->
<template>
  <div class="wh-redirect">
    <div class="wh-spinner" role="progressbar" aria-label="Loading" />
    <p>{{ $t('workspace.redirect_creation') }}</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const router = useRouter()
onMounted(() => { router.replace('/workspace/creation') })
</script>

<style scoped>
.wh-redirect {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 400px; gap: 16px; color: var(--text-muted, #767676); font-size: 14px;
}
.wh-spinner {
  width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid var(--border-light, #ebebea);
  border-top-color: var(--color-brand-600, #5b5fe3);
  animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
