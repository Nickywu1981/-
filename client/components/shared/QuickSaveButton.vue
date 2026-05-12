<template>
  <button
    class="quick-save-btn"
    :class="{ saved: isSaved, saving }"
    :disabled="saving || disabled"
    :title="isSaved ? '已收藏' : '收藏到合集'"
    @click="toggle"
  >
    <span class="icon">{{ isSaved ? '❤️' : '🤍' }}</span>
    <span class="label">{{ isSaved ? '已收藏' : '收藏' }}</span>
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  workId: string
  workType?: string
  workUrl?: string
  workTitle?: string
  disabled?: boolean
}>(), { workType: 'image', workTitle: '', disabled: false })

const toast = useToast()
const isSaved = ref(false)
const saving = ref(false)

const STORAGE_KEY = 'movio_quick_saves'

function getSavedIds(): string[] {
  if (!import.meta.client) return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function checkSaved() {
  if (!props.workId) return
  isSaved.value = getSavedIds().includes(props.workId)
}

async function toggle() {
  if (saving.value || !props.workId || !import.meta.client) return
  saving.value = true
  try {
    const ids = getSavedIds()
    if (isSaved.value) {
      const idx = ids.indexOf(props.workId)
      if (idx !== -1) ids.splice(idx, 1)
      isSaved.value = false
      toast.success('已取消收藏')
    } else {
      ids.unshift(props.workId)
      isSaved.value = true
      toast.success('已收藏')
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, 200)))
  } catch (e: any) {
    toast.error('操作失败')
  } finally { saving.value = false }
}

onMounted(() => { checkSaved() })
watch(() => props.workId, () => { checkSaved() })
</script>

<style scoped>
.quick-save-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid var(--border-light);
  border-radius: var(--radius-md); background: var(--bg-card);
  color: var(--text-secondary); font-size: 12px; cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); user-select: none;
}
.quick-save-btn:hover { border-color: var(--brand); color: var(--brand); }
.quick-save-btn.saved { border-color: #ec4899; color: #ec4899; background: #fdf2f8; }
.quick-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.quick-save-btn.saving { opacity: 0.7; }
.icon { font-size: 14px; }
.label { font-weight: 500; }
</style>
