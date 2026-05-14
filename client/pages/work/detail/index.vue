<!--
  Movio AI v4.1 — Detail Image Page
  G4 前端开发 | W2
  详情图套图生成 + 详情图复刻 + 长图合成 + 智能识别
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || $t('work_pages.detail_index.page_title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('work_pages.detail_index.page_subtitle') }}</p>
    </header>

    <div class="work-tabs">
      <button class="tab-btn" :class="{ active: mode === 'generate' }" @click="mode = 'generate'">{{ $t('work_pages.detail_index.tab_generate') }}</button>
      <button class="tab-btn" :class="{ active: mode === 'replicate' }" @click="mode = 'replicate'">{{ $t('work_pages.detail_index.tab_replicate') }}</button>
      <button class="tab-btn" :class="{ active: mode === 'longImage' }" @click="mode = 'longImage'">{{ $t('work_pages.detail_index.tab_long_image') }}</button>
      <button class="tab-btn" :class="{ active: mode === 'smartRecognition' }" @click="mode = 'smartRecognition'">{{ $t('work_pages.detail_index.tab_smart_recognition') }}</button>
    </div>

    <div class="work-panel">
      <!-- 套图生成 -->
      <div v-if="mode === 'generate'">
        <div class="input-group">
          <label>{{ $t('work_pages.detail_index.product_name_label') }}</label>
          <input v-model="productName" type="text" class="input" :placeholder="$t('work_pages.detail_index.product_name_placeholder')" maxlength="200" />
        </div>

        <div class="input-group">
          <label>{{ $t('work_pages.detail_index.highlights_label') }}</label>
          <textarea v-model="highlightsText" class="input" rows="4" :placeholder="$t('work_pages.detail_index.highlights_placeholder')" maxlength="2000"></textarea>
          <PromptEnhancer v-if="highlightsText.trim()" mode="detail" :initial-prompt="highlightsText" @applied="(v) => highlightsText = v" />
        </div>

        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="10" @uploaded="onImagesUploaded" />

        <div class="input-group">
          <label>{{ $t('work_pages.detail_index.template_label') }}</label>
          <select v-model="template" class="input">
            <option v-for="t in templateOptions" :key="t.item_key" :value="t.item_key">{{ t.item_value }}</option>
          </select>
        </div>

        <button class="btn btn-primary btn-lg" :disabled="!productName || productImages.length === 0" @click="doGenerate">
          {{ $t('work_pages.detail_index.generate_set_btn') }}
        </button>
      </div>

      <!-- 复刻 -->
      <div v-if="mode === 'replicate'">
        <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onRefUploaded" />
        <p class="hint">{{ $t('work_pages.detail_index.replicate_hint') }}</p>

        <div class="input-group" style="margin-top:16px">
          <label>{{ $t('work_pages.detail_index.product_name_label') }}</label>
          <input v-model="productName" type="text" class="input" :placeholder="$t('work_pages.detail_index.product_name_placeholder')" maxlength="200" />
        </div>

        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="10" @uploaded="onImagesUploaded" />
        <p class="hint">{{ $t('work_pages.detail_index.material_hint') }}</p>

        <button class="btn btn-primary btn-lg" :disabled="!refUrl || !productName" @click="doReplicate">
          {{ $t('work_pages.detail_index.replicate_btn') }}
        </button>
      </div>

      <!-- 长图合成 -->
      <div v-if="mode === 'longImage'">
        <div class="input-group">
          <label>{{ $t('work_pages.detail_index.product_name_label') }}</label>
          <input v-model="productName" type="text" class="input" :placeholder="$t('work_pages.detail_index.product_name_placeholder')" maxlength="200" />
        </div>

        <div class="scenes-section">
          <div class="scenes-header">
            <label>{{ $t('work_pages.detail_index.scenes_label') }} ({{ scenes.length }}/20)</label>
            <button class="btn btn-secondary btn-sm" :disabled="scenes.length >= 20" @click="addScene">{{ $t('work_pages.detail_index.add_scene') }}</button>
          </div>
          <div v-for="(scene, idx) in scenes" :key="idx" class="scene-item">
            <div class="scene-top">
              <span class="scene-label">{{ $t('work_pages.detail_index.scene_label', { n: idx + 1 }) }}</span>
              <button v-if="scenes.length > 1" class="btn-icon" :title="$t('work_pages.detail_index.delete_scene')" @click="removeScene(idx)">✕</button>
            </div>
            <input v-model="scene.prompt" class="input" :placeholder="$t('work_pages.detail_index.scene_prompt_placeholder')" maxlength="2000" />
            <input v-model="scene.imageUrl" class="input" :placeholder="$t('work_pages.detail_index.scene_image_url_placeholder')" style="margin-top:8px" />
          </div>
        </div>

        <div class="options-row" style="margin-top:16px">
          <div class="option">
            <label>{{ $t('work_pages.detail_index.output_width_label') }}</label>
            <select v-model.number="outputWidth" class="input">
              <option :value="480">480 {{ $t('work_pages.detail_index.pixel_unit') }}</option>
              <option :value="750">750 {{ $t('work_pages.detail_index.pixel_unit') }}</option>
              <option :value="800">800 {{ $t('work_pages.detail_index.pixel_unit') }}</option>
              <option :value="1200">1200 {{ $t('work_pages.detail_index.pixel_unit') }}</option>
            </select>
          </div>
          <div class="option">
            <label>{{ $t('work_pages.detail_index.target_platform_label') }}</label>
            <select v-model="platform" class="input">
              <option value="">{{ $t('work_pages.detail_index.platform_default') }}</option>
              <option value="taobao">{{ $t('work_pages.detail_index.platform_taobao') }}</option>
              <option value="amazon">{{ $t('work_pages.detail_index.platform_amazon') }}</option>
              <option value="shopify">Shopify</option>
              <option value="shein">Shein</option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" style="margin-top:16px" :disabled="!productName || scenes.length === 0 || scenes.some(s => !s.prompt.trim()) || taskStatus === 'processing'" @click="doGenerateLongImage">
          {{ taskStatus === 'processing' ? $t('work_pages.detail_index.generating') : $t('work_pages.detail_index.generate_long_image_btn') }}
        </button>
      </div>

      <!-- 智能识别 -->
      <div v-if="mode === 'smartRecognition'">
        <p class="hint" style="margin-top:0">{{ $t('work_pages.detail_index.smart_hint') }}</p>

        <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onSmartRefUploaded" />

        <div v-if="smartRefUrl" style="margin-top:16px">
          <div class="preview-row">
            <img :src="smartRefUrl" :alt="$t('work_pages.detail_index.ref_preview_alt')" class="ref-preview" />
            <button class="btn btn-primary" :disabled="smartLoading" @click="doExtractInfo">
              {{ smartLoading ? $t('work_pages.detail_index.recognizing') : $t('work_pages.detail_index.start_recognize') }}
            </button>
          </div>
        </div>

        <div v-if="smartResult" class="smart-result">
          <div class="input-group">
            <label>{{ $t('work_pages.detail_index.product_category_label') }} <span class="hint-inline">{{ $t('work_pages.detail_index.editable_hint') }}</span></label>
            <input v-model="smartResult.productName" type="text" class="input" maxlength="200" />
          </div>
          <div class="input-group">
            <label>{{ $t('work_pages.detail_index.category_label') }}</label>
            <select v-model="smartResult.category" class="input">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="input-group">
            <label>{{ $t('work_pages.detail_index.features_label') }} <span class="hint-inline">{{ $t('work_pages.detail_index.features_editable_hint') }}</span></label>
            <textarea v-model="smartFeaturesText" class="input" rows="4" maxlength="2000" :placeholder="$t('work_pages.detail_index.features_placeholder')"></textarea>
          </div>

          <div class="options-row" style="margin-top:16px">
            <div class="option">
              <label>{{ $t('work_pages.detail_index.voice_label') }}</label>
              <select v-model="smartOptions.voice" class="input">
                <option value="">{{ $t('work_pages.detail_index.voice_none') }}</option>
                <option value="female_sweet">{{ $t('work_pages.detail_index.voice_female_sweet') }}</option>
                <option value="male_magnetic">{{ $t('work_pages.detail_index.voice_male_magnetic') }}</option>
                <option value="female_natural">{{ $t('work_pages.detail_index.voice_female_natural') }}</option>
                <option value="male_standard">{{ $t('work_pages.detail_index.voice_male_standard') }}</option>
              </select>
            </div>
            <div class="option">
              <label>{{ $t('work_pages.detail_index.quantity_label') }}</label>
              <select v-model.number="smartOptions.quantity" class="input">
                <option :value="1">{{ $t('work_pages.detail_index.quantity_n', { n: 1 }) }}</option>
                <option :value="3">{{ $t('work_pages.detail_index.quantity_n', { n: 3 }) }}</option>
                <option :value="5">{{ $t('work_pages.detail_index.quantity_n', { n: 5 }) }}</option>
                <option :value="10">{{ $t('work_pages.detail_index.quantity_n', { n: 10 }) }}</option>
              </select>
            </div>
            <div class="option">
              <label>{{ $t('work_pages.detail_index.color_label') }}</label>
              <select v-model="smartOptions.colorScheme" class="input">
                <option value="">{{ $t('work_pages.detail_index.color_auto') }}</option>
                <option value="white_bg">{{ $t('work_pages.detail_index.color_white_bg') }}</option>
                <option value="dark_luxury">{{ $t('work_pages.detail_index.color_dark_luxury') }}</option>
                <option value="warm_life">{{ $t('work_pages.detail_index.color_warm_life') }}</option>
                <option value="brand_blue">{{ $t('work_pages.detail_index.color_brand_blue') }}</option>
                <option value="minimal_gray">{{ $t('work_pages.detail_index.color_minimal_gray') }}</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary btn-lg" style="margin-top:16px" :disabled="!smartResult.productName || !smartFeaturesText.trim()" @click="doGenerateFromSmart">
            {{ $t('work_pages.detail_index.confirm_generate_btn') }}
          </button>
        </div>

        <p v-if="smartError" class="error-msg">{{ smartError }}</p>
      </div>

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" @retry="retry" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

import PromptEnhancer from '~/components/PromptEnhancer.vue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { configs } = useAppPage({ configs: ['page.detail.header'] })
const { options: templateOptions } = useAppDict('detail_template')

const headerCfg = computed(() => configs.value['page.detail.header'] || {})

const mode = ref('generate')
const productName = ref('')
const highlightsText = ref('')
const template = ref('standard')
const productImages = ref<any[]>([])
const refUrl = ref('')
const { status: taskStatus, progress: taskProgress, error: taskError, submit } = useTaskPolling()

// 长图合成
const scenes = ref<Array<{ prompt: string; imageUrl: string }>>([{ prompt: '', imageUrl: '' }])
const outputWidth = ref(750)
const platform = ref('')

// 智能识别
const smartRefUrl = ref('')
const smartLoading = ref(false)
const smartError = ref('')
const smartResult = ref<{ productName: string; category: string; features: string[] } | null>(null)
const smartFeaturesText = computed({
  get: () => smartResult.value?.features?.join('\n') || '',
  set: (v) => { if (smartResult.value) smartResult.value.features = v.split('\n').filter(l => l.trim()) },
})
const smartOptions = reactive({ voice: '', quantity: 1, colorScheme: '' })

const CATEGORIES = computed(() => [
  t('categories.womenswear'), t('categories.menswear'), t('categories.shoes'),
  t('categories.bags'), t('categories.beauty'), t('categories.electronics'),
  t('categories.home'), t('categories.food'), t('categories.sports'),
  t('categories.maternity'), t('categories.jewelry'), t('categories.auto'),
  t('categories.other'),
])

function onSmartRefUploaded(files: any[]) { if (files.length > 0) { smartRefUrl.value = files[0].url; smartResult.value = null; smartError.value = '' } }

async function doExtractInfo() {
  smartLoading.value = true; smartError.value = '';
  try {
    const data = await $fetch('/api/detail/extract-product-info', { method: 'POST', body: { image_url: smartRefUrl.value } })
    smartResult.value = { productName: data.productName || '', category: data.category || t('categories.other'), features: data.features || [] }
  } catch (e: unknown) {
    smartError.value = e?.data?.message || e?.message || t('work_pages.detail_index.recognize_failed')
  } finally { smartLoading.value = false }
}

async function doGenerateFromSmart() {
  if (!smartResult.value) return
  const features = smartFeaturesText.value.split('\n').filter(l => l.trim())
  await submit('detail_set_gen', {
    product_name: smartResult.value.productName,
    product_images: smartRefUrl.value ? [smartRefUrl.value] : [],
    highlights: [`${t('work_pages.detail_index.category_label')}: ${smartResult.value.category}`, ...features],
    template: template.value,
    extra: {
      voice: smartOptions.voice || undefined,
      quantity: smartOptions.quantity,
      color_scheme: smartOptions.colorScheme || undefined,
    },
  })
}

function addScene() { if (scenes.value.length < 20) scenes.value.push({ prompt: '', imageUrl: '' }) }
function removeScene(idx: number) { if (scenes.value.length > 1) scenes.value.splice(idx, 1) }

function onImagesUploaded(files: any[]) { productImages.value = files }
function onRefUploaded(files: any[]) { if (files.length > 0) refUrl.value = files[0].url }

async function doGenerate() {
  const highlights = highlightsText.value.split('\n').filter(l => l.trim())
  await submit('detail_set_gen', {
    product_name: productName.value,
    product_images: productImages.value.map(f => f.url),
    highlights,
    template: template.value,
  })
}

async function doReplicate() {
  await submit('detail_replicate', {
    reference_url: refUrl.value,
    product_name: productName.value,
    product_images: productImages.value.map(f => f.url),
    template: template.value,
  })
}

async function doGenerateLongImage() {
  await submit('detail_long_image', {
    product_name: productName.value,
    scenes: scenes.value
      .filter(s => s.prompt.trim())
      .map(s => ({ prompt: s.prompt.trim(), ...(s.imageUrl.trim() ? { imageUrl: s.imageUrl.trim() } : {}) }) ),
    width: outputWidth.value,
    platform: platform.value || undefined,
  })
}

function retry() {
  if (mode.value === 'smartRecognition') doGenerateFromSmart()
  else if (mode.value === 'generate') doGenerate()
  else if (mode.value === 'longImage') doGenerateLongImage()
  else doReplicate()
}
</script>

<style scoped>
.work-page { max-width: 900px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }
.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--cfg-border); flex-wrap: wrap; }
.tab-btn { padding: 10px 20px; border: none; background: none; font-size: var(--cfg-font-size-base); color: var(--cfg-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; }
.tab-btn.active { color: var(--cfg-primary); border-bottom-color: var(--cfg-primary); font-weight: var(--cfg-font-weight-semibold); }
.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }
.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }
.hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 8px 0 16px; }

