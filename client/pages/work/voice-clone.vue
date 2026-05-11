<template>
  <WorkLayout title="声音克隆" subtitle="AI 语音合成与音色克隆" :steps="steps" :current-step="currentStep">
      <div class="ws-section">
        <div class="ws-section__title">上传音频样本</div>
        <div class="ws-section__desc">上传 10-60 秒清晰人声，AI 将学习并克隆该音色</div>
        <div class="ws-upload-area" @dragover.prevent @drop.prevent="handleDrop" @click="triggerUpload">
          <div v-if="!audioFileName" class="ws-upload-area__inner">
            <div class="ws-upload-area__icon">🎙️</div>
            <div class="ws-upload-area__text">点击上传或拖拽音频文件</div>
            <div class="ws-upload-area__hint">支持 MP3 / WAV / M4A，时长 10s-60s</div>
          </div>
          <div v-else class="ws-upload-area__inner">
            <div class="ws-upload-area__icon">🎵</div>
            <div class="ws-upload-area__text">{{ audioFileName }}</div>
            <div class="ws-upload-area__hint">点击重新选择</div>
          </div>
          <input ref="fileInput" type="file" accept="audio/*" hidden @change="handleFile" />
        </div>
        <div v-if="uploading" class="ws-uploading">⏳ 上传中...</div>
        <div v-else-if="uploadedUrl" class="ws-uploaded">✓ 已上传</div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">输入文本</div>
        <textarea class="ws-textarea" v-model="text" placeholder="输入需要朗读的文本内容..." rows="5" maxlength="1000"></textarea>
        <div class="ws-hint">{{ text.length }} / 500 字符</div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">音色预设</div>
        <div class="voice-preset-grid">
          <div v-for="v in presets" :key="v.id" class="voice-preset" :class="{ active: selectedPreset === v.id }" @click="selectedPreset = v.id">
            <div class="voice-preset__icon">{{ v.icon }}</div>
            <div class="voice-preset__name">{{ v.name }}</div>
            <div class="voice-preset__desc">{{ v.desc }}</div>
          </div>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">预计消耗 <strong>5</strong> 积分</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!uploadedUrl || !text.trim() || submitting" @click="handleGenerate">{{ submitting ? '生成中...' : '开始生成' }}</button>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">生成结果</div>
        <div v-if="task.polling.value" class="progress-box">
          <div class="spinner" /><p>AI 正在克隆音色并合成...</p>
          <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
        </div>
        <div v-else-if="task.status.value === 2" class="ws-result">
          <audio v-if="task.result.value" class="ws-audio" controls :src="task.result.value"></audio>
          <div class="ws-result__meta"><span>音色：{{ presets.find(p=>p.id===selectedPreset)?.name || '自定义克隆' }}</span></div>
        </div>
        <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value || '生成失败' }}</p><button class="ws-btn ws-btn--primary" @click="handleRedo">重试</button></div>
        <div v-else class="ws-placeholder"><div class="ws-placeholder__icon">🔊</div><div class="ws-placeholder__text">生成后的音频将显示在这里</div></div>
      </div>
      </WorkLayout>
</template>

<script setup lang="ts">

const steps = ['上传音频', '选择音色', '生成音频']
const currentStep = ref(0)
const audioFileName = ref('')
const uploadedUrl = ref('')
const uploading = ref(false)
const text = ref('')
const selectedPreset = ref('gentle-female')
const submitting = ref(false)
const task = useTask()
const fileInput = ref<HTMLInputElement>()

const presets = [
  { id: 'gentle-female', icon: '👩', name: '温柔女声', desc: '清晰温柔的中文女声' },
  { id: 'professional-male', icon: '👨', name: '专业男声', desc: '沉稳大气的播音男声' },
  { id: 'lively-female', icon: '👧', name: '活泼女声', desc: '轻快活力的年轻女声' },
  { id: 'deep-male', icon: '🧔', name: '深沉男声', desc: '浑厚低沉的磁性男声' },
]

function triggerUpload() { fileInput.value?.click() }

async function uploadFile(file: File) {
  uploading.value = true
  const formData = new FormData(); formData.append('file', file)
  try {
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData })
    uploadedUrl.value = res.data?.url
  } catch (e: any) { toast.error(e?.data?.msg || '上传失败') }
  uploading.value = false
}

function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) { audioFileName.value = files[0].name; uploadFile(files[0]) }
}

function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files?.length) { audioFileName.value = files[0].name; uploadFile(files[0]) }
}

async function handleGenerate() {
  if (!uploadedUrl.value) { toast.warn('请上传音频样本'); return }
  if (!text.value.trim()) { toast.warn('请输入文本内容'); return }
  submitting.value = true
  try {
    const res: any = await $fetch('/api/adv-video/voice-clone', {
      method: 'POST', credentials: 'include',
      body: { audioSampleUrl: uploadedUrl.value, text: text.value, presetVoice: selectedPreset.value },
    })
    currentStep.value = 2
    task.pollTask(res.data?.taskId, '/api/adv-video/tasks/')
  } catch (e: any) { toast.error(e?.data?.msg || '提交失败') }
  finally { submitting.value = false }
}

function handleRedo() { task.reset(); currentStep.value = 0; uploading.value = false; uploadedUrl.value = ''; audioFileName.value = ''; submitting.value = false }
</script>

<style scoped>
.voice-preset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.voice-preset { padding: 16px; border-radius: 12px; border: 2px solid var(--border); background: var(--bg-card); text-align: center; cursor: pointer; transition: border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast); }
.voice-preset:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.voice-preset.active { border-color: var(--brand); background: var(--brand-light); }
.voice-preset__icon { font-size: 2rem; margin-bottom: 8px; }
.voice-preset__name { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
.voice-preset__desc { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px; }
.ws-uploading, .ws-uploaded { text-align: center; padding: 8px; font-size: 0.9rem; }
.ws-uploaded { color: var(--success); }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; flex-wrap: wrap; gap: 12px; }
.ws-cost { font-size: 0.9rem; color: var(--text-secondary); }
.ws-cost strong { color: var(--brand); }
.ws-audio { width: 100%; margin-top: 12px; }
.ws-result__meta { display: flex; gap: 16px; font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; }
.progress-box { text-align: center; padding: 40px; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.bar { width: 100%; height: 6px; background: var(--bg-hover); border-radius: 3px; margin-top: 16px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width 0.3s; }
.error-box { text-align: center; padding: 40px; color: var(--danger); }
</style>
