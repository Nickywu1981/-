<!--
  Movio AI v4.1 — Detail Image Page
  G4 前端开发 | W2
  详情图套图生成 + 详情图复刻 + 长图合成 + 智能识别
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || 'AI 详情图创作中心' }}</h1>
      <p>{{ headerCfg.subtitle || '套图一键生成 · 详情图复刻 · 智能排版 · AI识别' }}</p>
    </header>

    <div class="work-tabs">
      <button class="tab-btn" :class="{ active: mode === 'generate' }" @click="mode = 'generate'">套图生成</button>
      <button class="tab-btn" :class="{ active: mode === 'replicate' }" @click="mode = 'replicate'">详情图复刻</button>
      <button class="tab-btn" :class="{ active: mode === 'longImage' }" @click="mode = 'longImage'">{{ $t('action.long_image_tab') || '长图合成' }}</button>
      <button class="tab-btn" :class="{ active: mode === 'smartRecognition' }" @click="mode = 'smartRecognition'">{{ $t('action.smart_recognition_tab') || '智能识别' }}</button>
    </div>

    <div class="work-panel">
      <!-- 套图生成 -->
      <div v-if="mode === 'generate'">
        <div class="input-group">
          <label>商品名称 *</label>
          <input v-model="productName" type="text" class="input" placeholder="输入商品名称" maxlength="200" />
        </div>

        <div class="input-group">
          <label>商品卖点 (选填，每行一个)</label>
          <textarea v-model="highlightsText" class="input" rows="4" placeholder="防水材质，透气舒适&#10;耐磨鞋底，防滑设计&#10;..." maxlength="2000"></textarea>
          <PromptEnhancer v-if="highlightsText.trim()" mode="detail" :initial-prompt="highlightsText" @applied="(v) => highlightsText = v" />
        </div>

        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="10" @uploaded="onImagesUploaded" />

        <div class="input-group">
          <label>详情图模板</label>
          <select v-model="template" class="input">
            <option v-for="t in templateOptions" :key="t.item_key" :value="t.item_key">{{ t.item_value }}</option>
          </select>
        </div>

        <button class="btn btn-primary btn-lg" :disabled="!productName || productImages.length === 0" @click="doGenerate">
          一键生成详情图套图
        </button>
      </div>

      <!-- 复刻 -->
      <div v-if="mode === 'replicate'">
        <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onRefUploaded" />
        <p class="hint">上传一张参考详情图，AI 将分析其布局和风格并复刻</p>

        <div class="input-group" style="margin-top:16px">
          <label>商品名称 *</label>
          <input v-model="productName" type="text" class="input" placeholder="输入商品名称" maxlength="200" />
        </div>

        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="10" @uploaded="onImagesUploaded" />
        <p class="hint">上传商品图片作为素材</p>

        <button class="btn btn-primary btn-lg" :disabled="!refUrl || !productName" @click="doReplicate">
          开始复刻
        </button>
      </div>

      <!-- 长图合成 -->
      <div v-if="mode === 'longImage'">
        <div class="input-group">
          <label>商品名称 *</label>
          <input v-model="productName" type="text" class="input" placeholder="输入商品名称" maxlength="200" />
        </div>

        <div class="scenes-section">
          <div class="scenes-header">
            <label>{{ $t('action.scenes_count') || '场景列表' }} ({{ scenes.length }}/20)</label>
            <button class="btn btn-secondary btn-sm" :disabled="scenes.length >= 20" @click="addScene">{{ $t('action.add_scene') || '+ 添加场景' }}</button>
          </div>
          <div v-for="(scene, idx) in scenes" :key="idx" class="scene-item">
            <div class="scene-top">
              <span class="scene-label">场景 {{ idx + 1 }}</span>
              <button v-if="scenes.length > 1" class="btn-icon" title="删除" @click="removeScene(idx)">✕</button>
            </div>
            <input v-model="scene.prompt" class="input" :placeholder="$t('action.scene_prompt') || '场景描述，如：夏季户外运动场景'" maxlength="2000" />
            <input v-model="scene.imageUrl" class="input" :placeholder="$t('action.scene_image_url') || '参考图 URL（可选）'" style="margin-top:8px" />
          </div>
        </div>

        <div class="options-row" style="margin-top:16px">
          <div class="option">
            <label>{{ $t('action.output_width') || '输出宽度' }}</label>
            <select v-model.number="outputWidth" class="input">
              <option :value="480">480 {{ $t('action.pixel') || '像素' }}</option>
              <option :value="750">750 {{ $t('action.pixel') || '像素' }}</option>
              <option :value="800">800 {{ $t('action.pixel') || '像素' }}</option>
              <option :value="1200">1200 {{ $t('action.pixel') || '像素' }}</option>
            </select>
          </div>
          <div class="option">
            <label>{{ $t('action.platform') || '目标平台' }}</label>
            <select v-model="platform" class="input">
              <option value="">{{ $t('action.clothing_auto') || '通用' }}</option>
              <option value="taobao">淘宝</option>
              <option value="amazon">亚马逊</option>
              <option value="shopify">Shopify</option>
              <option value="shein">Shein</option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" style="margin-top:16px" :disabled="!productName || scenes.length === 0 || scenes.some(s => !s.prompt.trim()) || taskStatus === 'processing'" @click="doGenerateLongImage">
          {{ taskStatus === 'processing' ? $t('work_pages.detail_index.generating') : ($t('action.generate_long') || '生成长图') }}
        </button>
      </div>

      <!-- 智能识别 -->
      <div v-if="mode === 'smartRecognition'">
        <p class="hint" style="margin-top:0">上传一张商品参考图，AI 自动识别产品名称、品类、核心特征，识别后可编辑确认</p>

        <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onSmartRefUploaded" />

        <div v-if="smartRefUrl" style="margin-top:16px">
          <div class="preview-row">
            <img :src="smartRefUrl" alt="参考图预览" class="ref-preview" />
            <button class="btn btn-primary" :disabled="smartLoading" @click="doExtractInfo">
              {{ smartLoading ? '识别中...' : '开始识别' }}
            </button>
          </div>
        </div>

        <div v-if="smartResult" class="smart-result">
          <div class="input-group">
            <label>产品名称及品类 <span class="hint-inline">（可修改）</span></label>
            <input v-model="smartResult.productName" type="text" class="input" maxlength="200" />
          </div>
          <div class="input-group">
            <label>品类</label>
            <select v-model="smartResult.category" class="input">
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="input-group">
            <label>核心特征清单（严格锚定） <span class="hint-inline">（可修改，每行一个）</span></label>
            <textarea v-model="smartFeaturesText" class="input" rows="4" maxlength="2000" placeholder="每行一个核心特征"></textarea>
          </div>

          <div class="options-row" style="margin-top:16px">
            <div class="option">
              <label>{{ $t('action.voice_option') || '语音' }}</label>
              <select v-model="smartOptions.voice" class="input">
                <option value="">{{ $t('action.none') || '无' }}</option>
                <option value="female_sweet">甜美女声</option>
                <option value="male_magnetic">磁性男声</option>
                <option value="female_natural">自然女声</option>
                <option value="male_standard">标准男声</option>
              </select>
            </div>
            <div class="option">
              <label>{{ $t('action.quantity_option') || '数量' }}</label>
              <select v-model.number="smartOptions.quantity" class="input">
                <option :value="1">1 张</option>
                <option :value="3">3 张</option>
                <option :value="5">5 张</option>
                <option :value="10">10 张</option>
              </select>
            </div>
            <div class="option">
              <label>{{ $t('action.color_option') || '配色' }}</label>
              <select v-model="smartOptions.colorScheme" class="input">
                <option value="">{{ $t('action.clothing_auto') || '自动' }}</option>
                <option value="white_bg">白底清新</option>
                <option value="dark_luxury">深色高端</option>
                <option value="warm_life">暖色生活</option>
                <option value="brand_blue">品牌蓝调</option>
                <option value="minimal_gray">极简灰白</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary btn-lg" style="margin-top:16px" :disabled="!smartResult.productName || !smartFeaturesText.trim()" @click="doGenerateFromSmart">
            确认并生成详情图
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

