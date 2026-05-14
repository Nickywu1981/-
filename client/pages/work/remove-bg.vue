<template>
  <WorkLayout :title="$t('work_pages.remove_bg_title')" :subtitle="$t('work_pages.remove_bg_subtitle')" :steps="steps" :current-step="currentStep">
    <!-- Input mode: no task running -->
    <div v-if="taskStatus === -1">
      <div class="upload-section">
        <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
          <p class="dz-icon">🖼️</p>
          <p>{{ $t('work_pages.remove_bg_drop_text') }}</p>
          <p class="hint">{{ $t('work_pages.remove_bg_drop_hint') }}</p>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
          <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.remove_bg_select_image') }}</button>
        </div>
        <div v-if="previewUrl" class="preview-box">
          <img loading="lazy" :src="previewUrl" :alt="$t('work_pages.remove_bg_preview_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <button class="preview-remove" @click="clearImage" :aria-label="$t('work_pages.remove_bg_clear_image')">✕</button>
        </div>
        <p v-if="uploadErr" class="msg msg-error">{{ uploadErr }}</p>
        <p v-if="uploading" class="msg">{{ $t('work_pages.remove_bg_uploading') }}</p>
        <div v-if="previewUrl" class="actions">
          <div class="cost-badge">{{ $t('work_pages.remove_bg_cost', { count: 2 }) }}</div>
          <button class="btn btn-brand" @click="currentStep = 1">{{ $t('work_pages.remove_bg_next_bg') }}</button>
        </div>
      </div>

      <div v-if="currentStep >= 1" class="param-section">
        <h3 class="param-title">{{ $t('work_pages.remove_bg_bg_title') }}</h3>
        <div class="bg-grid">
          <button v-for="bg in bgOptions" :key="bg.id" class="bg-card" :class="{ active: selectedBg === bg.id }" @click="selectedBg = bg.id">
            <span class="bg-preview" :style="{ background: bg.css }" />
            <span class="bg-label">{{ $t(bg.nameKey) }}</span>
            <span v-if="bg.id === 'transparent'" class="bg-badge">{{ $t('work_pages.remove_bg_recommended') }}</span>
          </button>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="currentStep = 0">{{ $t('common.back') }}</button>
          <button class="btn btn-brand" :disabled="processing" @click="startRemoveBg">
            <span v-if="processing" class="spinner" /> {{ processing ? $t('work_pages.remove_bg_processing') : $t('work_pages.remove_bg_start') }}
          </button>
        </div>
      </div>

      <div v-if="!previewUrl" class="empty-hint">
        <span class="empty-icon">🖼️</span>
        <p>{{ $t('work_pages.remove_bg_empty_hint') }}</p>
      </div>
    </div>

    <!-- Result -->
    <div v-else-if="taskStatus === 2" class="result-section">
      <h3 class="result-title">{{ $t('work_pages.remove_bg_result_title') }}</h3>
      <div class="compare-row">
        <div class="compare-card">
          <span class="compare-label">{{ $t('work_pages.remove_bg_original_label') }}</span>
          <img loading="lazy" :src="uploadedUrl" class="compare-img" :alt="$t('work_pages.remove_bg_original_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        </div>
        <span class="compare-arrow">→</span>
        <div class="compare-card">
          <span class="compare-label">{{ $t('work_pages.remove_bg_after_label') }}</span>
          <img loading="lazy" :src="resultUrl" class="compare-img" :alt="$t('work_pages.remove_bg_after_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-brand" @click="downloadResult">{{ $t('work_pages.remove_bg_download_png') }}</button>
        <button class="btn-outline" @click="resetAll">{{ $t('work_pages.remove_bg_redo') }}</button>
      </div>
    </div>

    <!-- Progress -->
    <div v-else-if="taskStatus === 0 || taskStatus === 1" class="progress-section">
      <div class="spinner-lg" />
      <p>{{ progressMsg || $t('work_pages.remove_bg_queued') }}</p>
      <div class="progress-bar"><div class="progress-fill" :style="{ width: progress + '%' }" /></div>
      <p class="progress-pct">{{ progress }}%</p>
    </div>

    <!-- Error -->
    <div v-else-if="taskStatus === 3" class="error-section">
      <p class="error-icon">!</p>
      <p>{{ errorMsg || $t('work_pages.remove_bg_failed_process') }}</p>
      <button class="btn-outline" @click="startRemoveBg">{{ $t('common.retry') }}</button>
    </div>

    <!-- Fallback -->
    <div v-else class="empty-hint">
      <span class="empty-icon">🖼️</span>
      <p>{{ $t('work_pages.remove_bg_empty_hint') }}</p>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const steps = computed(() => [t('work_pages.remove_bg_step_upload'), t('work_pages.remove_bg_step_bg'), t('work_pages.remove_bg_step_download')])
