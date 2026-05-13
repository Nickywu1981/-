<template>
  <div class="poster-page">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p class="page-desc">AI 智能生成营销海报与社媒封面，支持多种风格与尺寸适配</p>
    </div>

    <!-- Type Tabs -->
    <div class="type-tabs">
      <button
        v-for="tab in posterTabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left: Input Panel -->
      <div class="input-panel">
        <SmartRecognitionPanel
          hint="上传商品参考图，AI 自动生成海报描述文案"
          confirm-label="确认并生成描述"
          @confirm="onSmartApply"
        />
        <div class="panel-section">
          <label class="section-label">海报描述</label>
          <textarea
            v-model="prompt"
            class="prompt-input"
            :placeholder="currentTab.placeholder"
            rows="5"
            maxlength="4000"
            @input="onPromptChange"
          ></textarea>
          <div class="char-count">{{ prompt.length }}/4000</div>
        </div>

        <!-- Size Info -->
        <div class="panel-section">
          <label class="section-label">尺寸规格</label>
          <div class="size-info">
            <span class="size-badge">{{ currentSize.width }}×{{ currentSize.height }}</span>
            <span class="size-ratio">比例 {{ currentSize.ratio }}</span>
            <span class="size-label">{{ currentSize.label }}</span>
          </div>
        </div>

        <!-- Style Override -->
        <div class="panel-section">
          <label class="section-label">风格偏好 <span class="optional">(可选)</span></label>
          <input
            v-model="styleOverride"
            class="style-input"
            :placeholder="currentStyle"
            maxlength="2000"
          />
        </div>

        <!-- Templates -->
        <div class="panel-section">
          <label class="section-label">快速模板</label>
          <div class="template-chips">
            <button
              v-for="tpl in currentTemplates"
              :key="tpl.label"
              class="tpl-chip"
              @click="applyTemplate(tpl)"
            >
              {{ tpl.label }}
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-row">
          <button
            class="btn btn-outline"
            :disabled="!prompt.trim() || enhancing"
            @click="enhancePrompt"
          >
            <span v-if="enhancing" class="spinner"></span>
            {{ enhancing ? '润色中...' : '✨ AI 润色' }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="!prompt.trim() || submitting"
            @click="submitTask"
          >
            <span v-if="submitting" class="spinner"></span>
            {{ submitting ? '生成中...' : '🎨 生成海报' }}
          </button>
        </div>

        <!-- Enhanced Prompt Preview -->
        <div v-if="enhancedPrompt && enhancedPrompt !== prompt" class="enhanced-preview">
          <div class="enhanced-header">
            <span>✨ 润色结果</span>
            <button class="btn-text" @click="discardEnhance">还原</button>
          </div>
          <p class="enhanced-text">{{ enhancedPrompt }}</p>
        </div>
      </div>

      <!-- Right: Preview Panel -->
      <PosterPreviewPanel
        :results="results"
        :generating="generating"
        :error="errorMsg"
        :status-text="jobStatusText"
        :size="currentSize"
        @retry="retry"
        @download="downloadImage"
        @copy="copyImage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">

import SmartRecognitionPanel from '~/components/shared/SmartRecognitionPanel.vue'
import PosterPreviewPanel from '~/components/work/PosterPreviewPanel.vue'
import { posterTabs, posterTemplates, posterStyleDefaults, posterSizes } from '~/data/posterData'

const { config } = useSiteConfig('page.poster')

const activeTab = ref('product')
const { download } = useFileDownload()
const prompt = ref('')
const styleOverride = ref('')
const enhancedPrompt = ref('')
const enhancing = ref(false)
const submitting = ref(false)
const generating = ref(false)
const errorMsg = ref('')
const results = ref<{ url: string }[]>([])

let pollTimer: ReturnType<typeof setInterval> | null = null

const currentTab = computed(() => posterTabs.find(t => t.key === activeTab.value)!)
const currentTemplates = computed(() => posterTemplates[activeTab.value] || [])
const currentStyle = computed(() => posterStyleDefaults[activeTab.value] || '')
const currentSize = computed(() => posterSizes[activeTab.value])

const pageTitle = computed(() => config.value?.page_title || '海报与封面生成')

const jobStatusText = computed(() => {
  if (!generating.value) return ''
  return 'AI 正在为您创作海报，请稍候...'
})

function switchTab(key: string) {
  activeTab.value = key
  resetState()
}

function applyTemplate(tpl: { prompt: string }) {
  prompt.value = tpl.prompt
  enhancedPrompt.value = ''
}

function onPromptChange() {
  if (enhancedPrompt.value) enhancedPrompt.value = ''
}

async function enhancePrompt() {
  if (!prompt.value.trim()) return
  enhancing.value = true
  try {
    const resp: any = await $fetch('/api/posters/enhance-prompt', {
      method: 'POST',
      body: { prompt: prompt.value.trim(), posterType: activeTab.value },
      credentials: 'include',
    })
    enhancedPrompt.value = resp.data?.enhanced_prompt || resp.enhanced_prompt || prompt.value
    if (enhancedPrompt.value === prompt.value) {
      toast.warning('润色服务暂不可用，将使用原始描述')
    }
  } catch {
    toast.error('提示词润色失败，将使用原始描述')
    enhancedPrompt.value = prompt.value
  } finally {
    enhancing.value = false
  }
}

function discardEnhance() { enhancedPrompt.value = '' }

async function submitTask() {
  if (!prompt.value.trim() || submitting.value) return
  submitting.value = true
  generating.value = true
  errorMsg.value = ''
  results.value = []

  try {
    const body = {
      posterType: activeTab.value,
      prompt: prompt.value.trim(),
      enhancedPrompt: enhancedPrompt.value || undefined,
      style: styleOverride.value.trim() || undefined,
    }
    const resp: any = await $fetch('/api/posters/generate', {
      method: 'POST', body, credentials: 'include',
    })
    startPolling(resp.job_id)
  } catch (e: unknown) {
    errorMsg.value = e.data?.message || '海报生成失败，请重试'
    generating.value = false
  } finally {
    submitting.value = false
  }
}

function startPolling(jobId: string) {
  let pollCount = 0
  let failCount = 0
  const MAX_POLL = 40
  const MAX_FAILS = 5
  clearInterval(pollTimer!)
  pollTimer = setInterval(async () => {
    pollCount++
    if (pollCount > MAX_POLL) {
      clearInterval(pollTimer!)
      generating.value = false
      errorMsg.value = '任务超时，请刷新页面查看结果'
      return
    }
    try {
      const resp: any = await $fetch(`/api/job/${jobId}`, { credentials: 'include' })
      const job = resp.data || resp
      failCount = 0
      if (job.status === 'completed') {
        clearInterval(pollTimer!)
        generating.value = false
        results.value = (job.result?.images || job.result?.urls || []).map((u: string) => ({ url: u }))
        if (!results.value.length && job.result?.url) {
          results.value = [{ url: job.result.url }]
        }
      } else if (job.status === 'failed') {
        clearInterval(pollTimer!)
        generating.value = false
        errorMsg.value = job.error || '生成失败'
      }
    } catch {
      failCount++
      if (failCount >= MAX_FAILS) {
        clearInterval(pollTimer!)
        generating.value = false
        errorMsg.value = '网络不稳定，查询任务状态失败，请刷新查看结果'
      }
    }
  }, 3000)
}

function retry() { errorMsg.value = ''; submitTask() }

function downloadImage(url: string) {
  if (!url) return
  download(url, `poster_${activeTab.value}_${Date.now()}.png`)
}

async function copyImage(url: string) {
  if (!url) return
  if (!import.meta.client) return
  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const resp = await fetch(url)
      const blob = await resp.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      toast.success('已复制到剪贴板')
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function resetState() {
  prompt.value = ''
  styleOverride.value = ''
  enhancedPrompt.value = ''
  results.value = []
  errorMsg.value = ''
  generating.value = false
  clearInterval(pollTimer!)
}

const toast = useToast()

onBeforeUnmount(() => { clearInterval(pollTimer!) })

function onSmartApply(info: { productName: string; category: string; features: string[]; refUrl: string }) {
  prompt.value = `${info.productName}（${info.category}）\n核心卖点：${info.features.join('、')}\n目标风格：专业电商展示，高清细节，干净背景`
}

definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.poster-page { max-width: 1400px; margin: 0 auto; padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
.page-desc { color: var(--text-secondary); font-size: 14px; margin: 0; }

.type-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 13px; transition: border-color 0.2s, color 0.2s; }
.tab-btn:hover { border-color: var(--brand); color: var(--brand); }
.tab-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }
.tab-icon { font-size: 16px; }

.main-content { display: grid; grid-template-columns: 420px 1fr; gap: 24px; align-items: start; }
@media (max-width: 900px) { .main-content { grid-template-columns: 1fr; } }

.input-panel { display: flex; flex-direction: column; gap: 20px; }
.panel-section { display: flex; flex-direction: column; gap: 8px; }
.section-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.optional { font-weight: 400; color: var(--text-tertiary); font-size: 12px; }

.prompt-input { width: 100%; padding: 12px; border: 1px solid var(--input-border); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); font-size: 14px; resize: vertical; min-height: 100px; }
.prompt-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(var(--brand-rgb), 0.1); }
.char-count { text-align: right; font-size: 11px; color: var(--text-tertiary); }