const CATEGORIES = ['女装', '男装', '鞋靴', '箱包', '美妆', '3C数码', '家居', '食品', '运动户外', '母婴', '珠宝配饰', '汽车用品', '其他']

function onSmartRefUploaded(files: any[]) { if (files.length > 0) { smartRefUrl.value = files[0].url; smartResult.value = null; smartError.value = '' } }

async function doExtractInfo() {
  smartLoading.value = true; smartError.value = '';
  try {
    const data = await $fetch('/api/detail/extract-product-info', { method: 'POST', body: { image_url: smartRefUrl.value } })
    smartResult.value = { productName: data.productName || '', category: data.category || '其他', features: data.features || [] }
  } catch (e: any) {
    smartError.value = e?.data?.message || e?.message || '识别失败，请重试'
  } finally { smartLoading.value = false }
}

async function doGenerateFromSmart() {
  if (!smartResult.value) return
  const features = smartFeaturesText.value.split('\n').filter(l => l.trim())
  await submit('detail_set_gen', {
    product_name: smartResult.value.productName,
    product_images: smartRefUrl.value ? [smartRefUrl.value] : [],
    highlights: [`品类: ${smartResult.value.category}`, ...features],
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
.btn-icon:hover { color: var(--cfg-error); background: #fee2e2; }

.options-row { display: flex; gap: 16px; flex-wrap: wrap; }
.option { flex: 1; min-width: 120px; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.btn-lg { width: 100%; padding: 12px 24px; font-size: var(--cfg-font-size-base); }

.preview-row { display: flex; align-items: center; gap: 16px; }
.ref-preview { width: 160px; height: 160px; object-fit: contain; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: #f8f9fb; }
.smart-result { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--cfg-border); }
.hint-inline { font-weight: var(--cfg-font-weight-normal); color: var(--cfg-text-muted); }
.error-msg { color: var(--cfg-error); font-size: var(--cfg-font-size-sm); margin-top: 8px; }

.input { width: 100%; padding: 8px 12px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); color: var(--cfg-text-primary); font-size: var(--cfg-font-size-base); box-sizing: border-box; }
.input:focus { outline: none; border-color: var(--cfg-primary); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
</style>
