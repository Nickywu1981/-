<!--
  Movio AI v4.1 — Smart Video Editor (长视频精剪)
  G4 前端开发 | W3
  智能精剪 · 去冗余 · 杂音优化 · 字幕校对
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || 'AI 长视频精剪' }}</h1>
      <p>{{ headerCfg.subtitle || '智能识别高光片段 · 自动去冗余 · 杂音优化 · 字幕校对' }}</p>
    </header>

    <div class="work-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- 智能精剪 -->
    <div v-if="activeTab === 'smartClip'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onClipVideoUploaded" />
      <p class="hint">上传长视频，AI自动识别高光片段进行精剪</p>

      <div class="options-row" style="margin-top:16px">
        <div class="option">
          <label>目标时长 (秒)</label>
          <select v-model="clipDuration" class="input">
            <option :value="30">30秒</option>
            <option :value="60">60秒</option>
            <option :value="120">120秒</option>
            <option :value="300">300秒</option>
          </select>
        </div>
        <div class="option">
          <label>剪辑数量</label>
          <select v-model="clipCount" class="input">
            <option :value="1">1段</option>
            <option :value="3">3段</option>
            <option :value="5">5段</option>
            <option :value="10">10段</option>
          </select>
        </div>
        <div class="option">
          <label>风格</label>
          <select v-model="clipStyle" class="input">
            <option value="fast">快节奏</option>
            <option value="smooth">流畅叙事</option>
            <option value="highlight">高光合集</option>
          </select>
        </div>
      </div>

      <div class="input-group">
        <label>手动指定剪切区间（可选，JSON格式）</label>
        <textarea v-model="clipRegionsText" class="input" rows="3" placeholder='[{"start": 10, "end": 30}, {"start": 60, "end": 90}]'></textarea>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!clipVideo || clipStatus === 'processing'" @click="doSmartClip">
        {{ clipStatus === 'processing' ? '精剪中...' : '开始精剪' }}
      </button>
      <AppTaskProgress v-if="clipStatus !== 'idle'" :status="clipStatus" :progress="clipProgress" @retry="doSmartClip" />
    </div>

    <!-- 去冗余 -->
    <div v-if="activeTab === 'removeRedundant'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onRedundantVideoUploaded" />
      <p class="hint">自动检测并删除静音段和重复段</p>

      <div class="option" style="max-width:300px;margin:16px 0">
        <label>相似度阈值</label>
        <select v-model="threshold" class="input">
          <option :value="0.7">宽松 (0.7)</option>
          <option :value="0.8">标准 (0.8)</option>
          <option :value="0.9">严格 (0.9)</option>
        </select>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!redundantVideo || redundantStatus === 'processing'" @click="doRemoveRedundant">
        {{ redundantStatus === 'processing' ? '处理中...' : '去冗余' }}
      </button>
      <AppTaskProgress v-if="redundantStatus !== 'idle'" :status="redundantStatus" :progress="redundantProgress" @retry="doRemoveRedundant" />
    </div>

    <!-- 杂音优化 -->
    <div v-if="activeTab === 'audioOptimize'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onAudioVideoUploaded" />
      <p class="hint">对人声进行降噪优化，提升音频清晰度</p>

      <div class="option" style="max-width:300px;margin:16px 0">
        <label>优化级别</label>
        <select v-model="audioLevel" class="input">
          <option value="light">轻度</option>
          <option value="standard">标准</option>
          <option value="aggressive">强力</option>
        </select>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!audioVideo || audioStatus === 'processing'" @click="doOptimizeAudio">
        {{ audioStatus === 'processing' ? '优化中...' : '优化杂音' }}
      </button>
      <AppTaskProgress v-if="audioStatus !== 'idle'" :status="audioStatus" :progress="audioProgress" @retry="doOptimizeAudio" />
    </div>

    <!-- 字幕校对 -->
    <div v-if="activeTab === 'subtitleFix'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="500" :max-count="1" @uploaded="onSubtitleVideoUploaded" />
      <p class="hint">AI自动识别视频语音并生成精确字幕</p>

      <div class="option" style="max-width:300px;margin:16px 0">
        <label>源语言</label>
        <select v-model="subtitleLang" class="input">
          <option value="zh">中文</option>
          <option value="en">英文</option>
          <option value="ja">日文</option>
          <option value="ko">韩文</option>
        </select>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!subtitleVideo || subStatus === 'processing'" @click="doSubtitleFix">
        {{ subStatus === 'processing' ? '校对中...' : '字幕校对' }}
      </button>
      <AppTaskProgress v-if="subStatus !== 'idle'" :status="subStatus" :progress="subProgress" @retry="doSubtitleFix" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppPage } from '~/composables/useAppPage'
import { useTaskPolling } from '~/composables/useTaskPolling'

definePageMeta({ layout: 'workspace', middleware: 'auth' })

const { configs } = useAppPage({ configs: ['page.video_edit.header'] })
const headerCfg = computed(() => configs.value['page.video_edit.header'] || {})

const activeTab = ref('smartClip')
const tabs = [
  { key: 'smartClip', label: '智能精剪' },
  { key: 'removeRedundant', label: '去冗余' },
  { key: 'audioOptimize', label: '杂音优化' },
  { key: 'subtitleFix', label: '字幕校对' },
]

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
.tab-btn { padding: 10px 18px; border: none; background: none; font-size: var(--cfg-font-size-base); color: var(--cfg-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: all var(--cfg-transition-fast); white-space: nowrap; }
.tab-btn.active { color: var(--cfg-primary); border-bottom-color: var(--cfg-primary); font-weight: var(--cfg-font-weight-semibold); }

.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }
.hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 12px 0; }

.options-row { display: flex; gap: 16px; margin-bottom: 20px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }
</style>
