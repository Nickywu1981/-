<template>
  <WorkLayout title="AI模特生成" :steps="['上传服装图', '选模特', '生成']" :current-step="step">
    <div v-if="step === 0" class="step-content">
      <h3 class="step-title">上传服装平铺图</h3>
      <p class="step-desc">上传服装平铺/挂拍照片，AI 自动识别版型并生成真人模特试穿效果</p>
      <div class="dropzone" :class="{ 'has-file': previewUrl }" @dragover.prevent @drop.prevent="handleDrop">
        <template v-if="!previewUrl">
          <span class="dz-icon">👤</span>
          <p class="dz-label">拖拽或点击上传服装图片</p>
          <p class="dz-hint">支持 JPG / PNG / WebP，建议 800×800 以上</p>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
          <button class="btn-outline-sm" @click="($refs.fileInput as HTMLInputElement)?.click()">选择图片</button>
        </template>
        <img loading="lazy" v-else :src="previewUrl" alt="preview" class="preview-img" />
      </div>
      <p v-if="uploading" class="upload-status"><span class="spinner-sm" /> 上传中...</p>
      <button v-if="uploadedUrl" class="btn-primary" @click="step = 1">下一步：选择模特 →</button>
    </div>

    <div v-else-if="step === 1" class="step-content">
      <h3 class="step-title">选择模特风格</h3>
      <p class="step-desc">4 种模特风格可选，AI 将自动匹配合适的肤色与体型</p>
      <div class="model-grid">
        <button v-for="m in models" :key="m.id" class="model-card" :class="{ active: selectedModel === m.id }" @click="selectedModel = m.id">
          <span class="model-icon">{{ m.icon }}</span>
          <span class="model-name">{{ m.name }}</span>
          <span class="model-desc">{{ m.desc }}</span>
        </button>
      </div>
      <div class="cost-badge"><span class="cost-icon">⚡</span> 成本：10 积分/次</div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">← 返回</button>
        <button class="btn-primary" @click="submitTask">开始生成</button>
      </div>
    </div>

    <div v-else class="step-content result-step">
      <div v-if="processing" class="processing-card">
        <span class="spinner" />
        <h4>AI 正在生成模特试穿效果</h4>
        <p class="hint">预计耗时 10-30 秒，请耐心等待</p>
      </div>
      <div v-if="resultUrl && !processing" class="result-display">
        <div class="compare-row">
          <div class="compare-item"><p class="compare-label">原图</p><img loading="lazy" :src="previewUrl" alt="original" /></div>
          <span class="compare-arrow">→</span>
          <div class="compare-item"><p class="compare-label">试穿效果</p><img loading="lazy" :src="resultUrl" alt="result" /></div>
        </div>
        <div class="result-actions">
          <button class="btn-primary" @click="downloadImage">下载图片</button>
          <button class="btn-outline" @click="resetAll">重新生成</button>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">

const step = ref(0)
const previewUrl = ref(''); const uploadedUrl = ref(''); const uploading = ref(false)
const processing = ref(false); const resultUrl = ref('')
const selectedModel = ref('asian_female')
const models = [
  { id: 'asian_female', name: '亚洲女性', icon: '👩', desc: '自然肤色优雅气质' },
  { id: 'asian_male', name: '亚洲男性', icon: '👨', desc: '阳光活力商务范' },
  { id: 'western_female', name: '欧美女性', icon: '👩‍🦰', desc: '高挑气场时尚感' },
  { id: 'western_male', name: '欧美男性', icon: '👨‍🦰', desc: '健硕硬朗稳重感' },
]

const toast = useToast()
async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return; previewUrl.value = URL.createObjectURL(file); uploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res: any = await $fetch('/api/upload/image', { method: 'POST', body: fd })
    uploadedUrl.value = res.data?.url || res.url
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '上传失败')
    previewUrl.value = ''
  } finally { uploading.value = false }
}
function handleDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.files[0]) previewUrl.value = URL.createObjectURL(e.dataTransfer.files[0])
}
async function submitTask() {
  processing.value = true; step.value = 2
  try {
    const res: any = await $fetch('/api/advanced/model-generate', { method: 'POST', body: { image_url: uploadedUrl.value, model_type: selectedModel.value } })
    resultUrl.value = res.data?.result_url || res.result_url
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '生成失败，请重试')
    step.value = 1
  } finally { processing.value = false }
}
function downloadImage() { if (resultUrl.value) { const a = document.createElement('a'); a.href = resultUrl.value; a.download = 'model-generate.png'; a.click() } }
function resetAll() { step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; resultUrl.value = ''; processing.value = false }
</script>

<style scoped>
.step-content { max-width: 720px; margin: 0 auto; }
.step-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
.step-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
.dropzone { border: 2px dashed var(--input-border); border-radius: var(--radius-xl); padding: 36px 24px; text-align: center; background: var(--bg-card); transition: all var(--transition-fast); cursor: pointer; }
.dropzone:hover { border-color: var(--brand-light); background: var(--brand-subtle); }
.dropzone.has-file { padding: 12px; border-style: solid; border-color: var(--brand); }
.dz-icon { font-size: 48px; display: block; margin-bottom: 8px; }
.dz-label { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.dz-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
.preview-img { max-width: 100%; max-height: 280px; border-radius: var(--radius-lg); }
.btn-outline-sm { padding: 8px 18px; background: transparent; color: var(--brand); border: 1px solid var(--brand); border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn-outline-sm:hover { background: var(--brand-subtle); }
.upload-status { display: flex; align-items: center; gap: 6px; justify-content: center; margin-top: 12px; font-size: 13px; color: var(--brand); }
.spinner-sm { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--input-border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
.model-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.model-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 18px 10px; border: 2px solid var(--input-border); border-radius: var(--radius-lg); background: var(--bg-card); cursor: pointer; transition: all var(--transition-fast); }
.model-card:hover { border-color: var(--brand-light); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.model-card.active { border-color: var(--brand); background: var(--brand-subtle); box-shadow: var(--shadow-brand); }
.model-icon { font-size: 32px; }
.model-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.model-desc { font-size: 11px; color: var(--text-muted); }
.cost-badge { display: inline-flex; align-items: center; gap: 4px; margin-top: 16px; padding: 6px 14px; background: var(--bg-subtle); border-radius: 20px; font-size: 12px; color: var(--text-secondary); }
.actions { display: flex; gap: 10px; margin-top: 20px; justify-content: center; }
.btn-primary { padding: 10px 28px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; font-weight: 600; transition: all var(--transition-fast); box-shadow: var(--shadow-brand); display: block; margin: 16px auto 0; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-outline { padding: 10px 28px; background: transparent; color: var(--text-primary); border: 1px solid var(--input-border); border-radius: var(--radius-lg); cursor: pointer; font-size: 14px; transition: all var(--transition-fast); }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.processing-card { text-align: center; padding: 48px 24px; background: var(--bg-card); border-radius: var(--radius-xl); }
.processing-card h4 { margin: 12px 0 6px; font-size: 16px; color: var(--text-primary); }
.hint { font-size: 12px; color: var(--text-muted); }
.spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--input-border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.result-display { text-align: center; }
.compare-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px; }
.compare-item { text-align: center; }
.compare-item img { max-width: 240px; max-height: 320px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
.compare-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
.compare-arrow { font-size: 24px; color: var(--brand); font-weight: 700; }
.result-actions { display: flex; gap: 10px; justify-content: center; }

@media (max-width: 640px) {
  .model-grid { grid-template-columns: repeat(2, 1fr); }
  .compare-row { flex-direction: column; }
  .compare-item img { max-width: 180px; }
}
</style>
