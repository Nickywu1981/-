<!--
  Movio AI v4.1 — Smart Video Editor (长视频精剪)
  G4 前端开发 | W3
  智能精剪 · 去冗余 · 杂音优化 · 字幕校对
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || $t('work_pages.video_edit_title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('work_pages.video_edit_subtitle') }}</p>
    </header>

    <div class="work-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- 智能精剪 -->
    <div v-if="activeTab === 'smartClip'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onClipVideoUploaded" />
      <p class="hint">{{ $t('work_pages.video_edit_hint_smart_clip') }}</p>

      <div class="options-row" style="margin-top:16px">
        <div class="option">
          <label>{{ $t('work_pages.video_edit_duration_label') }}</label>
          <select v-model="clipDuration" class="input">
            <option v-for="opt in durationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="option">
          <label>{{ $t('work_pages.video_edit_clip_count_label') }}</label>
          <select v-model="clipCount" class="input">
            <option v-for="opt in clipCountOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="option">
          <label>{{ $t('work_pages.video_edit_style_label') }}</label>
          <select v-model="clipStyle" class="input">
            <option v-for="opt in styleOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
          </select>
        </div>
      </div>

      <div class="input-group">
        <label>{{ $t('work_pages.video_edit_manual_regions_label') }}</label>
        <textarea v-model="clipRegionsText" class="input" rows="3" placeholder='[{"start": 10, "end": 30}, {"start": 60, "end": 90}]' maxlength="2000"></textarea>
        <PromptEnhancer v-if="clipRegionsText.trim()" mode="video" :initial-prompt="clipRegionsText" @applied="(v) => clipRegionsText = v" />
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!clipVideo || clipStatus === 'processing'" @click="doSmartClip">
        {{ clipStatus === 'processing' ? $t('work_pages.video_edit_clipping') : $t('work_pages.video_edit_btn_smart_clip') }}
      </button>
      <AppTaskProgress v-if="clipStatus !== 'idle'" :status="clipStatus" :progress="clipProgress" @retry="doSmartClip" />
    </div>

    <!-- 去冗余 -->
    <div v-if="activeTab === 'removeRedundant'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onRedundantVideoUploaded" />
      <p class="hint">{{ $t('work_pages.video_edit_hint_redundant') }}</p>

      <div class="option" style="max-width:300px;margin:16px 0">
        <label>{{ $t('work_pages.video_edit_similarity_label') }}</label>
        <select v-model="threshold" class="input">
          <option v-for="opt in thresholdOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
        </select>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!redundantVideo || redundantStatus === 'processing'" @click="doRemoveRedundant">
        {{ redundantStatus === 'processing' ? $t('work_pages.video_edit_processing') : $t('work_pages.video_edit_btn_remove_redundant') }}
      </button>
      <AppTaskProgress v-if="redundantStatus !== 'idle'" :status="redundantStatus" :progress="redundantProgress" @retry="doRemoveRedundant" />
    </div>

    <!-- 杂音优化 -->
    <div v-if="activeTab === 'audioOptimize'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onAudioVideoUploaded" />
      <p class="hint">{{ $t('work_pages.video_edit_hint_audio') }}</p>

      <div class="option" style="max-width:300px;margin:16px 0">
        <label>{{ $t('work_pages.video_edit_optimize_level_label') }}</label>
        <select v-model="audioLevel" class="input">
          <option v-for="opt in audioLevelOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
        </select>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!audioVideo || audioStatus === 'processing'" @click="doOptimizeAudio">
        {{ audioStatus === 'processing' ? $t('work_pages.video_edit_optimizing') : $t('work_pages.video_edit_btn_optimize_audio') }}
      </button>
      <AppTaskProgress v-if="audioStatus !== 'idle'" :status="audioStatus" :progress="audioProgress" @retry="doOptimizeAudio" />
    </div>

    <!-- 字幕校对 -->
    <div v-if="activeTab === 'subtitleFix'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onSubtitleVideoUploaded" />
      <p class="hint">{{ $t('work_pages.video_edit_hint_subtitle') }}</p>

      <div class="option" style="max-width:300px;margin:16px 0">
        <label>{{ $t('work_pages.video_edit_source_lang_label') }}</label>
        <select v-model="subtitleLang" class="input">
          <option v-for="opt in langOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
        </select>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!subtitleVideo || subStatus === 'processing'" @click="doSubtitleFix">
        {{ subStatus === 'processing' ? $t('work_pages.video_edit_correcting') : $t('work_pages.video_edit_btn_subtitle_fix') }}
      </button>
      <AppTaskProgress v-if="subStatus !== 'idle'" :status="subStatus" :progress="subProgress" @retry="doSubtitleFix" />
    </div>
  </div>
</template>

<script setup lang="ts">


import PromptEnhancer from '~/components/PromptEnhancer.vue'

const { t } = useI18n()
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { configs } = useAppPage({ configs: ['page.video_edit.header'] })
const headerCfg = computed(() => configs.value['page.video_edit.header'] || {})

const activeTab = ref('smartClip')

const durationOptions = computed(() => [30, 60, 120, 300].map(n => ({ value: n, label: t('work_pages.video_edit_seconds_value', { n }) })))
const clipCountOptions = computed(() => [1, 3, 5, 10].map(n => ({ value: n, label: t('work_pages.video_edit_clips_value', { n }) })))
const styleOptions = [
  { value: 'fast', nameKey: 'work_pages.video_edit_style_fast' },
  { value: 'smooth', nameKey: 'work_pages.video_edit_style_smooth' },
  { value: 'highlight', nameKey: 'work_pages.video_edit_style_highlight' },
]
const thresholdOptions = [
  { value: 0.7, nameKey: 'work_pages.video_edit_threshold_loose' },
  { value: 0.8, nameKey: 'work_pages.video_edit_threshold_standard' },
  { value: 0.9, nameKey: 'work_pages.video_edit_threshold_strict' },
]
const audioLevelOptions = [
  { value: 'light', nameKey: 'work_pages.video_edit_audio_light' },
  { value: 'standard', nameKey: 'work_pages.video_edit_audio_standard' },
  { value: 'aggressive', nameKey: 'work_pages.video_edit_audio_aggressive' },
]
const langOptions = [
  { value: 'zh', nameKey: 'work_pages.video_edit_lang_zh' },
  { value: 'en', nameKey: 'work_pages.video_edit_lang_en' },
  { value: 'ja', nameKey: 'work_pages.video_edit_lang_ja' },
  { value: 'ko', nameKey: 'work_pages.video_edit_lang_ko' },
]
const tabs = computed(() => [
  { key: 'smartClip', label: t('work_pages.video_edit_tab_smart_clip') },
  { key: 'removeRedundant', label: t('work_pages.video_edit_tab_remove_redundant') },
  { key: 'audioOptimize', label: t('work_pages.video_edit_tab_audio_optimize') },
  { key: 'subtitleFix', label: t('work_pages.video_edit_tab_subtitle_fix') },
])

// ---- 智能精剪 ----
const clipVideo = ref('')
const clipDuration = ref(60)
const clipCount = ref(3)
const clipStyle = ref('fast')
const clipRegionsText = ref('')
const { status: clipStatus, progress: clipProgress, submit: submitClip } = useTaskPolling()

function onClipVideoUploaded(files: any[]) { if (files.length > 0) clipVideo.value = files[0].url }
async function doSmartClip() {
  let regions: any[] | undefined
  try { regions = clipRegionsText.value.trim() ? JSON.parse(clipRegionsText.value) : undefined } catch { /* invalid JSON, let AI auto-detect */ }
  await submitClip('live_clip', {
    video_url: clipVideo.value,
    duration: clipDuration.value,
    clip_count: clipCount.value,
    style: clipStyle.value,
    clip_regions: regions || null,
  })
}

// ---- 去冗余 ----
const redundantVideo = ref('')
const threshold = ref(0.8)
const { status: redundantStatus, progress: redundantProgress, submit: submitRedundant } = useTaskPolling()

function onRedundantVideoUploaded(files: any[]) { if (files.length > 0) redundantVideo.value = files[0].url }
async function doRemoveRedundant() {
  await submitRedundant('live_cut', { video_url: redundantVideo.value, threshold: threshold.value })
}

// ---- 杂音优化 ----
const audioVideo = ref('')
const audioLevel = ref('standard')
const { status: audioStatus, progress: audioProgress, submit: submitAudio } = useTaskPolling()

function onAudioVideoUploaded(files: any[]) { if (files.length > 0) audioVideo.value = files[0].url }
async function doOptimizeAudio() {
  await submitAudio('live_noise_fix', { video_url: audioVideo.value, level: audioLevel.value })
}

// ---- 字幕校对 ----
const subtitleVideo = ref('')
const subtitleLang = ref('zh')
const { status: subStatus, progress: subProgress, submit: submitSub } = useTaskPolling()

function onSubtitleVideoUploaded(files: any[]) { if (files.length > 0) subtitleVideo.value = files[0].url }
async function doSubtitleFix() {
  await submitSub('live_subtitle_fix', { video_url: subtitleVideo.value, source_language: subtitleLang.value })
}
</script>

<style scoped>
.work-page { max-width: 900px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }

.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--cfg-border); overflow-x: auto; }
.tab-btn { padding: 10px 18px; border: none; background: none; font-size: var(--cfg-font-size-base); color: var(--cfg-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: color var(--cfg-transition-fast), border-color var(--cfg-transition-fast); white-space: nowrap; }
.tab-btn.active { color: var(--cfg-primary); border-bottom-color: var(--cfg-primary); font-weight: var(--cfg-font-weight-semibold); }

.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }
.hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 12px 0; }

.options-row { display: flex; gap: 16px; margin-bottom: 20px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }
</style>
