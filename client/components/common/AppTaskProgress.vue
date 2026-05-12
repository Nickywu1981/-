<!--
  Movio AI v4.1 — AppTaskProgress.vue
  G4 前端开发 | 任务进度组件
  三态视觉: 排队(灰) → 处理中(蓝+预估时间) → 完成(绿) / 失败(红+重试)
-->
<template>
  <div class="app-task-progress" :class="`state-${status}`">
    <!-- 排队中 -->
    <template v-if="status === 'queued'">
      <div class="status-card queued">
        <svg class="status-icon" viewBox="0 0 24 24" width="32" height="32">
          <path fill="currentColor" d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        <p class="status-text">{{ queueText }}</p>
      </div>
    </template>

    <!-- 处理中 -->
    <template v-else-if="status === 'processing'">
      <div class="status-card processing">
        <div class="progress-header">
          <span class="status-text">{{ processingText }}</span>
          <span class="progress-pct">{{ progress }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <p v-if="etaText" class="eta-text">{{ etaText }}</p>
      </div>
    </template>

    <!-- 完成 -->
    <template v-else-if="status === 'completed'">
      <div class="status-card completed">
        <svg class="status-icon" viewBox="0 0 24 24" width="32" height="32">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <p class="status-text">{{ completedText }}</p>
        <button v-if="showDownload" class="btn btn-primary" @click="$emit('download')">
          {{ downloadBtnText }}
        </button>
      </div>
    </template>

    <!-- 失败 -->
    <template v-else-if="status === 'failed'">
      <div class="status-card failed">
        <svg class="status-icon" viewBox="0 0 24 24" width="32" height="32">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p class="status-text">{{ errorMessage || failedText }}</p>
        <button class="btn btn-error" @click="$emit('retry')">
          {{ retryBtnText }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">

const props = defineProps({
  status: { type: String, default: 'idle' }, // idle | queued | processing | completed | failed
  progress: { type: Number, default: 0 },
  errorMessage: { type: String, default: '' },
  showDownload: { type: Boolean, default: false },
  etaSeconds: { type: Number, default: 0 },
})

defineEmits<{ download: []; retry: [] }>()

const queueText = computed(() => props.status === 'queued' ? '排队中，请稍候...' : '')
const processingText = computed(() => '处理中...')
const completedText = computed(() => '处理完成')
const failedText = computed(() => '处理失败')
const downloadBtnText = computed(() => '下载')
const retryBtnText = computed(() => '重试')

const etaText = computed(() => {
  if (props.etaSeconds <= 0) return ''
  const mins = Math.ceil(props.etaSeconds / 60)
  return `预计剩余 ${mins} 分钟`
})
</script>

<style scoped>
.app-task-progress { width: 100%; }
.status-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; border-radius: var(--cfg-radius, 8px);
  border: 1px solid var(--cfg-border, #e5e7eb);
}
.status-card.queued { background: var(--bg-page); border-color: var(--border-light); }
.status-card.queued .status-icon { color: var(--text-muted); }
.status-card.processing { background: var(--brand-light); border-color: var(--brand-soft); }
.status-card.completed { background: var(--success-light); border-color: var(--success); }
.status-card.completed .status-icon { color: var(--cfg-success, #10B981); }
.status-card.failed { background: var(--danger-light); border-color: var(--danger); }
.status-card.failed .status-icon { color: var(--cfg-error, #EF4444); }

.status-text { flex: 1; font-size: 14px; color: var(--cfg-text-primary, #374151); }
.progress-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.progress-pct { font-size: 14px; font-weight: 600; color: var(--cfg-primary, #4F46E5); }

.progress-bar { width: 100%; height: 8px; background: var(--cfg-border, #e5e7eb); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--cfg-primary, #4F46E5); border-radius: 4px; transition: width 0.5s ease; }
.eta-text { font-size: 12px; color: var(--cfg-text-muted, #9ca3af); margin: 4px 0 0 0; }
</style>
