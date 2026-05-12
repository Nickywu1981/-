<template>
  <WorkLayout :steps="['上传图片', '选语言', '翻译']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">🌐</p>
        <p>上传包含中文文字的电商图片</p>
        <p class="hint">AI识别并翻译文字，自动排版融入原图风格</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">选择图片</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img loading="lazy" :src="previewUrl" alt="图片翻译预览" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
      <p v-if="uploading" class="hint uploading">⏳ 上传中...</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">✓ 已上传</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">下一步：选语言</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择目标语言</h3>
      <div class="lang-grid">
        <button v-for="l in languages" :key="l.code" class="lang-btn" :class="{ active: selectedLang === l.code }" @click="selectedLang = l.code">
          <span class="lang-flag">{{ l.flag }}</span>
          <span>{{ l.name }}</span>
        </button>
      </div>
      <p class="cost-hint">成本：3 点/张 · 支持批量20张</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">开始翻译</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>翻译完成</h3>
        <div class="compare-row">
          <div class="compare-card"><span class="label">原文</span><div class="compare-img" /></div>
          <div class="compare-arrow">→</div>
          <div class="compare-card"><span class="label">译文</span><div class="compare-img" /></div>
        </div>
        <div v-if="task.result.value?.detectedTexts" class="texts-detected">
          <span>检测到{{ task.result.value.detectedTexts.length }}处文字</span>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">再做一次</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedLang = ref('en');
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData }); uploadedUrl.value = res.data?.url; } catch (e: any) { toast.error(e?.data?.msg || '上传失败'); }
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
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return; }
  step.value = 2;
  try {
    const res = await $fetch('/api/advanced/image-translate', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, targetLang: selectedLang.value },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; selectedLang.value = 'en'; }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.compare-row { display: flex; gap: 16px; align-items: center; justify-content: center; }
.compare-card { text-align: center; }
.compare-card .label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; display: block; }
.compare-img { width: 200px; aspect-ratio: 1; background: var(--bg-hover); border-radius: 8px; }
.compare-arrow { font-size: 24px; color: var(--brand); font-weight: 700; }
.texts-detected { text-align: center; font-size: 13px; color: var(--text-secondary); margin-top: 12px; }
</style>
