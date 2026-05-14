<template>
  <WorkLayout :title="$t('work_pages.person_replace_title')" :subtitle="$t('work_pages.person_replace_subtitle')" :steps="steps" :current-step="currentStep">
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.person_replace_step_upload') }}</div>
        <div class="dual-upload">
          <div class="dual-upload__col">
            <div class="dual-upload__label">{{ $t('work_pages.person_replace_upload_product') }}</div>
            <div class="ws-upload-area" @dragover.prevent @drop.prevent="(e: DragEvent) => handleDrop(e, 'source')">
              <div class="ws-upload-area__icon" v-if="!sourceUrl">👕</div>
              <img loading="lazy" v-else :src="sourceUrl" :alt="$t('work_pages.person_replace_alt_source')" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
              <div class="ws-upload-area__text">{{ sourceUrl ? $t('work_pages.person_replace_click_change') : $t('work_pages.person_replace_upload_product_text') }}</div>
              <input ref="sourceInput" type="file" accept="image/*" hidden @change="(e: Event) => handleFile(e, 'source')" />
              <button class="ws-btn ws-btn--secondary ws-btn--sm" type="button" @click="sourceInput?.click()">{{ $t('work_pages.person_replace_btn_select') }}</button>
            </div>
            <div class="upload-status" v-if="uploadingSrc">{{ $t('work_pages.person_replace_uploading') }}</div>
            <div class="upload-status ok" v-else-if="uploadedSourceUrl">{{ $t('work_pages.person_replace_uploaded') }}</div>
          </div>
          <div class="dual-upload__col">
            <div class="dual-upload__label">{{ $t('work_pages.person_replace_upload_person') }}</div>
            <div class="ws-upload-area" @dragover.prevent @drop.prevent="(e: DragEvent) => handleDrop(e, 'target')">
              <div class="ws-upload-area__icon" v-if="!targetUrl">🧑</div>
              <img loading="lazy" v-else :src="targetUrl" :alt="$t('work_pages.person_replace_alt_target')" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
              <div class="ws-upload-area__text">{{ targetUrl ? $t('work_pages.person_replace_click_change') : $t('work_pages.person_replace_upload_person_text') }}</div>
              <input ref="targetInput" type="file" accept="image/*" hidden @change="(e: Event) => handleFile(e, 'target')" />
              <button class="ws-btn ws-btn--secondary ws-btn--sm" type="button" @click="targetInput?.click()">{{ $t('work_pages.person_replace_btn_select') }}</button>
            </div>
            <div class="upload-status" v-if="uploadingTgt">{{ $t('work_pages.person_replace_uploading') }}</div>
            <div class="upload-status ok" v-else-if="uploadedTargetUrl">{{ $t('work_pages.person_replace_uploaded') }}</div>
          </div>
        </div>
      </div>
      <div class="ws-section" v-if="sourceUrl && targetUrl">
        <div class="ws-section__title">{{ $t('work_pages.person_replace_params_title') }}</div>
        <div class="param-group">
          <div class="param-group__label">{{ $t('work_pages.person_replace_skin') }}</div>
          <div class="param-row">
            <span v-for="s in skinTones" :key="s.key" class="ws-tag" :class="{ active: selectedSkin === s.key }" @click="selectedSkin = s.key">{{ s.label }}</span>
          </div>
        </div>
        <div class="param-group">
          <div class="param-group__label">{{ $t('work_pages.person_replace_body') }}</div>
          <div class="param-row">
            <span v-for="b in bodyTypes" :key="b.key" class="ws-tag" :class="{ active: selectedBody === b.key }" @click="selectedBody = b.key">{{ b.label }}</span>
          </div>
        </div>
        <div class="param-group">
          <div class="param-group__label">{{ $t('work_pages.person_replace_style') }}</div>
          <div class="param-row">
            <span v-for="st in styleOptions" :key="st.key" class="ws-tag" :class="{ active: selectedStyle === st.key }" @click="selectedStyle = st.key">{{ st.label }}</span>
          </div>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">{{ $t('work_pages.person_replace_cost') }} <strong>6</strong> {{ $t('work_pages.person_replace_cost_unit') }}</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!sourceUrl || !targetUrl" @click="submitTask">{{ $t('work_pages.person_replace_btn_start') }}</button>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.person_replace_step_result') }}</div>
        <div class="ws-placeholder" v-if="task.status.value === 0">
          <div class="ws-placeholder__icon">✨</div>
          <div class="ws-placeholder__text">{{ $t('work_pages.person_replace_result_placeholder') }}</div>
        </div>
        <div class="progress-box" v-else-if="task.polling.value">
          <div class="spinner" />
          <p>{{ task.progressMsg.value }}</p>
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: task.progress.value + '%' }" />
          </div>
        </div>
        <div class="result-compare" v-else-if="task.status.value === 2">
          <div class="result-compare__item">
            <div class="result-compare__label">{{ $t('work_pages.person_replace_before') }}</div>
            <div class="result-compare__img" />
          </div>
          <div class="result-compare__arrow">→</div>
          <div class="result-compare__item">
            <div class="result-compare__label">{{ $t('work_pages.person_replace_after') }}</div>
            <div class="result-compare__img after" />
          </div>
        </div>
        <div class="ws-error" v-else-if="task.status.value === 3">
          <p>{{ task.errorMsg.value || $t('work_pages.person_replace_error_generate_failed') }}</p>
          <button class="ws-btn ws-btn--primary" @click="handleRedo">{{ $t('work_pages.person_replace_btn_retry') }}</button>
        </div>
      </div>
      </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const steps = computed(() => [t('work_pages.person_replace_step_upload'), t('work_pages.person_replace_step_params'), t('work_pages.person_replace_step_result')])
