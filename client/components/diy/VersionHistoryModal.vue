<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)" @keydown.escape="close">
      <div class="modal version-modal">
        <h3>{{ $t('versionHistory.title') }}</h3>
        <div v-if="loading" class="v-loading">{{ $t('versionHistory.loading') }}</div>
        <div v-else-if="!versions.length" class="v-empty">{{ $t('versionHistory.empty') }}</div>
        <div v-else class="version-list">
          <div
            v-for="(v, i) in versions"
            :key="v.version"
            class="version-item"
            :class="{ selected: selected.includes(i) }"
            @click="toggle(i)"
          >
            <div class="v-dot" :class="{ latest: i === 0 }" />
            <div class="v-info">
              <span class="v-version">v{{ v.version }}</span>
              <span class="v-time">{{ v.created_at?.slice(0, 19) || '-' }}</span>
              <span v-if="v.remark" class="v-remark">{{ v.remark }}</span>
              <span v-if="i === 0" class="v-latest-tag">{{ $t('versionHistory.latest') }}</span>
            </div>
          </div>
        </div>
        <div v-if="diffResult" class="diff-panel">
          <h4>{{ $t('versionHistory.diffTitle') }}</h4>
          <div v-for="(d, di) in diffResult" :key="di" class="diff-item" :class="d.type">
            <span class="diff-type">{{ d.type === 'added' ? '+' : d.type === 'removed' ? '-' : '~' }}</span>
            <span>{{ d.path }}</span>
            <span v-if="d.aType || d.bType">({{ d.aType || $t('versionHistory.emptyValue') }} → {{ d.bType || $t('versionHistory.emptyValue') }})</span>
          </div>
        </div>
        <div class="modal-actions">
          <button
            v-if="selected.length === 2"
            class="btn btn-outline"
            @click="$emit('diff', selected[0], selected[1])"
          >{{ $t('versionHistory.compareSelected') }}</button>
          <button
            v-if="selected.length === 1 && selected[0] !== 0"
            class="btn btn-outline"
            @click="$emit('rollback', selected[0])"
          >{{ $t('versionHistory.rollbackTo') }}</button>
          <button class="btn-cancel" @click="close">{{ $t('versionHistory.close') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface VersionItem {
  version: number
  created_at?: string
  remark?: string
}

interface DiffItem {
  type: 'added' | 'removed' | 'modified'
  path: string
  aType?: string
  bType?: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  versions: VersionItem[]
  loading: boolean
  diffResult: DiffItem[] | null
}>(), {
  modelValue: false,
  versions: () => [],
  loading: false,
  diffResult: null,
})

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  diff: [a: number, b: number]
  rollback: [idx: number]
}>()

const selected = ref<number[]>([])

function toggle(i: number) {
  const idx = selected.value.indexOf(i)
  if (idx >= 0) { selected.value.splice(idx, 1) }
  else if (selected.value.length < 2) { selected.value.push(i) }
  else { selected.value = [selected.value[1], i] }
}

function close() {
  selected.value = []
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (val) => {
  if (!val) selected.value = []
})
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 5000; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 24px; width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); }
.v-loading, .v-empty { text-align: center; padding: 32px; color: var(--text-muted); font-size: 14px; }
.version-list { display: flex; flex-direction: column; gap: 2px; max-height: 320px; overflow-y: auto; margin-bottom: 16px; }
.version-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background .15s; border: 1px solid transparent; }
.version-item:hover { background: var(--bg-hover); }
.version-item.selected { background: var(--brand-light); border-color: var(--brand); }
.v-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); margin-top: 5px; flex-shrink: 0; }
.v-dot.latest { background: var(--success); }
.v-info { flex: 1; display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
.v-version { font-weight: 600; font-size: 13px; color: var(--text-primary); }
.v-time { font-size: 12px; color: var(--text-muted); }
.v-remark { font-size: 12px; color: var(--text-secondary); }
.v-latest-tag { padding: 0 6px; border-radius: 3px; background: var(--success); color: #fff; font-size: 10px; font-weight: 600; }
.diff-panel { border-top: 1px solid var(--border-light); padding-top: 12px; margin-bottom: 12px; }
.diff-panel h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary); }
.diff-item { display: flex; gap: 8px; padding: 4px 0; font-size: 12px; }
.diff-item.added { color: var(--success); }
.diff-item.removed { color: var(--danger); }
.diff-item.modified { color: var(--warning); }
.diff-type { font-weight: 700; width: 16px; }
.modal-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
.btn { padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }
.btn-outline { background: var(--bg-card); border: 1px solid var(--border-light); color: var(--text-primary); }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: 6px; background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-cancel:hover { border-color: var(--text-muted); }
</style>