.scenes-section { margin-bottom: 16px; }
.scenes-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.scenes-header label { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); font-weight: var(--cfg-font-weight-medium); }
.scene-item { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); padding: 12px; margin-bottom: 12px; }
.scene-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.scene-label { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); font-weight: var(--cfg-font-weight-medium); }
.btn-icon { background: none; border: none; color: var(--cfg-text-muted); cursor: pointer; font-size: var(--cfg-font-size-base); padding: 2px 6px; border-radius: var(--cfg-radius-sm); transition: color var(--cfg-transition-fast), background var(--cfg-transition-fast); }
.btn-icon:hover { color: var(--cfg-error); background: var(--danger-light); }

.options-row { display: flex; gap: 16px; flex-wrap: wrap; }
.option { flex: 1; min-width: 120px; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.btn-lg { width: 100%; padding: 12px 24px; font-size: var(--cfg-font-size-base); }

.preview-row { display: flex; align-items: center; gap: 16px; }
.ref-preview { width: 160px; height: 160px; object-fit: contain; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--bg-input); }
.smart-result { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--cfg-border); }
.hint-inline { font-weight: var(--cfg-font-weight-normal); color: var(--cfg-text-muted); }
.error-msg { color: var(--cfg-error); font-size: var(--cfg-font-size-sm); margin-top: 8px; }

.input { width: 100%; padding: 8px 12px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); color: var(--cfg-text-primary); font-size: var(--cfg-font-size-base); box-sizing: border-box; }
.input:focus { outline: none; border-color: var(--cfg-primary); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
</style>
