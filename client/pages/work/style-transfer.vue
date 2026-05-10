<template>
  <WorkLayout :steps="['上传图片', '选风格', '生成']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">🎨</p>
        <p>上传产品图进行AI风格转化</p>
        <p class="hint">保留商品特征，转换整体风格</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="($refs.fileInput as HTMLInputElement)?.click()">选择图片</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img loading="lazy" :src="previewUrl" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
      <p v-if="uploading" class="hint uploading">⏳ 上传中...</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">✓ 已上传</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">下一步：选风格</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择目标风格</h3>
      <div class="style-grid">
        <button v-for="s in styles" :key="s.id" class="style-card" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
          <span class="style-icon">{{ s.icon }}</span>
          <span>{{ s.name }}</span>
        </button>
      </div>
      <p class="cost-hint">成本：5 点/次</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">开始转化</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>风格转化完成</h3>
        <div class="image-grid">
          <div v-for="img in (task.result.value?.images || [])" :key="img.id" class="result-card">
            <div class="result-img" />
            <span>{{ img.variant }}</span>
          </div>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">再做一次</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">

const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedStyle = ref('vintage');
const task = useTask();

const styles = [
  { id: 'vintage', name: '复古风', icon: '📻' },
  { id: 'guochao', name: '国潮风', icon: '🏮' },
  { id: 'illustration', name: '插画风', icon: '🎨' },
  { id: 'watercolor', name: '水彩风', icon: '🖌' },
  { id: 'cyberpunk', name: '赛博朋克', icon: '🤖' },
  { id: 'minimalist', name: '极简主义', icon: '◻' },
];

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData }); uploadedUrl.value = res.data.url; } catch (e: any) { toast.error(e.data?.msg || '上传失败'); }
  uploading.value = false;
}

async function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) { previewUrl.value = URL.createObjectURL(files[0]); await uploadFile(files[0]); }
}
async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files?.length) { previewUrl.value = URL.createObjectURL(files[0]); await uploadFile(files[0]); }
}

async function submitTask() {
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return; }
  step.value = 2;
  try {
    const res = await $fetch('/api/advanced/style-transfer', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, targetStyle: selectedStyle.value },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; }
</script>

<style scoped>
.image-grid { display: flex; gap: 12px; justify-content: center; }
.result-card { text-align: center; }
.result-img { width: 160px; aspect-ratio: 1; background: var(--bg-hover); border-radius: 8px; }
</style>
