<template>
  <div class="pagination-bar" v-if="total > 0">
    <span class="pg-info">{{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, total) }} / {{ $t('common.pagination.total', { total }) }}</span>
    <div class="pg-btns">
      <button :disabled="page <= 1" @click="$emit('change', page - 1)" :aria-label="$t('common.pagination.prev')">{{ $t('common.pagination.prev_short') }}</button>
      <span class="pg-num" :aria-label="$t('common.pagination.page_info', { page, total: totalPages })">{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="$emit('change', page + 1)" :aria-label="$t('common.pagination.next')">{{ $t('common.pagination.next_short') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ page: number; pageSize: number; total: number }>(), {
  page: 1,
  pageSize: 10,
  total: 0,
})
defineEmits<{ change: [page: number] }>()
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<style scoped>
.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; font-size: 13px; }
.pg-info { color: var(--text-muted); }
.pg-btns { display: flex; align-items: center; gap: 12px; }
.pg-num  { color: var(--text-secondary); font-weight: 500; }
.pg-btns button {
  padding: 6px 14px; border: 1px solid var(--input-border);
  border-radius: var(--radius-sm); background: var(--bg-card);
  cursor: pointer; font-size: 13px; color: var(--text-secondary);
  transition: border-color var(--transition-fast), color var(--transition-fast);
}
.pg-btns button:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.pg-btns button:disabled { opacity: .4; cursor: not-allowed; }
</style>
