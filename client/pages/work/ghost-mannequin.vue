<template>
  <WorkLayout :title="$t('work_pages.ghost_mannequin_title')" sub:title="$t('work_pages.ghost_mannequin_subtitle')" :steps="steps" :current-step="currentStep">
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.ghost_mannequin_upload_title') }}</div>
        <div class="ws-section__desc">{{ $t('work_pages.ghost_mannequin_upload_desc') }}</div>
        <div class="ws-upload-area" @dragover.prevent @drop.prevent="handleDrop" @click="triggerUpload">
          <div v-if="!previewUrl" class="ws-upload-area__inner">
            <div class="ws-upload-area__icon">👻</div>
            <div class="ws-upload-area__text">{{ $t('work_pages.ghost_mannequin_upload_placeholder') }}</div>
            <div class="ws-upload-area__hint">{{ $t('work_pages.ghost_mannequin_upload_hint') }}</div>
          </div>
          <img loading="lazy" v-else :src="previewUrl" alt="上传预览" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        </div>
        <div v-if="uploading" class="ws-uploading">⏳ 上传中...</div>
        <div v-else-if="uploadedUrl" class="ws-uploaded">✓ 已上传</div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.ghost_mannequin_effect_title') }}</div>
        <div class="effect-grid">
          <div v-for="e in effects" :key="e.id" class="effect-card" :class="{ active: selectedEffect === e.id }" @click="selectedEffect = e.id">
            <div class="effect-card__preview">{{ e.preview }}</div>
            <div class="effect-card__name">{{ e.name }}</div>
            <div class="effect-card__desc">{{ e.desc }}</div>
          </div>
        </div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.ghost_mannequin_category_title') }}</div>
        <div class="tag-row">
          <span v-for="c in categories" :key="c" class="ws-tag" :class="{ active: selectedCategory === c }" @click="selectedCategory = c">{{ c }}</span>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">{{ $t('work_pages.ghost_mannequin_cost') }} <strong>4</strong> {{ $t('work_pages.ghost_mannequin_cost_unit') }}</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!uploadedUrl || submitting" @click="handleGenerate">{{ submitting ? '提交中...' : '开始生成' }}</button>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">{{ $t('work_pages.result_section_title') }}</div>
        <div v-if="task.polling.value" class="progress-box">
          <div class="spinner" /><p>{{ task.progressMsg.value || 'AI 正在处理...' }}</p>
          <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
        </div>
        <div v-else-if="task.status.value === 2" class="result-compare">
          <div class="result-compare__item">
            <div class="result-compare__label">{{ $t('work_pages.ghost_mannequin_before_label') }}</div>
            <img loading="lazy" v-if="uploadedUrl" :src="uploadedUrl" alt="原图" class="result-compare__img before" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img before" />
          </div>
          <div class="result-compare__divider">
            <div class="result-compare__arrow">→</div>
            <div class="result-compare__badge">{{ $t('work_pages.ghost_mannequin_ai_badge') }}</div>
          </div>
          <div class="result-compare__item">
            <div class="result-compare__label">{{ $t('work_pages.ghost_mannequin_after_label') }}</div>
            <img loading="lazy" v-if="task.result.value" :src="task.result.value" alt="生成结果" class="result-compare__img after" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="result-compare__img after" />
          </div>
        </div>
        <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value || '任务失败' }}</p><button class="ws-btn ws-btn--primary" @click="handleRedo">{{ $t('work_pages.ghost_mannequin_btn_retry') }}</button></div>
        <div v-else class="ws-placeholder"><div class="ws-placeholder__icon">✨</div><div class="ws-placeholder__text">{{ $t('work_pages.ghost_mannequin_result_placeholder') }}</div></div>
      </div>
      </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

const steps = ['上传图片', '选择效果', '生成展示']
const currentStep = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const uploading = ref(false)
const submitting = ref(false)
const selectedEffect = ref('floating')
const selectedCategory = ref('tops')
const task = useTask()
const fileInput = ref<HTMLInputElement>()

const effects = [
  { id: 'floating', preview: '👕', name: '立体悬浮', desc: '3D 立体悬浮展示，带自然阴影' },
  { id: 'flat', preview: '📐', name: '平铺展示', desc: '干净利落的平铺陈列效果' },
  { id: 'rotate3d', preview: '🔄', name: '3D 旋转', desc: '360° 缓慢旋转展示' },
  { id: 'dynamic', preview: '💨', name: '动态飘动', desc: '模拟微风吹拂自然飘动' },
]

const categories = ['上衣', '裤装', '裙装', '外套', '内衣', '运动服']

function triggerUpload() { fileInput.value?.click() }

async function uploadFile(file: File) {
  uploading.value = true
  const formData = new FormData(); formData.append('file', file)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData })
    uploadedUrl.value = res.data?.url
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || '上传失败') }
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

async function handleGenerate() {
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return }
  submitting.value = true
  try {
    const res: any = await $fetch('/api/advanced/ghost-mannequin', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, effect: selectedEffect.value, category: selectedCategory.value },
    })
    currentStep.value = 2
    task.pollTask(res.data?.taskId, '/api/advanced/tasks/')
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || '提交失败') }
  finally { submitting.value = false }
}

function handleRedo() { task.reset(); currentStep.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; submitting.value = false }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.effect-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.effect-card { padding: 16px; border-radius: var(--radius-lg); border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; text-align: center; transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast); }
.effect-card:hover { border-color: var(--brand-soft); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.effect-card.active { border-color: var(--brand); background: var(--brand-light); }
.effect-card__preview { font-size: 2rem; margin-bottom: 8px; }
.effect-card__name { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
.effect-card__desc { font-size: 0.72rem; color: var(--text-tertiary); margin-top: 4px; }
.tag-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ws-tag { padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg-card); cursor: pointer; font-size: 0.85rem; color: var(--text-secondary); transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); }
.ws-tag:hover { border-color: var(--brand-soft); color: var(--brand); }
.ws-tag.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); font-weight: 600; }
.ws-uploading, .ws-uploaded { text-align: center; padding: 8px; font-size: 0.9rem; }
.ws-uploaded { color: var(--success); }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; flex-wrap: wrap; gap: 12px; }
.result-compare { display: flex; align-items: center; gap: 20px; }
.result-compare__item { flex: 1; text-align: center; }
.result-compare__label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; }
.result-compare__img { width: 100%; aspect-ratio: 3/4; border-radius: var(--radius-lg); border: 2px solid var(--border); object-fit: cover; }
.result-compare__img.before { background: linear-gradient(135deg, var(--bg-hover), var(--bg-subtle)); }
.result-compare__img.after { background: linear-gradient(135deg, var(--brand-light), var(--brand-lightest)); }
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
