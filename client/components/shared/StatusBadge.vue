<!-- 状态标签组件 — 可配置颜色/尺寸/点状指示器 -->
<template>
  <span
    class="status-badge"
    :class="[`status-badge--${variant}`, `status-badge--${size}`, { 'status-badge--dot': dot }]"
  >
    <span v-if="dot" class="status-badge__dot" />
    <span class="status-badge__text"><slot /></span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}>(), {
  variant: 'default',
  size: 'md',
  dot: false,
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--radius-full, 999px);
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--transition-fast, 0.15s);
}
.status-badge--sm { padding: 1px 8px; font-size: 11px; line-height: 18px; }
.status-badge--md { padding: 2px 10px; font-size: 12px; line-height: 20px; }
.status-badge--lg { padding: 4px 14px; font-size: 14px; line-height: 22px; }

.status-badge--default  { background: var(--bg-hover, #f5f5f5); color: var(--text-secondary, #666); }
.status-badge--success  { background: var(--success-light, #e8f5e9); color: var(--success, #22c55e); }
.status-badge--warning  { background: var(--warning-light, #fff8e1); color: var(--warning, #f59e0b); }
.status-badge--danger   { background: var(--danger-light, #fde8e8); color: var(--danger, #dc2626); }
.status-badge--info     { background: var(--info-light, #e3f2fd); color: var(--info, #3b82f6); }
.status-badge--primary  { background: var(--brand-light, rgba(var(--brand-rgb, 91,95,227), 0.1)); color: var(--brand, #5b5fe3); }

.status-badge__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-badge--success .status-badge__dot { background: var(--success, #22c55e); }
.status-badge--warning .status-badge__dot { background: var(--warning, #f59e0b); }
.status-badge--danger  .status-badge__dot { background: var(--danger, #dc2626); }
.status-badge--info    .status-badge__dot { background: var(--info, #3b82f6); }
.status-badge--primary .status-badge__dot { background: var(--brand, #5b5fe3); }

.status-badge--default .status-badge__dot,
.status-badge--dot.status-badge--default { animation: badgePulse 2s ease-in-out infinite; }
@keyframes badgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
