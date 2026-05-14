<template>
  <WorkLayout :steps="['上传服装', '去褶皱', '对比']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">👔</p>
        <p>上传带褶皱的服装图</p>
        <p class="hint">AI自动识别褶皱区域，保留材质纹理</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">选择图片</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img loading="lazy" :src="previewUrl" alt="去皱预览" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
      <p v-if="uploading" class="hint uploading">⏳ 上传中...</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">✓ 已上传</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">下一步：选材质</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择面料材质</h3>
      <div class="fabric-grid">
        <button v-for="f in fabrics" :key="f" class="fabric-btn" :class="{ active: selectedFabric === f }" @click="selectedFabric = f">{{ f }}</button>
      </div>
      <p class="cost-hint">成本：3 点/次</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">开始去褶皱</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>去褶皱完成</h3>
        <div class="compare-row">
          <div class="compare-card"><span class="label">处理前</span><div class="compare-img" /></div>
          <div class="compare-arrow">→</div>
          <div class="compare-card"><span class="label">处理后</span><div class="compare-img" /></div>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">再做一次</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedFabric = ref('auto');
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const fabrics = ['auto', '棉', '麻', '丝', '毛', '化纤', '牛仔', '针织'];

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData }); uploadedUrl.value = res.data?.url; } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_upload')); }
  uploading.value = false;
}

async function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) { previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]); }
}
async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files?.length) { previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]); }
}

async function submitTask() {
  if (!uploadedUrl.value) { toast.warn(t('common.upload_image_first')); return; }
  step.value = 2;
  try {
    const res = await $fetch('/api/advanced/wrinkle-remove', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, fabricType: selectedFabric.value },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; selectedFabric.value = 'auto'; }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.compare-row { display: flex; gap: 16px; align-items: center; justify-content: center; }
.compare-card { text-align: center; }
.compare-card .label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; display: block; }
.compare-img { width: 200px; aspect-ratio: 3/4; background: var(--bg-hover); border-radius: var(--radius-md); }
.compare-arrow { font-size: 24px; color: var(--brand); font-weight: 700; }
.fabric-grid { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.fabric-btn {
  padding: 8px 20px; border: 2px solid var(--border-light); border-radius: var(--radius-full);
  background: var(--bg-card); cursor: pointer; font-size: 13px; color: var(--text-secondary);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.fabric-btn:hover { border-color: var(--brand); color: var(--brand); }
.fabric-btn.active {
  border-color: var(--brand); color: #fff;
  background: var(--brand-gradient);
}
</style>
