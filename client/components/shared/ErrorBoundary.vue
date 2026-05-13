<!-- ErrorBoundary — catches child render errors without crashing the page -->
<template>
  <div v-if="error" class="errb" role="alert">
    <div class="errb-icon">⚠️</div>
    <h3 class="errb-title">{{ $t('error_boundary.title') }}</h3>
    <p class="errb-msg">{{ $t('error_boundary.message') }}</p>
    <button class="errb-retry" @click="reset">{{ $t('error_boundary.retry') }}</button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<Error | null>(null)

function reset() {
  error.value = null
}

onErrorCaptured((err) => {
  error.value = err as Error
  if (import.meta.dev) console.error('[ErrorBoundary]', err)
  return false
})
</script>

<style scoped>
.errb {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; text-align: center; min-height: 200px;
}
.errb-icon { font-size: 40px; margin-bottom: 12px; }
.errb-title { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
.errb-msg { font-size: 14px; color: var(--text-muted); margin: 0 0 20px; max-width: 360px; }
.errb-retry {
  padding: 8px 20px; border: none; border-radius: var(--radius-md);
  background: var(--brand, #5b5fe3); color: #fff; font-size: 14px; cursor: pointer;
  transition: opacity var(--transition-fast);
}
.errb-retry:hover { opacity: 0.85; }
</style>
