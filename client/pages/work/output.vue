<template>
  <WorkLayout :title="$t('work_pages.output.title')" :subtitle="$t('work_pages.output.subtitle')">
    <LoadingSkeleton v-if="loading" type="card" :rows="4" />
    <template v-else-if="items.length">
      <div class="output-list">
        <div v-for="item in items" :key="item.id" class="output-item">
          <div class="item-info">
            <span class="name">{{ item.name || item.task_code || $t('work_pages.output.task_label', { id: item.id }) }}</span>
            <span class="type-tag">{{ item.type || item.task_type || $t('work_pages.output.type_default') }}</span>
            <span class="status-tag" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="item-actions">
            <span class="item-date">{{ item.create_time?.slice(0,10) || '-' }}</span>
            <button v-if="item.result_url" class="btn-sm" @click="downloadItem(item)">{{ $t('work_pages.output.download') }}</button>
          </div>
        </div>
      </div>
      <button class="btn-export" @click="exportAll">{{ $t('work_pages.output.export_all') }}</button>
    </template>
    <div v-else class="empty">{{ $t('work_pages.output.empty') }}</div>
  </WorkLayout>
</template>
<script setup lang="ts">const { t } = useI18n()

const items = ref<any[]>([])
const loading = ref(true)
const toast = useToast()
const { download } = useFileDownload()

function statusLabel(s: string) {
  return { pending: t('work_pages.output.status_pending'), processing: t('work_pages.output.status_processing'), completed: t('work_pages.output.status_completed'), failed: t('work_pages.output.status_failed'), cancelled: t('work_pages.output.status_cancelled') }[s] || s || t('work_pages.output.status_unknown')
}
function statusClass(s: string) {
  return { completed:'done', processing:'proc', failed:'fail', pending:'pend', cancelled:'cancel' }[s] || ''
}

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/tasks/my-works', { credentials: 'include' })
    items.value = data?.data?.list || data?.data || []
    if (!Array.isArray(items.value)) items.value = []
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || e?.message || t('common.loadFail')) }
  loading.value = false
})

function downloadItem(item: any) {
  if (!item.result_url) return
  download(item.result_url, item.name || t('work_pages.output.output_filename', { id: item.id }))
}

function exportAll() {
  const downloadable = items.value.filter(i => i.result_url)
  if (!downloadable.length) { toast.warn(t('common.no_downloadable_works')); return }
  toast.info(t('work_pages.output.exporting', { n: downloadable.length }))
  downloadable.forEach((item, i) => {
    const tid = setTimeout(() => downloadItem(item), i * 300)
    _timeoutIds.push(tid)
  })
}

const _timeoutIds: ReturnType<typeof setTimeout>[] = []
onUnmounted(() => { _timeoutIds.forEach(clearTimeout); _timeoutIds.length = 0 })
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
<style scoped>
.output-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
.output-item { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.item-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.name { font-weight: 600; font-size: 14px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.type-tag { display: inline-block; padding: 2px 8px; border-radius: var(--badge-radius); font-size: 11px; background: var(--status-processing-bg); color: var(--status-processing-text); flex-shrink: 0; }
.status-tag { display: inline-block; padding: 2px 8px; border-radius: var(--badge-radius); font-size: 11px; flex-shrink: 0; }
.status-tag.done { background: var(--status-done-bg); color: var(--status-done-text); }
.status-tag.proc { background: var(--status-processing-bg); color: var(--status-processing-text); }
.status-tag.fail { background: var(--status-fail-bg); color: var(--status-fail-text); }
.status-tag.pend { background: var(--status-pending-bg); color: var(--status-pending-text); }
.item-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.item-date { font-size: 12px; color: var(--text-muted); }
.btn-sm { padding: 5px 14px; border: 1px solid var(--brand); border-radius: var(--radius-sm); background: var(--brand); color: #fff; cursor: pointer; font-size: 12px; white-space: nowrap; transition: opacity var(--transition-fast); }
.btn-sm:hover { opacity: 0.85; }
.btn-export { width: 100%; padding: 12px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-md); font-size: 15px; font-weight: 600; cursor: pointer; transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
.btn-export:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
.empty { text-align: center; color: var(--text-muted); padding: 60px 20px; font-size: 14px; }
</style>
