<template>
  <div v-if="appError" class="app-error-page">
    <span class="app-error-icon">⚠️</span>
    <h2 class="app-error-title">页面加载异常</h2>
    <p class="app-error-desc">{{ appError }}</p>
    <button class="eb-btn eb-btn-primary" @click="reloadPage">重新加载</button>
  </div>
  <template v-else>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toast />
    <ConfirmDialog ref="confirmDialogRef" />
    <JsonLd />
  </template>
</template>

<script setup>
import '~/assets/css/main.css'
import '~/assets/css/theme.css'

const appError = ref('')
const confirmDialogRef = ref()

// 注册全局确认对话框到 useConfirm
import { registerConfirmDialog } from '~/composables/useConfirm'
if (import.meta.client) {
  onMounted(() => { registerConfirmDialog(confirmDialogRef) })
}

onErrorCaptured((err) => {
  appError.value = err?.message || '未知错误'
  return false
})

function reloadPage() {
  appError.value = ''
  if (import.meta.client) window.location.reload()
}
</script>

<style scoped>
.app-error-page {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; padding: 48px 24px; text-align: center;
}
.app-error-icon { font-size: 56px; display: block; margin-bottom: 16px; }
.app-error-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.app-error-desc { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; }
.eb-btn {
  padding: 10px 24px; border: none; border-radius: 8px;
  font-size: 14px; cursor: pointer;
}
.eb-btn-primary { background: var(--brand); color: #fff; }
.eb-btn-primary:hover { opacity: 0.9; }
</style>
