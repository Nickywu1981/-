<template>
  <WorkLayout title="人物替换" subtitle="AI 智能替换模特/人物，保留服装细节" :steps="steps" :current-step="currentStep">
    <template #input>
      <div class="ws-section">
        <div class="ws-section__title">上传素材</div>
        <div class="dual-upload">
          <div class="dual-upload__col">
            <div class="dual-upload__label">产品/服装图</div>
            <div class="ws-upload-area" @dragover.prevent @drop.prevent="(e: DragEvent) => handleDrop(e, 'source')">
              <div class="ws-upload-area__icon" v-if="!sourceUrl">👕</div>
              <img loading="lazy" v-else :src="sourceUrl" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
              <div class="ws-upload-area__text">{{ sourceUrl ? '点击更换' : '上传产品图' }}</div>
              <input ref="sourceInput" type="file" accept="image/*" hidden @change="(e: Event) => handleFile(e, 'source')" />
              <button class="ws-btn ws-btn--secondary ws-btn--sm" type="button" @click="sourceInput?.click()">选择图片</button>
            </div>
            <div class="upload-status" v-if="uploadingSrc">⏳ 上传中...</div>
            <div class="upload-status ok" v-else-if="uploadedSourceUrl">✓ 已上传</div>
          </div>
          <div class="dual-upload__col">
            <div class="dual-upload__label">目标人物图</div>
            <div class="ws-upload-area" @dragover.prevent @drop.prevent="(e: DragEvent) => handleDrop(e, 'target')">
              <div class="ws-upload-area__icon" v-if="!targetUrl">🧑</div>
              <img loading="lazy" v-else :src="targetUrl" class="ws-upload-area__preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
              <div class="ws-upload-area__text">{{ targetUrl ? '点击更换' : '上传人物图' }}</div>
              <input ref="targetInput" type="file" accept="image/*" hidden @change="(e: Event) => handleFile(e, 'target')" />
              <button class="ws-btn ws-btn--secondary ws-btn--sm" type="button" @click="targetInput?.click()">选择图片</button>
            </div>
            <div class="upload-status" v-if="uploadingTgt">⏳ 上传中...</div>
            <div class="upload-status ok" v-else-if="uploadedTargetUrl">✓ 已上传</div>
          </div>
        </div>
      </div>
      <div class="ws-section" v-if="sourceUrl && targetUrl">
        <div class="ws-section__title">参数设置</div>
        <div class="param-group">
          <div class="param-group__label">肤色</div>
          <div class="param-row">
            <span v-for="s in skinTones" :key="s" class="ws-tag" :class="{ active: selectedSkin === s }" @click="selectedSkin = s">{{ s }}</span>
          </div>
        </div>
        <div class="param-group">
          <div class="param-group__label">体型</div>
          <div class="param-row">
            <span v-for="b in bodyTypes" :key="b" class="ws-tag" :class="{ active: selectedBody === b }" @click="selectedBody = b">{{ b }}</span>
          </div>
        </div>
        <div class="param-group">
          <div class="param-group__label">穿搭风格</div>
          <div class="param-row">
            <span v-for="st in styles" :key="st" class="ws-tag" :class="{ active: selectedStyle === st }" @click="selectedStyle = st">{{ st }}</span>
          </div>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">预计消耗 <strong>6</strong> 积分</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!sourceUrl || !targetUrl" @click="submitTask">开始生成</button>
      </div>
    </template>
    <template #output>
      <div class="ws-section">
        <div class="ws-section__title">生成结果</div>
        <div class="ws-placeholder" v-if="task.status.value === 0">
          <div class="ws-placeholder__icon">✨</div>
          <div class="ws-placeholder__text">人物替换结果将显示在这里</div>
        </div>
        <div class="progress-box" v-else-if="task.polling.value">
          <div class="spinner" />
          <p>{{ task.progressMsg.value }}</p>
          <div class="progress-bar">
            <div class="progress-bar__fill" :style="{ width: task.progress.value + '%' }" />
          </div>
        </div>
        <div class="result-compare" v-else-if="task.status.value === 2">
          <div class="result-compare__item">
            <div class="result-compare__label">替换前</div>
            <div class="result-compare__img" />
          </div>
          <div class="result-compare__arrow">→</div>
          <div class="result-compare__item">
            <div class="result-compare__label">替换后</div>
            <div class="result-compare__img after" />
          </div>
        </div>
        <div class="ws-error" v-else-if="task.status.value === 3">
          <p>{{ task.errorMsg.value || '生成失败' }}</p>
          <button class="ws-btn ws-btn--primary" @click="handleRedo">重试</button>
        </div>
      </div>
    </template>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const steps = ['上传素材', '设置参数', '生成结果']
