<!--
  Movio AI v4.1 — Assets Library
  Browse/manage all AI-generated works (images + videos)
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ $t('assets.title') }}</h1>
      <p>{{ $t('assets.subtitle') }}</p>
    </header>

    <div class="toolbar">
      <div class="filter-tabs">
        <button v-for="f in filters" :key="f.key" class="filter-btn" :class="{ active: activeFilter === f.key }" @click="switchFilter(f.key)">
          {{ f.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty-state">{{ $t('assets.loading') }}</div>
    <div v-else-if="items.length === 0" class="empty-state">
      <div class="empty-icon">🗂</div>
      <p>{{ $t('assets.empty_title') }}</p>
      <p class="empty-hint">{{ $t('assets.empty_hint') }}</p>
    </div>

    <div v-else class="asset-grid">
      <div v-for="item in items" :key="item.id" class="asset-card" @click="previewItem = item">
        <div v-if="item.type === 'video'" class="asset-media video">
          <div class="video-indicator">▶</div>
          <img v-if="item.meta?.thumbnail_url" :src="item.meta.thumbnail_url" alt="" />
          <div v-else class="video-placeholder">🎬</div>
        </div>
        <img v-else :src="item.url" :alt="item.task_type" class="asset-media" @error="($event.target as HTMLImageElement).style.display='none'" />
        <div class="asset-info">
          <span class="asset-type">{{ typeLabel(item.task_type) }}</span>
          <span class="asset-date">{{ formatDate(item.created_at, 'MM-DD') }}</span>
        </div>
      </div>
    </div>

    <div v-if="total > page * pageSize" class="load-more">
      <button class="btn btn-ghost" @click="loadMore">{{ $t('assets.load_more') }}</button>
    </div>

    <Teleport to="body">
      <div v-if="previewItem" class="preview-overlay" @click.self="previewItem = null" @keydown.escape="previewItem = null">
        <div class="preview-box">
          <button class="preview-close" @click="previewItem = null" :aria-label="$t('assets.close_preview')">✕</button>
          <video v-if="previewItem.type === 'video'" :src="previewItem.url" class="preview-media" controls />
          <img v-else :src="previewItem.url" :alt="$t('assets.preview_alt')" class="preview-media" />
          <div class="preview-actions">
            <button class="btn btn-primary btn-sm" @click="downloadItem(previewItem)">{{ $t('assets.download') }}</button>
            <button class="btn btn-secondary btn-sm" @click="copyLink(previewItem.url)">{{ $t('assets.copy_link') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { formatDate, copyToClipboard } from '@/utils/format'

const copyLink = copyToClipboard

const toast = useToast()
const { t } = useI18n()
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const apiBase = useRuntimeConfig().public.apiBase || '/api'

const items = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = 24
const total = ref(0)
const activeFilter = ref('all')
const previewItem = ref<any>(null)

const filters = computed(() => [
  { key: 'all', label: t('assets.filter_all') },
  { key: 'image', label: t('assets.filter_image') },
  { key: 'video', label: t('assets.filter_video') },
])

const typeLabels: Record<string, string> = {
  image_gen: t('assets.type_image_gen'), image_replicate: t('assets.type_image_replicate'),
  batch_image_gen: t('assets.type_batch_image'), batch_image_edit: t('assets.type_batch_edit'),
  video_gen: t('assets.type_video_gen'), action_migrate: t('assets.type_action_migrate'),
  digital_human: t('assets.type_digital_human'), viral_replicate: t('assets.type_viral_replicate'),
  live_clip: t('assets.type_live_clip'),
}

function typeLabel(key: string) { return typeLabels[key] || key }

async function fetchAssets() {
  loading.value = true
  try {
    const filter = activeFilter.value === 'all' ? undefined : activeFilter.value
    const res: any = await $fetch(`${apiBase}/assets/list`, { credentials: 'include', params: { page: page.value, pageSize, type: filter } })
    if (res.code === 200) {
      items.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch { toast.error(t('assets.load_error')) } finally { loading.value = false }
}

function switchFilter(key: string) {
  activeFilter.value = key
  page.value = 1
  items.value = []
  fetchAssets()
}

function loadMore() { page.value++; fetchAssets() }

function downloadItem(item: any) { if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer') }

onMounted(() => fetchAssets())
</script>

<style scoped>
.page-container { max-width: 1100px; margin: 0 auto; padding: var(--space-8, 32px)) var(--space-4, 16px)); }
.page-header { text-align: center; margin-bottom: 24px; }
.page-header h1 { font-size: var(--text-2xl, 1.5rem)); margin: 0 0 6px; }
.page-header p { color: var(--text-muted, #9ca3af)); margin: 0; }

.toolbar { margin-bottom: 20px; }
.filter-tabs { display: flex; gap: 8px; }
.filter-btn { padding: 8px 16px; border: 1px solid var(--border-color, #e5e7eb)); background: var(--bg-card, #ffffff)); border-radius: var(--radius-full, 9999px)); font-size: var(--text-sm, 0.875rem)); cursor: pointer; color: var(--text-secondary, #6b7280)); transition: background var(--transition-fast, 0.15s ease)), color var(--transition-fast, 0.15s ease)), border-color var(--transition-fast, 0.15s ease)); }
.filter-btn.active { background: var(--brand, #5b5fe3)); color: #fff; border-color: var(--brand, #5b5fe3)); }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted, #9ca3af)); }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-hint { font-size: var(--text-sm, 0.875rem)); margin-top: 6px; }

.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.asset-card { border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-md, 8px)); overflow: hidden; background: var(--bg-card, #ffffff)); cursor: pointer; transition: border-color var(--transition-fast, 0.15s ease)), transform var(--transition-fast, 0.15s ease)); }
.asset-card:hover { border-color: var(--brand, #5b5fe3)); transform: translateY(-2px); }
.asset-media { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.asset-media.video { position: relative; background: var(--bg-tertiary, #f3f4f6)); display: flex; align-items: center; justify-content: center; }
.video-indicator { position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 1; }
.video-placeholder { font-size: 40px; }
.asset-info { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
.asset-type { font-size: var(--text-xs, 0.75rem)); font-weight: 500); color: var(--text-primary, #1f2937)); }
.asset-date { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); }

.load-more { text-align: center; margin-top: 20px; }

.preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
.preview-box { max-width: 90vw; max-height: 90vh; position: relative; }
.preview-close { position: absolute; top: -12px; right: -12px; width: 32px; height: 32px; border-radius: 50%; background: var(--bg-card); border: none; font-size: 16px; cursor: pointer; z-index: 2; }
.preview-media { max-width: 90vw; max-height: 80vh; border-radius: var(--radius-md, 8px)); }
.preview-actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
</style>