.size-info { display: flex; gap: 12px; align-items: center; }
.size-badge { background: var(--brand-light); color: var(--brand); padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600; }
.size-ratio, .size-label { color: var(--text-secondary); font-size: 13px; }

.style-input { width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); font-size: 13px; }
.style-input:focus { outline: none; border-color: var(--brand); }

.template-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.tpl-chip { padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 20px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 12px; transition: border-color 0.2s, color 0.2s, background 0.2s; }
.tpl-chip:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }

.action-row { display: flex; gap: 10px; }
.btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 6px; transition: background 0.2s, opacity 0.2s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--brand); color: #fff; flex: 1; }
.btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
.btn-text { background: none; border: none; color: var(--brand); cursor: pointer; font-size: 12px; padding: 0; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

.enhanced-preview { background: var(--brand-light); border: 1px solid var(--brand); border-radius: 8px; padding: 12px; }
.enhanced-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--brand); }
.enhanced-text { margin: 0; font-size: 13px; color: var(--text-primary); line-height: 1.6; }

@keyframes spin { to { transform: rotate(360deg); } }

/* Dark mode */
:root[data-theme="dark"] .tab-btn { background: var(--bg-card); }
:root[data-theme="dark"] .prompt-input, :root[data-theme="dark"] .style-input { background: var(--bg-input, #1a1a2e); }
</style>
