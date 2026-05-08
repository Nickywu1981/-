<template>
  <div class="error-boundary" :class="{ fullpage }">
    <span class="eb-icon">{{ icon }}</span>
    <h3 class="eb-title">{{ title }}</h3>
    <p v-if="message" class="eb-message">{{ message }}</p>
    <p v-if="errorCode" class="eb-code">错误码: {{ errorCode }}</p>
    <div class="eb-actions">
      <button v-if="retryLabel" class="eb-btn eb-btn-primary" @click="$emit('retry')">
        {{ retryLabel }}
      </button>
      <button v-if="homeLabel" class="eb-btn eb-btn-secondary" @click="goHome">
        {{ homeLabel }}
      </button>
      <button v-if="backLabel" class="eb-btn eb-btn-secondary" @click="$emit('back')">
        {{ backLabel }}
      </button>
    </div>
    <details v-if="detail" class="eb-detail">
      <summary>技术详情</summary>
      <pre>{{ detail }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

const props = withDefaults(defineProps<{
  icon?: string
  title?: string
  message?: string
  errorCode?: string | number
  detail?: string
  retryLabel?: string
  homeLabel?: string
  backLabel?: string
  fullpage?: boolean
}>(), {
  icon: '⚠️',
  title: '加载失败',
  homeLabel: '返回首页',
  fullpage: false,
})

defineEmits<{ retry: []; back: [] }>()

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.error-boundary {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 24px; text-align: center;
}
.error-boundary.fullpage {
  min-height: 60vh;
}
.eb-icon { font-size: 56px; display: block; margin-bottom: 16px; }
.eb-title { font-size: 18px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px; }
.eb-message { font-size: 14px; color: var(--text-muted); margin: 0 0 6px; line-height: 1.5; max-width: 400px; }
.eb-code { font-size: 12px; color: var(--text-muted); font-family: monospace; margin: 0 0 20px; }
.eb-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.eb-btn {
  padding: 10px 24px; border: none; border-radius: var(--radius-md);
  font-size: 14px; cursor: pointer; transition: opacity var(--transition-fast);
}
.eb-btn-primary { background: var(--brand); color: #fff; }
.eb-btn-primary:hover { opacity: 0.9; }
.eb-btn-secondary { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--input-border); }
.eb-btn-secondary:hover { background: var(--bg-hover); }
.eb-detail { margin-top: 20px; max-width: 500px; width: 100%; }
.eb-detail summary { font-size: 12px; color: var(--text-muted); cursor: pointer; margin-bottom: 8px; }
.eb-detail pre { font-size: 11px; color: var(--text-muted); background: var(--bg-hover); padding: 12px; border-radius: var(--radius-md); overflow-x: auto; text-align: left; white-space: pre-wrap; word-break: break-all; }
</style>
