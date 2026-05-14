<!--
  Movio AI v4.1 — Video Creation Center
  G4 前端开发 | W3
  配置驱动 + 图生视频/多图合成/一键成片/角色替换
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || $t('work_pages.video.title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('work_pages.video.subtitle') }}</p>
    </header>

    <div class="work-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- 图生视频 -->
    <div v-if="activeTab === 'img2video'" class="work-panel">
      <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="9" @uploaded="onImagesUploaded" />
      <p v-if="images.length" class="hint">{{ $t('work_pages.video.images_hint', { n: images.length, suffix: images.length === 1 ? $t('work_pages.video.hint_single_suffix') : $t('work_pages.video.hint_multi_suffix') }) }}</p>

      <SmartRecognitionPanel
        v-if="images.length"
        :hint="$t('work_pages.video.smart_hint')"
        :confirm-label="$t('work_pages.video.smart_confirm')"
        @confirm="onSmartApply"
      />

      <div class="input-group" style="margin-top:16px">
        <label>{{ $t('work_pages.video.prompt_label') }}</label>
        <textarea v-model="prompt" class="input prompt-input" rows="3" :placeholder="$t('work_pages.video.prompt_placeholder')" maxlength="2000"></textarea>
        <div class="prompt-actions">
          <PromptEnhancer v-model="prompt" type="video" @enhanced="onPromptEnhanced" />
          <button class="btn btn-ghost btn-sm" :disabled="enhancing" @click="doEnhance">
            {{ enhancing ? $t('work_pages.video.enhancing') : $t('work_pages.video.enhance_btn') }}
          </button>
        </div>
      </div>

      <div class="options-row">
        <div class="option">
          <label>{{ $t('work_pages.video.ratio_label') }}</label>
          <select v-model="ratio" class="input">
            <option v-for="r in ratioOptions" :key="r.item_key" :value="r.item_key">{{ r.item_value }}</option>
          </select>
        </div>
        <div class="option">
          <label>{{ $t('work_pages.video.duration_label') }}</label>
          <select v-model="duration" class="input">
            <option v-for="opt in durationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!images.length || taskStatus === 'processing' || taskStatus === 'queued'" @click="doGenerate">
        {{ taskStatus === 'processing' ? $t('work_pages.video.generating') : taskStatus === 'queued' ? $t('work_pages.video.queued') : $t('work_pages.video.generate_btn') }}
      </button>

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" :show-download="taskStatus === 'completed'" @retry="doGenerate" @download="downloadResult" />

      <div v-if="resultUrl" class="result-preview">
        <video :src="resultUrl" class="result-video" controls />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">{{ $t('work_pages.video.download_btn') }}</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(resultUrl)">{{ $t('work_pages.video.copy_link') }}</button>
        </div>
      </div>
    </div>

    <!-- 一键成片 (商品广告) -->
    <div v-if="activeTab === 'productAd'" class="work-panel">
      <div class="input-group">
        <label>{{ $t('work_pages.video.product_name') }}</label>
        <input v-model="productName" type="text" class="input" :placeholder="$t('work_pages.video.product_name_placeholder')" maxlength="200" />
      </div>

      <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="9" @uploaded="onProductImagesUploaded" />

      <div class="input-group" style="margin-top:16px">
        <label>{{ $t('work_pages.video.product_ad_highlights_label') }}</label>
        <textarea v-model="highlightsText" class="input" rows="3" :placeholder="$t('work_pages.video.product_ad_highlights_placeholder')" maxlength="2000"></textarea>
      </div>

      <div class="options-row">
        <div class="option">
          <label>{{ $t('work_pages.video.product_ad_style_label') }}</label>
          <select v-model="adStyle" class="input">
            <option v-for="opt in adStyleOptions" :key="opt.value" :value="opt.value">{{ $t(opt.nameKey) }}</option>
          </select>
        </div>
        <div class="option">
          <label>{{ $t('work_pages.video.product_ad_duration_label') }}</label>
          <select v-model="adDuration" class="input">
            <option v-for="opt in adDurationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!productName || adTaskStatus === 'processing'" @click="doProductAd">
        {{ adTaskStatus === 'processing' ? $t('work_pages.video.generating') : $t('work_pages.video.product_ad_btn') }}
      </button>

      <AppTaskProgress v-if="adTaskStatus !== 'idle'" :status="adTaskStatus" :progress="adProgress" @retry="doProductAd" />
    </div>

    <!-- 角色替换 -->
    <div v-if="activeTab === 'replaceChar'" class="work-panel">
      <div class="two-col-upload">
        <div class="upload-col">
          <label>{{ $t('work_pages.video.replace_char_source_label') }}</label>
          <AppMediaUpload accept="video" :multiple="false" :max-size="200" :max-count="1" @uploaded="onVideoUploaded" />
        </div>
        <div class="upload-col">
          <label>{{ $t('work_pages.video.replace_char_target_label') }}</label>
          <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onTargetPersonUploaded" />
        </div>
      </div>

      <button class="btn btn-primary btn-lg" style="margin-top:20px" :disabled="!sourceVideo || !targetImage || repTaskStatus === 'processing'" @click="doReplaceChar">
        {{ repTaskStatus === 'processing' ? $t('work_pages.video.replace_char_processing') : $t('work_pages.video.replace_char_btn') }}
      </button>

      <AppTaskProgress v-if="repTaskStatus !== 'idle'" :status="repTaskStatus" :progress="repProgress" @retry="doReplaceChar" />
    </div>

    <!-- 分镜生成 -->
    <div v-if="activeTab === 'storyboard'" class="work-panel">
      <div class="input-group">
        <label>{{ $t('work_pages.video.storyboard_prompt_label') }}</label>
        <textarea v-model="storyPrompt" class="input prompt-input" rows="4" :placeholder="$t('work_pages.video.storyboard_prompt_placeholder')" maxlength="2000"></textarea>
      </div>
      <div class="option" style="max-width:200px;margin-bottom:16px">
        <label>{{ $t('work_pages.video.storyboard_count_label') }}</label>
        <select v-model="sceneCount" class="input">
          <option v-for="opt in sceneCountOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
      <button class="btn btn-primary btn-lg" :disabled="!storyPrompt || sbTaskStatus === 'processing'" @click="doStoryboard">
        {{ sbTaskStatus === 'processing' ? $t('work_pages.video.generating') : $t('work_pages.video.storyboard_btn') }}
      </button>

      <AppTaskProgress v-if="sbTaskStatus !== 'idle'" :status="sbTaskStatus" :progress="sbProgress" @retry="doStoryboard" />

      <div v-if="storyboardResult" class="storyboard-result">
        <h3>{{ $t('work_pages.video.storyboard_result_title') }}</h3>
        <div v-for="(scene, i) in storyboardResult" :key="i" class="scene-card">
          <span class="scene-num">{{ $t('work_pages.video.storyboard_scene_num', { n: Number(i) + 1 }) }}</span>
          <p>{{ scene.description || scene }}</p>
        </div>
      </div>
    </div>

    <!-- 视频包装 -->
    <div v-if="activeTab === 'package'" class="work-panel">
      <AppMediaUpload accept="video" :multiple="false" :max-size="200" :max-count="1" @uploaded="onPkgVideoUploaded" />
      <p class="hint">{{ $t('work_pages.video.package_hint') }}</p>
      <button class="btn btn-primary btn-lg" style="margin-top:16px" :disabled="!pkgVideo || pkgTaskStatus === 'processing'" @click="doPackage">
        {{ pkgTaskStatus === 'processing' ? $t('work_pages.video.package_processing') : $t('work_pages.video.package_btn') }}
      </button>
      <AppTaskProgress v-if="pkgTaskStatus !== 'idle'" :status="pkgTaskStatus" :progress="pkgProgress" @retry="doPackage" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()



import { copyToClipboard } from '@/utils/format'
import PromptEnhancer from '~/components/PromptEnhancer.vue'
import SmartRecognitionPanel from '~/components/shared/SmartRecognitionPanel.vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

function onSmartApply(info: { productName: string; category: string; features: string[]; refUrl: string }) {
  prompt.value = t('work_pages.video.smart_prompt_template', { name: info.productName, category: info.category, features: info.features.join(t('work_pages.video.feature_separator')) })
}

const { configs } = useAppPage({ configs: ['page.video.header'] })
const { options: ratioOptions } = useAppDict('video_ratio')
const headerCfg = computed(() => configs.value['page.video.header'] || {})

const durationOptions = computed(() => [10, 15, 30, 60].map(n => ({ value: n, label: t('work_pages.video.seconds_value', { n }) })))
const adDurationOptions = computed(() => [15, 30, 60].map(n => ({ value: n, label: t('work_pages.video.seconds_value', { n }) })))
const sceneCountOptions = computed(() => [3, 5, 8, 12].map(n => ({ value: n, label: t('work_pages.video.storyboard_scenes_value', { n }) })))
const adStyleOptions = [
  { value: 'fast', nameKey: 'work_pages.video.product_ad_style_fast' },
  { value: 'elegant', nameKey: 'work_pages.video.product_ad_style_elegant' },
  { value: 'story', nameKey: 'work_pages.video.product_ad_style_story' },
]
const activeTab = ref('img2video')
const tabs = [
  { key: 'img2video', label: t('work_pages.video.tab_img2video') },
  { key: 'productAd', label: t('work_pages.video.tab_oneshot') },
  { key: 'replaceChar', label: t('work_pages.video.tab_avatar') },
  { key: 'storyboard', label: t('work_pages.video.tab_storyboard') },
  { key: 'package', label: t('work_pages.video.tab_package') },
]

// ---- 图生视频 ----
const images = ref<any[]>([])
const prompt = ref('')
const ratio = ref('16:9')
const duration = ref(15)
const enhancedPrompt = ref('')
const { enhancing, enhance } = usePromptEnhance()
const { status: taskStatus, progress: taskProgress, error: taskError, result, submit } = useTaskPolling()
const resultUrl = computed(() => result.value?.video_url || result.value?.file_url || '')
const { download } = useFileDownload()

function onImagesUploaded(files: any[]) { images.value = files }
async function doEnhance() {
  if (!prompt.value.trim()) return
  try {
    enhancedPrompt.value = await enhance(prompt.value, 'video')
  } catch { /* enhance failure is non-blocking */ }
}
function onPromptEnhanced({ enhanced: val }: { original: string; enhanced: string }) {
  enhancedPrompt.value = val
}
async function doGenerate() {
  const finalPrompt = enhancedPrompt.value || prompt.value
  const isSingle = images.value.length === 1
  const imageUrl = images.value[0]?.url || ''
  const imageUrls = images.value.map((f: any) => f.url)

  if (isSingle) {
    await submit('video_gen', { prompt: finalPrompt, image_url: imageUrl, duration: duration.value, ratio: ratio.value, enhanced_prompt: enhancedPrompt.value })
  } else {
    await submit('multi_image_to_video', { images: imageUrls, prompt: finalPrompt, duration: duration.value, ratio: ratio.value })
  }
}

// ---- 一键成片 ----
const productName = ref('')
const productImages = ref<any[]>([])
const highlightsText = ref('')
const adStyle = ref('fast')
const adDuration = ref(15)
const { status: adTaskStatus, progress: adProgress, submit: submitAd } = useTaskPolling()

function onProductImagesUploaded(files: any[]) { productImages.value = files }
async function doProductAd() {
  const highlights = highlightsText.value.split('\n').filter((l: string) => l.trim())
  await submitAd('product_ad', {
    product_name: productName.value,
    product_images: productImages.value.map((f: any) => f.url),
    highlights,
    style: adStyle.value,
    duration: adDuration.value,
  })
}

// ---- 角色替换 ----
const sourceVideo = ref('')
const targetImage = ref('')
const { status: repTaskStatus, progress: repProgress, submit: submitReplace } = useTaskPolling()

function onVideoUploaded(files: any[]) { if (files.length > 0) sourceVideo.value = files[0].url }
function onTargetPersonUploaded(files: any[]) { if (files.length > 0) targetImage.value = files[0].url }
async function doReplaceChar() {
  await submitReplace('replace_character', { video_url: sourceVideo.value, target_person_image: targetImage.value })
}

// ---- 分镜 ----
const storyPrompt = ref('')
const sceneCount = ref(5)
const storyboardResult = ref<any>(null)
const { status: sbTaskStatus, progress: sbProgress, result: sbResult, submit: submitSb } = useTaskPolling()

async function doStoryboard() {
  await submitSb('storyboard', { prompt: storyPrompt.value, scene_count: sceneCount.value })
}
watch(sbResult, (v) => { if (v) storyboardResult.value = v.scenes || v.storyboard || v })

// ---- 视频包装 ----
const pkgVideo = ref('')
const { status: pkgTaskStatus, progress: pkgProgress, submit: submitPkg } = useTaskPolling()

function onPkgVideoUploaded(files: any[]) { if (files.length > 0) pkgVideo.value = files[0].url }
async function doPackage() {
  await submitPkg('video_package', { video_url: pkgVideo.value, options: {} })
}

// ---- 工具 ----
function downloadResult() { if (resultUrl.value) download(resultUrl.value, 'generated-video.mp4') }
</script>

<style scoped>
.work-page { max-width: 960px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }

.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--cfg-border); overflow-x: auto; }
.tab-btn { padding: 10px 18px; border: none; background: none; font-size: var(--cfg-font-size-base); color: var(--cfg-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: color var(--cfg-transition-fast), border-color var(--cfg-transition-fast); white-space: nowrap; }
.tab-btn.active { color: var(--cfg-primary); border-bottom-color: var(--cfg-primary); font-weight: var(--cfg-font-weight-semibold); }

.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }
.hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 12px 0; }

.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }
.prompt-input { font-size: var(--cfg-font-size-md); min-height: 80px; }
.prompt-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }

.options-row { display: flex; gap: 16px; margin-bottom: 20px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.two-col-upload { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.upload-col label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 8px; font-weight: var(--cfg-font-weight-medium); }

.result-preview { margin-top: 24px; }
.result-video { width: 100%; max-height: 480px; border-radius: var(--cfg-radius-base); border: 1px solid var(--cfg-border); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }

.storyboard-result { margin-top: 24px; }
.storyboard-result h3 { font-size: var(--cfg-font-size-lg); margin-bottom: 16px; }
.scene-card { padding: 12px 16px; background: var(--cfg-bg-tertiary); border-radius: var(--cfg-radius-base); margin-bottom: 8px; display: flex; gap: 12px; align-items: flex-start; }
.scene-num { flex-shrink: 0; background: var(--cfg-primary); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--cfg-font-size-xs); font-weight: var(--cfg-font-weight-bold); }
.scene-card p { margin: 0; color: var(--cfg-text-primary); font-size: var(--cfg-font-size-base); line-height: 1.6; }
</style>
