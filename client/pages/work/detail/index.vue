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

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" @retry="retry" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppPage } from '~/composables/useAppPage'
import { useTaskPolling } from '~/composables/useTaskPolling'
import { useAppDict } from '~/composables/useAppDict'
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

function retry() { mode.value === 'generate' ? doGenerate() : doReplicate() }
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
</style>
