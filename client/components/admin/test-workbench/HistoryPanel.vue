<template>
  <div class="tw-history">
    <div class="history-header">
      <h3>{{ $t('test_workbench.test_history') }}</h3>
      <div class="history-filters">
        <select v-model="historyCategory" class="tw-select-sm" @change="$emit('loadHistory')">
          <option value="">{{ $t('test_workbench.all_categories') }}</option>
          <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
        </select>
        <select v-model="historyType" class="tw-select-sm" @change="$emit('loadHistory')">
          <option value="">{{ $t('test_workbench.all_modes') }}</option>
          <option value="single">{{ $t('test_workbench.tab_single') }}</option>
          <option value="mixed">{{ $t('test_workbench.tab_mixed') }}</option>
          <option value="custom">{{ $t('test_workbench.tab_custom') }}</option>
          <option value="compare">{{ $t('test_workbench.tab_compare') }}</option>
        </select>
        <button class="btn-mini danger" @click="$emit('clearHistory')">{{ $t('test_workbench.clear_history') }}</button>
      </div>
    </div>

    <div v-if="historyLoading" class="loading-box">{{ $t('common.loading') }}</div>

    <div v-else-if="historyList.length === 0" class="empty-box">
      {{ $t('test_workbench.no_history') }}
    </div>

    <div v-else class="history-list">
      <div
        v-for="h in historyList"
        :key="h.id"
        :class="['history-item', { error: h.error }]"
        @click="$emit('viewHistory', h)"
      >
        <span class="hi-type">
          <span v-if="h.type === 'single'">{{ $t('test_workbench.type_single') }}</span>
          <span v-else-if="h.type === 'mixed'">{{ $t('test_workbench.type_mixed') }}</span>
          <span v-else-if="h.type === 'custom'">{{ $t('test_workbench.type_custom') }}</span>
          <span v-else>{{ $t('test_workbench.type_compare') }}</span>
        </span>
        <span class="hi-model">{{ h.model_key || h.task_type || h.model_sequence?.join(' → ') }}</span>
        <span class="hi-prompt">{{ truncate(h.prompt, 60) }}</span>
        <span class="hi-dur">{{ formatDuration(h.duration_ms) }}</span>
        <span class="hi-status">{{ h.error ? '❌' : '✅' }}</span>
        <span class="hi-time">{{ formatTime(h.created_at) }}</span>
        <button class="hi-delete" :aria-label="$t('test_workbench.delete_history')" @click.stop="$emit('deleteHistoryItem', h.id)">🗑</button>
      </div>
    </div>

    <div v-if="historyTotal > historyPageSize" class="history-pagination">
      <button :disabled="historyPage <= 1" @click="goPage(historyPage - 1)">{{ $t('enterprise.common.prevPage') }}</button>
      <span>{{ historyPage }} / {{ Math.ceil(historyTotal / historyPageSize) }}</span>
      <button :disabled="historyPage >= Math.ceil(historyTotal / historyPageSize)" @click="goPage(historyPage + 1)">{{ $t('enterprise.common.nextPage') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { truncate } from '@/utils/format'
import { formatDateTime } from '@/utils/format'

interface HistoryItem {
  id: string
  error?: boolean
  type: string
  model_key?: string
  task_type?: string
  model_sequence?: string[]
  prompt: string
  duration_ms: number
  created_at: string
}

const props = withDefaults(defineProps<{
  historyList: HistoryItem[]
  historyLoading: boolean
  historyPageSize: number
  historyTotal: number
  categories: Array<{ key: string; label: string; icon: string }>
}>(), {
  historyList: () => [],
  historyLoading: false,
  historyPageSize: 10,
  historyTotal: 0,
  categories: () => [],
})

const emit = defineEmits<{
  'loadHistory': []
  'clearHistory': []
  'viewHistory': [h: HistoryItem]
  'deleteHistoryItem': [id: string]
}>()

const historyCategory = defineModel<string>('historyCategory', { default: '' })
const historyType = defineModel<string>('historyType', { default: '' })
const historyPage = defineModel<number>('historyPage', { default: 1 })

function goPage(page: number) {
  historyPage.value = page
  emit('loadHistory')
}

const formatTime = (iso: string) => iso ? formatDateTime(iso, 'HH:mm:ss') : ''

function formatDuration(ms: number) {
  if (!ms) return '0ms'
  if (ms < 1000) return ms + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}
</script>

<style scoped>
.tw-history {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); padding: 20px;
}
.history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
.history-header h3 { font-size: 16px; margin: 0; }
.history-filters { display: flex; gap: 8px; align-items: center; }
.tw-select-sm { width: auto; min-width: 120px; padding: 6px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); background: var(--bg-page); color: var(--text-primary); }
.loading-box, .empty-box { text-align: center; padding: 32px; color: var(--text-muted); font-size: 13px; }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border: 1px solid var(--border-light); border-radius: var(--radius-md);
  cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast);
  font-size: 12px;
}
.history-item:hover { border-color: var(--brand); background: rgba(var(--brand-rgb), 0.03); }
.history-item.error { border-left: 2px solid #ef4444; }
.hi-type { min-width: 70px; }
.hi-model { font-weight: 600; min-width: 80px; }
.hi-prompt { flex: 1; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hi-dur { color: var(--text-muted); min-width: 60px; text-align: right; }
.hi-time { color: var(--text-muted); min-width: 70px; text-align: right; }
.hi-delete { background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0; transition: opacity var(--transition-fast); }
.history-item:hover .hi-delete { opacity: 1; }
.history-pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 14px; font-size: 13px; }
.history-pagination button { padding: 6px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-page); cursor: pointer; color: var(--text-secondary); }
.history-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
