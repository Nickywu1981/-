<!--
  Movio AI v4.1 — Digital Human Page
  G4 前端开发 | W3
  文本/音频驱动口播数字人
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || 'AI 数字人口播' }}</h1>
      <p>{{ headerCfg.subtitle || '文本/音频驱动 — 选择形象+语音+背景 — 一键生成口播视频' }}</p>
    </header>

    <div class="work-panel">
      <!-- 口播文案 -->
      <div class="input-group">
        <label>口播文案</label>
        <textarea v-model="script" class="input prompt-input" rows="6" placeholder="请输入口播文案...&#10;&#10;如：这款秋季新品连衣裙，采用高支棉面料，亲肤透气不起球。限时特惠只要99元！&#10;&#10;约5字/秒，30秒口播约150字" maxlength="2000"></textarea>
        <div class="enhance-row">
          <PromptEnhancer mode="script" :initial-prompt="script" @applied="(v) => script = v" />
        </div>

        <div class="word-count">{{ script.length }} 字 · 约 {{ Math.ceil(script.length / 5) }} 秒</div>
      </div>

      <div class="quick-scripts">
        <button v-for="(q, i) in quickTemplates" :key="i" class="btn btn-ghost btn-xs" @click="script = q">{{ q.slice(0, 25) }}...</button>
      </div>

      <!-- 音频上传 (可选) -->
      <div class="input-group" style="margin-top:20px">
        <label>或上传音频文件（可选，不传则用AI语音合成）</label>
        <AppMediaUpload accept="all" :multiple="false" :max-size="50" :max-count="1" @uploaded="onAudioUploaded" />
        <p v-if="audioUrl" class="hint ok">✓ 已上传音频</p>
      </div>

      <!-- 形象选择 -->
      <h3 class="section-title">选择数字人形象</h3>
      <div class="avatar-grid">
        <button v-for="a in avatars" :key="a.id" class="avatar-card" :class="{ active: selectedAvatar === a.id }" @click="selectedAvatar = a.id">
          <span class="avatar-icon">{{ a.icon }}</span>
          <span class="avatar-name">{{ a.name }}</span>
        </button>
      </div>

      <!-- 背景 -->
      <h3 class="section-title">选择背景</h3>
      <div class="bg-row">
        <button v-for="bg in backgrounds" :key="bg.id" class="bg-btn" :class="{ active: selectedBg === bg.id }" @click="selectedBg = bg.id">
          {{ bg.name }}
        </button>
      </div>

      <div class="cost-hint">成本：15 点/次</div>

      <button class="btn btn-primary btn-lg" :disabled="!script.trim() || submitting" @click="doCreate">
        <span v-if="submitting" class="spinner" /> {{ submitting ? '提交中...' : taskStatus === 'processing' ? '生成中...' : taskStatus === 'queued' ? '排队中...' : '生成口播视频' }}
      </button>

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" :show-download="taskStatus === 'completed'" @retry="doCreate" @download="downloadResult" />

      <div v-if="resultUrl" class="result-preview">
        <video :src="resultUrl" class="result-video" controls />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">下载</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(resultUrl)">复制链接</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppPage } from '~/composables/useAppPage'
import { useTaskPolling } from '~/composables/useTaskPolling'
import { copyToClipboard } from '@/utils/format'
import PromptEnhancer from '~/components/PromptEnhancer.vue'

definePageMeta({ layout: 'workspace' })

const { configs } = useAppPage({ configs: ['page.digital_human.header'] })
const headerCfg = computed(() => configs.value['page.digital_human.header'] || {})

const script = ref('')
const audioUrl = ref('')
const selectedAvatar = ref('default')
const selectedBg = ref('studio')
const { status: taskStatus, progress: taskProgress, error: taskError, result, submit } = useTaskPolling()
const submitting = ref(false)
const resultUrl = computed(() => result.value?.video_url || result.value?.file_url || '')
const { download } = useFileDownload()

const quickTemplates = [
  '这款新品首发，限时特惠只要99元，点击下方链接立即抢购！',
  '大家好，今天给大家推荐一款超好用的清洁神器，顽固污渍一抹就干净！',
  '姐妹们，这件衣服真的太显瘦了！高腰设计完美遮肉，显高显气质！',
]

const avatars = [
  { id: 'default', name: '职场女性', icon: '👩‍💼' },
  { id: 'casual_female', name: '休闲女生', icon: '👩' },
  { id: 'business_man', name: '商务男士', icon: '👨‍💼' },
  { id: 'casual_male', name: '休闲男生', icon: '👨' },
  { id: 'senior_female', name: '知性女性', icon: '👩‍🏫' },
  { id: 'fashion_male', name: '时尚潮男', icon: '🕺' },
]

const backgrounds = [
  { id: 'studio', name: '录播棚' },
  { id: 'white', name: '纯白背景' },
  { id: 'office', name: '商务办公' },
  { id: 'living', name: '温馨家居' },
]

function onAudioUploaded(files: any[]) { if (files.length > 0) audioUrl.value = files[0].url }

async function doCreate() {
  submitting.value = true
  try {
    await submit('digital_human', {
      text: script.value,
      audio_url: audioUrl.value || undefined,
      avatar_style: selectedAvatar.value,
      background: selectedBg.value,
    })
  } finally {
    submitting.value = false
  }
}

function downloadResult() { if (resultUrl.value) download(resultUrl.value, 'digital-human.mp4') }
</script>

<style scoped>
.work-page { max-width: 900px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }

.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }

.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }
.prompt-input { font-size: var(--cfg-font-size-md); min-height: 120px; }
.word-count { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); margin-top: 6px; }
.hint.ok { font-size: var(--cfg-font-size-xs); color: var(--cfg-success); margin-top: 6px; }

.quick-scripts { display: flex; gap: 8px; flex-wrap: wrap; }
.section-title { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-semibold); margin: 24px 0 12px; color: var(--cfg-text-primary); }

.avatar-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.avatar-card { padding: 16px 12px; border: 2px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); cursor: pointer; text-align: center; min-width: 100px; transition: all var(--cfg-transition-fast); }
.avatar-card:hover { border-color: var(--cfg-primary); }
.avatar-card.active { border-color: var(--cfg-primary); background: var(--cfg-bg-brand-light); }
.avatar-icon { font-size: 28px; display: block; margin-bottom: 6px; }
.avatar-name { font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-primary); }

.bg-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.bg-btn { padding: 8px 16px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-sm); background: var(--cfg-bg-primary); cursor: pointer; font-size: var(--cfg-font-size-sm); transition: all var(--cfg-transition-fast); }
.bg-btn:hover { border-color: var(--cfg-primary); }
.bg-btn.active { background: var(--cfg-primary); color: #fff; border-color: var(--cfg-primary); }

.cost-hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-warning); margin-bottom: 16px; font-weight: var(--cfg-font-weight-medium); }

.result-preview { margin-top: 24px; }
.result-video { width: 100%; max-height: 480px; border-radius: var(--cfg-radius-base); border: 1px solid var(--cfg-border); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }
</style>
