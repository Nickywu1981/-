<!--
  Movio AI v4.1 — Image Generation Page
  G4 前端开发 | W2
  配置驱动 + 提示词增强 + 任务进度
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || 'AI 图片创作中心' }}</h1>
      <p>{{ headerCfg.subtitle || '智能生成商品主图 · 批量处理 · 一键复刻' }}</p>
    </header>

    <div class="work-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- 图像生成 -->
    <div v-if="activeTab === 'generate'" class="work-panel">
      <div class="prompt-area">
        <label class="area-label">描述您想要的画面效果</label>
        <textarea
          v-model="prompt"
          class="input prompt-input"
          rows="4"
          placeholder="例如: 一款白色运动鞋放在木质地板上，自然光从左侧照射，45度俯拍角度，简约风格..."
          maxlength="2000"
        ></textarea>
        <div class="prompt-actions">
          <PromptEnhancer v-model="prompt" type="image" @enhanced="onPromptEnhanced" />
          <button class="btn btn-ghost btn-sm" :disabled="enhancing" @click="doEnhance">
            {{ enhancing ? '优化中...' : '✨ AI 优化提示词' }}
          </button>
          <span v-if="enhancedPrompt" class="enhanced-hint">已优化</span>
        </div>
        <div v-if="enhancedPrompt" class="enhanced-preview">
          <span class="preview-label">优化后:</span>
          <p>{{ enhancedPrompt }}</p>
        </div>
      </div>

      <div class="options-row">
        <div class="option">
          <label>图片比例</label>
          <select v-model="ratio" class="input">
            <option v-for="r in ratioOptions" :key="r.item_key" :value="r.item_key">{{ r.item_value }}</option>
          </select>
        </div>
        <div class="option">
          <label>图片风格</label>
          <select v-model="style" class="input">
            <option v-for="s in styleOptions" :key="s.item_key" :value="s.item_key">{{ s.item_value }}</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!prompt || taskStatus === 'processing' || taskStatus === 'queued'" @click="doGenerate">
        {{ taskStatus === 'processing' ? '生成中...' : taskStatus === 'queued' ? '排队中...' : '开始生成' }}
      </button>

      <AppTaskProgress
        v-if="taskStatus !== 'idle'"
        :status="taskStatus"
        :progress="taskProgress"
        :error-message="taskError"
        :show-download="taskStatus === 'completed'"
        @retry="doGenerate"
        @download="downloadResult"
      />

      <div v-if="resultUrl" class="result-preview">
        <img loading="lazy" :src="resultUrl" alt="生成结果" class="result-image" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">下载</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(resultUrl)">复制链接</button>
        </div>
      </div>
    </div>

    <!-- 主图复刻 -->
    <div v-if="activeTab === 'replicate'" class="work-panel">
      <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onRefUploaded" />
      <div class="input-group" style="margin-top:16px">
        <label>商品名称</label>
        <input v-model="productName" type="text" class="input" placeholder="输入商品名称" maxlength="200" />
      </div>
      <button class="btn btn-primary btn-lg" :disabled="!refImageUrl || !productName" @click="doReplicate">
        开始复刻
      </button>
      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" @retry="doReplicate" />
    </div>

    <!-- 批量处理 -->
    <div v-if="activeTab === 'batch'" class="work-panel">
      <div class="batch-mode-tabs">
        <button :class="{ active: batchMode === 'generate' }" @click="batchMode = 'generate'">批量生图</button>
        <button :class="{ active: batchMode === 'edit' }" @click="batchMode = 'edit'">批量改图</button>
        <button :class="{ active: batchMode === 'replace' }" @click="batchMode = 'replace'">批量替换</button>
      </div>

      <div v-if="batchMode === 'generate'" class="batch-generate">
        <p class="hint">每行一个提示词，最多50行</p>
        <textarea v-model="batchPrompts" class="input" rows="8" placeholder="白色运动鞋 简约风格&#10;黑色高跟鞋 时尚风格&#10;..." maxlength="5000"></textarea>
        <button class="btn btn-primary" :disabled="!batchPrompts.trim()" @click="doBatchGenerate">
          批量生成 ({{ batchLines.length }} 张)
        </button>
      </div>

      <div v-else class="batch-upload">
        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="30" @uploaded="onBatchUploaded" />
        <p class="hint">已选择 {{ batchImages.length }} 张图片</p>
        <button v-if="batchImages.length > 0" class="btn btn-primary" @click="doBatchEdit">开始处理</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppPage } from '~/composables/useAppPage'
