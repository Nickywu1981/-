<template>
  <WorkLayout title="作品输出" subtitle="批量导出与发布">
    <LoadingSkeleton v-if="loading" type="card" :rows="4" />
    <template v-else-if="items.length">
      <div class="output-list">
        <div v-for="item in items" :key="item.id" class="output-item">
          <div class="item-info">
            <span class="name">{{ item.name || item.task_code || `任务 #${item.id}` }}</span>
            <span class="type-tag">{{ item.type || item.task_type || '图片' }}</span>
            <span class="status-tag" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="item-actions">
            <span class="item-date">{{ item.create_time?.slice(0,10) || '-' }}</span>
            <button v-if="item.result_url" class="btn-sm" @click="downloadItem(item)">下载</button>
          </div>
        </div>
      </div>
      <button class="btn-export" @click="exportAll">全部导出</button>
    </template>
    <div v-else class="empty">暂无作品，完成创作后作品将显示在此</div>
  </WorkLayout>
</template>
<script setup lang="ts">
const items = ref<any[]>([])
const loading = ref(true)
const { download } = useFileDownload()

function statusLabel(s: string) {
  return { pending:'排队中', processing:'处理中', completed:'已完成', failed:'失败', cancelled:'已取消' }[s] || s || '未知'
}
function statusClass(s: string) {
  return { completed:'done', processing:'proc', failed:'fail', pending:'pend', cancelled:'cancel' }[s] || ''
}

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/tasks/my-works', { credentials: 'include' })
    items.value = data?.data?.list || data?.data || []
    if (!Array.isArray(items.value)) items.value = []
  } catch(e: any) { toast.error(e?.data?.msg || e?.message || '加载失败') }
  loading.value = false
})

function downloadItem(item: any) {
  if (!item.result_url) return
  download(item.result_url, item.name || `output_${item.id}.png`)
}

function exportAll() {
  const downloadable = items.value.filter(i => i.result_url)
  if (!downloadable.length) { toast.warn('没有可下载的作品'); return }
  toast.info(`正在导出 ${downloadable.length} 个文件...`)
  downloadable.forEach((item, i) => {
    const tid = setTimeout(() => downloadItem(item), i * 300)
    _timeoutIds.push(tid)
  })
}

const _timeoutIds: ReturnType<typeof setTimeout>[] = []
onUnmounted(() => { _timeoutIds.forEach(clearTimeout); _timeoutIds.length = 0 })
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
