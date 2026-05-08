<template>
  <WorkLayout title="语音生成" subtitle="AI 配音/TTS 语音合成" :steps="steps" :current-step="currentStep">
    <template #input>
      <div class="ws-section">
        <div class="ws-section__title">输入配音文案</div>
        <textarea class="ws-textarea" v-model="text" placeholder="输入需要配音的文案内容..." rows="5"></textarea>
        <div class="ws-hint">{{ text.length }} / 1000 字符 · 支持中/英/日/韩多语种</div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">选择音色</div>
        <div class="voice-grid">
          <div v-for="v in voices" :key="v.id" class="voice-card" :class="{ active: selectedVoice === v.id }" @click="selectedVoice = v.id">
            <div class="voice-card__icon">{{ v.icon }}</div>
            <div class="voice-card__name">{{ v.name }}</div>
            <div class="voice-card__style">{{ v.style }}</div>
          </div>
        </div>
      </div>
      <div class="ws-section">
        <div class="ws-section__title">语速</div>
        <div class="ws-slider-row">
          <input type="range" v-model="speed" min="0.5" max="2" step="0.1" class="ws-range" />
          <span class="ws-range-val">{{ speed }}x</span>
        </div>
      </div>
      <div class="ws-actions">
        <div class="ws-cost">预计消耗 <strong>3</strong> 积分</div>
        <button class="ws-btn ws-btn--primary ws-btn--lg" :disabled="!text.trim() || submitting" @click="handleGenerate">{{ submitting ? '生成中...' : '开始生成' }}</button>
      </div>
    </template>
    <template #output>
      <div class="ws-section">
        <div class="ws-section__title">生成结果</div>
        <div v-if="task.polling.value" class="progress-box">
          <div class="spinner" /><p>AI 正在合成语音...</p>
          <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
        </div>
        <div v-else-if="task.status.value === 2" class="ws-audio-box">
          <audio v-if="task.result.value" controls style="width:100%"><source :src="task.result.value" /></audio>
          <div class="ws-audio-meta">音色：{{ voices.find(v=>v.id===selectedVoice)?.name }} · 语速：{{ speed }}x</div>
        </div>
        <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value || '生成失败' }}</p><button class="ws-btn ws-btn--primary" @click="handleRedo">重试</button></div>
        <div v-else class="ws-placeholder"><div class="ws-placeholder__icon">🔊</div><div class="ws-placeholder__text">生成后的语音将显示在这里</div></div>
      </div>
    </template>
  </WorkLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const steps = ['输入文案', '选择音色', '生成语音']
const currentStep = ref(0)
const text = ref('')
const speed = ref(1.0)
const selectedVoice = ref('sweet-female')
const submitting = ref(false)
const task = useTask()

const voices = [
  { id: 'sweet-female', icon: '👩', name: '甜美女声', style: '温柔亲切·带货推荐' },
  { id: 'magnetic-male', icon: '👨', name: '磁性男声', style: '沉稳大气·品牌旁白' },
  { id: 'cute-child', icon: '👧', name: '可爱童声', style: '活泼轻快·趣味配音' },
  { id: 'steady-news', icon: '🎙', name: '沉稳播报', style: '专业清晰·资讯播报' },
  { id: 'lively-sales', icon: '💁', name: '活泼带货', style: '热情激昂·直播带货' },
  { id: 'gentle-heal', icon: '🌸', name: '温柔治愈', style: '安静舒缓·情感叙述' },
]

async function handleGenerate() {
  if (!text.value.trim()) { toast.warn('请输入配音文案'); return }
  submitting.value = true
  try {
    const res: any = await $fetch('/api/adv-video/voice-gen', {
      method: 'POST', credentials: 'include',
      body: { text: text.value, voiceType: selectedVoice.value, speed: speed.value, lang: 'zh' },
    })
    currentStep.value = 2
    task.pollTask(res.data.taskId, '/api/adv-video/tasks/')
  } catch (e: any) { toast.error(e.data?.msg || '提交失败') }
  submitting.value = false
}

function handleRedo() { task.reset(); currentStep.value = 0; submitting.value = false }
</script>

<style scoped>
.voice-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.voice-card { padding: 14px; border-radius: 12px; border: 2px solid var(--border-light); background: var(--bg-card); cursor: pointer; text-align: center; transition: all var(--transition-fast); }
.voice-card:hover { border-color: var(--brand-soft); transform: translateY(-2px); }
.voice-card.active { border-color: var(--brand); background: var(--brand-light); }
.voice-card__icon { font-size: 1.6rem; margin-bottom: 4px; }
.voice-card__name { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
.voice-card__style { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
.ws-slider-row { display: flex; align-items: center; gap: 14px; }
.ws-range { flex: 1; accent-color: var(--brand); }
.ws-range-val { font-weight: 600; color: var(--brand); min-width: 44px; text-align: right; font-size: 0.9rem; }
.ws-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; flex-wrap: wrap; gap: 12px; }
.ws-cost { font-size: 0.9rem; color: var(--text-secondary); }
.ws-cost strong { color: var(--brand); }
.ws-audio-box { padding: 24px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-lg); text-align: center; }
.ws-audio-meta { margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary); }
.progress-box { text-align: center; padding: 40px; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.bar { width: 100%; height: 6px; background: var(--bg-hover); border-radius: 3px; margin-top: 16px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--brand-gradient); border-radius: 3px; transition: width 0.3s; }
.error-box { text-align: center; padding: 40px; color: var(--danger); }
</style>
