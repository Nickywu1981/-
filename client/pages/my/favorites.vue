<template>
  <div class="favorites-page">
    <div class="page-header">
      <div>
        <h1>我的收藏</h1>
        <p class="subtitle">{{ total }} 个收藏项</p>
      </div>
      <div class="header-actions">
        <button class="btn-outline" @click="activeTab = 'all'" :class="{ active: activeTab === 'all' }">全部</button>
        <button class="btn-outline" @click="activeTab = 'image'" :class="{ active: activeTab === 'image' }">图片</button>
        <button class="btn-outline" @click="activeTab = 'video'" :class="{ active: activeTab === 'video' }">视频</button>
        <button class="btn-outline" @click="activeTab = 'prompt'" :class="{ active: activeTab === 'prompt' }">提示词</button>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="card" :rows="3" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="btn-outline" @click="fetchFavorites">重试</button>
    </div>

    <div v-else-if="filtered.length === 0" class="empty-state">
      <span class="empty-icon">💾</span>
      <p>还没有收藏任何内容</p>
      <NuxtLink to="/workbench" class="btn-primary">去发现</NuxtLink>
    </div>

    <div v-else class="favorites-grid">
      <div v-for="item in filtered" :key="item.id" class="favorite-card">
        <div class="card-preview">
          <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title" @error="onImgError" />
          <span v-else class="card-placeholder">{{ item.type === 'video' ? '🎬' : '🖼️' }}</span>
          <button class="card-remove" title="取消收藏" aria-label="取消收藏" @click.stop="removeFavorite(item.id)">×</button>
        </div>
        <div class="card-body">
          <span class="card-type">{{ typeLabel(item.type) }}</span>
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-meta">{{ formatDate(item.createdAt) }}</p>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page === 1" @click="page--">上一页</button>
      <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '@/utils/format'
const { confirm } = useConfirm()

const activeTab = ref('all')
const page = ref(1)
const pageSize = 12
const loading = ref(true)
const error = ref('')
const items = ref<any[]>([])
const total = ref(0)

const filtered = computed(() => {
  if (activeTab.value === 'all') return items.value
  return items.value.filter((i: any) => i.type === activeTab.value)
})

const typeLabel = (t: string) => ({ image: '图片', video: '视频', prompt: '提示词' }[t] || t)

const fetchFavorites = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch('/api/collections', { credentials: 'include', params: { page: page.value, pageSize } })
    items.value = data.list || []
    total.value = data.total || 0
  } catch (e: any) {
    error.value = e?.data?.msg || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const removeFavorite = async (id: number) => {
  if (!await confirm({ message: '确定取消收藏？', variant: 'warning' })) return;
  try {
    await $fetch(`/api/collections/${id}`, { credentials: 'include', method: 'DELETE' })
    items.value = items.value.filter(i => i.id !== id)
    total.value--
  } catch { /* 全局拦截器已 toast 提示 */ }
}

watch(page, fetchFavorites)
onMounted(fetchFavorites)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.favorites-page { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-header h1 { font-size: 22px; font-weight: 700; color: var(--text-primary); }
.subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

.header-actions { display: flex; gap: 8px; }
.btn-outline { padding: 6px 16px; border: 1px solid var(--border-light); border-radius: 20px; background: var(--bg-card); color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.btn-outline.active { background: var(--brand-gradient); color: #fff; border-color: transparent; }

.favorites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }

.favorite-card { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-lg); overflow: hidden; transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast); }
.favorite-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(124,58,237,0.08); border-color: var(--brand-soft); }

.card-preview { position: relative; aspect-ratio: 1; background: var(--bg-hover); overflow: hidden; }
.card-preview img { width: 100%; height: 100%; object-fit: cover; }
.card-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 36px; }

.card-remove { position: absolute; top: 8px; right: 8px; min-width: 32px; min-height: 32px; border-radius: 50%; border: none; background: rgba(0,0,0,0.5); color: #fff; font-size: 16px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity var(--transition-fast); }
.favorite-card:hover .card-remove { opacity: 1; }

.card-body { padding: 12px; }
.card-type { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: var(--brand-light); color: var(--brand); }
.card-title { font-size: 14px; font-weight: 500; color: var(--text-primary); margin: 6px 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta { font-size: 12px; color: var(--text-muted); }

.error-state, .empty-state { text-align: center; padding: 60px 20px; }
.error-icon, .empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
.error-state p { color: var(--danger); font-size: 15px; margin-bottom: 16px; }
.empty-state p { color: var(--text-secondary); font-size: 15px; margin-bottom: 16px; }
.btn-primary { display: inline-block; padding: 10px 24px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-md); font-size: 14px; cursor: pointer; text-decoration: none; font-weight: 600; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 32px; font-size: 14px; }
.pagination button { padding: 6px 20px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { color: var(--text-muted); }

@media (max-width: 768px) {
  .favorites-grid { grid-template-columns: repeat(2, 1fr); }
  .page-header { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 480px) {
  .favorites-grid { grid-template-columns: 1fr; }
}
</style>
