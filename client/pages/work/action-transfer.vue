<!--
  Movio AI v4.1 — Action Migration Page (全球独家杀手功能)
  G4 前端开发 | W3
  单人动作迁移 + 批量动作迁移
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || $t('work_pages.action_transfer.title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('work_pages.action_transfer.subtitle') }}</p>
    </header>

    <div class="work-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- 单人动作迁移 -->
    <div v-if="activeTab === 'single'" class="work-panel">
      <div class="two-col-upload">
        <div class="upload-col">
          <label>{{ $t('work_pages.action_transfer.source_video') }}</label>
          <AppMediaUpload accept="video" :multiple="false" :max-size="200" :max-count="1" @uploaded="onSourceVideoUploaded" />
          <p v-if="sourceVideoUrl" class="hint ok">{{ $t('work_pages.action_transfer.source_selected') }}</p>
        </div>
        <div class="upload-col">
          <label>{{ $t('work_pages.action_transfer.target_image') }}</label>
          <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onTargetImageUploaded" />
          <p v-if="targetImageUrl" class="hint ok">{{ $t('work_pages.action_transfer.source_selected') }}</p>
        </div>
      </div>

      <div class="options-row" style="margin-top:20px">
        <div class="option">
          <label>{{ $t('work_pages.action_transfer.action_style') }}</label>
          <select v-model="actionStyle" class="input">
            <option value="">{{ $t('work_pages.action_transfer.style_auto') }}</option>
            <option v-for="opt in actionStyleOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
          </select>
        </div>
      </div>

      <!-- 增强选项：换背景 -->
      <div class="enhanced-section">
        <div class="enhanced-header">
          <label class="toggle-label">
            <input type="checkbox" v-model="replaceBackground" />
            <span>{{ $t('action.background_replace') || $t('work_pages.action_transfer.bg_replace') }}</span>
          </label>
        </div>
        <div v-if="replaceBackground" class="enhanced-body">
          <label>{{ $t('action.background_url') || $t('work_pages.action_transfer.bg_url') }}</label>
          <input v-model="backgroundUrl" class="input" :placeholder="$t('action.background_hint') || $t('work_pages.action_transfer.bg_hint')" />
        </div>
      </div>

      <!-- 增强选项：换衣服 -->
      <div class="enhanced-section">
        <div class="enhanced-header">
          <label class="toggle-label">
            <input type="checkbox" v-model="replaceClothing" />
            <span>{{ $t('action.clothing_replace') || $t('work_pages.action_transfer.clothing_replace') }}</span>
          </label>
        </div>
        <div v-if="replaceClothing" class="enhanced-body">
          <div class="options-row">
            <div class="option">
              <label>{{ $t('action.clothing_style') || $t('work_pages.action_transfer.clothing_style') }}</label>
              <select v-model="clothingStyle" class="input">
                <option value="">{{ $t('action.clothing_auto') || $t('work_pages.action_transfer.clothing_auto') }}</option>
                <option v-for="opt in clothingStyleOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
              </select>
            </div>
            <div class="option">
              <label>{{ $t('action.clothing_color') || $t('work_pages.action_transfer.clothing_color') }}</label>
              <input v-model="clothingColor" class="input" :placeholder="$t('action.color_hint') || $t('work_pages.action_transfer.color_hint')" />
            </div>
          </div>
        </div>
      </div>

      <!-- 增强选项：音频处理 -->
      <div class="enhanced-section">
        <div class="enhanced-header">
          <label class="toggle-label">
            <input type="checkbox" v-model="keepOriginalAudio" />
            <span>{{ $t('action.keep_audio') || $t('work_pages.action_transfer.keep_audio') }}</span>
          </label>
        </div>
        <div v-if="keepOriginalAudio" class="enhanced-body">
          <div class="option">
            <label>{{ $t('action.bgm_url') || $t('work_pages.action_transfer.bgm_url') }}</label>
            <input v-model="bgmUrl" class="input" :placeholder="$t('action.bgm_hint') || 'https://...'" />
          </div>
          <div class="option" style="margin-top:12px">
            <label>{{ $t('work_pages.action_transfer.volume_label') }}: {{ Math.round(volume * 100) }}%</label>
            <input type="range" v-model.number="volume" min="0" max="1" step="0.05" class="slider" />
          </div>
          <div class="option" style="margin-top:12px">
            <label>{{ $t('work_pages.action_transfer.voiceover_text_label') }}</label>
            <input v-model="voiceoverText" class="input" :placeholder="$t('work_pages.action_transfer.voiceover_hint')" />
          </div>
          <div class="option" style="margin-top:12px" v-if="voiceoverText">
            <label>{{ $t('work_pages.action_transfer.voiceover_type_label') }}</label>
            <select v-model="voiceoverType" class="input">
              <option value="">{{ $t('action.voice_auto') || $t('work_pages.action_transfer.clothing_auto') }}</option>
              <option v-for="opt in voiceoverTypeOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="cost-hint">{{ $t('work_pages.action_transfer.cost_hint') }}</div>

      <button class="btn btn-primary btn-lg" :disabled="!sourceVideoUrl || !targetImageUrl || taskStatus === 'processing' || taskStatus === 'queued'" @click="doMigrate">
        {{ taskStatus === 'processing' ? $t('work_pages.action_transfer.migrating') : taskStatus === 'queued' ? $t('work_pages.action_transfer.queued') : $t('work_pages.action_transfer.start_migrate') }}
      </button>

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" :show-download="taskStatus === 'completed'" @retry="doMigrate" @download="downloadResult" />

      <div v-if="resultUrl" class="result-preview">
        <video :src="resultUrl" class="result-video" controls />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">{{ $t('common.download') }}</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(resultUrl)">{{ $t('work_pages.action_transfer.copy_link') }}</button>
        </div>
      </div>
    </div>

    <!-- 批量动作迁移 -->
    <div v-if="activeTab === 'batch'" class="work-panel">
      <div class="batch-section">
        <label>{{ $t('work_pages.action_transfer.batch_source_label') }}</label>
        <AppMediaUpload accept="video" :multiple="true" :max-size="200" :max-count="10" @uploaded="onBatchVideosUploaded" />
        <p class="hint">{{ $t('work_pages.action_transfer.batch_source_hint', { n: batchSourceVideos.length }) }}</p>
      </div>
      <div class="batch-section" style="margin-top:20px">
        <label>{{ $t('work_pages.action_transfer.batch_target_label') }}</label>
        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="20" @uploaded="onBatchImagesUploaded" />
        <p class="hint">{{ $t('work_pages.action_transfer.batch_target_hint', { n: batchTargetImages.length }) }}</p>
      </div>

      <div v-if="batchSourceVideos.length && batchTargetImages.length" class="batch-summary">
        {{ $t('work_pages.action_transfer.batch_summary', { v: batchSourceVideos.length, i: batchTargetImages.length, t: batchSourceVideos.length * batchTargetImages.length }) }}
      </div>

      <button class="btn btn-primary btn-lg" style="margin-top:16px" :disabled="!batchSourceVideos.length || !batchTargetImages.length || batchStatus === 'processing'" @click="doBatchMigrate">
        {{ batchStatus === 'processing' ? $t('work_pages.action_transfer.batch_migrating') : $t('work_pages.action_transfer.batch_start') }}
      </button>

      <AppTaskProgress v-if="batchStatus !== 'idle'" :status="batchStatus" :progress="batchProgress" @retry="doBatchMigrate" />

      <div v-if="batchChildren.length > 0" class="batch-progress-list">
        <h4>{{ $t('work_pages.action_transfer.batch_subtask_title') }}</h4>
        <div v-for="child in batchChildren" :key="child.id" class="child-row">
          <span class="child-status" :class="child.status">{{ statusLabel(child.status) }}</span>
          <div class="child-bar"><div class="child-bar-fill" :style="{ width: (child.progress || 0) + '%' }" /></div>
          <span class="child-pct">{{ child.progress || 0 }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()


import { copyToClipboard } from '@/utils/format'

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const { configs } = useAppPage({ configs: ['page.action_migrate.header'] })
const headerCfg = computed(() => configs.value['page.action_migrate.header'] || {})

const actionStyleOptions = [
  { value: 'dance', nameKey: 'work_pages.action_transfer.style_dance' },
  { value: 'showcase', nameKey: 'work_pages.action_transfer.style_showcase' },
  { value: 'catwalk', nameKey: 'work_pages.action_transfer.style_catwalk' },
  { value: 'gesture', nameKey: 'work_pages.action_transfer.style_gesture' },
]
const clothingStyleOptions = [
  { value: 'casual', nameKey: 'work_pages.action_transfer.clothing_casual' },
  { value: 'formal', nameKey: 'work_pages.action_transfer.clothing_formal' },
  { value: 'sport', nameKey: 'work_pages.action_transfer.clothing_sport' },
  { value: 'fashion', nameKey: 'work_pages.action_transfer.clothing_fashion' },
  { value: 'vintage', nameKey: 'work_pages.action_transfer.clothing_vintage' },
]
const voiceoverTypeOptions = [
  { value: 'female_sweet', nameKey: 'work_pages.action_transfer.voice_female_sweet' },
  { value: 'female_gentle', nameKey: 'work_pages.action_transfer.voice_female_gentle' },
  { value: 'male_deep', nameKey: 'work_pages.action_transfer.voice_male_deep' },
  { value: 'male_young', nameKey: 'work_pages.action_transfer.voice_male_young' },
]
const activeTab = ref('single')
const tabs = [
  { key: 'single', label: t('work_pages.action_transfer.tab_single') },
  { key: 'batch', label: t('work_pages.action_transfer.tab_batch') },
]

// ---- 单人迁移 ----
const sourceVideoUrl = ref('')
const targetImageUrl = ref('')
const actionStyle = ref('')
const { status: taskStatus, progress: taskProgress, error: taskError, result, submit } = useTaskPolling()
const resultUrl = computed(() => result.value?.video_url || result.value?.file_url || '')
const { download } = useFileDownload()

// 增强选项
const replaceBackground = ref(false)
const backgroundUrl = ref('')
const replaceClothing = ref(false)
const clothingStyle = ref('')
const clothingColor = ref('')
const keepOriginalAudio = ref(false)
const bgmUrl = ref('')
const volume = ref(1.0)
const voiceoverText = ref('')
const voiceoverType = ref('')

function buildEnhancedOptions() {
  const enh: Record<string, any> = {}
  if (replaceBackground.value) {
    enh.replace_background = backgroundUrl.value || true
  }
  if (replaceClothing.value) {
    enh.replace_clothing = true
    if (clothingStyle.value) enh.clothing_style = clothingStyle.value
    if (clothingColor.value) enh.clothing_color = clothingColor.value
  }
  if (keepOriginalAudio.value) {
    enh.keep_original_audio = true
    if (bgmUrl.value) enh.bgm_url = bgmUrl.value
    enh.volume = volume.value
    if (voiceoverText.value) {
      enh.voiceover = { text: voiceoverText.value }
      if (voiceoverType.value) enh.voiceover.voice_type = voiceoverType.value
    }
  }
  return Object.keys(enh).length ? enh : undefined
}

function onSourceVideoUploaded(files: any[]) { if (files.length > 0) sourceVideoUrl.value = files[0].url }
function onTargetImageUploaded(files: any[]) { if (files.length > 0) targetImageUrl.value = files[0].url }

async function doMigrate() {
  const enhanced = buildEnhancedOptions()
  await submit('action_migrate', {
    source_video_url: sourceVideoUrl.value,
    target_person_image: targetImageUrl.value,
    options: actionStyle.value ? { style: actionStyle.value } : {},
    ...(enhanced ? { enhanced_options: enhanced } : {}),
  })
}

// ---- 批量迁移 ----
const batchSourceVideos = ref<any[]>([])
const batchTargetImages = ref<any[]>([])
const { status: batchStatus, progress: batchProgress, result: batchResult, submit: submitBatch } = useTaskPolling()
const batchChildren = ref<any[]>([])

function onBatchVideosUploaded(files: any[]) { batchSourceVideos.value = files }
function onBatchImagesUploaded(files: any[]) { batchTargetImages.value = files }

async function doBatchMigrate() {
  const enhanced = buildEnhancedOptions()
  await submitBatch('batch_action_migrate', {
    source_video_urls: batchSourceVideos.value.map((f: any) => f.url),
    target_person_images: batchTargetImages.value.map((f: any) => f.url),
    options: {},
    ...(enhanced ? { enhanced_options: enhanced } : {}),
  })
}

watch(batchResult, (v) => {
  if (v?.sub_tasks) batchChildren.value = v.sub_tasks
})

function statusLabel(s: string) {
  const map: Record<string, string> = { queued: t('work_pages.action_transfer.status_queued'), processing: t('work_pages.action_transfer.status_processing'), completed: t('work_pages.action_transfer.status_completed'), failed: t('work_pages.action_transfer.status_failed') }
  return map[s] || s
}

function downloadResult() { if (resultUrl.value) download(resultUrl.value, 'action-transfer.mp4') }
</script>

<style scoped>
.work-page { max-width: 960px; margin: 0 auto; padding: var(--space-8, 32px)) var(--space-4, 16px)); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--text-2xl, 1.5rem)); margin: 0 0 8px 0; }
.work-header p { color: var(--text-muted, #9ca3af)); margin: 0; }

.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color, #e5e7eb)); }
.tab-btn { padding: 10px 20px; border: none; background: none; font-size: var(--text-base, 1rem)); color: var(--text-secondary, #6b7280)); cursor: pointer; border-bottom: 2px solid transparent; transition: color var(--transition-fast, 0.15s ease)), border-color var(--transition-fast, 0.15s ease)); }
.tab-btn.active { color: var(--brand, #5b5fe3)); border-bottom-color: var(--brand, #5b5fe3)); font-weight: 600); }

.work-panel { background: var(--bg-card, #ffffff)); border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-lg, 12px)); padding: 24px; }
.two-col-upload { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.upload-col label { display: block; font-size: var(--text-sm, 0.875rem)); color: var(--text-secondary, #6b7280)); margin-bottom: 8px; font-weight: 500); }
.hint { font-size: var(--text-sm, 0.875rem)); color: var(--text-muted, #9ca3af)); margin: 8px 0; }
.hint.ok { color: var(--success, #10b981)); }

.options-row { display: flex; gap: 16px; margin-bottom: 20px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--text-sm, 0.875rem)); color: var(--text-secondary, #6b7280)); margin-bottom: 6px; }

.cost-hint { font-size: var(--text-sm, 0.875rem)); color: var(--warning, #f59e0b)); margin-bottom: 16px; font-weight: 500); }

.result-preview { margin-top: 24px; }
.result-video { width: 100%; max-height: 480px; border-radius: var(--radius-md, 8px)); border: 1px solid var(--border-color, #e5e7eb)); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }

.batch-section label { display: block; font-size: var(--text-sm, 0.875rem)); color: var(--text-secondary, #6b7280)); margin-bottom: 8px; font-weight: 500); }
.batch-summary { margin-top: 16px; padding: 12px; background: var(--bg-tertiary, #f3f4f6)); border-radius: var(--radius-md, 8px)); font-size: var(--text-sm, 0.875rem)); color: var(--brand, #5b5fe3)); text-align: center; font-weight: 600); }

.batch-progress-list { margin-top: 24px; }
.batch-progress-list h4 { font-size: var(--text-base, 1rem)); margin-bottom: 12px; }
.child-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.child-status { font-size: var(--text-xs, 0.75rem)); padding: 2px 8px; border-radius: var(--radius-sm, 4px)); }
.child-status.queued { background: var(--bg-tertiary, #f3f4f6)); color: var(--text-secondary, #6b7280)); }
.child-status.processing { background: var(--info-bg); color: var(--brand, #5b5fe3)); }
.child-status.completed { background: var(--success-light); color: var(--success, #10b981)); }
.child-status.failed { background: var(--danger-light); color: var(--danger, #ef4444)); }
.child-bar { flex: 1; height: 6px; background: var(--bg-tertiary, #f3f4f6)); border-radius: 3px; overflow: hidden; }
.child-bar-fill { height: 100%; background: var(--brand, #5b5fe3)); border-radius: 3px; transition: width 0.3s; }
.child-pct { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); min-width: 36px; text-align: right; }

.enhanced-section { margin-bottom: 16px; border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-md, 8px)); overflow: hidden; }
.enhanced-header { padding: 10px 14px; background: var(--bg-tertiary, #f3f4f6)); }
.enhanced-body { padding: 14px; }
.toggle-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--text-sm, 0.875rem)); color: var(--text-primary, #1f2937)); font-weight: 500); }
.toggle-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--brand, #5b5fe3)); }
.slider { width: 100%; accent-color: var(--brand, #5b5fe3)); }

.input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-md, 8px)); background: var(--bg-card, #ffffff)); color: var(--text-primary, #1f2937)); font-size: var(--text-base, 1rem)); box-sizing: border-box; }
.input:focus { outline: none; border-color: var(--brand, #5b5fe3)); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
</style>
