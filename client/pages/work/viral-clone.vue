<template>
  <WorkLayout :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <h3>{{ $t('work_pages.viral_clone.subtitle') }}</h3>
      <div class="row">
        <div class="upload-col">
          <h4>{{ $t('work_pages.viral_clone.ref_video_title') }}</h4>
          <div class="dropzone" @dragover.prevent @drop.prevent="(e) => handleDrop(e, 'ref')">
            <p v-if="!refVideoUrl" class="dz-icon">🎬</p>
            <video v-else :src="refVideoUrl" class="preview-media" controls />
            <p>{{ refVideoUrl ? $t('work_pages.viral_clone.click_change') : $t('work_pages.viral_clone.upload_ref_video') }}</p>
            <input ref="refInput" type="file" accept="video/*" hidden @change="(e) => handleFile(e, 'ref')" />
            <button class="btn-outline" @click="refInput?.click()">{{ $t('work_pages.viral_clone.select_video') }}</button>
          </div>
          <p v-if="uploadingRef" class="status">⏳ {{ $t('work_pages.viral_clone.uploading') }}</p>
          <p v-else-if="uploadedRefUrl" class="status ok">✓ {{ $t('work_pages.viral_clone.uploaded') }}</p>
        </div>
        <div class="upload-col">
          <h4>{{ $t('work_pages.viral_clone.product_img_title') }}</h4>
          <div class="dropzone" @dragover.prevent @drop.prevent="(e) => handleDrop(e, 'product')">
            <p v-if="!productImageUrl" class="dz-icon">📷</p>
            <img loading="lazy" v-else :src="productImageUrl" :alt="$t('work_pages.viral_clone.product_alt')" class="preview-media" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <p>{{ productImageUrl ? $t('work_pages.viral_clone.click_change') : $t('work_pages.viral_clone.upload_product_img') }}</p>
            <input ref="imgInput" type="file" accept="image/*" hidden @change="(e) => handleFile(e, 'product')" />
            <button class="btn-outline" @click="imgInput?.click()">{{ $t('work_pages.viral_clone.select_image') }}</button>
          </div>
          <p v-if="uploadingProd" class="status">⏳ {{ $t('work_pages.viral_clone.uploading') }}</p>
          <p v-else-if="uploadedProductUrl" class="status ok">✓ {{ $t('work_pages.viral_clone.uploaded') }}</p>
        </div>
      </div>
      <button v-if="refVideoUrl && productImageUrl" class="btn" @click="step = 1">{{ $t('work_pages.viral_clone.next_step') }}</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.viral_clone.confirm_params') }}</h3>
      <div class="summary-box">
        <div class="summary-row"><span>{{ $t('work_pages.viral_clone.ref_video_label') }}</span><strong>{{ $t('work_pages.viral_clone.uploaded_ok') }}</strong></div>
        <div class="summary-row"><span>{{ $t('work_pages.viral_clone.product_img_label') }}</span><strong>{{ $t('work_pages.viral_clone.uploaded_ok') }}</strong></div>
        <div class="summary-row"><span>{{ $t('work_pages.viral_clone.match_strength_label') }}</span><strong>{{ matchStrength * 100 }}%</strong></div>
      </div>
      <label class="slider-label">
        {{ $t('work_pages.viral_clone.match_strength') }} {{ matchStrength * 100 }}%
        <input v-model.number="matchStrength" type="range" min="0.3" max="1" step="0.1" class="slider" />
      </label>
      <p class="cost-hint">{{ $t('work_pages.viral_clone.cost_hint') }}</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.viral_clone.back_btn') }}</button>
        <button class="btn" @click="submitTask" :disabled="submitting">{{ $t('work_pages.viral_clone.start_btn') }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.viral_clone.complete_title') }}</h3>
        <div class="video-placeholder">▶ {{ $t('work_pages.viral_clone.video_preview') }}</div>
        <div v-if="task.result.value?.analysis" class="analysis-box">
          <h4>{{ $t('work_pages.viral_clone.analysis_report') }}</h4>
          <p>{{ $t('work_pages.viral_clone.match_score_label') }}{{ task.result.value.matchScore }}</p>
          <p>{{ $t('work_pages.viral_clone.tempo_label') }}{{ task.result.value.analysis.tempo }}</p>
          <p>{{ $t('work_pages.viral_clone.color_label') }}{{ task.result.value.analysis.dominantColor }}</p>
          <p>{{ $t('work_pages.viral_clone.avg_shot_label') }}{{ task.result.value.analysis.avgShotLength }}</p>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">{{ $t('work_pages.viral_clone.redo_btn') }}</button>
          <button class="btn">{{ $t('work_pages.viral_clone.download_btn') }}</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">{{ $t('work_pages.viral_clone.retry_btn') }}</button></div>
      <div v-else class="progress-box"><div class="spinner" /><p>{{ $t('work_pages.viral_clone.preparing') }}</p></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const steps = computed(() => [t('work_pages.viral_clone.step_upload'), t('work_pages.viral_clone.step_product'), t('work_pages.viral_clone.step_generate')])
const step = ref(0);
const refVideoUrl = ref('');
const productImageUrl = ref('');
const uploadedRefUrl = ref('');
const uploadedProductUrl = ref('');
const uploadingRef = ref(false);
const uploadingProd = ref(false);
const matchStrength = ref(0.8);
const refInput = ref<HTMLInputElement | null>(null)
const imgInput = ref<HTMLInputElement | null>(null)
const task = useTask();
const submitting = ref(false);

async function uploadFile(file: File, type: string) {
  if (type === 'ref') uploadingRef.value = true;
  else uploadingProd.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData });
    if (type === 'ref') uploadedRefUrl.value = res.data?.url;
    else uploadedProductUrl.value = res.data?.url;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_upload')); }
  if (type === 'ref') uploadingRef.value = false;
  else uploadingProd.value = false;
}

