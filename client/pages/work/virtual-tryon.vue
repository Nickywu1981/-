<template>
  <WorkLayout :steps="['上传服装', '选模特', '生成']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">👕</p>
        <p>上传服装平铺图</p>
        <p class="hint">T恤/衬衫/连衣裙/外套/裤子 — AI自动识别款式</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">选择图片</button>
      </div>
      <div v-if="previewUrl" class="preview-box">
        <img loading="lazy" :src="previewUrl" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      </div>
      <p v-if="uploading" class="hint uploading">⏳ 上传中...</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">✓ 已上传</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">下一步：选模特</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择模特参数</h3>
      <h4>肤色</h4>
      <div class="opt-row">
        <button v-for="s in skinTones" :key="s.value" class="opt-btn" :class="{ active: selectedSkin === s.value }" @click="selectedSkin = s.value">{{ s.label }}</button>
      </div>
      <h4>体型</h4>
      <div class="opt-row">
        <button v-for="b in bodyTypes" :key="b.value" class="opt-btn" :class="{ active: selectedBody === b.value }" @click="selectedBody = b.value">{{ b.label }}</button>
      </div>
      <h4>穿搭风格</h4>
      <div class="opt-row">
        <button v-for="st in styles" :key="st" class="opt-btn" :class="{ active: selectedStyle === st }" @click="selectedStyle = st">{{ st }}</button>
      </div>
      <p class="cost-hint">成本：8 点/次</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">开始生成</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>虚拟模特效果</h3>
        <div class="image-grid">
          <div v-for="img in (task.result.value?.images || [])" :key="img.id" class="result-card">
            <img loading="lazy" v-if="img.url" :src="img.url" :alt="img.style || '试衣结果'" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-img" />
            <span class="result-label">{{ img.style }}</span>
          </div>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">再做一次</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const submitting = ref(false);
const selectedSkin = ref('natural');
const selectedBody = ref('standard');
const selectedStyle = ref('casual');
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const skinTones = [
  { value: 'fair', label: '白皙' }, { value: 'natural', label: '自然' },
  { value: 'wheat', label: '小麦' }, { value: 'dark', label: '深色' },
];
const bodyTypes = [
  { value: 'slim', label: '纤细' }, { value: 'standard', label: '标准' },
  { value: 'curvy', label: '丰满' }, { value: 'muscular', label: '肌肉' },
];
const styles = ['休闲', '商务', '甜美', '运动', '街头', '韩系'];

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData }); uploadedUrl.value = res.data?.url; } catch (e: any) { toast.error(e?.data?.msg || '上传失败'); }
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
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return; }
  if (submitting.value) return;
  submitting.value = true;
  step.value = 2;
  try {
    const res = await $fetch('/api/advanced/virtual-tryon', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, skinTone: selectedSkin.value, bodyType: selectedBody.value, style: selectedStyle.value },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
    step.value = 1;
  } finally {
    submitting.value = false;
  }
}
function handleRedo() { task.reset(); step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; }

onBeforeUnmount(() => {
  if (previewUrl.value) revoke(previewUrl.value)
})
</script>

<style scoped>
.image-grid { display: flex; gap: 12px; justify-content: center; }
.result-card { text-align: center; }
.result-img { width: 160px; aspect-ratio: 3/4; background: var(--bg-hover); border-radius: 8px; }
.result-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block; }
</style>
