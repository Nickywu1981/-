<template>
  <WorkLayout title="图片精修" subtitle="AI 自动美化：亮度+对比度+锐化+色彩增强" :steps="steps" :current-step="currentStep">
      <div class="ws-section">
        <div class="ws-section__title">上传商品图片</div>
        <div class="ws-section__desc">AI 自动检测并优化图片质量</div>
        <div class="ws-upload-area" @dragover.prevent @drop.prevent="handleDrop" @click="triggerUpload">
          <div v-if="!previewUrl" class="ws-upload-area__inner">
            <div class="ws-upload-area__icon">✨</div>
            <div class="ws-upload-area__text">点击上传或拖拽图片到此处</div>
            <div class="ws-upload-area__hint">支持 JPG / PNG / WebP，最大 20MB</div>
          </div>
          <img loading="lazy" v-else :src="previewUrl" alt="上传预览" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        </div>
        <div v-if="uploading" class="ws-uploading">⏳ 上传中...</div>
        <div v-else-if="uploadedUrl" class="ws-uploaded">✓ 已上传</div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">精修选项</div>
        <div class="tag-row">
          <span v-for="f in features" :key="f.id" class="ws-tag" :class="{ active: selectedFeatures.includes(f.id) }" @click="toggleFeature(f.id)">{{ f.icon }} {{ f.name }}</span>
        </div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">精修强度</div>
        <div class="level-row">
          <span v-for="l in levels" :key="l.id" class="level-chip" :class="{ active: selectedLevel === l.id }" @click="selectedLevel = l.id">{{ l.name }}</span>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">预计消耗 <strong>2</strong> 积分</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!uploadedUrl || submitting" @click="submitRetouch">{{ submitting ? '提交中...' : '开始精修' }}</button>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">精修结果</div>
        <div v-if="task.polling.value" class="progress-box">
          <div class="spinner" />
          <p>{{ task.progressMsg.value || 'AI 正在精修...' }}</p>
          <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
        </div>
        <div v-else-if="task.status.value === 2" class="result-compare">
          <div class="result-compare__item">
            <div class="result-compare__label">原始图片</div>
            <img loading="lazy" v-if="uploadedUrl" :src="uploadedUrl" alt="原图" class="result-compare__img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img placeholder" />
          </div>
          <div class="result-compare__divider">
            <div class="result-compare__arrow">→</div>
            <div class="result-compare__badge">AI 精修</div>
          </div>
          <div class="result-compare__item">
            <div class="result-compare__label">精修后</div>
            <img loading="lazy" v-if="task.result.value" :src="task.result.value" alt="精修结果" class="result-compare__img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img placeholder" />
          </div>
        </div>
        <div v-else-if="task.status.value === 3" class="error-box">
          <p>{{ task.errorMsg.value || '任务失败' }}</p>
          <button class="ws-btn ws-btn--primary" @click="handleRedo">重试</button>
        </div>
        <div v-else class="ws-placeholder">
          <div class="ws-placeholder__icon">✨</div>
          <div class="ws-placeholder__text">精修结果将显示在这里</div>
        </div>
      </div>
      </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const steps = ['上传图片', '精修处理', '查看结果']
const currentStep = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const uploading = ref(false)
const submitting = ref(false)
const selectedLevel = ref('standard')
const selectedFeatures = ref(['beautify', 'contrast', 'sharpen'])
const task = useTask()
const fileInput = ref<HTMLInputElement>()

const features = [
  { id: 'beautify', icon: '💄', name: '一键美化' },
  { id: 'contrast', icon: '☀', name: '色彩增强' },
  { id: 'sharpen', icon: '🔍', name: '锐化细节' },
  { id: 'denoise', icon: '🧹', name: '去噪降噪' },
  { id: 'lighting', icon: '💡', name: '光影优化' },
  { id: 'bokeh', icon: '📸', name: '背景虚化' },
]

const levels = [
  { id: 'light', name: '轻度' },
  { id: 'standard', name: '标准' },
  { id: 'heavy', name: '深度' },
]

function toggleFeature(id: string) {
  const idx = selectedFeatures.value.indexOf(id)
  if (idx >= 0) selectedFeatures.value.splice(idx, 1)
  else selectedFeatures.value.push(id)
}

function triggerUpload() { fileInput.value?.click() }

async function uploadFile(file: File) {
  uploading.value = true
  const formData = new FormData(); formData.append('file', file)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData })
    uploadedUrl.value = res.data?.url
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_upload')) }
  uploading.value = false
}

async function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) { previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]) }
}

async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files?.length) { previewUrl.value = createBlobUrl(files[0]); await uploadFile(files[0]) }
}

async function submitRetouch() {
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return }
  submitting.value = true
  try {
    const res: any = await $fetch('/api/images/retouch', {
      method: 'POST', credentials: 'include',
      body: { imageUrl: uploadedUrl.value, level: selectedLevel.value, features: selectedFeatures.value },
    })
    currentStep.value = 2
    task.pollTask(res.data?.taskId, '/api/images/tasks/')
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.failed_submit')) }
  submitting.value = false
}

function handleRedo() { task.reset(); currentStep.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; submitting.value = false }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.tag-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ws-tag { padding: 8px 16px; border-radius: 20px; border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; font-size: 0.85rem; color: var(--text-secondary); transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); }
.ws-tag:hover { border-color: var(--brand-soft); color: var(--brand); }
.ws-tag.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); font-weight: 600; }
.ws-uploading, .ws-uploaded { text-align: center; padding: 8px; font-size: 0.9rem; }
.ws-uploaded { color: var(--success); }
.level-row { display: flex; gap: 10px; }
.level-chip { padding: 8px 24px; border-radius: var(--radius-full); border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; font-size: 0.9rem; color: var(--text-secondary); transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); }
.level-chip:hover { border-color: var(--brand-soft); color: var(--brand); }
.level-chip.active { border-color: var(--brand); background: var(--brand-gradient); color: #fff; font-weight: 600; }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; flex-wrap: wrap; gap: 12px; }
.result-compare { display: flex; align-items: center; gap: 20px; }
.result-compare__item { flex: 1; text-align: center; }
.result-compare__label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; }
.result-compare__img { width: 100%; aspect-ratio: 3/4; border-radius: var(--radius-lg); border: 2px solid var(--border); object-fit: cover; }
.result-compare__img.placeholder { background: var(--bg-hover); }
.result-compare__divider { text-align: center; flex-shrink: 0; }
.result-compare__arrow { font-size: 1.5rem; color: var(--brand); }
.result-compare__badge { font-size: 0.72rem; color: var(--brand); margin-top: 4px; }
.progress-box { text-align: center; padding: 40px; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.bar { width: 100%; height: 6px; background: var(--bg-hover); border-radius: 3px; margin-top: 16px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width 0.3s; }
.error-box { text-align: center; padding: 40px; color: var(--danger); }
@media (max-width: 640px) { .result-compare { flex-direction: column; } .result-compare__divider { transform: rotate(90deg); } }
</style>
