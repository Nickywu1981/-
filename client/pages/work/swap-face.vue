<template>
  <WorkLayout :title="$t('work_pages.swap_face.title')" :steps="steps" :current-step="step">
    <div v-if="step === 0" class="step-content">
      <h3 class="step-title">{{ $t('work_pages.swap_face.base_title') }}</h3>
      <p class="step-desc">{{ $t('work_pages.swap_face.base_desc') }}</p>
      <div class="dropzone" :class="{ 'has-file': previewUrl }" @dragover.prevent @drop.prevent="handleDrop">
        <template v-if="!previewUrl">
          <span class="dz-icon">😊</span>
          <p class="dz-label">{{ $t('work_pages.swap_face.drop_label') }}</p>
          <p class="dz-hint">{{ $t('work_pages.swap_face.drop_hint') }}</p>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
          <button class="btn-outline-sm" @click="fileInput?.click()">{{ $t('work_pages.swap_face.select_base') }}</button>
        </template>
        <img loading="lazy" v-else :src="previewUrl" alt="preview" class="preview-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      </div>
      <p v-if="uploading" class="upload-status"><span class="spinner-sm" /> {{ $t('work_pages.swap_face.uploading') }}</p>
      <button v-if="uploadedUrl" class="btn-primary" @click="step = 1">{{ $t('work_pages.swap_face.next_face') }}</button>
    </div>

    <div v-else-if="step === 1" class="step-content">
      <h3 class="step-title">{{ $t('work_pages.swap_face.face_title') }}</h3>
      <p class="step-desc">{{ $t('work_pages.swap_face.face_desc') }}</p>
      <div class="dropzone" :class="{ 'has-file': facePreviewUrl }" @dragover.prevent @drop.prevent="handleFaceDrop">
        <template v-if="!facePreviewUrl">
          <span class="dz-icon">👤</span>
          <p class="dz-label">{{ $t('work_pages.swap_face.face_drop_label') }}</p>
          <p class="dz-hint">{{ $t('work_pages.swap_face.face_drop_hint') }}</p>
          <input ref="faceInput" type="file" accept="image/*" hidden @change="handleFaceFile" />
          <button class="btn-outline-sm" @click="faceInput?.click()">{{ $t('work_pages.swap_face.select_face') }}</button>
        </template>
        <img loading="lazy" v-else :src="facePreviewUrl" alt="face" class="preview-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      </div>
      <div class="cost-badge"><span class="cost-icon">⚡</span> {{ $t('work_pages.swap_face.cost_badge') }}</div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.swap_face.back_btn') }}</button>
        <button v-if="faceUploadedUrl" class="btn-primary" @click="submitTask">{{ $t('work_pages.swap_face.start_swap') }}</button>
        <button v-else class="btn-primary" disabled>{{ $t('work_pages.swap_face.upload_face_first') }}</button>
      </div>
    </div>

    <div v-else class="step-content result-step">
      <div v-if="processing" class="processing-card">
        <span class="spinner" />
        <h4>{{ $t('work_pages.swap_face.processing_title') }}</h4>
        <p class="hint">{{ $t('work_pages.swap_face.processing_hint') }}</p>
      </div>
      <div v-if="resultUrl && !processing" class="result-display">
        <div class="compare-row">
          <div class="compare-item"><p class="compare-label">{{ $t('work_pages.swap_face.original_base') }}</p><img loading="lazy" :src="previewUrl" alt="original" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
          <span class="compare-arrow">+</span>
          <div class="compare-item"><p class="compare-label">{{ $t('work_pages.swap_face.target_face') }}</p><img loading="lazy" :src="facePreviewUrl" alt="face" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
          <span class="compare-arrow">→</span>
          <div class="compare-item"><p class="compare-label">{{ $t('work_pages.swap_face.swap_result') }}</p><img loading="lazy" :src="resultUrl" alt="result" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
        </div>
        <div class="result-actions">
          <button class="btn-primary" @click="downloadImage">{{ $t('work_pages.swap_face.download_btn') }}</button>
          <button class="btn-outline" @click="resetAll">{{ $t('work_pages.swap_face.re_swap') }}</button>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()

const steps = computed(() => [t('work_pages.swap_face.step_upload_base'), t('work_pages.swap_face.step_upload_face'), t('work_pages.swap_face.step_generate')])
const step = ref(0)
const previewUrl = ref(''); const uploadedUrl = ref(''); const uploading = ref(false)
const facePreviewUrl = ref(''); const faceUploadedUrl = ref('')
const processing = ref(false); const resultUrl = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const faceInput = ref<HTMLInputElement | null>(null)

