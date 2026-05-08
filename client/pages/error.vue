<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-icon">{{ icon }}</div>
      <h1 class="error-code">{{ code }}</h1>
      <h2 class="error-title">{{ title }}</h2>
      <p class="error-desc">{{ desc }}</p>
      <div class="error-actions">
        <button class="btn-back" @click="goBack">{{ backLabel }}</button>
        <NuxtLink to="/" class="btn-home">返回首页</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ErrorProps { error?: { statusCode?: number; message?: string } }
const props = defineProps<ErrorProps>();
const error = props.error || {};

const states: Record<number, { icon: string; title: string; desc: string; back: string }> = {
  404: {
    icon: '🔍',
    title: '页面不存在',
    desc: '您访问的页面已删除、更名或暂时不可用。请检查地址是否拼写正确。',
    back: '返回上一页',
  },
  403: {
    icon: '🔒',
    title: '暂无权限',
    desc: '您没有权限访问此页面，请联系管理员开通权限，或切换账号登录。',
    back: '返回上一页',
  },
  500: {
    icon: '⚙️',
    title: '服务器开小差了',
    desc: '服务器遇到临时故障，我们正在抢修中，请稍后重试。',
    back: '刷新页面',
  },
};

const code = computed(() => error?.statusCode || 404);
const s = computed(() => states[code.value] || states[404]);
const icon = computed(() => s.value.icon);
const title = computed(() => s.value.title);
const desc = computed(() => s.value.desc);
const backLabel = computed(() => s.value.back);

function goBack() {
  if (code.value === 500) location.reload();
  else window.history.back();
}
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
  transition: all var(--transition-fast);
}
.btn-home:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
</style>
