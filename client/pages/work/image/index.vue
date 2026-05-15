<!--
  Movio AI v4.1 — Image Generation Page
  G4 前端开发 | W2
  配置驱动 + 提示词增强 + 任务进度
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || $t('work_pages.image_index.title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('work_pages.image_index.subtitle') }}</p>
    </header>

    <div class="work-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- 图像生成 -->
    <div v-if="activeTab === 'generate'" class="work-panel">
      <div class="prompt-area">
        <label class="area-label">{{ $t('work_pages.image_index.prompt_label') }}</label>
        <textarea
          v-model="prompt"
          class="input prompt-input"
          rows="4"
          :placeholder="$t('work_pages.image_index.prompt_placeholder')"
          maxlength="2000"
        ></textarea>
        <div class="prompt-actions">
          <PromptEnhancer v-model="prompt" type="image" @enhanced="onPromptEnhanced" />
          <button class="btn btn-ghost btn-sm" :disabled="enhancing" @click="doEnhance">
            {{ enhancing ? $t('work_pages.image_index.enhancing') : $t('work_pages.image_index.enhance_btn') }}
          </button>
          <span v-if="enhancedPrompt" class="enhanced-hint">{{ $t('work_pages.image_index.enhanced') }}</span>
        </div>
        <div v-if="enhancedPrompt" class="enhanced-preview">
          <span class="preview-label">{{ $t('work_pages.image_index.enhanced_label') }}</span>
          <p>{{ enhancedPrompt }}</p>
        </div>
      </div>

      <div class="options-row">
        <div class="option">
          <label>{{ $t('work_pages.image_index.ratio_label') }}</label>
          <select v-model="ratio" class="input">
            <option v-for="r in ratioOptions" :key="r.item_key" :value="r.item_key">{{ r.item_value }}</option>
          </select>
        </div>
        <div class="option">
          <label>{{ $t('work_pages.image_index.style_label') }}</label>
          <select v-model="style" class="input">
            <option v-for="s in styleOptions" :key="s.item_key" :value="s.item_key">{{ s.item_value }}</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!prompt || taskStatus === 'processing' || taskStatus === 'queued'" @click="doGenerate">
        {{ taskStatus === 'processing' ? $t('work_pages.image_index.generating') : taskStatus === 'queued' ? $t('work_pages.image_index.queued') : $t('work_pages.image_index.generate_btn') }}
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
        <img loading="lazy" :src="resultUrl" :alt="$t('work_pages.image_index.result_alt')" class="result-image" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">{{ $t('work_pages.image_index.download_btn') }}</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(resultUrl)">{{ $t('work_pages.image_index.copy_link') }}</button>
        </div>
      </div>
    </div>

    <!-- 主图复刻 -->
    <div v-if="activeTab === 'replicate'" class="work-panel">
      <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onRefUploaded" />
      <div class="input-group" style="margin-top:16px">
        <label>{{ $t('work_pages.image_index.product_name_label') }}</label>
        <input v-model="productName" type="text" class="input" :placeholder="$t('work_pages.image_index.product_name_placeholder')" maxlength="200" />
      </div>
      <button class="btn btn-primary btn-lg" :disabled="!refImageUrl || !productName" @click="doReplicate">
        {{ $t('work_pages.image_index.replicate_btn') }}
      </button>
      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" @retry="doReplicate" />
    </div>

    <!-- 批量处理 -->
    <div v-if="activeTab === 'batch'" class="work-panel">
      <div class="batch-mode-tabs">
        <button :class="{ active: batchMode === 'generate' }" @click="batchMode = 'generate'">{{ $t('work_pages.image_index.batch_generate_tab') }}</button>
        <button :class="{ active: batchMode === 'edit' }" @click="batchMode = 'edit'">{{ $t('work_pages.image_index.batch_edit_tab') }}</button>
        <button :class="{ active: batchMode === 'replace' }" @click="batchMode = 'replace'">{{ $t('work_pages.image_index.batch_replace_tab') }}</button>
      </div>

      <div v-if="batchMode === 'generate'" class="batch-generate">
        <p class="hint">{{ $t('work_pages.image_index.batch_hint') }}</p>
        <textarea v-model="batchPrompts" class="input" rows="8" :placeholder="$t('work_pages.image_index.batch_placeholder')" maxlength="5000"></textarea>
        <button class="btn btn-primary" :disabled="!batchPrompts.trim()" @click="doBatchGenerate">
          {{ $t('work_pages.image_index.batch_btn', { n: batchLines.length }) }}
        </button>
      </div>

      <div v-else class="batch-upload">
        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="30" @uploaded="onBatchUploaded" />
        <p class="hint">{{ $t('work_pages.image_index.batch_selected_hint', { n: batchImages.length }) }}</p>
        <button v-if="batchImages.length > 0" class="btn btn-primary" @click="doBatchEdit">{{ $t('work_pages.image_index.batch_start_btn') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">



import { copyToClipboard } from '@/utils/format'
import PromptEnhancer from '~/components/PromptEnhancer.vue'

const { t } = useI18n()
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const { configs } = useAppPage({ configs: ['page.image.header'] })
const { options: ratioOptions } = useAppDict('image_ratio')
const { options: styleOptions } = useAppDict('image_style')

const headerCfg = computed(() => configs.value['page.image.header'] || {})

const activeTab = ref('generate')
const tabs = [
  { key: 'generate', label: t('work_pages.image_index.tab_generate') },
  { key: 'replicate', label: t('work_pages.image_index.tab_replicate') },
  { key: 'batch', label: t('work_pages.image_index.tab_batch') },
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
.work-page { max-width: 900px; margin: 0 auto; padding: var(--space-8, 32px)) var(--space-4, 16px)); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--text-2xl, 1.5rem)); margin: 0 0 8px 0; }
.work-header p { color: var(--text-muted, #9ca3af)); margin: 0; }

.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color, #e5e7eb)); }
.tab-btn { padding: 10px 20px; border: none; background: none; font-size: var(--text-base, 1rem)); color: var(--text-secondary, #6b7280)); cursor: pointer; border-bottom: 2px solid transparent; transition: color var(--transition-fast, 0.15s ease)), border-color var(--transition-fast, 0.15s ease)); }
.tab-btn.active { color: var(--brand, #5b5fe3)); border-bottom-color: var(--brand, #5b5fe3)); font-weight: 600); }

.work-panel { background: var(--bg-card, #ffffff)); border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-lg, 12px)); padding: 24px; }
.prompt-area { margin-bottom: 20px; }
.area-label { display: block; font-size: var(--text-sm, 0.875rem)); font-weight: 500); color: var(--text-secondary, #6b7280)); margin-bottom: 8px; }
.prompt-input { font-size: var(--text-base, 1rem)); min-height: 100px; }
.prompt-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.enhanced-hint { font-size: var(--text-xs, 0.75rem)); color: var(--success, #10b981)); }
.enhanced-preview { margin-top: 12px; padding: 12px; background: var(--bg-tertiary, #f3f4f6)); border-radius: var(--radius-md, 8px)); border-left: 3px solid var(--brand, #5b5fe3)); }
.preview-label { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); display: block; margin-bottom: 4px; }
.enhanced-preview p { font-size: var(--text-base, 1rem)); color: var(--text-primary, #1f2937)); margin: 0; }

.options-row { display: flex; gap: 16px; margin-bottom: 20px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--text-sm, 0.875rem)); color: var(--text-secondary, #6b7280)); margin-bottom: 6px; }

.result-preview { margin-top: 24px; }
.result-image { width: 100%; border-radius: var(--radius-md, 8px)); border: 1px solid var(--border-color, #e5e7eb)); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }

.batch-mode-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.batch-mode-tabs button { padding: 6px 16px; border: 1px solid var(--border-color, #e5e7eb)); background: var(--bg-card, #ffffff)); border-radius: var(--radius-sm, 4px)); cursor: pointer; font-size: var(--text-sm, 0.875rem)); }
.batch-mode-tabs button.active { background: var(--brand, #5b5fe3)); color: #fff; border-color: var(--brand, #5b5fe3)); }
.hint { font-size: var(--text-sm, 0.875rem)); color: var(--text-muted, #9ca3af)); margin: 8px 0; }
.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--text-sm, 0.875rem)); color: var(--text-secondary, #6b7280)); margin-bottom: 6px; }
</style>