import { useTaskPolling } from '~/composables/useTaskPolling'
import { useAppDict } from '~/composables/useAppDict'
import { copyToClipboard } from '@/utils/format'
import PromptEnhancer from '~/components/PromptEnhancer.vue'

definePageMeta({ layout: 'workspace' })

const { configs } = useAppPage({ configs: ['page.image.header'] })
const { options: ratioOptions } = useAppDict('image_ratio')
const { options: styleOptions } = useAppDict('image_style')

const headerCfg = computed(() => configs.value['page.image.header'] || {})

const activeTab = ref('generate')
const tabs = [
  { key: 'generate', label: '图像生成' },
  { key: 'replicate', label: '主图复刻' },
  { key: 'batch', label: '批量处理' },
]

// 生成
const prompt = ref('')
const ratio = ref('1:1')
const style = ref('realistic')
const enhancedPrompt = ref('')
const { enhancing, enhance } = usePromptEnhance()
const { status: taskStatus, progress: taskProgress, error: taskError, result, submit } = useTaskPolling()
const resultUrl = computed(() => result.value?.image_url || result.value?.file_url || '')
const { download } = useFileDownload()

async function doEnhance() {
  if (!prompt.value.trim()) return
  try {
    enhancedPrompt.value = await enhance(prompt.value, 'image')
  } catch { /* enhance failure is non-blocking, user can still generate with original prompt */ }
}
function onPromptEnhanced({ enhanced: val }: { original: string; enhanced: string }) {
  enhancedPrompt.value = val
}

async function doGenerate() {
  const finalPrompt = enhancedPrompt.value || prompt.value
  await submit('image_gen', { prompt: finalPrompt, ratio: ratio.value, style: style.value, enhanced_prompt: enhancedPrompt.value })
}

// 复刻
const refImageUrl = ref('')
const productName = ref('')
function onRefUploaded(files: any[]) { if (files.length > 0) refImageUrl.value = files[0].url }
async function doReplicate() {
  await submit('image_replicate', { reference_image_url: refImageUrl.value, product_name: productName.value, style: style.value, ratio: ratio.value })
}

// 批量
const batchMode = ref('generate')
const batchPrompts = ref('')
const batchImages = ref<any[]>([])
const batchLines = computed(() => batchPrompts.value.split('\n').filter(l => l.trim()))

function onBatchUploaded(files: any[]) { batchImages.value = files }

async function doBatchGenerate() {
  await submit('batch_image_gen', { prompts: batchLines.value, ratio: ratio.value, style: style.value })
}
async function doBatchEdit() {
  await submit('batch_image_edit', { images: batchImages.value.map(f => ({ url: f.url })), operations: [] })
}

function downloadResult() { if (resultUrl.value) download(resultUrl.value, 'generated-image.png') }
</script>

<style scoped>
.work-page { max-width: 900px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }

.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--cfg-border); }
.tab-btn { padding: 10px 20px; border: none; background: none; font-size: var(--cfg-font-size-base); color: var(--cfg-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: color var(--cfg-transition-fast), border-color var(--cfg-transition-fast); }
.tab-btn.active { color: var(--cfg-primary); border-bottom-color: var(--cfg-primary); font-weight: var(--cfg-font-weight-semibold); }

.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }
.prompt-area { margin-bottom: 20px; }
.area-label { display: block; font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-secondary); margin-bottom: 8px; }
.prompt-input { font-size: var(--cfg-font-size-md); min-height: 100px; }
.prompt-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.enhanced-hint { font-size: var(--cfg-font-size-xs); color: var(--cfg-success); }
.enhanced-preview { margin-top: 12px; padding: 12px; background: var(--cfg-bg-tertiary); border-radius: var(--cfg-radius-base); border-left: 3px solid var(--cfg-primary); }
.preview-label { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); display: block; margin-bottom: 4px; }
.enhanced-preview p { font-size: var(--cfg-font-size-base); color: var(--cfg-text-primary); margin: 0; }

.options-row { display: flex; gap: 16px; margin-bottom: 20px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.result-preview { margin-top: 24px; }
.result-image { width: 100%; border-radius: var(--cfg-radius-base); border: 1px solid var(--cfg-border); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }

.batch-mode-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.batch-mode-tabs button { padding: 6px 16px; border: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); border-radius: var(--cfg-radius-sm); cursor: pointer; font-size: var(--cfg-font-size-sm); }
.batch-mode-tabs button.active { background: var(--cfg-primary); color: #fff; border-color: var(--cfg-primary); }
.hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 8px 0; }
.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }
</style>
