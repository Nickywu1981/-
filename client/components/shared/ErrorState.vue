<template>
  <div class="error-state">
    <span class="error-icon">{{ icon }}</span>
    <h3>{{ title }}</h3>
    <p v-if="message" class="error-message">{{ message }}</p>
    <div class="error-actions">
      <button v-if="retryLabel" class="btn-retry" @click="$emit('retry')">{{ retryLabel }}</button>
      <button v-if="backLabel" class="btn-back" @click="$emit('back')">{{ backLabel }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string;
  title?: string;
  message?: string;
  retryLabel?: string;
  backLabel?: string;
}>();
defineEmits<{ retry: []; back: [] }>();
</script>

<script lang="ts">
export default {
  icon: '⚠️',
  title: '加载失败',
  message: '',
  retryLabel: '重试',
  backLabel: '',
};
</script>

<style scoped>
.error-state { text-align: center; padding: 64px 24px; }
.error-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.error-state h3 { font-size: 16px; color: var(--danger); margin: 0 0 8px; font-weight: 600; }
.error-message { font-size: 13px; color: var(--text-muted); margin: 0 0 20px; line-height: 1.5; }
.error-actions { display: flex; gap: 12px; justify-content: center; }
.btn-retry {
  padding: 10px 28px; background: var(--brand); color: #fff;
  border: none; border-radius: var(--radius-md); font-size: 14px; cursor: pointer;
  transition: opacity var(--transition-fast);
}
.btn-retry:hover { opacity: 0.9; }
.btn-back {
  padding: 10px 28px; background: var(--bg-card); color: var(--text-secondary);
  border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 14px; cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-back:hover { background: var(--bg-hover); }
</style>