const toast = useToast()
async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const oldUrl = previewUrl.value
  previewUrl.value = createBlobUrl(file)
  if (oldUrl) revoke(oldUrl)
  uploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res: any = await $fetch('/api/upload/image', { method: 'POST', body: fd })
    uploadedUrl.value = res.data?.url || res.url
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_upload'))
    previewUrl.value = ''
  } finally { uploading.value = false }
}
async function handleFaceFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const oldUrl = facePreviewUrl.value
  facePreviewUrl.value = createBlobUrl(file)
  if (oldUrl) revoke(oldUrl)
  try {
    const fd = new FormData(); fd.append('file', file)
    const res: any = await $fetch('/api/upload/image', { method: 'POST', body: fd })
    faceUploadedUrl.value = res.data?.url || res.url
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_upload'))
    facePreviewUrl.value = ''
  }
}
async function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const oldUrl = previewUrl.value
  previewUrl.value = createBlobUrl(file)
  if (oldUrl) revoke(oldUrl)
  uploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res: any = await $fetch('/api/upload/image', { method: 'POST', body: fd })
    uploadedUrl.value = res.data?.url || res.url
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_upload'))
    previewUrl.value = ''
  } finally { uploading.value = false }
}
async function handleFaceDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const oldUrl = facePreviewUrl.value
  facePreviewUrl.value = createBlobUrl(file)
  if (oldUrl) revoke(oldUrl)
  try {
    const fd = new FormData(); fd.append('file', file)
    const res: any = await $fetch('/api/upload/image', { method: 'POST', body: fd })
    faceUploadedUrl.value = res.data?.url || res.url
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_upload'))
    facePreviewUrl.value = ''
  }
}
async function submitTask() {
  processing.value = true; step.value = 2
  try {
    const res: any = await $fetch('/api/advanced/swap-face', { method: 'POST', body: { base_url: uploadedUrl.value, face_url: faceUploadedUrl.value } })
    resultUrl.value = res.data?.result_url || res.result_url
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('work_pages.swap_face.failed'))
    step.value = 1
  } finally { processing.value = false }
}
const { download } = useFileDownload()
function downloadImage() { if (resultUrl.value) download(resultUrl.value, 'swap-face.png') }
function resetAll() { step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; facePreviewUrl.value = ''; faceUploadedUrl.value = ''; resultUrl.value = ''; processing.value = false }

onBeforeUnmount(() => {
  if (previewUrl.value) revoke(previewUrl.value)
  if (facePreviewUrl.value) revoke(facePreviewUrl.value)
})
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.step-content { max-width: 720px; margin: 0 auto; }
.step-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
.step-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
.dropzone { border: 2px dashed var(--input-border); border-radius: var(--radius-xl); padding: 36px 24px; text-align: center; background: var(--bg-card); transition: border-color var(--transition-fast), background var(--transition-fast); cursor: pointer; }
.dropzone:hover { border-color: var(--brand-light); background: var(--brand-subtle); }
.dropzone.has-file { padding: 12px; border-style: solid; border-color: var(--brand); }
.dz-icon { font-size: 48px; display: block; margin-bottom: 8px; }
.dz-label { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.dz-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
.preview-img { max-width: 100%; max-height: 280px; border-radius: var(--radius-lg); }
.btn-outline-sm { padding: 8px 18px; background: transparent; color: var(--brand); border: 1px solid var(--brand); border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: background var(--transition-fast); }
.btn-outline-sm:hover { background: var(--brand-subtle); }
.upload-status { display: flex; align-items: center; gap: 6px; justify-content: center; margin-top: 12px; font-size: 13px; color: var(--brand); }
.spinner-sm { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--input-border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
.cost-badge { display: inline-flex; align-items: center; gap: 4px; margin-top: 16px; padding: 6px 14px; background: var(--bg-subtle); border-radius: 20px; font-size: 12px; color: var(--text-secondary); }
.actions { display: flex; gap: 10px; margin-top: 20px; justify-content: center; }
.btn-primary { padding: 10px 28px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; font-weight: 600; transition: opacity var(--transition-fast), transform var(--transition-fast); box-shadow: var(--shadow-brand); display: block; margin: 16px auto 0; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-outline { padding: 10px 28px; background: transparent; color: var(--text-primary); border: 1px solid var(--input-border); border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.processing-card { text-align: center; padding: 48px 24px; background: var(--bg-card); border-radius: var(--radius-xl); }
.processing-card h4 { margin: 12px 0 6px; font-size: 16px; color: var(--text-primary); }
.hint { font-size: 12px; color: var(--text-muted); }
.spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--input-border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.result-display { text-align: center; }
.compare-row { display: flex; align-items: flex-start; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.compare-item { text-align: center; }
.compare-item img { max-width: 180px; max-height: 240px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
.compare-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
.compare-arrow { font-size: 24px; color: var(--brand); font-weight: 700; align-self: center; }
.result-actions { display: flex; gap: 10px; justify-content: center; }

@media (max-width: 768px) {
  .compare-row { flex-direction: column; align-items: center; }
  .compare-arrow { transform: rotate(90deg); }
}
</style>
