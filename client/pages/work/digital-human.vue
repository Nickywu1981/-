<!--
  Movio AI v4.1 — Digital Human Page
  G4 前端开发 | W3
  文本/音频驱动口播数字人
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || $t('work_pages.digital_human_title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('work_pages.digital_human_subtitle') }}</p>
    </header>

    <div class="work-panel">
      <!-- 口播文案 -->
      <div class="input-group">
        <label>{{ $t('work_pages.digital_human_script_label') }}</label>
        <textarea v-model="script" class="input prompt-input" rows="6" :placeholder="$t('work_pages.digital_human_script_placeholder')" maxlength="2000"></textarea>
        <div class="enhance-row">
          <PromptEnhancer mode="script" :initial-prompt="script" @applied="(v) => script = v" />
        </div>

        <div class="word-count">{{ script.length }} {{ $t('work_pages.digital_human_word_count_suffix') }} {{ Math.ceil(script.length / 5) }} {{ $t('work_pages.digital_human_word_count_sec') }}</div>
      </div>

      <div class="quick-scripts">
        <button v-for="(q, i) in quickTemplates" :key="i" class="btn btn-ghost btn-xs" @click="script = q">{{ q.slice(0, 25) }}...</button>
      </div>

      <!-- 音频上传 (可选) -->
      <div class="input-group" style="margin-top:20px">
        <label>{{ $t('work_pages.digital_human_audio_label') }}</label>
        <AppMediaUpload accept="all" :multiple="false" :max-size="50" :max-count="1" @uploaded="onAudioUploaded" />
        <p v-if="audioUrl" class="hint ok">{{ $t('work_pages.digital_human_audio_uploaded') }}</p>
      </div>

      <!-- 形象选择 -->
      <h3 class="section-title">{{ $t('work_pages.digital_human_avatar_title') }}</h3>
      <div class="avatar-grid">
        <button v-for="a in avatars" :key="a.id" class="avatar-card" :class="{ active: selectedAvatar === a.id }" @click="selectedAvatar = a.id">
          <span class="avatar-icon">{{ a.icon }}</span>
          <span class="avatar-name">{{ $t('work_pages.digital_human_avatar_' + a.id) }}</span>
        </button>
      </div>

      <!-- 背景 -->
      <h3 class="section-title">{{ $t('work_pages.digital_human_bg_title') }}</h3>
      <div class="bg-row">
        <button v-for="bg in backgrounds" :key="bg.id" class="bg-btn" :class="{ active: selectedBg === bg.id }" @click="selectedBg = bg.id">
          {{ $t('work_pages.digital_human_bg_' + bg.id) }}
        </button>
      </div>

      <div class="cost-hint">{{ $t('work_pages.digital_human_cost') }}{{ costValue }} {{ $t('work_pages.digital_human_cost_unit') }}</div>

      <button class="btn btn-primary btn-lg" :disabled="!script.trim() || submitting" @click="doCreate">
        <span v-if="submitting" class="spinner" /> {{ submitting ? $t('work_pages.digital_human_btn_submitting') : taskStatus === 'processing' ? $t('work_pages.digital_human_btn_generating') : taskStatus === 'queued' ? $t('work_pages.digital_human_btn_queued') : $t('work_pages.digital_human_btn_submit') }}
      </button>

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" :show-download="taskStatus === 'completed'" @retry="doCreate" @download="downloadResult" />

      <div v-if="resultUrl" class="result-preview">
        <video :src="resultUrl" class="result-video" controls />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">{{ $t('work_pages.digital_human_download') }}</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(resultUrl)">{{ $t('work_pages.digital_human_copy_link') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">


import { copyToClipboard } from '@/utils/format'
import PromptEnhancer from '~/components/PromptEnhancer.vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

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

const costValue = ref(15)

const quickTemplates = [
  '这款新品首发，限时特惠只要99元，点击下方链接立即抢购！',
  '大家好，今天给大家推荐一款超好用的清洁神器，顽固污渍一抹就干净！',
  '姐妹们，这件衣服真的太显瘦了！高腰设计完美遮肉，显高显气质！',
]

const avatars = [
  { id: 'default', icon: '👩‍💼' },
  { id: 'casual_female', icon: '👩' },
  { id: 'business_man', icon: '👨‍💼' },
  { id: 'casual_male', icon: '👨' },
  { id: 'senior_female', icon: '👩‍🏫' },
  { id: 'fashion_male', icon: '🕺' },
]

const backgrounds = [
  { id: 'studio' },
  { id: 'white' },
  { id: 'office' },
  { id: 'living' },
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
.prompt-input { font-size: var(--cfg-font-size-base); min-height: 120px; }
.enhance-row { margin-top: 8px; }
.word-count { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); margin-top: 6px; }
.hint.ok { font-size: var(--cfg-font-size-xs); color: var(--cfg-success); margin-top: 6px; }
.quick-scripts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }

.section-title { font-size: var(--cfg-font-size-base); margin: 20px 0 12px; font-weight: var(--cfg-font-weight-semibold); }

.avatar-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.avatar-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 2px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); cursor: pointer; transition: border-color var(--cfg-transition-fast); }
.avatar-card.active { border-color: var(--cfg-primary); background: var(--cfg-bg-tertiary); }
.avatar-icon { font-size: 32px; }
.avatar-name { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); font-weight: var(--cfg-font-weight-medium); }

.bg-row { display: flex; gap: 8px; flex-wrap: wrap; }
.bg-btn { padding: 6px 16px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-sm); background: var(--cfg-bg-primary); cursor: pointer; font-size: var(--cfg-font-size-sm); }
.bg-btn.active { background: var(--cfg-primary); color: #fff; border-color: var(--cfg-primary); }

.cost-hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-warning); margin: 16px 0; }

.result-preview { margin-top: 24px; }
.result-video { width: 100%; max-height: 480px; border-radius: var(--cfg-radius-base); border: 1px solid var(--cfg-border); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }
</style>
