<!--
  Movio AI v4.1 — Viral Video Analysis & Replicate
  G4 前端开发 | W3
  爆款视频分析 → 提取节奏/转场/文案 → 应用到你的产品
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || $t('work_pages.viral_replicate_title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('work_pages.viral_replicate_subtitle') }}</p>
    </header>

    <div class="work-panel">
      <!-- Step 1: 分析 -->
      <div class="step-section" :class="{ done: analysisDone }">
        <div class="step-header">
          <span class="step-num">1</span>
          <span class="step-label">{{ $t('work_pages.viral_replicate_step1_label') }}</span>
        </div>
        <div class="input-row">
          <input v-model="viralUrl" class="input" :placeholder="$t('work_pages.viral_replicate_url_placeholder')" :disabled="analyzing" maxlength="500" />
          <button class="btn btn-primary btn-sm" :disabled="!viralUrl.trim() || analyzing" @click="doAnalyze">
            {{ analyzing ? $t('work_pages.viral_replicate_analyzing') : $t('work_pages.viral_replicate_analyze') }}
          </button>
        </div>
        <div class="platform-badges">
          <span>{{ $t('work_pages.viral_replicate_supported') }}</span>
          <button v-for="p in platforms" :key="p.code" class="badge" :class="{ active: selectedPlatform === p.code }" @click="selectedPlatform = p.code">{{ $t(p.nameKey) }}</button>
        </div>

        <div v-if="analysisResult" class="analysis-box">
          <div class="analysis-title">{{ $t('work_pages.viral_replicate_analysis_result') }}</div>
          <div class="analysis-meta">
            <div class="meta-item"><span>{{ $t('work_pages.viral_replicate_meta_duration') }}</span><strong>{{ analysisResult.duration || '--' }}s</strong></div>
            <div class="meta-item"><span>{{ $t('work_pages.viral_replicate_meta_transitions') }}</span><strong>{{ analysisResult.transitions ? $t('work_pages.viral_replicate_meta_transitions_unit', { n: analysisResult.transitions }) : '--' }}</strong></div>
            <div class="meta-item"><span>BGM</span><strong>{{ analysisResult.bgm || '--' }}</strong></div>
            <div class="meta-item"><span>{{ $t('work_pages.viral_replicate_meta_copy') }}</span><strong>{{ analysisResult.hasText ? $t('work_pages.viral_replicate_meta_has_text') : $t('work_pages.viral_replicate_meta_no_text') }}</strong></div>
          </div>
          <div v-if="analysisResult.structure" class="structure-section">
            <div class="structure-label">{{ $t('work_pages.viral_replicate_structure_label') }}</div>
            <div class="structure-bar">
              <div v-for="(seg, i) in analysisResult.structure" :key="i" class="structure-seg" :style="{ width: seg.width + '%' }">
                {{ seg.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: 上传素材 -->
      <div class="step-section" :class="{ active: analysisDone }">
        <div class="step-header">
          <span class="step-num">2</span>
          <span class="step-label">{{ $t('work_pages.viral_replicate_step2_label') }}</span>
        </div>
        <div class="input-group">
          <label>{{ $t('work_pages.viral_replicate_product_name') }}</label>
          <input v-model="productName" type="text" class="input" :placeholder="$t('work_pages.viral_replicate_product_name_placeholder')" :disabled="!analysisDone" maxlength="200" />
        </div>
        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="9" @uploaded="onProductImagesUploaded" />
        <p v-if="productImages.length" class="hint ok">{{ $t('work_pages.viral_replicate_images_selected', { n: productImages.length }) }}</p>

        <div class="input-group" style="margin-top:16px">
          <label>{{ $t('work_pages.viral_replicate_custom_prompt') }}</label>
          <textarea v-model="customPrompt" class="input" rows="2" :placeholder="$t('work_pages.viral_replicate_prompt_placeholder')" :disabled="!analysisDone" maxlength="2000"></textarea>
          <PromptEnhancer v-if="analysisDone && customPrompt.trim()" mode="video" :initial-prompt="customPrompt" @applied="(v) => customPrompt = v" />
        </div>
      </div>

      <!-- Submit -->
      <button class="btn btn-primary btn-lg" :disabled="!analysisDone || !productName || repStatus === 'processing'" @click="doReplicate">
        {{ repStatus === 'processing' ? $t('work_pages.viral_replicate_replicating') : repStatus === 'queued' ? $t('work_pages.viral_replicate_queued') : $t('work_pages.viral_replicate_start') }}
      </button>

      <AppTaskProgress v-if="repStatus !== 'idle'" :status="repStatus" :progress="repProgress" :error-message="repError" :show-download="repStatus === 'completed'" @retry="doReplicate" @download="downloadResult" />

      <div v-if="replicateResultUrl" class="result-preview">
        <video :src="replicateResultUrl" class="result-video" controls />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">{{ $t('common.download') }}</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(replicateResultUrl)">{{ $t('work_pages.viral_replicate_copy_link') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">


import { copyToClipboard } from '@/utils/format'
import PromptEnhancer from '~/components/PromptEnhancer.vue'

const { t } = useI18n()
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { configs } = useAppPage({ configs: ['page.viral_replicate.header'] })
const headerCfg = computed(() => configs.value['page.viral_replicate.header'] || {})

// ---- Step 1: 分析 ----
const viralUrl = ref('')
const selectedPlatform = ref('douyin')
const analyzing = ref(false)
const analysisResult = ref<any>(null)
const { jobId: analysisJobId, status: anaStatus, result: anaResult, submit: submitAna } = useTaskPolling()

const platforms = [
  { code: 'douyin', nameKey: 'work_pages.viral_replicate_platform_douyin' },
  { code: 'kuaishou', nameKey: 'work_pages.viral_replicate_platform_kuaishou' },
  { code: 'xiaohongshu', nameKey: 'work_pages.viral_replicate_platform_xiaohongshu' },
  { code: 'tiktok', name: 'TikTok' },
]

const analysisDone = computed(() => !!analysisJobId.value && anaStatus.value === 'completed')

async function doAnalyze() {
  if (!viralUrl.value.trim()) return
  analyzing.value = true
  await submitAna('viral_analysis', { video_url: viralUrl.value, platform: selectedPlatform.value })
  analyzing.value = false
}

// 监听分析结果
watch(anaResult, (v) => {
  if (v) {
    try { analysisResult.value = typeof v === 'string' ? JSON.parse(v) : v }
    catch { analysisResult.value = null }
  }
})

// ---- Step 2: 复刻 ----
const productName = ref('')
const productImages = ref<any[]>([])
const customPrompt = ref('')
const { status: repStatus, progress: repProgress, error: repError, result: repResult, submit: submitRep } = useTaskPolling()
const replicateResultUrl = computed(() => repResult.value?.video_url || repResult.value?.file_url || '')
const { download } = useFileDownload()

function onProductImagesUploaded(files: any[]) { productImages.value = files }

async function doReplicate() {
  if (!analysisJobId.value) return
  await submitRep('viral_replicate', {
    analysis_job_id: analysisJobId.value,
    product_name: productName.value,
    product_images: productImages.value.map((f: any) => f.url),
    custom_prompt: customPrompt.value || undefined,
  })
}

function downloadResult() { if (replicateResultUrl.value) download(replicateResultUrl.value, 'viral-video.mp4') }
</script>

<style scoped>
.work-page { max-width: 900px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }

.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }

.step-section { opacity: 0.55; padding: 16px; border-radius: var(--cfg-radius-base); margin-bottom: 20px; border: 1px solid var(--cfg-border); transition: opacity var(--cfg-transition-fast), border-color var(--cfg-transition-fast); }
.step-section.active, .step-section.done { opacity: 1; border-color: var(--cfg-primary); }
.step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.step-num { width: 26px; height: 26px; border-radius: 50%; background: var(--cfg-bg-tertiary); color: var(--cfg-text-muted); display: flex; align-items: center; justify-content: center; font-size: var(--cfg-font-size-xs); font-weight: var(--cfg-font-weight-bold); }
.step-section.done .step-num { background: var(--cfg-success); color: #fff; }
.step-section.active .step-num { background: var(--cfg-primary); color: #fff; }
.step-label { font-weight: var(--cfg-font-weight-semibold); font-size: var(--cfg-font-size-base); color: var(--cfg-text-primary); }

.input-row { display: flex; gap: 8px; }
.input-row .input { flex: 1; }

.platform-badges { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); }
.badge { padding: 4px 12px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-full); background: var(--cfg-bg-primary); cursor: pointer; font-size: var(--cfg-font-size-xs); transition: background var(--cfg-transition-fast), color var(--cfg-transition-fast), border-color var(--cfg-transition-fast); }
.badge.active { background: var(--cfg-primary); color: #fff; border-color: var(--cfg-primary); }

.analysis-box { margin-top: 16px; padding: 16px; background: var(--cfg-bg-tertiary); border-radius: var(--cfg-radius-base); }
.analysis-title { font-weight: var(--cfg-font-weight-semibold); font-size: var(--cfg-font-size-base); margin-bottom: 12px; }
.analysis-meta { display: flex; gap: 24px; margin-bottom: 12px; }
.meta-item { display: flex; flex-direction: column; gap: 2px; }
.meta-item span { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.meta-item strong { font-size: var(--cfg-font-size-base); color: var(--cfg-text-primary); }

.structure-section { margin-top: 12px; }
.structure-label { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); margin-bottom: 6px; }
.structure-bar { display: flex; height: 28px; border-radius: var(--cfg-radius-sm); overflow: hidden; gap: 2px; }
.structure-seg { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: var(--cfg-font-weight-medium); }
.structure-seg:nth-child(1) { background: #EF4444; }
.structure-seg:nth-child(2) { background: #F59E0B; }
.structure-seg:nth-child(3) { background: #3B82F6; }
.structure-seg:nth-child(4) { background: #10B981; }
.structure-seg:nth-child(5) { background: #8B5CF6; }

.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }
.hint.ok { font-size: var(--cfg-font-size-xs); color: var(--cfg-success); margin-top: 6px; }

.result-preview { margin-top: 24px; }
.result-video { width: 100%; max-height: 480px; border-radius: var(--cfg-radius-base); border: 1px solid var(--cfg-border); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }
</style>
