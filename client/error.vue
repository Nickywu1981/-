<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-code">{{ error?.statusCode || '404' }}</div>
      <h1 class="error-title">{{ title }}</h1>
      <p class="error-desc">{{ description }}</p>
      <div class="error-actions">
        <button class="btn-back" @click="handleBack">返回上一页</button>
        <NuxtLink to="/" class="btn-home">回到首页</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error?: any }>();

const title = computed(() => {
  const code = props.error?.statusCode;
  if (code === 404) return '页面不存在';
  if (code === 403) return '无权访问';
  if (code === 500) return '服务器错误';
  return '发生异常';
});

const description = computed(() => {
  const code = props.error?.statusCode;
  if (code === 404) return '您访问的页面已被移除或链接错误';
  if (code === 403) return '您没有权限访问此页面';
  if (code === 500) return '服务器暂时无法处理请求，请稍后再试';
  return '请稍后再试或联系客服';
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
.btn-back { padding: 10px 32px; background: var(--bg-card); color: var(--brand); border: 1px solid var(--brand); border-radius: var(--radius-md); font-size: 15px; cursor: pointer; transition: all var(--transition-fast); }
.btn-back:hover { background: var(--brand-light); }
.btn-home { padding: 10px 32px; background: var(--brand-gradient); color: #fff; border-radius: var(--radius-md); font-size: 15px; text-decoration: none; display: inline-block; transition: all var(--transition-fast); }
.btn-home:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
</style>
