<template>
  <WorkLayout :title="$t('work_pages.style_transfer.title')" :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">🎨</p>
        <p>{{ $t('work_pages.style_transfer.drop_title') }}</p>
        <p class="hint">{{ $t('work_pages.style_transfer.drop_hint') }}</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.style_transfer.select_image') }}</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img loading="lazy" :src="previewUrl" :alt="$t('work_pages.style_transfer.preview_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
      <p v-if="uploading" class="hint uploading">{{ $t('work_pages.style_transfer.uploading') }}</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">{{ $t('work_pages.style_transfer.uploaded') }}</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">{{ $t('work_pages.style_transfer.next_step') }}</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.style_transfer.select_style_title') }}</h3>
      <div class="style-grid">
        <button v-for="s in styles" :key="s.id" class="style-card" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
          <span class="style-icon">{{ s.icon }}</span>
          <span>{{ s.name }}</span>
        </button>
      </div>
      <p class="cost-hint">{{ $t('work_pages.style_transfer.cost_hint') }}</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.style_transfer.back_btn') }}</button>
        <button class="btn" @click="submitTask">{{ $t('work_pages.style_transfer.start_btn') }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.style_transfer.complete_title') }}</h3>
        <div class="image-grid">
          <div v-for="img in (task.result.value?.images || [])" :key="img.id" class="result-card">
            <img loading="lazy" :src="img.url || img.image_url" :alt="img.variant" class="result-img" @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }" />
            <span>{{ img.variant }}</span>
          </div>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">{{ $t('work_pages.style_transfer.redo_btn') }}</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">{{ $t('work_pages.style_transfer.retry_btn') }}</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()

const steps = computed(() => [t('work_pages.style_transfer.step_upload'), t('work_pages.style_transfer.step_select'), t('work_pages.style_transfer.step_generate')])
const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedStyle = ref('vintage');
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const styles = computed(() => [
  { id: 'vintage', name: t('work_pages.style_transfer.style_vintage'), icon: '📻' },
  { id: 'guochao', name: t('work_pages.style_transfer.style_guochao'), icon: '🏮' },
  { id: 'illustration', name: t('work_pages.style_transfer.style_illustration'), icon: '🎨' },
  { id: 'watercolor', name: t('work_pages.style_transfer.style_watercolor'), icon: '🖌' },
  { id: 'cyberpunk', name: t('work_pages.style_transfer.style_cyberpunk'), icon: '🤖' },
  { id: 'minimalist', name: t('work_pages.style_transfer.style_minimalist'), icon: '◻' },
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
  step.value = 2;
  try {
    const res = await $fetch('/api/advanced/style-transfer', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, targetStyle: selectedStyle.value },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; if (previewUrl.value) revoke(previewUrl.value); previewUrl.value = ''; uploadedUrl.value = ''; }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.image-grid { display: flex; gap: 12px; justify-content: center; }
.result-card { text-align: center; }
.result-img { width: 160px; aspect-ratio: 1; background: var(--bg-hover); border-radius: 8px; object-fit: cover; }
</style>
