<template>
  <div class="my-works-page">
    <div class="page-header">
      <h2>{{ $t('my.works.page_title') }}</h2>
      <div class="header-actions">
        <select v-model="filterType" class="filter-select" @change="fetchWorks">
          <option value="">{{ $t('my.works.filter_all') }}</option>
          <option value="image">{{ $t('my.works.type_image') }}</option>
          <option value="video">{{ $t('my.works.type_video') }}</option>
          <option value="batch">{{ $t('my.works.type_batch') }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" v-for="i in 6" :key="i">
        <div class="sk-thumb"></div>
        <div class="sk-line"></div>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn-retry" @click="fetchWorks">{{ $t('my.works.retry') }}</button>
    </div>

    <template v-else>
      <div v-if="works.length > 0" class="works-grid">
        <div v-for="item in works" :key="item.id" class="work-card" tabindex="0" role="button" @click="openDetail(item)" @keydown.enter="openDetail(item)" @keydown.space.prevent="openDetail(item)">
          <div class="card-thumb">
            <img v-if="item.thumbnail" :src="item.thumbnail" :alt="item.title" loading="lazy" />
            <div v-else class="thumb-placeholder">{{ typeIcon(item.type) }}</div>
            <span class="card-badge" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="card-body">
            <h4 class="card-title">{{ item.title || $t('my.works.unnamed') }}</h4>
            <div class="card-meta">
              <span class="meta-type">{{ typeLabel(item.type) }}</span>
              <span class="meta-date">{{ formatDateTime(item.create_time) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">&#127912;</div>
        <p>{{ $t('my.works.empty') }}</p>
        <NuxtLink to="/workspace" class="btn-go">{{ $t('my.works.go_workspace') }}</NuxtLink>
      </div>

      <Pagination
        v-if="total > pageSize"
        :page="page"
        :total="total"
        :page-size="pageSize"
        @change="onPageChange"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format';

const { t } = useI18n()


const filterType = ref('')
const page = ref(1)
const pageSize = ref(12)
const works = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')

function typeIcon(type: string) {
  const map: Record<string, string> = { image: '🖼️', video: '🎬', batch: '📦' }
  return map[type] || '📄'
}

function typeLabel(type: string) {
  const map: Record<string, string> = { image: t('my.works.type_image'), video: t('my.works.type_video'), batch: t('my.works.type_batch') }
  return map[type] || type
}

function statusLabel(s: number) {
  const map: Record<number, string> = { 0: t('my.works.status_queued'), 1: t('my.works.status_processing'), 2: t('my.works.status_completed'), 3: t('my.works.status_failed') }
  return map[s] || t('my.works.status_unknown')
}

function statusClass(s: number) {
  const map: Record<number, string> = { 0: 's-queue', 1: 's-proc', 2: 's-done', 3: 's-fail' }
  return map[s] || ''
}

async function fetchWorks() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))
    if (filterType.value) params.set('type', filterType.value)

    const res: any = await $fetch(`/api/tasks/my-works?${params.toString()}`, { credentials: 'include' })
    works.value = res.data?.list || res.data || []
    total.value = res.data?.total || 0
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    error.value = err?.data?.msg || err.message || t('my.works.load_failed')
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  fetchWorks()
}

function openDetail(item: any) {
  const routeMap: Record<string, string> = {
    image: '/work/detail-h5',
    main_image: '/work/main-image',
    scene: '/work/scene',
    video: '/work/video',
    batch: '/work/batch',
  }
  const target = routeMap[item.type] || '/workspace'
  navigateTo(target)
}

onMounted(fetchWorks)
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.my-works-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.filter-select {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.work-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
  cursor: pointer;
  transition: transform .2s, box-shadow .2s;
}

.work-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, .12);
}

.card-thumb {
  aspect-ratio: 3/2;
  background: var(--bg-subtle);
  position: relative;
  overflow: hidden;
}

.card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: .75rem;
  color: #fff;
}

.s-done { background: var(--success); }
.s-proc { background: var(--brand); }
.s-queue { background: var(--text-muted); }
.s-fail { background: var(--danger); }

.card-body {
  padding: 12px;
}

.card-title {
  font-size: .875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: .75rem;
  color: var(--text-muted);
}

/* States */
.loading-state {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.skeleton {
  background: var(--bg-card);
  border-radius: var(--radius);
  overflow: hidden;
}

.sk-thumb {
  aspect-ratio: 3/2;
  background: var(--bg-subtle);
  animation: pulse 1.5s infinite;
}

.sk-line {
  height: 14px;
  margin: 12px;
  border-radius: 4px;
  background: var(--bg-subtle);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}

.error-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon { font-size: 3rem; margin-bottom: 12px; }

.btn-retry, .btn-go {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 24px;
  background: var(--brand);
  color: #fff;
  border-radius: var(--radius-sm);
  text-decoration: none;
  cursor: pointer;
  transition: filter .2s;
}

.btn-retry:hover, .btn-go:hover {
  filter: brightness(1.1);
}

@media (max-width: 768px) {
  .my-works-page { padding: 16px; }
  .works-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
