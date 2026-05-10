<template>
  <WorkLayout title="白底图生成" subtitle="AI 自动替换为电商标准纯白背景" :steps="steps" :current-step="currentStep">
    <!-- Input mode: no task running -->
    <div v-if="taskStatus === -1">
      <div class="upload-section">
        <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
          <p class="dz-icon">⬜</p>
          <p>上传商品图片</p>
          <p class="hint">支持 JPG / PNG / WebP，最大 20MB</p>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
          <button class="btn-outline" @click="fileInput?.click()">选择图片</button>
        </div>
        <div v-if="previewUrl" class="preview-box">
          <img loading="lazy" :src="previewUrl" alt="预览" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <button class="preview-remove" @click="clearImage" aria-label="清除图片">✕</button>
        </div>
        <p v-if="uploadErr" class="msg msg-error">{{ uploadErr }}</p>
        <p v-if="uploading" class="msg">上传中...</p>
        <div v-if="previewUrl" class="actions">
          <div class="cost-badge">预计消耗 <strong>2</strong> 积分</div>
          <button class="btn btn-brand" @click="currentStep = 1">下一步：设置参数</button>
        </div>
      </div>

      <div v-if="currentStep >= 1" class="param-section">
        <h3 class="param-title">白底图参数</h3>
        <div class="param-grid">
          <label class="param-item">
            <span class="param-label">阴影效果</span>
            <select v-model="shadow" class="param-select">
              <option value="soft">柔和阴影</option>
              <option value="hard">清晰投影</option>
              <option value="none">无阴影</option>
            </select>
          </label>
          <label class="param-item">
            <span class="param-label">输出尺寸</span>
            <select v-model="size" class="param-select">
              <option value="original">原图尺寸</option>
              <option value="800">800 px</option>
              <option value="1600">1600 px</option>
              <option value="2000">2000 px</option>
            </select>
          </label>
          <label class="param-item">
            <span class="param-label">边缘优化</span>
            <select v-model="edge" class="param-select">
              <option value="auto">自动优化</option>
              <option value="smooth">柔化边缘</option>
              <option value="sharp">锐利边缘</option>
            </select>
          </label>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="currentStep = 0">返回</button>
          <button class="btn btn-brand" :disabled="processing" @click="startWhiteBg">
            <span v-if="processing" class="spinner" /> {{ processing ? '生成中...' : '生成白底图' }}
          </button>
        </div>
      </div>

      <div v-if="!previewUrl" class="empty-hint">
        <span class="empty-icon">⬜</span>
        <p>上传商品图，AI 自动生成电商标准白底图</p>
      </div>
    </div>

    <!-- Result -->
    <div v-else-if="taskStatus === 2" class="result-section">
      <h3 class="result-title">白底图已生成</h3>
      <div class="compare-row">
        <div class="compare-card">
          <span class="compare-label">原图</span>
          <img loading="lazy" :src="uploadedUrl" class="compare-img" alt="原图" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        </div>
        <span class="compare-arrow">→</span>
        <div class="compare-card">
          <span class="compare-label">白底图</span>
          <img loading="lazy" :src="resultUrl" class="compare-img" alt="结果" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-brand" @click="downloadResult">下载 JPG</button>
        <button class="btn-outline" @click="resetAll">重新处理</button>
      </div>
    </div>

    <!-- Progress -->
    <div v-else-if="taskStatus === 0 || taskStatus === 1" class="progress-section">
      <div class="spinner-lg" />
      <p>{{ progressMsg || '生成中...' }}</p>
      <div class="progress-bar"><div class="progress-fill" :style="{ width: progress + '%' }" /></div>
      <p class="progress-pct">{{ progress }}%</p>
    </div>

    <!-- Error -->
    <div v-else-if="taskStatus === 3" class="error-section">
      <p class="error-icon">!</p>
      <p>{{ errorMsg || '生成失败' }}</p>
      <button class="btn-outline" @click="startWhiteBg">重试</button>
    </div>

    <!-- Fallback -->
    <div v-else class="empty-hint">
      <span class="empty-icon">⬜</span>
      <p>上传商品图，AI 自动生成电商标准白底图</p>
    </div>
  </WorkLayout>
</template>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const steps = ['上传图片', '参数设置', '下载结果']
const currentStep = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const resultUrl = ref('')
const uploading = ref(false)
const uploadErr = ref('')
const processing = ref(false)
const shadow = ref('soft')
const size = ref('original')
const edge = ref('auto')
const fileInput = ref<HTMLInputElement | null>(null)
const taskStatus = ref(-1)
const POLL_INITIAL_MS = 1000
const POLL_INTERVAL_MS = 2000
const POLL_BACKOFF_MS = 5000
const progress = ref(0)
const progressMsg = ref('')
const errorMsg = ref('')
const { download } = useFileDownload()
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0
let consecutiveFailures = 0

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file?.type.startsWith('image/')) uploadFile(file)
}

function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadFile(file)
}

async function uploadFile(file: File) {
  previewUrl.value = createBlobUrl(file)
  uploadErr.value = ''
  uploading.value = true
  try {
    const form = new FormData(); form.append('file', file)
    const res: any = await $fetch('/api/upload/image', {
      method: 'POST', credentials: 'include', body: form,
    })
    uploadedUrl.value = res.data?.url || previewUrl.value
  } catch (e: any) { uploadErr.value = e.data?.msg || '上传失败' }
  finally { uploading.value = false }
}

