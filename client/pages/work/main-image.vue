<template>
  <WorkLayout :steps="['上传商品图', '选平台', '选风格', '生成']" :current-step="step">
    <!-- Step 1: 上传 -->
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📷</p>
        <p>拖拽商品图到此处 或 点击上传</p>
        <p class="dz-hint">支持 JPG / PNG / WebP，建议 800×800 以上</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="($refs.fileInput as HTMLInputElement)?.click()">选择文件</button>
      </div>
      <div v-if="previewUrl" class="preview">
        <img loading="lazy" :src="previewUrl" alt="预览" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <p v-if="uploading" class="uploading-hint">上传中...</p>
        <p v-else-if="uploadedUrl" class="uploaded-hint">已上传 ✓</p>
      </div>
      <button v-if="uploadedUrl" class="btn" @click="step = 1">下一步：选平台</button>
    </div>

    <!-- Step 2: 选平台 -->
    <div v-else-if="step === 1" class="select-section">
      <h3>选择目标平台</h3>
      <div class="platform-grid">
        <button v-for="p in platforms" :key="p.code" class="plat-card" :class="{ active: selectedPlatform === p.code }" @click="selectedPlatform = p.code">
          {{ p.name }}
        </button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" :disabled="!selectedPlatform" @click="step = 2">下一步：选风格</button>
      </div>
    </div>

    <!-- Step 3: 选风格 -->
    <div v-else-if="step === 2" class="select-section">
      <h3>选择主图风格</h3>
      <div class="style-grid">
        <button v-for="s in styles" :key="s.id" class="style-card" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
          <div class="style-preview">{{ s.preview }}</div>
          <span>{{ s.name }}</span>
        </button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 1">返回</button>
        <button class="btn" :disabled="!selectedStyle" @click="submitTask">开始生成</button>
      </div>

      <!-- 提示词润色 -->
      <div class="enhance-section">
        <p class="enhance-label">不确定怎么描述？让 AI 帮你优化</p>
        <PromptEnhancer mode="image" :initial-prompt="stylePrompt" @applied="(v) => stylePrompt = v" />
      </div>
    </div>

    <!-- Step 4: 生成中 / 结果 -->
    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" />
        <p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2" class="result-images">
        <h3>生成完成 — 3张不同风格</h3>
        <div class="image-grid">
          <div v-for="img in task.result.value?.images" :key="img.id" class="result-card">
            <img loading="lazy" :src="img.url" :alt="img.style" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <span class="img-label">{{ img.style }}</span>
            <button class="btn-sm">下载</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">重新生成</button>
          <NuxtLink to="/my/works" class="btn">去素材库查看</NuxtLink>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

import PromptEnhancer from '~/components/PromptEnhancer.vue'
import { useBlobUrl } from '~/composables/useBlobUrl'

const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedPlatform = ref('');
const selectedStyle = ref('');
const stylePrompt = ref('');
const task = useTask();

const platforms = [
  { code: 'taobao', name: '淘宝' }, { code: 'pdd', name: '拼多多' }, { code: 'douyin', name: '抖音' },
  { code: 'xiaohongshu', name: '小红书' }, { code: 'sph', name: '视频号' }, { code: 'amazon', name: '亚马逊' },
  { code: 'temu', name: 'Temu' }, { code: 'shein', name: 'Shein' }, { code: 'tiktok', name: 'TikTok Shop' },
  { code: 'mercado', name: '美客多' }, { code: 'ozon', name: 'Ozon' }, { code: 'shopee', name: 'Shopee' }, { code: 'lazada', name: 'Lazada' },
];

const styles = [
  { id: 'simple', name: '简约白底', preview: '⬜' },
  { id: 'luxury', name: '高级轻奢', preview: '✨' },
  { id: 'promo', name: '活动促销', preview: '🏷' },
];

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res: any = await $fetch('/api/upload/image', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    uploadedUrl.value = res.data.url;
  } catch (e: any) {
    toast.error(e.data?.msg || '上传失败，请重试');
  }
  uploading.value = false;
}

async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    if (previewUrl.value) revoke(previewUrl.value);
    previewUrl.value = createBlobUrl(file);
    await uploadFile(file);
  }
}

async function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    if (previewUrl.value) revoke(previewUrl.value);
    previewUrl.value = createBlobUrl(file);
    await uploadFile(file);
  }
}

async function submitTask() {
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return; }
  step.value = 3;
  try {
    const res = await $fetch('/api/images/main-image', {
      method: 'POST',
      credentials: 'include',
      body: { imageUrl: uploadedUrl.value, platform: selectedPlatform.value, style: selectedStyle.value },
    });
    task.pollTask((res as any).data.taskId);
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
    step.value = 2;
  }
}

function handleRedo() {
  task.reset();
  step.value = 0;
  previewUrl.value = '';
  uploadedUrl.value = '';
}

onUnmounted(() => { if (previewUrl.value) revoke(previewUrl.value) })
</script>

<style scoped>
.plat-card { padding: 10px 18px; border: 1px solid var(--border-light); border-radius: var(--radius-full); background: var(--bg-card); font-size: 14px; cursor: pointer; color: var(--text-secondary); transition: all var(--transition-fast); }
.plat-card:hover { border-color: var(--brand); color: var(--brand); }
.plat-card.active { background: var(--brand-gradient); color: #fff; border-color: transparent; }
.style-preview { font-size: 32px; margin-bottom: 8px; }
</style>
