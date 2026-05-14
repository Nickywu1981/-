<template>
  <WorkLayout :title="$t('work_pages.color_swap.title')" :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">👗</p>
        <p>{{ $t('work_pages.color_swap.drop_title') }}</p>
        <p class="hint">{{ $t('work_pages.color_swap.drop_hint') }}</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.color_swap.select_image') }}</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img loading="lazy" :src="previewUrl" :alt="$t('work_pages.color_swap.preview_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
      <p v-if="uploading" class="hint uploading">{{ $t('work_pages.color_swap.uploading') }}</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">{{ $t('work_pages.color_swap.uploaded') }}</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">{{ $t('work_pages.color_swap.next_color') }}</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.color_swap.select_color') }}</h3>
      <div class="palette-grid">
        <button v-for="c in presetColors" :key="c.value" class="color-btn" :class="{ active: selectedColors.includes(c.value) }" @click="toggleColor(c.value)">
          <span class="color-swatch" :style="{ background: c.value }" />
          <span class="color-label">{{ c.label }}</span>
        </button>
      </div>
      <div class="custom-color">
        <input v-model="customColor" type="color" />
        <input v-model="customColorHex" :placeholder="$t('work_pages.color_swap.custom_color_placeholder')" class="color-hex" maxlength="20" />
        <button class="btn-outline-sm" @click="addCustomColor">{{ $t('work_pages.color_swap.add_color') }}</button>
      </div>
      <div v-if="selectedColors.length" class="selected-colors">
        <span v-for="c in selectedColors" :key="c" class="tag" :style="{ background: c }">{{ c }}</span>
      </div>
      <p class="cost-hint">{{ $t('work_pages.color_swap.cost_hint', { n: selectedColors.length || 3 }) }}</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.color_swap.back') }}</button>
        <button class="btn" @click="submitTask">{{ $t('work_pages.color_swap.start_swap') }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.color_swap.complete_title') }}</h3>
        <div class="image-grid">
          <div v-for="img in (task.result.value?.images || [])" :key="img.color" class="result-card">
            <img loading="lazy" :src="img.url || img.image_url" :alt="img.color" class="result-img" @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }" />
            <span class="result-label" :style="{ background: img.color }">{{ img.color }}</span>
          </div>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">{{ $t('work_pages.color_swap.redo_btn') }}</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">{{ $t('work_pages.color_swap.retry_btn') }}</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()

const steps = computed(() => [t('work_pages.color_swap.step_upload'), t('work_pages.color_swap.step_color'), t('work_pages.color_swap.step_generate')])
const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedColors = ref<string[]>([]);
const customColor = ref('#FF0000');
const customColorHex = ref('');
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const presetColors = computed(() => [
  { value: '#FF0000', label: t('work_pages.color_swap.color_red') },
  { value: '#FF6600', label: t('work_pages.color_swap.color_orange') },
  { value: '#FFD700', label: t('work_pages.color_swap.color_gold') },
  { value: '#00FF00', label: t('work_pages.color_swap.color_green') },
  { value: '#0080FF', label: t('work_pages.color_swap.color_blue') },
  { value: '#8000FF', label: t('work_pages.color_swap.color_purple') },
  { value: '#FF69B4', label: t('work_pages.color_swap.color_pink') },
  { value: '#000000', label: t('work_pages.color_swap.color_black') },
  { value: '#FFFFFF', label: t('work_pages.color_swap.color_white') },
  { value: '#808080', label: t('work_pages.color_swap.color_gray') },
  { value: '#8B4513', label: t('work_pages.color_swap.color_brown') },
  { value: '#F5F5DC', label: t('work_pages.color_swap.color_beige') },
]);

function toggleColor(c: string) {
  const i = selectedColors.value.indexOf(c);
  if (i >= 0) selectedColors.value.splice(i, 1);
  else selectedColors.value.push(c);
}
function addCustomColor() {
  const c = customColorHex.value || customColor.value;
  if (c && !selectedColors.value.includes(c)) selectedColors.value.push(c);
  customColorHex.value = '';
}

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
    const colors = selectedColors.value.length ? selectedColors.value : ['#FF0000', '#0000FF', '#00FF00'];
    const res = await $fetch('/api/advanced/color-swap', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, targetColors: colors },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; if (previewUrl.value) revoke(previewUrl.value); previewUrl.value = ''; uploadedUrl.value = ''; selectedColors.value = []; }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.btn-outline-sm { padding: 6px 14px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; font-size: 12px; }
.palette-grid { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; max-width: 500px; margin: 0 auto; }
.color-btn { padding: 10px; border: 2px solid var(--border-light); border-radius: 10px; background: var(--bg-card); cursor: pointer; text-align: center; width: 70px; }
.color-btn.active { border-color: var(--brand); }
.color-swatch { width: 36px; height: 36px; border-radius: 50%; display: block; margin: 0 auto 4px; border: 1px solid var(--border-light); }
.color-label { font-size: 11px; color: var(--text-secondary); }
.custom-color { display: flex; gap: 8px; align-items: center; justify-content: center; margin-top: 16px; }
.custom-color input[type="color"] { width: 36px; height: 36px; border: 1px solid var(--border-light); border-radius: 6px; cursor: pointer; }
.color-hex { width: 100px; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; }
.selected-colors { display: flex; gap: 6px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.tag { padding: 3px 10px; border-radius: 12px; color: #fff; font-size: 11px; text-shadow: 0 0 2px rgba(0,0,0,0.5); }
.image-grid { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.result-card { text-align: center; }
.result-img { width: 160px; aspect-ratio: 1; background: var(--bg-hover); border-radius: 8px; object-fit: cover; }
.result-label { font-size: 11px; color: #fff; padding: 2px 8px; border-radius: 10px; margin-top: 4px; display: inline-block; text-shadow: 0 0 2px rgba(0,0,0,0.3); }
</style>