const currentStep = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const resultUrl = ref('')
const uploading = ref(false)
const uploadErr = ref('')
const processing = ref(false)
const selectedBg = ref('transparent')
const fileInput = ref<HTMLInputElement | null>(null)
const taskStatus = ref(-1)
const POLL_INITIAL_MS = 1000
const POLL_INTERVAL_MS = 2000
const POLL_BACKOFF_MS = 5000
const progress = ref(0)
const progressMsg = ref('')
const errorMsg = ref('')
const { download } = useFileDownload()
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0
let consecutiveFailures = 0

const bgOptions = [
  { id: 'transparent', nameKey: 'work_pages.remove_bg_bg_transparent', css: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%) 0 0 / 20px 20px, #fff' },
  { id: 'white', nameKey: 'work_pages.remove_bg_bg_white', css: '#ffffff' },
  { id: 'gray', nameKey: 'work_pages.remove_bg_bg_gray', css: '#e5e7eb' },
]

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file?.type.startsWith('image/')) uploadFile(file)
}

function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadFile(file)
}

async function uploadFile(file: File) {
  previewUrl.value = createBlobUrl(file)
  uploadErr.value = ''
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const res: any = await $fetch('/api/upload/image', {
      method: 'POST', credentials: 'include', body: form,
    })
    uploadedUrl.value = res.data?.url || previewUrl.value
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    uploadErr.value = err?.data?.msg || t('work_pages.remove_bg_failed_upload')
  } finally { uploading.value = false }
}

function clearImage() {
  stopPolling()
  if (previewUrl.value) revoke(previewUrl.value);
  previewUrl.value = ''
  uploadedUrl.value = ''
  uploadErr.value = ''
  taskStatus.value = -1
  currentStep.value = 0
}

async function startRemoveBg() {
  processing.value = true
  taskStatus.value = 0
  progress.value = 0
  try {
    const res: any = await $fetch('/api/images/remove-bg', {
      method: 'POST', credentials: 'include',
      body: { imageUrl: uploadedUrl.value, bgType: selectedBg.value },
    })
    const taskId = res.data?.taskId
    if (taskId) {
      currentStep.value = 2
      startPolling(taskId)
    } else {
      resultUrl.value = res.data?.resultUrl || uploadedUrl.value
      taskStatus.value = 2
    }
    processing.value = false
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    taskStatus.value = 3
    errorMsg.value = err?.data?.msg || t('work_pages.remove_bg_failed_process')
    processing.value = false
  }
}

function startPolling(taskId: string) {
  stopPolling()
  pollCount = 0
  consecutiveFailures = 0
  const poll = async () => {
    try {
      const res: any = await $fetch(`/api/images/tasks/${taskId}`, {
        credentials: 'include',
      })
      const d = res.data
      taskStatus.value = d.status
      progress.value = d.progress ?? 0
      progressMsg.value = d.progress_msg || ''
      consecutiveFailures = 0
      if (d.status === 2) {
        resultUrl.value = d.output_result?.url || d.resultUrl || uploadedUrl.value
        stopPolling()
        return
      } else if (d.status === 3) {
        errorMsg.value = d.error_msg || t('work_pages.remove_bg_failed_task')
        stopPolling()
        return
      }
    } catch { consecutiveFailures++ }
    pollCount++
    let interval = POLL_INITIAL_MS
    if (pollCount > 5) interval = POLL_INTERVAL_MS
    if (consecutiveFailures > 3) interval = POLL_BACKOFF_MS
    pollTimer = setTimeout(poll, interval)
  }
  poll()
}