const currentStep = ref(0)
const sourceUrl = ref('')
const targetUrl = ref('')
const uploadedSourceUrl = ref('')
const uploadedTargetUrl = ref('')
const uploadingSrc = ref(false)
const uploadingTgt = ref(false)
const selectedSkin = ref('natural')
const selectedBody = ref('standard')
const selectedStyle = ref('casual')
const sourceInput = ref<HTMLInputElement | null>(null)
const targetInput = ref<HTMLInputElement | null>(null)
const task = useTask()

const skinTones = computed(() => [
  { key: 'fair', label: t('work_pages.person_replace_skin_fair') },
  { key: 'natural', label: t('work_pages.person_replace_skin_natural') },
  { key: 'wheat', label: t('work_pages.person_replace_skin_wheat') },
  { key: 'dark', label: t('work_pages.person_replace_skin_dark') },
])
const bodyTypes = computed(() => [
  { key: 'slim', label: t('work_pages.person_replace_body_slim') },
  { key: 'standard', label: t('work_pages.person_replace_body_standard') },
  { key: 'curvy', label: t('work_pages.person_replace_body_plump') },
  { key: 'muscular', label: t('work_pages.person_replace_body_muscular') },
])
const styleOptions = computed(() => [
  { key: 'casual', label: t('work_pages.person_replace_style_casual') },
  { key: 'business', label: t('work_pages.person_replace_style_business') },
  { key: 'sweet', label: t('work_pages.person_replace_style_sweet') },
  { key: 'sporty', label: t('work_pages.person_replace_style_sporty') },
  { key: 'street', label: t('work_pages.person_replace_style_street') },
])

async function uploadFile(file: File, type: string) {
  if (type === 'source') uploadingSrc.value = true
  else uploadingTgt.value = true
  const formData = new FormData(); formData.append('file', file)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData })
    if (type === 'source') uploadedSourceUrl.value = res.data?.url
    else uploadedTargetUrl.value = res.data?.url
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_upload')) }
  if (type === 'source') uploadingSrc.value = false
  else uploadingTgt.value = false
}

async function handleFile(e: Event, type: string) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  const url = createBlobUrl(files[0])
  if (type === 'source') sourceUrl.value = url
  else targetUrl.value = url
  await uploadFile(files[0], type)
}
async function handleDrop(e: DragEvent, type: string) {
  const files = e.dataTransfer?.files
  if (!files?.length) return
  const url = createBlobUrl(files[0])
  if (type === 'source') sourceUrl.value = url
  else targetUrl.value = url
  await uploadFile(files[0], type)
}

async function submitTask() {
  if (!uploadedSourceUrl.value || !uploadedTargetUrl.value) { toast.warn(t('common.upload_image_first')); return }
  currentStep.value = 2
  try {
    const res = await $fetch('/api/videos/person-replace', {
      method: 'POST',
      credentials: 'include',
      body: { sourceImageUrl: uploadedSourceUrl.value, targetPersonUrl: uploadedTargetUrl.value },
    })
    task.pollTask((res as any).data.taskId, '/api/videos/tasks/')
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    currentStep.value = 0;
  }
}
function handleRedo() { task.reset(); currentStep.value = 0; sourceUrl.value = ''; targetUrl.value = ''; uploadedSourceUrl.value = ''; uploadedTargetUrl.value = '' }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.dual-upload { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .dual-upload { grid-template-columns: 1fr; } }
.dual-upload__col { text-align: center; }
.dual-upload__label { font-weight: 600; color: var(--text-primary); margin-bottom: 10px; font-size: 0.9rem; }
.upload-status { font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; }
.upload-status.ok { color: var(--success); }
.ws-upload-area__preview { max-width: 100%; max-height: 180px; border-radius: var(--radius-md); margin-bottom: 8px; object-fit: contain; }
.param-group { margin-bottom: 14px; }
.param-group__label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.param-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ws-tag {
  padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border);
  background: var(--bg-card); cursor: pointer; font-size: 0.85rem;
  color: var(--text-secondary); transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}
.ws-tag:hover { border-color: var(--brand-soft); color: var(--brand); }
.ws-tag.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); font-weight: 600; }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }

.progress-box { text-align: center; padding: 40px 20px; }
.spinner {
  width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--brand);
  border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.progress-bar { width: 100%; height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; margin-top: 12px; }
.progress-bar__fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width 0.3s; }

.result-compare { display: flex; align-items: center; gap: 16px; }
.result-compare__item { flex: 1; text-align: center; }
.result-compare__label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; }
.result-compare__img { width: 100%; aspect-ratio: 3/4; border-radius: var(--radius-lg); border: 2px solid var(--border); background: var(--bg-hover); }
.result-compare__img.after { background: linear-gradient(135deg, var(--brand-light), var(--bg-card)); }
.result-compare__arrow { font-size: 1.5rem; color: var(--brand); flex-shrink: 0; }
@media (max-width: 640px) {
  .result-compare { flex-direction: column; }
  .result-compare__arrow { transform: rotate(90deg); }
}
.ws-error { text-align: center; padding: 20px; color: var(--danger); }
</style>
