<!--
  Movio AI v4.1 — Content Distribution (内容分发)
  G4 前端开发 | W4
  将AI生成内容一键发布到多个电商/社交平台
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ $t('contentDistribution.title') }}</h1>
      <p>{{ $t('contentDistribution.subtitle') }}</p>
    </header>

    <div v-if="loading" class="loading-state">{{ $t('contentDistribution.loading') }}</div>

    <template v-else>

    <!-- 已绑定平台 -->
    <div class="section">
      <h3>{{ $t('contentDistribution.boundPlatforms') }}</h3>
      <div v-if="boundPlatforms.length === 0" class="empty-state">
        <p>{{ $t('contentDistribution.noPlatforms') }}</p>
        <NuxtLink to="/account/bind-platform" class="btn btn-primary btn-sm">{{ $t('contentDistribution.goBind') }}</NuxtLink>
      </div>
      <div v-else class="platform-list">
        <div v-for="p in boundPlatforms" :key="p.platform" class="platform-row">
          <span class="pf-icon">{{ platformIcon(p.platform) }}</span>
          <div class="pf-info">
            <span class="pf-name">{{ p.platform_name || p.platform }}</span>
            <span class="pf-account">{{ p.account_name || p.account_id }}</span>
          </div>
          <span class="pf-status" :class="p.bind_type">{{ bindTypeLabel(p.bind_type) }}</span>
        </div>
      </div>
    </div>

    <!-- 待发布作品 -->
    <div class="section">
      <h3>{{ $t('contentDistribution.pendingWorks') }}</h3>
      <div v-if="recentWorks.length === 0" class="empty-state">
        <p>{{ $t('contentDistribution.noWorks') }}</p>
        <NuxtLink to="/work/video" class="btn btn-primary btn-sm">{{ $t('contentDistribution.goCreate') }}</NuxtLink>
      </div>
      <div v-else class="works-list">
        <div v-for="work in recentWorks" :key="work.id" class="work-row">
          <div class="work-preview" :class="work.type">
            <img v-if="work.type === 'image'" :src="work.url" alt="" />
            <div v-else class="video-thumb">🎬</div>
          </div>
          <div class="work-info">
            <span class="work-type">{{ typeLabel(work.task_type) }}</span>
            <span class="work-date">{{ formatDate(work.created_at) }}</span>
          </div>
          <div class="work-actions">
            <select v-model="work.selectedPlatform" class="input input-sm">
              <option value="">{{ $t('contentDistribution.selectPlatform') }}</option>
              <option v-for="p in boundPlatforms" :key="p.platform" :value="p.platform">{{ p.platform_name || p.platform }}</option>
            </select>
            <button class="btn btn-primary btn-xs" :disabled="!work.selectedPlatform || publishing === work.id" @click="doPublish(work)">
              {{ publishing === work.id ? $t('contentDistribution.publishing') : $t('contentDistribution.publish') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 发布历史 -->
    <div class="section">
      <h3>{{ $t('contentDistribution.publishHistory') }}</h3>
      <div v-if="publishHistory.length === 0" class="empty-state">{{ $t('contentDistribution.noHistory') }}</div>
      <div v-else class="history-list">
        <div v-for="h in publishHistory" :key="h.id" class="history-row">
          <span class="h-platform">{{ h.platform }}</span>
          <span class="h-status" :class="h.status">{{ statusLabel(h.status) }}</span>
          <span v-if="h.published_url" class="h-link"><a :href="h.published_url" target="_blank" rel="noopener noreferrer">{{ $t('contentDistribution.viewLink') }}</a></span>
          <span class="h-time">{{ formatDate(h.created_at) }}</span>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '@/utils/format'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t } = useI18n()
const apiBase = useRuntimeConfig().public.apiBase || '/api'
const toast = useToast()

const boundPlatforms = ref<any[]>([])
const recentWorks = ref<any[]>([])
const publishHistory = ref<any[]>([])
const publishing = ref<number | null>(null)
const loading = ref(true)

const platformIcons: Record<string, string> = {
  douyin: '🎵', taobao: '🛒', kuaishou: '📱', xiaohongshu: '📕',
  tiktok: '🎬', shopee: '🛍', pdd: '📦', jd: '🐶',
}

function platformIcon(p: string) { return platformIcons[p] || '🔗' }

const typeLabelKeys: Record<string, string> = {
  image_gen: 'contentDistribution.typeImageGen',
  video_gen: 'contentDistribution.typeVideoGen',
  action_migrate: 'contentDistribution.typeActionMigrate',
  digital_human: 'contentDistribution.typeDigitalHuman',
  viral_replicate: 'contentDistribution.typeViralReplicate',
}

function typeLabel(tk: string) { return typeLabelKeys[tk] ? t(typeLabelKeys[tk]) : tk }

function bindTypeLabel(b: string) { return b === 'shop' ? t('contentDistribution.shop') : t('contentDistribution.account') }

const statusLabelKeys: Record<string, string> = {
  success: 'contentDistribution.statusSuccess',
  failed: 'contentDistribution.statusFailed',
  processing: 'contentDistribution.statusProcessing',
}

function statusLabel(s: string) { return statusLabelKeys[s] ? t(statusLabelKeys[s]) : s }

onMounted(async () => {
  try {
    const bindsRes: any = await $fetch(`${apiBase}/platforms/bindings`, { credentials: 'include' }).catch((err: any) => { toast.error(t('contentDistribution.errorBindLoad')); if (import.meta.dev) console.warn('[distribution]', err?.message || err); return null })
    if (bindsRes?.code === 200) boundPlatforms.value = bindsRes.data?.list || []

    const worksRes: any = await $fetch(`${apiBase}/assets/list`, { params: { page: 1, pageSize: 10 }, credentials: 'include' }).catch((err: any) => { toast.error(t('contentDistribution.errorWorksLoad')); if (import.meta.dev) console.warn('[distribution]', err?.message || err); return null })
    if (worksRes?.code === 200) {
      recentWorks.value = (worksRes.data?.list || []).map((w: any) => ({ ...w, selectedPlatform: '' }))
    }

    publishHistory.value = []
  } catch { toast.error(t('contentDistribution.errorLoad')) }
  finally { loading.value = false }
})

async function doPublish(work: any) {
  if (!work.selectedPlatform) return
  publishing.value = work.id
  try {
    const res: any = await $fetch(`${apiBase}/platforms/publish`, {
      method: 'POST',
      body: { work_id: work.id, platform: work.selectedPlatform, content_url: work.url },
      credentials: 'include',
    }).catch((err: any) => { toast.error(t('contentDistribution.errorPublish')); if (import.meta.dev) console.warn('[distribution]', err?.message || err); return null })
    if (res?.code === 200) {
      publishHistory.value.unshift({
        id: Date.now(), platform: work.selectedPlatform, status: 'success',
        published_url: res.data?.published_url || '', created_at: new Date().toISOString(),
      })
    }
  } catch { toast.error(t('contentDistribution.errorPublishFailed')) }
  publishing.value = null
}
</script>

<style scoped>
.page-container { max-width: 900px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.page-header { text-align: center; margin-bottom: 24px; }
.page-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 6px; }
.page-header p { color: var(--cfg-text-muted); margin: 0; }

.section { margin-bottom: 28px; }
.section h3 { font-size: var(--cfg-font-size-lg); margin: 0 0 16px; color: var(--cfg-text-primary); }

.empty-state { text-align: center; padding: 32px; color: var(--cfg-text-muted); border: 1px dashed var(--cfg-border); border-radius: var(--cfg-radius-base); }
.empty-state p { margin: 0 0 12px; }

.platform-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.platform-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); }
.platform-row:last-child { border-bottom: none; }
.pf-icon { font-size: 24px; flex-shrink: 0; }
.pf-info { flex: 1; display: flex; flex-direction: column; }
.pf-name { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-primary); }
.pf-account { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.pf-status { font-size: var(--cfg-font-size-xs); padding: 2px 8px; border-radius: var(--cfg-radius-full); }
.pf-status.shop { background: #dbeafe; color: #2563EB; }
.pf-status.account { background: #fef3c7; color: #D97706; }

.works-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.work-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); }
.work-row:last-child { border-bottom: none; }
.work-preview { width: 48px; height: 48px; border-radius: var(--cfg-radius-sm); overflow: hidden; flex-shrink: 0; background: var(--cfg-bg-tertiary); display: flex; align-items: center; justify-content: center; }
.work-preview img { width: 100%; height: 100%; object-fit: cover; }
.video-thumb { font-size: 20px; }
.work-info { flex: 1; display: flex; flex-direction: column; }
.work-type { font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-primary); }
.work-date { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.work-actions { display: flex; gap: 8px; align-items: center; }
.input-sm { width: 100px; padding: 4px 8px; font-size: var(--cfg-font-size-xs); }

.history-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.history-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); font-size: var(--cfg-font-size-sm); }
.history-row:last-child { border-bottom: none; }
.h-platform { font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-primary); min-width: 60px; }
.h-status { padding: 2px 8px; border-radius: var(--cfg-radius-full); font-size: var(--cfg-font-size-xs); }
.h-status.success { background: #d1fae5; color: #059669; }
.h-status.failed { background: #fee2e2; color: #DC2626; }
.h-link { flex: 1; }
.h-link a { color: var(--cfg-primary); text-decoration: none; }
.h-time { color: var(--cfg-text-muted); white-space: nowrap; }
</style>