function clearImage() { stopPolling(); previewUrl.value = ''; uploadedUrl.value = ''; uploadErr.value = ''; taskStatus.value = -1; currentStep.value = 0 }

async function startWhiteBg() {
  processing.value = true; taskStatus.value = 0; progress.value = 0
  try {
    const res: any = await $fetch('/api/images/white-bg', {
      method: 'POST', credentials: 'include',
      body: { imageUrl: uploadedUrl.value, shadow: shadow.value, size: size.value, edge: edge.value },
    })
    const taskId = res.data?.taskId
    if (taskId) { currentStep.value = 2; startPolling(taskId) }
    else { resultUrl.value = res.data?.resultUrl || uploadedUrl.value; taskStatus.value = 2 }
    processing.value = false
  } catch (e: any) { taskStatus.value = 3; errorMsg.value = e.data?.msg || '生成失败'; processing.value = false }
}

function startPolling(taskId: string) {
  stopPolling()
  pollCount = 0
  consecutiveFailures = 0
  const poll = async () => {
    try {
      const res: any = await $fetch(`/api/images/tasks/${taskId}`, { credentials: 'include' })
      const d = res.data
      taskStatus.value = d.status; progress.value = d.progress ?? 0; progressMsg.value = d.progress_msg || ''
      consecutiveFailures = 0
      if (d.status === 2) { resultUrl.value = d.output_result?.url || d.resultUrl || uploadedUrl.value; stopPolling(); return }
      else if (d.status === 3) { errorMsg.value = d.error_msg || '任务失败'; stopPolling(); return }
    } catch { consecutiveFailures++ }
    pollCount++
    let interval = POLL_INITIAL_MS
    if (pollCount > 5) interval = POLL_INTERVAL_MS
    if (consecutiveFailures > 3) interval = POLL_BACKOFF_MS
    pollTimer = setTimeout(poll, interval)
  }
  poll()
}

function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null } }

function downloadResult() {
  if (resultUrl.value) { download(resultUrl.value, 'white-bg.jpg') }
}

function resetAll() { stopPolling(); currentStep.value = 0; taskStatus.value = -1; resultUrl.value = ''; clearImage() }

onUnmounted(() => stopPolling())
</script>

<style scoped>
.upload-section { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.dropzone { width: 100%; max-width: 480px; padding: 48px 24px; border: 2px dashed var(--border-light); border-radius: var(--radius-xl); text-align: center; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
.dropzone:hover { border-color: var(--brand); background: var(--brand-alpha); }
.dz-icon { font-size: 40px; margin-bottom: 8px; }
.dropzone p { margin: 4px 0; color: var(--text-primary); font-size: 15px; }
.hint { font-size: 12px !important; color: var(--text-muted) !important; }
.btn-outline { padding: 8px 20px; border: 1px solid var(--brand); border-radius: var(--radius-lg); background: transparent; color: var(--brand); font-size: 14px; cursor: pointer; transition: background var(--transition-fast); }
.btn-outline:hover { background: var(--brand-alpha); }
.btn-brand { padding: 10px 24px; border: none; border-radius: var(--radius-lg); background: var(--brand-gradient); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform var(--transition-fast), box-shadow var(--transition-fast); display: flex; align-items: center; gap: 8px; }
.btn-brand:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 4px 16px var(--brand-alpha); }
.btn-brand:disabled { opacity: 0.5; cursor: not-allowed; }
.preview-box { position: relative; width: 100%; max-width: 320px; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-light); }
.preview-box img { width: 100%; display: block; }
.preview-remove { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border: none; border-radius: 50%; background: rgba(0,0,0,.5); color: #fff; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.msg { font-size: 13px; color: var(--text-muted); }
.msg-error { color: var(--danger); }
.actions { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
.cost-badge { padding: 4px 12px; background: var(--brand-alpha); border-radius: var(--radius-lg); font-size: 12px; color: var(--brand); }
.cost-badge strong { font-size: 16px; }

.param-section { display: flex; flex-direction: column; gap: 20px; }
.param-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.param-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.param-item { display: flex; flex-direction: column; gap: 6px; }
.param-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.param-select { padding: 10px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; cursor: pointer; transition: border-color var(--transition-fast); }
.param-select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }

.result-section, .progress-section, .error-section { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.result-title { font-size: 18px; font-weight: 600; color: var(--success); }
.compare-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; }
.compare-card { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.compare-label { font-size: 12px; color: var(--text-muted); }
.compare-img { max-width: 200px; max-height: 200px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); }
.compare-arrow { font-size: 24px; color: var(--brand); }

.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; }
.spinner-lg { width: 40px; height: 40px; border: 3px solid var(--brand-alpha); border-top-color: var(--brand); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.progress-bar { width: 100%; max-width: 320px; height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width .3s; }
.progress-pct { font-size: 13px; color: var(--text-secondary); }

.error-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--danger); color: #fff; font-weight: 700; font-size: 20px; display: flex; align-items: center; justify-content: center; }

.empty-hint { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.empty-hint p { font-size: 15px; color: var(--text-secondary); }
</style>
