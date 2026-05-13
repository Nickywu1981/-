<template>
  <div class="page">
    <h2>{{ $t('my_pages.works.title') }}</h2>
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key; page = 1; fetchAll()"
      >{{ t.label }}</button>
    </div>

    <div v-if="loading" class="loading">{{ $t('my_pages.works.loading') }}</div>

    <div v-else-if="errorMsg" class="error-box">
      <span class="error-icon">⚠️</span>
      <span>{{ errorMsg }}</span>
      <button class="btn-retry" @click="fetchAll()">{{ $t('my_pages.works.error_retry') }}</button>
    </div>

    <template v-else>
      <div v-if="filteredList.length > 0" class="grid">
        <div v-for="item in filteredList" :key="item.id" class="card" tabindex="0" role="button" @click="viewDetail(item)" @keydown.enter="viewDetail(item)" @keydown.space.prevent="viewDetail(item)">
          <div class="card-img">
            <img
              v-if="getThumbnail(item)"
              :src="getThumbnail(item)"
              :alt="item.title"
              class="card-thumb"
              loading="lazy"
              @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }"
            />
            <div v-else class="img-placeholder">{{ typeIcon(item.type) }}</div>
          </div>
          <div class="card-info">
            <span class="card-type tag" :class="item.type">{{ typeLabel(item.type) }}</span>
            <span class="card-date">{{ formatDateTime(item.create_time) }}</span>
          </div>
          <div class="card-title">{{ item.title }}</div>
          <div class="card-actions">
            <button class="btn-sm" @click.stop="redoTask(item)">{{ $t('my_pages.works.reuse_params') }}</button>
            <button v-if="getImages(item).length > 0" class="btn-sm btn-view" @click.stop="previewImages(item)">{{ $t('my_pages.works.preview') }}</button>
          </div>
        </div>
      </div>

      <div v-else class="empty-hint">
        <p>{{ $t('my_pages.works.empty') }}，<NuxtLink to="/">{{ $t('my_pages.works.empty_link') }}</NuxtLink></p>
      </div>

      <div v-if="total > pageSize" class="pager">
        <button :disabled="page <= 1" @click="page--; fetchAll()">{{ $t('my_pages.works.prev_page') }}</button>
        <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
        <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; fetchAll()">{{ $t('my_pages.works.next_page') }}</button>
      </div>
    </template>

    <ImageLightbox ref="lightbox" />
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'
import ImageLightbox from '@/components/shared/ImageLightbox.vue'

const { t } = useI18n()
const toast = useToast()
const activeTab = ref('all')
const page = ref(1)
const pageSize = 20
const loading = ref(true)
const errorMsg = ref('')
const allTasks = ref<any[]>([])
const total = ref(0)
const lightbox = useTemplateRef('lightbox')

const tabs = computed(() => [
  { key: 'all', label: t('my_pages.works.tab_all') },
  { key: 'image', label: t('my_pages.works.tab_image') },
  { key: 'video', label: t('my_pages.works.tab_video') },
  { key: 'batch', label: t('my_pages.works.tab_batch') },
])

const imageTypes = ['main_image', 'scene', 'detail_h5', 'virtual_tryon', 'color_swap', 'style_transfer', 'wrinkle_remove', 'image_translate']
const videoTypes = ['img2video', 'multi2video', 'video_packaging', 'action_transfer', 'person_replace', 'digital_human', 'script_gen', 'shot_plan', 'viral_clone', 'action_batch', 'video_beautify']
const batchTypes = ['batch']

const filteredList = computed(() => allTasks.value)

function typeLabel(tp: string) {
  const key = `my_pages.works.types.${tp}`
  const translated = t(key)
  return translated !== key ? translated : tp
}

function typeIcon(tp: string) {
  const m: Record<string, string> = {
    main_image: '📷', scene: '🖼', detail_h5: '📄', img2video: '🎬',
    multi2video: '🎥', batch: '📦', video_packaging: '🎞', action_transfer: '🕺',
    person_replace: '🧑', digital_human: '🎙', script_gen: '📝', shot_plan: '🎬',
    viral_clone: '🔥', action_batch: '📦', video_beautify: '✨', virtual_tryon: '👗',
    color_swap: '🎨', style_transfer: '🖌', wrinkle_remove: '👔', image_translate: '🌐',
  }
  return m[tp] || '📁'
}

function getImages(item: any): string[] {
  const r = item.output_result
  if (!r) return []
  if (Array.isArray(r.images)) return r.images.map((u: string) => `/uploads/${u.replace(/^\/?uploads\//, '')}`)
  if (typeof r.url === 'string') return [`/uploads/${r.url.replace(/^\/?uploads\//, '')}`]
  return []
}

