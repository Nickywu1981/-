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
  border-radius: var(--el-border-radius-round);
  font-weight: 500;
  white-space: nowrap;
  transition: all var(--el-transition-duration);
}
.status-badge--sm { padding: 1px 8px; font-size: 11px; line-height: 18px; }
.status-badge--md { padding: 2px 10px; font-size: 12px; line-height: 20px; }
.status-badge--lg { padding: 4px 14px; font-size: 14px; line-height: 22px; }

.status-badge--default  { background: var(--el-fill-color-light); color: var(--el-text-color-regular); }
.status-badge--success  { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.status-badge--warning  { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
.status-badge--danger   { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
.status-badge--info     { background: var(--el-color-info-light-9); color: var(--el-color-info); }
.status-badge--primary  { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }

.status-badge__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-badge--success .status-badge__dot { background: var(--el-color-success); }
.status-badge--warning .status-badge__dot { background: var(--el-color-warning); }
.status-badge--danger  .status-badge__dot { background: var(--el-color-danger); }
.status-badge--info    .status-badge__dot { background: var(--el-color-info); }
.status-badge--primary .status-badge__dot { background: var(--el-color-primary); }

.status-badge--default .status-badge__dot,
.status-badge--dot.status-badge--default { animation: badgePulse 2s ease-in-out infinite; }
@keyframes badgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