async function handleFile(e: Event, type: string) {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) return;
  const url = createBlobUrl(files[0]);
  if (type === 'ref') refVideoUrl.value = url;
  else productImageUrl.value = url;
  await uploadFile(files[0], type);
}
async function handleDrop(e: DragEvent, type: string) {
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  const url = createBlobUrl(files[0]);
  if (type === 'ref') refVideoUrl.value = url;
  else productImageUrl.value = url;
  await uploadFile(files[0], type);
}

async function submitTask() {
  if (!uploadedRefUrl.value || !uploadedProductUrl.value) { toast.warn(t('common.upload_material_first')); return; }
  if (submitting.value) return;
  submitting.value = true; step.value = 2;
  try {
    const res = await $fetch('/api/adv-video/viral-clone', {
      method: 'POST', credentials: 'include',
      body: { referenceVideoUrl: uploadedRefUrl.value, productImageUrl: uploadedProductUrl.value, matchStrength: matchStrength.value },
    });
    task.pollTask((res as any).data.taskId, '/api/adv-video/tasks/');
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    step.value = 1;
  } finally { submitting.value = false; }
}
function handleRedo() { task.reset(); step.value = 0; refVideoUrl.value = ''; productImageUrl.value = ''; uploadedRefUrl.value = ''; uploadedProductUrl.value = ''; }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.preview-media { width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; }
.slider-label { display: block; max-width: 420px; margin: 0 auto 16px; font-size: 13px; color: var(--text-secondary); text-align: center; }
.slider { display: block; width: 100%; margin-top: 8px; }
.analysis-box { max-width: 420px; margin: 16px auto; border: 1px solid var(--border-light); border-radius: 10px; padding: 16px; background: var(--bg-card); }
.analysis-box h4 { margin: 0 0 10px; font-size: 14px; }
.analysis-box p { font-size: 13px; color: var(--text-secondary); margin: 4px 0; }
</style>