function getThumbnail(item: any): string {
  return getImages(item)[0] || ''
}

function previewImages(item: any) {
  const imgs = getImages(item)
  if (imgs.length > 0) lightbox.value?.open(imgs.map((src: string) => ({ src, title: item.title })))
}

async function fetchAll() {
  loading.value = true
  errorMsg.value = ''
  try {
    const endpoints: Promise<any>[] = []
    if (activeTab.value === 'all' || activeTab.value === 'image') {
      endpoints.push($fetch('/api/images/tasks', { params: { page: page.value, pageSize }, credentials: 'include' }).catch((err: any) => { if (import.meta.dev) console.warn('[my-works] image tasks failed', err?.message || err); return { list: [], total: 0 } }))
    }
    if (activeTab.value === 'all' || activeTab.value === 'video') {
      endpoints.push($fetch('/api/videos/tasks', { params: { page: page.value, pageSize }, credentials: 'include' }).catch((err: any) => { if (import.meta.dev) console.warn('[my-works] video tasks failed', err?.message || err); return { list: [], total: 0 } }))
    }
    if (activeTab.value === 'all' || activeTab.value === 'batch') {
      endpoints.push($fetch('/api/advanced/tasks', { params: { page: page.value, pageSize }, credentials: 'include' }).catch((err: any) => { if (import.meta.dev) console.warn('[my-works] advanced tasks failed', err?.message || err); return { list: [], total: 0 } }))
      endpoints.push($fetch('/api/adv-video/tasks', { params: { page: page.value, pageSize }, credentials: 'include' }).catch((err: any) => { if (import.meta.dev) console.warn('[my-works] adv-video tasks failed', err?.message || err); return { list: [], total: 0 } }))
    }

    const results = await Promise.all(endpoints)
    allTasks.value = results.flatMap((r: any) => r.list || []).sort((a: any, b: any) =>
      new Date(b.create_time || 0).getTime() - new Date(a.create_time || 0).getTime()
    )
    total.value = results.reduce((sum: number, r: any) => sum + (r.total || 0), 0)
  } catch (e: any) {
    errorMsg.value = t('my_pages.works.load_failed')
    allTasks.value = []
  }
  loading.value = false
}

function redoTask(item: any) {
  navigateTo(`/work/${item.type === 'main_image' ? 'main-image' : item.type === 'scene' ? 'scene' : item.type.replace(/_/g, '-')}`)
}

function viewDetail(_item: any) {}

onMounted(fetchAll)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
h2 { font-size: 22px; margin-bottom: 16px; }
.tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.tabs button { padding: 6px 20px; border: 1px solid var(--border-light); border-radius: 20px; background: var(--bg-card); font-size: 13px; cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; }
.tabs button:hover { border-color: var(--brand); color: var(--brand); }
.tabs button.active { background: var(--brand); color: #fff; border-color: var(--brand); }

.loading { text-align: center; padding: 60px 0; color: var(--text-tertiary); }

.error-box { display: flex; align-items: center; gap: 12px; padding: 20px; background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; color: var(--text-secondary); font-size: 14px; margin-bottom: 16px; }
.error-icon { font-size: 20px; }
.btn-retry { padding: 6px 16px; border-radius: 6px; border: 1px solid var(--brand); background: transparent; color: var(--brand); cursor: pointer; font-size: 13px; }
.btn-retry:hover { background: var(--brand); color: #fff; }

.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 900px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }

.card { border: 1px solid var(--border-card); border-radius: 12px; overflow: hidden; background: var(--bg-card); cursor: pointer; transition: box-shadow 0.2s, border-color 0.2s; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-color: var(--border-light); }
.card-img { width: 100%; aspect-ratio: 1; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.img-placeholder { font-size: 40px; }
.card-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-info { padding: 10px 12px 4px; display: flex; justify-content: space-between; align-items: center; }
.card-type.tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: var(--tag-bg); color: var(--text-secondary); }
.card-date { font-size: 11px; color: var(--text-muted); }
.card-title { padding: 4px 12px; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-actions { padding: 8px 12px 12px; display: flex; gap: 8px; }
.btn-sm { flex: 1; padding: 6px 0; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); font-size: 12px; cursor: pointer; color: var(--brand); text-align: center; text-decoration: none; display: inline-block; }
.btn-sm:hover { background: var(--brand-light); }
.btn-view { color: var(--text-secondary); }

.empty-hint { text-align: center; padding: 80px 0; color: var(--text-muted); font-size: 15px; }
.empty-hint a { color: var(--text-link); }

.pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 32px; font-size: 14px; }
.pager button { padding: 6px 20px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; }
.pager button:disabled { opacity: 0.3; }
</style>
