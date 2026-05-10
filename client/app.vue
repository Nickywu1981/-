<template>
  <div v-if="appError" class="app-error-page">
    <span style="font-size:56px;display:block;margin-bottom:16px">⚠️</span>
    <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">页面加载异常</h2>
    <p style="font-size:14px;color:var(--text-muted);margin-bottom:20px">{{ appError }}</p>
    <button class="eb-btn eb-btn-primary" @click="appError = ''; window.location.reload()">重新加载</button>
  </div>
  <template v-else>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toast />
  </template>
</template>

<script setup>
import '~/assets/css/main.css'
import '~/assets/css/theme.css'

const appError = ref('')

onErrorCaptured((err) => {
  appError.value = err?.message || '未知错误'
  return false
})
</script>

<style scoped>
.app-error-page {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; padding: 48px 24px; text-align: center;
}
.eb-btn {
  padding: 10px 24px; border: none; border-radius: 8px;
  font-size: 14px; cursor: pointer;
}
.eb-btn-primary { background: var(--brand); color: #fff; }
.eb-btn-primary:hover { opacity: 0.9; }
</style>
