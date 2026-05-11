<template>
  <WorkLayout :steps="['上传产品图', '选场景', '生成']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">🖼</p>
        <p>拖拽产品图（已抠好最佳）或直接上传</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">选择文件</button>
      </div>
      <img loading="lazy" v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      <p v-if="uploading" class="hint">上传中...</p>
      <p v-else-if="uploadedUrl" class="hint ok">已上传 ✓</p>
      <button v-if="uploadedUrl" class="btn" @click="step = 1">下一步：选场景</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择场景风格</h3>
      <div class="scene-grid">
        <button v-for="s in scenes" :key="s.id" class="scene-card" :class="{ active: selectedScene === s.id }" @click="selectedScene = s.id">
          <div class="scene-icon">{{ s.icon }}</div>
          <span>{{ s.name }}</span>
        </button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" :disabled="!uploadedUrl || !selectedScene || task.polling.value" @click="submitTask">{{ task.polling.value ? '生成中...' : '开始生成' }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" />
        <p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>生成完成 — 5张场景图</h3>
        <div class="image-grid-5">
          <div v-for="img in task.result.value?.images" :key="img.id" class="result-card">
            <img loading="lazy" :src="img.url" :alt="img.style || '场景图'" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <button class="btn-sm">下载</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">换一批</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p class="error-msg">{{ task.errorMsg.value || '生成失败，请重试' }}</p>
        <button class="btn" @click="handleRedo">重新生成</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedScene = ref('');
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const scenes = [
  { id: 'home', name: '家居', icon: '🛋' }, { id: 'desk', name: '桌面', icon: '🪑' },
  { id: 'luxury', name: '轻奢', icon: '💎' }, { id: 'outdoor', name: '户外', icon: '🌿' },
  { id: 'ins', name: 'Ins极简', icon: '📱' }, { id: 'nordic', name: '北欧风', icon: '🪵' },
];

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res: any = await $fetch('/api/upload/image', {
      method: 'POST', credentials: 'include', body: formData,
    });
    uploadedUrl.value = res.data?.url;
  } catch (e: any) { toast.error(e?.data?.msg || '上传失败'); }
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
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return; }
  step.value = 2;
  try {
    const res = await $fetch('/api/images/scene', { method: 'POST', credentials: 'include', body: { imageUrl: uploadedUrl.value, sceneCategory: selectedScene.value } });
    task.pollTask((res as any).data.taskId);
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
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
