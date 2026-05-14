<template>
  <WorkLayout :title="$t('work_pages.scene.title')" :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">🖼</p>
        <p>{{ $t('work_pages.scene.drop_title') }}</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.scene.select_image') }}</button>
      </div>
      <img loading="lazy" v-if="previewUrl" :src="previewUrl" class="preview-img" :alt="$t('work_pages.scene.preview_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      <p v-if="uploading" class="hint">{{ $t('work_pages.scene.uploading') }}</p>
      <p v-else-if="uploadedUrl" class="hint ok">{{ $t('work_pages.scene.uploaded') }}</p>
      <button v-if="uploadedUrl" class="btn" @click="step = 1">{{ $t('work_pages.scene.next_scene') }}</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.scene.select_scene') }}</h3>
      <div class="scene-grid">
        <button v-for="s in scenes" :key="s.id" class="scene-card" :class="{ active: selectedScene === s.id }" @click="selectedScene = s.id">
          <div class="scene-icon">{{ s.icon }}</div>
          <span>{{ s.name }}</span>
        </button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.scene.back') }}</button>
        <button class="btn" :disabled="!uploadedUrl || !selectedScene || task.polling.value" @click="submitTask">{{ task.polling.value ? $t('work_pages.scene.generating') : $t('work_pages.scene.start_generate') }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" />
        <p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.scene.complete_title') }}</h3>
        <div class="image-grid-5">
          <div v-for="img in task.result.value?.images" :key="img.id" class="result-card">
            <img loading="lazy" :src="img.url" :alt="img.style || $t('work_pages.scene.scene_img_alt')" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <button class="btn-sm">{{ $t('work_pages.scene.download') }}</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">{{ $t('work_pages.scene.redo_btn') }}</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p class="error-msg">{{ task.errorMsg.value || $t('work_pages.scene.error_default') }}</p>
        <button class="btn" @click="handleRedo">{{ $t('work_pages.scene.retry_btn') }}</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const steps = computed(() => [t('work_pages.scene.step_upload'), t('work_pages.scene.step_scene'), t('work_pages.scene.step_generate')])
const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedScene = ref('');
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const scenes = computed(() => [
  { id: 'home', name: t('work_pages.scene.scene_home'), icon: '🛋' }, { id: 'desk', name: t('work_pages.scene.scene_desk'), icon: '🪑' },
  { id: 'luxury', name: t('work_pages.scene.scene_luxury'), icon: '💎' }, { id: 'outdoor', name: t('work_pages.scene.scene_outdoor'), icon: '🌿' },
  { id: 'ins', name: t('work_pages.scene.scene_ins'), icon: '📱' }, { id: 'nordic', name: t('work_pages.scene.scene_nordic'), icon: '🪵' },
]);

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res: any = await $fetch('/api/upload/image', {
      method: 'POST', credentials: 'include', body: formData,
    });
    uploadedUrl.value = res.data?.url;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_upload')); }
  uploading.value = false;
}

async function handleFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) { if (previewUrl.value) revoke(previewUrl.value); previewUrl.value = createBlobUrl(f); await uploadFile(f); }
}

async function handleDrop(e: DragEvent) {
  const f = e.dataTransfer?.files?.[0];
  if (f) { if (previewUrl.value) revoke(previewUrl.value); previewUrl.value = createBlobUrl(f); await uploadFile(f); }
}

async function submitTask() {
  if (!uploadedUrl.value) { toast.warn(t('common.upload_image_first')); return; }
  step.value = 2;
  try {
    const res = await $fetch('/api/images/scene', { method: 'POST', credentials: 'include', body: { imageUrl: uploadedUrl.value, sceneCategory: selectedScene.value } });
    task.pollTask((res as any).data.taskId);
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; selectedScene.value = ''; }

onUnmounted(() => { if (previewUrl.value) revoke(previewUrl.value) })
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.scene-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; max-width: 500px; margin: 0 auto 24px; }
.scene-card { padding: 20px; border: 2px solid var(--border-light); border-radius: 12px; background: var(--bg-card); cursor: pointer; text-align: center; }
.scene-card.active { border-color: var(--brand); }
.scene-icon { font-size: 28px; margin-bottom: 8px; }
.image-grid-5 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.result-card { border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; text-align: center; }
.img-placeholder { width: 100%; aspect-ratio: 1; background: var(--bg-hover); border-radius: 4px; margin-bottom: 8px; }
</style>
