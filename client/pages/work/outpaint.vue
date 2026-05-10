<template>
  <WorkLayout title="智能扩图" subtitle="AI 智能扩展图片边缘，自动补全构图" :steps="steps" :current-step="currentStep">
    <template #input>
      <div class="ws-section">
        <div class="ws-section__title">上传需要扩图的图片</div>
        <div class="ws-section__desc">AI 智能分析画面内容，自然扩展边缘区域</div>
        <div class="ws-upload-area" @dragover.prevent @drop.prevent="handleDrop" @click="triggerUpload">
          <div v-if="!previewUrl" class="ws-upload-area__inner">
            <div class="ws-upload-area__icon">↔</div>
            <div class="ws-upload-area__text">点击上传或拖拽图片到此处</div>
            <div class="ws-upload-area__hint">支持 JPG / PNG / WebP，最大 20MB</div>
          </div>
          <img loading="lazy" v-else :src="previewUrl" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        </div>
        <div v-if="uploading" class="ws-uploading">⏳ 上传中...</div>
        <div v-else-if="uploadedUrl" class="ws-uploaded">✓ 已上传</div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">扩图方向</div>
        <div class="direction-grid">
          <div v-for="d in directions" :key="d.id" class="direction-card" :class="{ active: selectedDirection === d.id }" @click="selectedDirection = d.id">
            <div class="direction-card__icon">{{ d.icon }}</div>
            <div class="direction-card__name">{{ d.name }}</div>
          </div>
        </div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">扩展比例</div>
        <div class="ws-slider-row">
          <input type="range" v-model="ratio" min="10" max="50" step="5" class="ws-range" />
          <span class="ws-range-val">{{ ratio }}%</span>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">预计消耗 <strong>3</strong> 积分</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!uploadedUrl || submitting" @click="submitOutpaint">{{ submitting ? '提交中...' : '开始扩图' }}</button>
      </div>
    </template>
    <template #output>
      <div class="ws-section">
        <div class="ws-section__title">扩图结果</div>
        <div v-if="task.polling.value" class="progress-box">
          <div class="spinner" /><p>{{ task.progressMsg.value || 'AI 正在扩图...' }}</p>
          <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
        </div>
        <div v-else-if="task.status.value === 2" class="result-compare">
          <div class="result-compare__item">
            <div class="result-compare__label">原始图片</div>
            <img loading="lazy" v-if="uploadedUrl" :src="uploadedUrl" class="result-compare__img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img placeholder" />
          </div>
          <div class="result-compare__divider">
            <div class="result-compare__arrow">→</div>
            <div class="result-compare__badge">AI 扩图</div>
          </div>
          <div class="result-compare__item">
            <div class="result-compare__label">扩展后</div>
            <img loading="lazy" v-if="task.result.value" :src="task.result.value" class="result-compare__img after" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img placeholder" />
          </div>
        </div>
        <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value || '任务失败' }}</p><button class="ws-btn ws-btn--primary" @click="handleRedo">重试</button></div>
        <div v-else class="ws-placeholder"><div class="ws-placeholder__icon">↔</div><div class="ws-placeholder__text">扩图结果将显示在这里</div></div>
      </div>
    </template>
  </WorkLayout>
</template>

<script setup lang="ts">

const steps = ['上传图片', '扩图设置', '查看结果']
const currentStep = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const uploading = ref(false)
const submitting = ref(false)
const selectedDirection = ref('all')
const ratio = ref(30)
const task = useTask()
const fileInput = ref<HTMLInputElement>()

const directions = [
  { id: 'all', icon: '🔲', name: '四周扩展' },
  { id: 'up', icon: '⬆', name: '向上扩展' },
  { id: 'down', icon: '⬇', name: '向下扩展' },
  { id: 'left', icon: '⬅', name: '向左扩展' },
  { id: 'right', icon: '➡', name: '向右扩展' },
]

function triggerUpload() { fileInput.value?.click() }

async function uploadFile(file: File) {
  uploading.value = true
  const formData = new FormData(); formData.append('file', file)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData })
    uploadedUrl.value = res.data.url
  } catch (e: any) { toast.error(e.data?.msg || '上传失败') }
  uploading.value = false
}

async function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) { previewUrl.value = URL.createObjectURL(files[0]); await uploadFile(files[0]) }
}

async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files?.length) { previewUrl.value = URL.createObjectURL(files[0]); await uploadFile(files[0]) }
}

async function submitOutpaint() {
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return }
  submitting.value = true
  try {
    const res: any = await $fetch('/api/advanced/outpaint', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, direction: selectedDirection.value, ratio: ratio.value },
    })
    currentStep.value = 2
    task.pollTask(res.data.taskId, '/api/advanced/tasks/')
  } catch (e: any) { toast.error(e.data?.msg || '提交失败') }
  submitting.value = false
}

function handleRedo() { task.reset(); currentStep.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; submitting.value = false }
</script>

<style scoped>
.direction-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.direction-card { padding: 14px; border-radius: var(--radius-lg); border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; text-align: center; transition: all var(--transition-fast); }
.direction-card:hover { border-color: var(--brand-soft); transform: translateY(-2px); }
.direction-card.active { border-color: var(--brand); background: var(--brand-light); }
.direction-card__icon { font-size: 1.5rem; margin-bottom: 4px; }
.direction-card__name { font-size: 0.8rem; color: var(--text-secondary); }
.ws-uploading, .ws-uploaded { text-align: center; padding: 8px; font-size: 0.9rem; }
.ws-uploaded { color: var(--success); }
.ws-slider-row { display: flex; align-items: center; gap: 14px; }
.ws-range { flex: 1; accent-color: var(--brand); }
.ws-range-val { font-weight: 600; color: var(--brand); min-width: 44px; text-align: right; font-size: 0.9rem; }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; flex-wrap: wrap; gap: 12px; }
.ws-cost { font-size: 0.9rem; color: var(--text-secondary); }
.ws-cost strong { color: var(--brand); }
.result-compare { display: flex; align-items: center; gap: 20px; }
.result-compare__item { flex: 1; text-align: center; }
.result-compare__label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; }
.result-compare__img { width: 100%; aspect-ratio: 1/1; border-radius: var(--radius-lg); border: 2px solid var(--border); object-fit: cover; }
.result-compare__img.placeholder { background: var(--bg-hover); }
.result-compare__img.after { aspect-ratio: auto; }
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
