<template>
  <WorkLayout :title="$t('work_pages.virtual_tryon.title')" :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">👕</p>
        <p>{{ $t('work_pages.virtual_tryon.drop_title') }}</p>
        <p class="hint">{{ $t('work_pages.virtual_tryon.drop_hint') }}</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.virtual_tryon.select_image') }}</button>
      </div>
      <div v-if="previewUrl" class="preview-box">
        <img loading="lazy" :src="previewUrl" :alt="$t('work_pages.virtual_tryon.preview_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      </div>
      <p v-if="uploading" class="hint uploading">{{ $t('work_pages.virtual_tryon.uploading') }}</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">{{ $t('work_pages.virtual_tryon.uploaded') }}</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">{{ $t('work_pages.virtual_tryon.next_model') }}</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.virtual_tryon.select_model') }}</h3>
      <h4>{{ $t('work_pages.virtual_tryon.skin_tone') }}</h4>
      <div class="opt-row">
        <button v-for="s in skinTones" :key="s.value" class="opt-btn" :class="{ active: selectedSkin === s.value }" @click="selectedSkin = s.value">{{ s.label }}</button>
      </div>
      <h4>{{ $t('work_pages.virtual_tryon.body_type') }}</h4>
      <div class="opt-row">
        <button v-for="b in bodyTypes" :key="b.value" class="opt-btn" :class="{ active: selectedBody === b.value }" @click="selectedBody = b.value">{{ b.label }}</button>
      </div>
      <h4>{{ $t('work_pages.virtual_tryon.style_title') }}</h4>
      <div class="opt-row">
        <button v-for="st in styles" :key="st.value" class="opt-btn" :class="{ active: selectedStyle === st.value }" @click="selectedStyle = st.value">{{ st.label }}</button>
      </div>
      <p class="cost-hint">{{ $t('work_pages.virtual_tryon.cost_hint') }}</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.virtual_tryon.back') }}</button>
        <button class="btn" @click="submitTask">{{ $t('work_pages.virtual_tryon.start_generate') }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.virtual_tryon.complete_title') }}</h3>
        <div class="image-grid">
          <div v-for="img in (task.result.value?.images || [])" :key="img.id" class="result-card">
            <img loading="lazy" v-if="img.url" :src="img.url" :alt="img.style || $t('work_pages.virtual_tryon.result_alt')" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-img" />
            <span class="result-label">{{ img.style }}</span>
          </div>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">{{ $t('work_pages.virtual_tryon.redo_btn') }}</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">{{ $t('work_pages.virtual_tryon.retry_btn') }}</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()

const steps = computed(() => [t('work_pages.virtual_tryon.step_upload'), t('work_pages.virtual_tryon.step_model'), t('work_pages.virtual_tryon.step_generate')])
const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const submitting = ref(false);
const selectedSkin = ref('natural');
const selectedBody = ref('standard');
const selectedStyle = ref('casual');
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const skinTones = computed(() => [
  { value: 'fair', label: t('work_pages.virtual_tryon.skin_fair') },
  { value: 'natural', label: t('work_pages.virtual_tryon.skin_natural') },
  { value: 'wheat', label: t('work_pages.virtual_tryon.skin_wheat') },
  { value: 'dark', label: t('work_pages.virtual_tryon.skin_dark') },
]);
const bodyTypes = computed(() => [
  { value: 'slim', label: t('work_pages.virtual_tryon.body_slim') },
  { value: 'standard', label: t('work_pages.virtual_tryon.body_standard') },
  { value: 'curvy', label: t('work_pages.virtual_tryon.body_curvy') },
  { value: 'muscular', label: t('work_pages.virtual_tryon.body_muscular') },
]);
const styles = computed(() => [
  { value: 'casual', label: t('work_pages.virtual_tryon.style_casual') },
  { value: 'business', label: t('work_pages.virtual_tryon.style_business') },
  { value: 'sweet', label: t('work_pages.virtual_tryon.style_sweet') },
  { value: 'sport', label: t('work_pages.virtual_tryon.style_sport') },
  { value: 'street', label: t('work_pages.virtual_tryon.style_street') },
  { value: 'korean', label: t('work_pages.virtual_tryon.style_korean') },
]);

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData }); uploadedUrl.value = res.data?.url; } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_upload')); }
  uploading.value = false;
}

async function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) { if (previewUrl.value) revoke(previewUrl.value); previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]); }
}
async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files?.length) { if (previewUrl.value) revoke(previewUrl.value); previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]); }
}

async function submitTask() {
  if (!uploadedUrl.value) { toast.warn(t('common.upload_image_first')); return; }
  if (submitting.value) return;
  submitting.value = true;
  step.value = 2;
  try {
    const res = await $fetch('/api/advanced/virtual-tryon', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, skinTone: selectedSkin.value, bodyType: selectedBody.value, style: selectedStyle.value },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    step.value = 1;
  } finally {
    submitting.value = false;
  }
}
function handleRedo() { task.reset(); step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; }

onBeforeUnmount(() => {
  if (previewUrl.value) revoke(previewUrl.value)
})
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.image-grid { display: flex; gap: 12px; justify-content: center; }
.result-card { text-align: center; }
.result-img { width: 160px; aspect-ratio: 3/4; background: var(--bg-hover); border-radius: 8px; }
.result-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block; }
</style>