function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null } }

function downloadResult() {
  if (resultUrl.value) { download(resultUrl.value, 'remove-bg.png') }
}

function resetAll() {
  stopPolling()
  currentStep.value = 0; taskStatus.value = -1; resultUrl.value = ''; clearImage()
}

onUnmounted(() => stopPolling())
const { t } = useI18n()
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.upload-section { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.dropzone { width: 100%; max-width: 480px; padding: 48px 24px; border: 2px dashed var(--border-light); border-radius: var(--radius-xl); text-align: center; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
.dropzone:hover { border-color: var(--brand); background: var(--brand-alpha); }
.dz-icon { font-size: 40px; margin-bottom: 8px; }
.dropzone p { margin: 4px 0; color: var(--text-primary); font-size: 15px; }
.hint { font-size: 12px !important; color: var(--text-muted) !important; }
.btn-outline { padding: 8px 20px; border: 1px solid var(--brand); border-radius: var(--radius-lg); background: transparent; color: var(--brand); font-size: 14px; cursor: pointer; transition: background var(--transition-fast); }
.btn-outline:hover { background: var(--brand-alpha); }
.btn-brand { padding: 10px 24px; border: none; border-radius: var(--radius-lg); background: var(--brand-gradient); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform var(--transition-fast), box-shadow var(--transition-fast); display: flex; align-items: center; gap: 8px; }
.btn-brand:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 16px var(--brand-alpha); }
.btn-brand:disabled { opacity: 0.5; cursor: not-allowed; }
.preview-box { position: relative; width: 100%; max-width: 320px; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-light); }
.preview-box img { width: 100%; display: block; }
.preview-remove { position: absolute; top: 8px; right: 8px; min-width: 28px; min-height: 28px; border: none; border-radius: 50%; background: rgba(0,0,0,.5); color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.msg { font-size: 13px; color: var(--text-muted); }
.msg-error { color: var(--danger); }
.actions { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
.cost-badge { padding: 4px 12px; background: var(--brand-alpha); border-radius: var(--radius-lg); font-size: 12px; color: var(--brand); }
.cost-badge strong { font-size: 16px; }

.param-section { display: flex; flex-direction: column; gap: 20px; }
.param-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.bg-card { padding: 16px 12px; border: 2px solid var(--border-light); border-radius: var(--radius-lg); background: var(--bg-card); cursor: pointer; text-align: center; transition: border-color var(--transition-fast), transform var(--transition-fast); position: relative; }
.bg-card:hover { border-color: var(--brand); transform: translateY(-2px); }
.bg-card.active { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-alpha); }
.bg-preview { display: block; width: 80px; height: 60px; margin: 0 auto 8px; border-radius: var(--radius-md); border: 1px solid var(--border-light); }
.bg-label { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.bg-badge { position: absolute; top: 6px; right: 6px; padding: 1px 6px; background: var(--brand); color: #fff; border-radius: var(--radius-xs); font-size: 10px; font-weight: 600; }

.result-section, .progress-section, .error-section { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.result-title { font-size: 18px; font-weight: 600; color: var(--success); }
.compare-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; }
.compare-card { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.compare-label { font-size: 12px; color: var(--text-muted); }
.compare-img { max-width: 200px; max-height: 200px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); }
.compare-arrow { font-size: 24px; color: var(--brand); }

.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; }
.spinner-lg { width: 40px; height: 40px; border: 3px solid var(--brand-alpha); border-top-color: var(--brand); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.progress-bar { width: 100%; max-width: 320px; height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width .3s; }
.progress-pct { font-size: 13px; color: var(--text-secondary); }

.error-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--danger); color: #fff; font-weight: 700; font-size: 20px; display: flex; align-items: center; justify-content: center; }

.empty-hint { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.empty-hint p { font-size: 15px; color: var(--text-secondary); }
</style>
