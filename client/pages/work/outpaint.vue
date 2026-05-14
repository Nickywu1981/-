<template>
  <WorkLayout :title="$t('work_pages.outpainting.title')" :subtitle="$t('work_pages.outpainting.subtitle')" :steps="steps" :current-step="currentStep">
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.outpainting.upload_title') }}</div>
        <div class="ws-section__desc">{{ $t('work_pages.outpainting.upload_desc') }}</div>
        <div class="ws-upload-area" @dragover.prevent @drop.prevent="handleDrop" @click="triggerUpload">
          <div v-if="!previewUrl" class="ws-upload-area__inner">
            <div class="ws-upload-area__icon">↔</div>
            <div class="ws-upload-area__text">{{ $t('work_pages.outpainting.upload_hint') }}</div>
            <div class="ws-upload-area__hint">{{ $t('work_pages.outpainting.upload_format_hint') }}</div>
          </div>
          <img loading="lazy" v-else :src="previewUrl" :alt="$t('work_pages.outpainting.upload_preview_alt')" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        </div>
        <div v-if="uploading" class="ws-uploading">⏳ {{ $t('work_pages.outpainting.uploading') }}</div>
        <div v-else-if="uploadedUrl" class="ws-uploaded">✓ {{ $t('work_pages.outpainting.uploaded') }}</div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.outpainting.direction_title') }}</div>
        <div class="direction-grid">
          <div v-for="d in directions" :key="d.id" class="direction-card" :class="{ active: selectedDirection === d.id }" @click="selectedDirection = d.id">
            <div class="direction-card__icon">{{ d.icon }}</div>
            <div class="direction-card__name">{{ d.name }}</div>
          </div>
        </div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.outpainting.ratio_title') }}</div>
        <div class="ws-slider-row">
          <input type="range" v-model="ratio" min="10" max="50" step="5" class="ws-range" />
          <span class="ws-range-val">{{ ratio }}%</span>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">{{ $t('work_pages.outpainting.cost_prefix') }} <strong>3</strong> {{ $t('work_pages.outpainting.cost_unit') }}</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!uploadedUrl || submitting" @click="submitOutpaint">{{ submitting ? $t('work_pages.outpainting.submitting') : $t('work_pages.outpainting.submit_btn') }}</button>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.outpainting.result_title') }}</div>
        <div v-if="task.polling.value" class="progress-box">
          <div class="spinner" /><p>{{ task.progressMsg.value || $t('work_pages.outpainting.generating') }}</p>
          <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
        </div>
        <div v-else-if="task.status.value === 2" class="result-compare">
          <div class="result-compare__item">
            <div class="result-compare__label">{{ $t('work_pages.outpainting.original_img') }}</div>
            <img loading="lazy" v-if="uploadedUrl" :src="uploadedUrl" :alt="$t('work_pages.outpainting.original_alt')" class="result-compare__img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img placeholder" />
          </div>
          <div class="result-compare__divider">
            <div class="result-compare__arrow">→</div>
            <div class="result-compare__badge">{{ $t('work_pages.outpainting.ai_expand_badge') }}</div>
          </div>
          <div class="result-compare__item">
            <div class="result-compare__label">{{ $t('work_pages.outpainting.expanded_label') }}</div>
            <img loading="lazy" v-if="task.result.value" :src="task.result.value" :alt="$t('work_pages.outpainting.expanded_alt')" class="result-compare__img after" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img placeholder" />
          </div>
        </div>
        <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value || $t('work_pages.outpainting.task_failed') }}</p><button class="ws-btn ws-btn--primary" @click="handleRedo">{{ $t('work_pages.outpainting.retry_btn') }}</button></div>
        <div v-else class="ws-placeholder"><div class="ws-placeholder__icon">↔</div><div class="ws-placeholder__text">{{ $t('work_pages.outpainting.result_placeholder') }}</div></div>
      </div>
      </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const steps = computed(() => [t('work_pages.outpainting.step_upload'), t('work_pages.outpainting.step_settings'), t('work_pages.outpainting.step_result')])
const currentStep = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const uploading = ref(false)
const submitting = ref(false)
const selectedDirection = ref('all')
const ratio = ref(30)
const task = useTask()
const fileInput = ref<HTMLInputElement>()

const directions = computed(() => [
  { id: 'all', icon: '🔲', name: t('work_pages.outpainting.dir_all') },
  { id: 'up', icon: '⬆', name: t('work_pages.outpainting.dir_up') },
  { id: 'down', icon: '⬇', name: t('work_pages.outpainting.dir_down') },
  { id: 'left', icon: '⬅', name: t('work_pages.outpainting.dir_left') },
  { id: 'right', icon: '➡', name: t('work_pages.outpainting.dir_right') },
])

function triggerUpload() { fileInput.value?.click() }

async function uploadFile(file: File) {
  uploading.value = true
  const formData = new FormData(); formData.append('file', file)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData })
    uploadedUrl.value = res.data?.url
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_upload')) }
  uploading.value = false
}

async function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) { previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]) }
}

async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files?.length) { previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]) }
}

async function submitOutpaint() {
  if (!uploadedUrl.value) { toast.warn(t('common.upload_image_first')); return }
  submitting.value = true
  try {
    const res: any = await $fetch('/api/advanced/outpaint', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, direction: selectedDirection.value, ratio: ratio.value },
    })
    currentStep.value = 2
    task.pollTask(res.data?.taskId, '/api/advanced/tasks/')
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_submit')) }
  submitting.value = false
}

function handleRedo() { task.reset(); currentStep.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; submitting.value = false }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.direction-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.direction-card { padding: 14px; border-radius: var(--radius-lg); border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; text-align: center; transition: border-color var(--transition-fast), transform var(--transition-fast), background var(--transition-fast); }
.direction-card:hover { border-color: var(--brand-soft); transform: translateY(-2px); }
.direction-card.active { border-color: var(--brand); background: var(--brand-light); }
.direction-card__icon { font-size: 1.5rem; margin-bottom: 4px; }
.direction-card__name { font-size: 0.8rem; color: var(--text-secondary); }
.ws-uploading, .ws-uploaded { text-align: center; padding: 8px; font-size: 0.9rem; }
.ws-uploaded { color: var(--success); }
.ws-slider-row { display: flex; align-items: center; gap: 14px; }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; flex-wrap: wrap; gap: 12px; }
.result-compare { display: flex; align-items: center; gap: 20px; }
.result-compare__item { flex: 1; text-align: center; }
.result-compare__label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; }
.result-compare__img { width: 100%; aspect-ratio: 1/1; border-radius: var(--radius-lg); border: 2px solid var(--border); object-fit: cover; }
.result-compare__img.placeholder { background: var(--bg-hover); }
.result-compare__img.after { aspect-ratio: auto; }
.result-compare__divider { text-align: center; flex-shrink: 0; }
.result-compare__arrow { font-size: 1.5rem; color: var(--brand); }
.result-compare__badge { font-size: 0.72rem; color: var(--brand); margin-top: 4px; }
.ws-range { flex: 1; accent-color: var(--brand); }
.ws-range-val { font-weight: 600; min-width: 44px; text-align: right; font-size: 0.9rem; color: var(--brand); }
.progress-box { text-align: center; padding: 40px; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.bar { width: 100%; height: 6px; background: var(--bg-hover); border-radius: 3px; margin-top: 16px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width 0.3s; }
.error-box { text-align: center; padding: 40px; color: var(--danger); }
@media (max-width: 640px) { .result-compare { flex-direction: column; } .result-compare__divider { transform: rotate(90deg); } }
</style>
