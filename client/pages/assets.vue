<template>
  <div class="assets-page">
    <div class="assets-header">
      <h1>素材库</h1>
      <div class="assets-toolbar">
        <div class="filter-tabs">
          <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{ active: activeTab === t.key }" @click="activeTab = t.key; fetchAssets()">
            {{ t.label }}
          </button>
        </div>
        <input v-model="search" class="search-input" placeholder="搜索素材..." @input="debouncedSearch" />
      </div>
    </div>

    <!-- 素材网格 -->
    <div class="assets-grid" v-if="items.length">
      <div v-for="item in items" :key="item.id" class="asset-card" @click="preview = item">
        <div class="asset-thumb">
          <img v-if="item.type === 'image'" :src="item.url" loading="lazy" alt="" />
          <video v-else :src="item.url" preload="metadata" />
          <span class="asset-type-tag">{{ item.type === 'video' ? '视频' : '图片' }}</span>
        </div>
        <div class="asset-info">
          <span class="asset-task">{{ taskLabel(item.task_type) }}</span>
          <span class="asset-date">{{ formatDate(item.created_at) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="empty">暂无素材</div>

    <!-- 分页 -->
    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; fetchAssets()">上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页</span>
      <button :disabled="page >= totalPages" @click="page++; fetchAssets()">下一页</button>
    </div>

    <!-- 预览弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="preview" class="preview-overlay" @click.self="preview = null">
          <div class="preview-dialog">
            <button class="preview-close" @click="preview = null">✕</button>
            <img v-if="preview.type === 'image'" :src="preview.url" class="preview-media" alt="" />
            <video v-else :src="preview.url" controls class="preview-media" />
            <div class="preview-meta">
              <span>{{ taskLabel(preview.task_type) }}</span>
              <span>{{ formatDate(preview.created_at) }}</span>
            </div>
            <div class="preview-actions">
              <button class="btn btn-primary" @click="downloadAsset(preview)">下载</button>
              <button class="btn btn-ghost" @click="preview = null">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const tabs = [
  { key: '', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
]
const activeTab = ref('')
const search = ref('')
const items = ref<any[]>([])
const page = ref(1)
const pageSize = 24
const total = ref(0)
const preview = ref<any>(null)

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

let searchTimer: any = null
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchAssets() }, 300)
}

async function fetchAssets() {
  try {
    const params: any = { page: page.value, pageSize }
    if (activeTab.value) params.type = activeTab.value
    const res: any = await $fetch('/api/assets/list', { params, credentials: 'include' })
    items.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { items.value = [] }
}

function taskLabel(type: string) {
  const map: Record<string, string> = {
    image_gen: '图片生成', image_replicate: '主图复刻', batch_image_gen: '批量生成', batch_image_edit: '批量编辑',
    video_gen: '视频生成', action_migrate: '动作迁移', digital_human: '数字人', viral_replicate: '爆款复刻', live_clip: '直播剪辑',
  }
  return map[type] || type
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }

function downloadAsset(item: any) {
  const a = document.createElement('a')
  a.href = item.url
  a.download = ''
  a.click()
}

onMounted(fetchAssets)
</script>

<style scoped>
.assets-page { max-width: 1200px; margin: 0 auto; padding: 20px clamp(12px, 3vw, 28px); }
.assets-header { margin-bottom: 20px; }
.assets-header h1 { font-size: 22px; margin: 0 0 12px; }
.assets-toolbar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

.filter-tabs { display: flex; gap: 4px; background: var(--bg-tertiary, #f0f0f0); border-radius: 10px; padding: 3px; }
.tab-btn {
  padding: 6px 16px; border: none; background: none; border-radius: 8px;
  font-size: 13px; cursor: pointer; color: var(--text-secondary, #666); transition: all 0.15s;
}
.tab-btn.active { background: #fff; color: var(--text-primary, #111); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.search-input { padding: 7px 14px; border: 1px solid var(--border-light, #ddd); border-radius: 10px; font-size: 13px; outline: none; width: 200px; }
.search-input:focus { border-color: var(--brand, #7c3aed); }

.assets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.asset-card { cursor: pointer; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-light, #eee); transition: all 0.2s; background: var(--bg-card, #fff); }
.asset-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.asset-thumb { aspect-ratio: 1; overflow: hidden; position: relative; background: var(--bg-tertiary, #f5f5f5); }
.asset-thumb img, .asset-thumb video { width: 100%; height: 100%; object-fit: cover; }
.asset-type-tag { position: absolute; top: 6px; right: 6px; font-size: 10px; padding: 1px 7px; border-radius: 4px; background: rgba(0,0,0,0.55); color: #fff; }
.asset-info { padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; }
.asset-task { font-size: 11px; color: var(--text-secondary, #666); }
.asset-date { font-size: 10px; color: var(--text-muted, #999); }

.pagination { display: flex; justify-content: center; gap: 16px; align-items: center; margin-top: 24px; font-size: 13px; }
.pagination button { padding: 6px 14px; border: 1px solid var(--border-light, #ddd); border-radius: 8px; background: var(--bg-card, #fff); cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

.empty { text-align: center; padding: 60px; color: var(--text-muted, #999); font-size: 14px; }

/* Preview overlay */
.preview-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; padding: 24px; }
.preview-dialog { background: var(--bg-card, #fff); border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow: auto; padding: 24px; position: relative; }
.preview-close { position: absolute; top: 12px; right: 12px; border: none; background: none; font-size: 20px; cursor: pointer; color: var(--text-secondary, #666); }
.preview-media { width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; }
.preview-meta { display: flex; gap: 16px; margin: 12px 0; font-size: 13px; color: var(--text-secondary, #666); }
.preview-actions { display: flex; gap: 10px; }
.btn { padding: 8px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
.btn-primary { background: var(--brand-gradient, linear-gradient(135deg,#7c3aed,#a855f7)); color: #fff; }
.btn-ghost { background: var(--bg-tertiary, #f0f0f0); color: var(--text-secondary, #666); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
