<template>
  <div class="empty-state" :class="[`empty--${size}`]">
    <div class="empty-visual">
      <slot name="visual">
        <span class="empty-icon">{{ icon }}</span>
      </slot>
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <div class="empty-actions">
      <button
        v-if="actionLabel"
        class="empty-action-btn empty-action--primary"
        @click="handleAction"
      >
        {{ actionLabel }}
      </button>
      <button
        v-if="showExample"
        class="empty-action-btn empty-action--secondary"
        @click="$emit('example')"
      >
        {{ exampleLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

const props = withDefaults(defineProps<{
  icon?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionRoute?: string;
  showExample?: boolean;
  exampleLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}>(), {
  icon: '📭',
  title: () => t('empty.defaultTitle', '暂无数据'),
  description: '',
  actionLabel: '',
  actionRoute: '',
  showExample: false,
  exampleLabel: () => t('empty.defaultExample', '查看示例'),
  size: 'md',
});

const emit = defineEmits<{
  action: [];
  example: [];
}>();

const router = useRouter();

function handleAction() {
  if (props.actionRoute) {
    router.push(props.actionRoute);
  }
  emit('action');
}
</script>

<style scoped>
.empty-state {
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center;
  width: 100%;
}

/* Sizes */
.empty--sm { padding: 32px 16px; }
.empty--md { padding: 56px 24px; }
.empty--lg { padding: 80px 32px; }

.empty--sm .empty-icon { font-size: 36px; }
.empty--md .empty-icon { font-size: 48px; }
.empty--lg .empty-icon { font-size: 64px; }

.empty--sm .empty-title { font-size: 14px; }
.empty--md .empty-title { font-size: 16px; }
.empty--lg .empty-title { font-size: 18px; }

.empty-visual { margin-bottom: 16px; }
.empty-icon { display: block; line-height: 1; }
.empty-title {
  color: var(--text-secondary);
  margin: 0 0 8px;
  font-weight: 600;
  line-height: 1.4;
}
.empty-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 24px;
  max-width: 360px;
  line-height: 1.6;
}
.empty-actions {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
}
.empty-action-btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  border: none;
  font-weight: 500;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
  white-space: nowrap;
}
.empty-action--primary {
  background: var(--brand-gradient);
  color: #fff;
}
.empty-action--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 12px rgba(var(--brand-rgb), 0.35);
}
.empty-action--secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}
.empty-action--secondary:hover {
  border-color: var(--brand);
  color: var(--brand);
}
</style>