const currentStep = ref(0)
const sourceUrl = ref('')
const targetUrl = ref('')
const uploadedSourceUrl = ref('')
const uploadedTargetUrl = ref('')
const uploadingSrc = ref(false)
const uploadingTgt = ref(false)
const selectedSkin = ref('自然')
const selectedBody = ref('标准')
const selectedStyle = ref('休闲')
const sourceInput = ref<HTMLInputElement | null>(null)
const targetInput = ref<HTMLInputElement | null>(null)
const task = useTask()

const skinTones = ['白皙', '自然', '小麦', '深色']
const bodyTypes = ['纤细', '标准', '丰满', '肌肉']
const styles = ['休闲', '商务', '甜美', '运动', '街头']

async function uploadFile(file: File, type: string) {
  if (type === 'source') uploadingSrc.value = true
  else uploadingTgt.value = true
  const formData = new FormData(); formData.append('file', file)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData })
    if (type === 'source') uploadedSourceUrl.value = res.data.url
    else uploadedTargetUrl.value = res.data.url
  } catch (e: any) { toast.error(e.data?.msg || '上传失败') }
  if (type === 'source') uploadingSrc.value = false
  else uploadingTgt.value = false
}

async function handleFile(e: Event, type: string) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  const url = createBlobUrl(files[0])
  if (type === 'source') sourceUrl.value = url
  else targetUrl.value = url
  await uploadFile(files[0], type)
}
async function handleDrop(e: DragEvent, type: string) {
  const files = e.dataTransfer?.files
  if (!files?.length) return
  const url = createBlobUrl(files[0])
  if (type === 'source') sourceUrl.value = url
  else targetUrl.value = url
  await uploadFile(files[0], type)
}

async function submitTask() {
  if (!uploadedSourceUrl.value || !uploadedTargetUrl.value) { toast.warn('请先上传图片'); return }
  currentStep.value = 2
  try {
    const res = await $fetch('/api/videos/person-replace', {
      method: 'POST',
      credentials: 'include',
      body: { sourceImageUrl: uploadedSourceUrl.value, targetPersonUrl: uploadedTargetUrl.value },
    })
    task.pollTask((res as any).data.taskId, '/api/videos/tasks/')
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
    currentStep.value = 0;
  }
}
function handleRedo() { task.reset(); currentStep.value = 0; sourceUrl.value = ''; targetUrl.value = ''; uploadedSourceUrl.value = ''; uploadedTargetUrl.value = '' }
</script>

<style scoped>
.dual-upload { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .dual-upload { grid-template-columns: 1fr; } }
.dual-upload__col { text-align: center; }
.dual-upload__label { font-weight: 600; color: var(--text-primary); margin-bottom: 10px; font-size: 0.9rem; }
.upload-status { font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; }
.upload-status.ok { color: var(--success); }
.ws-upload-area__preview { max-width: 100%; max-height: 180px; border-radius: var(--radius-md); margin-bottom: 8px; object-fit: contain; }
.param-group { margin-bottom: 14px; }
.param-group__label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.param-row { display: flex; gap: 8px; flex-wrap: wrap; }
.ws-tag {
  padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border);
  background: var(--bg-card); cursor: pointer; font-size: 0.85rem;
  color: var(--text-secondary); transition: all var(--transition-fast);
}
.ws-tag:hover { border-color: var(--brand-soft); color: var(--brand); }
.ws-tag.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); font-weight: 600; }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
.ws-cost { font-size: 0.9rem; color: var(--text-secondary); }
.ws-cost strong { color: var(--brand); }

.progress-box { text-align: center; padding: 40px 20px; }
.spinner {
  width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--brand);
  border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.progress-bar { width: 100%; height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; margin-top: 12px; }
.progress-bar__fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width 0.3s; }

.result-compare { display: flex; align-items: center; gap: 16px; }
.result-compare__item { flex: 1; text-align: center; }
.result-compare__label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; }
.result-compare__img { width: 100%; aspect-ratio: 3/4; border-radius: var(--radius-lg); border: 2px solid var(--border); background: var(--bg-hover); }
.result-compare__img.after { background: linear-gradient(135deg, var(--brand-light), var(--bg-card)); }
.result-compare__arrow { font-size: 1.5rem; color: var(--brand); flex-shrink: 0; }
@media (max-width: 640px) {
  .result-compare { flex-direction: column; }
  .result-compare__arrow { transform: rotate(90deg); }
}
.ws-error { text-align: center; padding: 20px; color: var(--danger); }
</style>
