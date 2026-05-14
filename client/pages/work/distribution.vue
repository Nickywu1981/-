<template>
  <div class="distribution-page">
    <div class="page-header">
      <div>
        <h1>{{ $t('work_pages.distribution_page_title') }}</h1>
        <p class="subtitle">{{ $t('work_pages.distribution_subtitle') }}</p>
      </div>
    </div>

    <div class="section">
      <h2>{{ $t('work_pages.distribution_platform_title') }}</h2>
      <div class="platform-grid">
        <label v-for="p in platforms" :key="p.id" class="platform-card" :class="{ selected: selected.includes(p.id) }">
          <input type="checkbox" :value="p.id" v-model="selected" class="platform-check" />
          <span class="platform-icon">{{ p.icon }}</span>
          <span class="platform-name">{{ p.name }}</span>
          <span class="platform-status" :class="{ connected: p.connected }">{{ p.connected ? $t('work_pages.distribution_platform_connected') : $t('work_pages.distribution_platform_disconnected') }}</span>
        </label>
      </div>
    </div>

    <div class="section" v-if="selected.length > 0">
      <h2>{{ $t('work_pages.distribution_content_title') }}</h2>
      <div class="form-group">
        <label>{{ $t('work_pages.distribution_label_title') }}</label>
        <input v-model="form.title" class="input" :placeholder="$t('work_pages.distribution_placeholder_title')" maxlength="200" required />
      </div>
      <div class="form-group">
        <label>{{ $t('work_pages.distribution_label_description') }}</label>
        <textarea v-model="form.description" class="input" rows="3" :placeholder="$t('work_pages.distribution_placeholder_description')" maxlength="2000" />
      </div>
      <div class="form-group">
        <label>{{ $t('work_pages.distribution_label_images') }}</label>
        <input type="file" accept="image/*" multiple @change="onFiles" class="input" />
        <span class="hint">{{ $t('work_pages.distribution_images_hint') }}</span>
      </div>
      <div class="form-group">
        <label>{{ $t('work_pages.distribution_label_schedule') }}</label>
        <input v-model="form.scheduledAt" type="datetime-local" class="input" />
        <span class="hint">{{ $t('work_pages.distribution_schedule_hint') }}</span>
      </div>
    </div>

    <div class="section" v-if="selected.length > 0">
      <div class="action-bar">
        <button class="btn-primary" :disabled="submitting" @click="publish">
          {{ submitting ? $t('work_pages.distribution_btn_publishing') : $t('work_pages.distribution_btn_publish_to', { n: selected.length }) }}
        </button>
        <button class="btn-outline" @click="saveDraft">{{ $t('work_pages.distribution_btn_draft') }}</button>
      </div>
    </div>

    <div class="section">
      <h2>{{ $t('work_pages.distribution_history_title') }}</h2>
      <LoadingSkeleton v-if="loading" type="list" :rows="3" />
      <div v-else-if="history.length === 0" class="empty-hint">{{ $t('work_pages.distribution_history_empty') }}</div>
      <div v-else class="table-wrap">
        <table class="history-table">
          <thead>
            <tr><th>{{ $t('work_pages.distribution_table_content') }}</th><th>{{ $t('work_pages.distribution_table_platform') }}</th><th>{{ $t('work_pages.distribution_table_status') }}</th><th>{{ $t('work_pages.distribution_table_time') }}</th><th>{{ $t('work_pages.distribution_table_actions') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td>{{ h.title }}</td>
              <td>{{ h.platforms?.join(', ') || '-' }}</td>
              <td><span class="status-tag" :class="h.status">{{ statusLabel(h.status) }}</span></td>
              <td>{{ formatDateTime(h.createdAt) }}</td>
              <td><button v-if="h.status === 'failed'" class="btn-sm" @click="retry(h.id)">{{ $t('work_pages.distribution_btn_retry') }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'
const { t } = useI18n()

const platforms = computed(() => [
  { id: 'taobao', name: t('work_pages.distribution_platform_taobao'), icon: '🛒', connected: true },
  { id: 'jd', name: t('work_pages.distribution_platform_jd'), icon: '🐶', connected: true },
  { id: 'pdd', name: t('work_pages.distribution_platform_pdd'), icon: '🔻', connected: true },
  { id: 'douyin', name: t('work_pages.distribution_platform_douyin'), icon: '🎵', connected: false },
  { id: 'kuaishou', name: t('work_pages.distribution_platform_kuaishou'), icon: '▶️', connected: false },
  { id: 'xiaohongshu', name: t('work_pages.distribution_platform_xiaohongshu'), icon: '📕', connected: false },
  { id: 'wechat', name: t('work_pages.distribution_platform_wechat'), icon: '💬', connected: false },
  { id: 'bilibili', name: t('work_pages.distribution_platform_bilibili'), icon: '📺', connected: false },
  { id: 'amazon', name: 'Amazon', icon: '📦', connected: false },
  { id: 'shopee', name: 'Shopee', icon: '🦐', connected: false },
  { id: 'lazada', name: 'Lazada', icon: '🛍️', connected: false },
  { id: 'ebay', name: 'eBay', icon: '🛒', connected: false },
  { id: 'shopify', name: 'Shopify', icon: '🏪', connected: false },
])

const selected = ref<string[]>([])
const submitting = ref(false)
const loading = ref(true)
const history = ref<any[]>([])
const form = reactive({ title: '', description: '', scheduledAt: '', files: [] as File[] })

const statusLabel = (s: string) =>
  ({ pending: t('work_pages.distribution_status_pending'), processing: t('work_pages.distribution_status_processing'), success: t('work_pages.distribution_status_success'), failed: t('work_pages.distribution_status_failed') }[s] || s)

const onFiles = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files) form.files = Array.from(files)
}

const toast = useToast()

const publish = async () => {
  if (!form.title) return toast.warn(t('common.enter_title'))
  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description)
    fd.append('platforms', JSON.stringify(selected.value))
    if (form.scheduledAt) fd.append('scheduledAt', form.scheduledAt)
    form.files.forEach(f => fd.append('files', f))
    await $fetch('/api/publish/submit', { method: 'POST', body: fd })
    toast.success(t('work_pages.distribution_success_publish'))
    fetchHistory()
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('work_pages.distribution_error_publish_failed'))
  } finally {
    submitting.value = false
  }
}

const saveDraft = async () => {
  try {
    await $fetch('/api/publish/drafts', {
      method: 'POST',
      body: { title: form.title, description: form.description, platforms: selected.value },
    })
    toast.success(t('common.draft_saved'))
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || err.message || t('work_pages.distribution_error_draft_failed'))
  }
}

const retry = async (id: number) => {
  try { await $fetch(`/api/publish/retry/${id}`, { method: 'POST' }); fetchHistory() } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.warn(err?.data?.msg || err.message || t('work_pages.distribution_error_retry_failed')) }
}

const fetchHistory = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/distribution/history', { credentials: 'include' })
    history.value = res?.list || res?.data || []
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || e?.message || t('work_pages.distribution_error_load_failed'))
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistory)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.history-table { width: 100%; border-collapse: collapse; min-width: 500px; }
</style>
