<!--
  Movio AI v4.1 — Detail Image Page
  G4 前端开发 | W2
  详情图套图生成 + 详情图复刻
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || 'AI 详情图创作中心' }}</h1>
      <p>{{ headerCfg.subtitle || '套图一键生成 · 详情图复刻 · 智能排版' }}</p>
    </header>

    <div class="work-tabs">
      <button class="tab-btn" :class="{ active: mode === 'generate' }" @click="mode = 'generate'">套图生成</button>
      <button class="tab-btn" :class="{ active: mode === 'replicate' }" @click="mode = 'replicate'">详情图复刻</button>
      <button class="tab-btn" :class="{ active: mode === 'longImage' }" @click="mode = 'longImage'">{{ $t('action.long_image_tab') || '长图合成' }}</button>
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
          {{ taskStatus === 'processing' ? '生成中...' : ($t('action.generate_long') || '生成长图') }}
        </button>
      </div>

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" @retry="retry" />
    </div>
  </div>
</template>

<script setup lang="ts">



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
  if (mode.value === 'generate') doGenerate()
  else if (mode.value === 'longImage') doGenerateLongImage()
  else doReplicate()
}
</script>

<style scoped>
.work-page { max-width: 900px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }
.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--cfg-border); }
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

.options-row { display: flex; gap: 16px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.btn-lg { width: 100%; padding: 12px 24px; font-size: var(--cfg-font-size-base); }

.input { width: 100%; padding: 8px 12px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); color: var(--cfg-text-primary); font-size: var(--cfg-font-size-base); box-sizing: border-box; }
.input:focus { outline: none; border-color: var(--cfg-primary); box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
</style>
