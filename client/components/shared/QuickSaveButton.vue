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
const showPicker = ref(false)

async function checkSaved() {
  if (!props.workId) return
  try {
    const res: any = await $fetch(`/api/collections/check?workId=${props.workId}`)
    isSaved.value = res?.data?.saved || false
  } catch { /* silent */ }
}

async function toggle() {
  if (saving.value || !props.workId) return
  saving.value = true
  try {
    if (isSaved.value) {
      await $fetch(`/api/collections/items/${props.workId}`, { method: 'DELETE' })
      isSaved.value = false
      toast.success('已取消收藏')
    } else {
      await $fetch('/api/collections/items', {
        method: 'POST',
        body: {
          work_id: props.workId,
          work_type: props.workType,
          work_url: props.workUrl,
          work_title: props.workTitle,
        },
      })
      isSaved.value = true
      toast.success('已收藏')
    }
  } catch (e: any) {
    toast.error(e.message || '操作失败')
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
  transition: all var(--transition-fast); user-select: none;
}
.quick-save-btn:hover { border-color: var(--brand); color: var(--brand); }
.quick-save-btn.saved { border-color: #ec4899; color: #ec4899; background: #fdf2f8; }
.quick-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.quick-save-btn.saving { opacity: 0.7; }
.icon { font-size: 14px; }
.label { font-weight: 500; }
</style>
