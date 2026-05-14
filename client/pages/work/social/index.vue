<!--
  Movio AI v4.1 — Social Media Cover Page
  G4 前端开发 | Phase 2
  小红书封面 / 微信公众号封面
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg?.title || $t('work_pages.social.title') }}</h1>
      <p>{{ headerCfg?.subtitle || $t('work_pages.social.subtitle') }}</p>
    </header>

    <!-- 平台类型选择 -->
    <div class="type-grid">
      <button
        v-for="t in types"
        :key="t.key"
        class="type-card"
        :class="{ active: activeType === t.key }"
        @click="activeType = t.key"
      >
        <span class="type-icon">{{ t.icon }}</span>
        <span class="type-label">{{ $t(t.labelKey) }}</span>
        <span class="type-desc">{{ $t(t.descKey) }}</span>
        <span class="type-size">{{ t.sizeText }}</span>
      </button>
    </div>

    <div class="work-panel">
      <!-- 左侧输入 -->
      <div class="input-section">
        <div class="prompt-area">
          <label class="area-label">{{ $t('work_pages.social.prompt_label') }}</label>
          <textarea
            v-model="prompt"
            class="input prompt-input"
            rows="4"
            :placeholder="activeTypeCfg?.placeholder || $t('work_pages.social.prompt_placeholder')"
            maxlength="4000"
          />
          <div class="prompt-toolbar">
            <PromptEnhancer v-model="prompt" type="social" @enhanced="onPromptEnhanced" />
            <button class="btn btn-ghost btn-sm" :disabled="enhancing" @click="doEnhance">
              {{ enhancing ? $t('work_pages.social.enhancing') : $t('work_pages.social.enhance_btn') }}
            </button>
            <label class="btn btn-ghost btn-sm">
              {{ $t('work_pages.social.upload_ref') }}
              <input type="file" accept="image/*" hidden @change="onRefImage" />
            </label>
            <span v-if="refImage" class="ref-name">{{ refImage.name }}</span>
          </div>
          <div v-if="enhancedPrompt" class="enhanced-preview">{{ enhancedPrompt }}</div>
        </div>

        <div class="style-select">
          <label class="area-label">{{ $t('work_pages.social.style_label') }}</label>
          <select v-model="style" class="input">
            <option v-for="s in styleOptions" :key="s.value" :value="s.value">{{ $t(s.nameKey) }}</option>
          </select>
        </div>

        <div class="size-select">
          <label class="area-label">{{ $t('work_pages.social.spec_label') }}</label>
          <select v-model="activeType" class="input">
            <option v-for="t in types" :key="t.key" :value="t.key">{{ $t(t.labelKey) }} ({{ t.sizeText }})</option>
          </select>
        </div>

        <button class="btn btn-primary btn-lg w-full" :disabled="submitting || !prompt" @click="doSubmit">
          <span v-if="submitting" class="spinner" /> {{ submitting ? $t('work_pages.social.generating') : $t('work_pages.social.generate_btn') }}
        </button>
      </div>

      <!-- 右侧预览 -->
      <div class="preview-section">
        <div v-if="!result && !submitting" class="empty-state">
          <span class="empty-icon">🖼️</span>
          <p>{{ $t('work_pages.social.empty_hint') }}</p>
        </div>
        <div v-else-if="submitting" class="loading-state">
          <div class="loading-bar" />
          <p>{{ loadingText }}</p>
        </div>
        <div v-else-if="result" class="result-view">
          <div class="result-image" :style="{ aspectRatio: activeTypeCfg?.ratio || '3:4' }">
            <img loading="lazy" v-if="result.imageUrl" :src="result.imageUrl" :alt="$t('work_pages.social.result_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div v-else class="placeholder-img">{{ $t('work_pages.social.img_generating') }}</div>
          </div>
          <div class="result-meta">
            <span>{{ $t(activeTypeCfg?.labelKey || '') }} | {{ result.width }}x{{ result.height }}</span>
          </div>
          <div class="result-actions">
            <button class="btn btn-sm" @click="doDownload">{{ $t('work_pages.social.download_btn') }}</button>
            <button class="btn btn-sm btn-ghost" @click="doRerun">{{ $t('work_pages.social.regen_btn') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="history.length" class="history-section">
      <h3>{{ $t('work_pages.social.history_title') }}</h3>
      <div class="history-grid">
        <button
          v-for="(item, i) in history"
          :key="i"
          class="history-card"
          @click="loadHistory(item)"
        >
          <img loading="lazy" v-if="item.imageUrl" :src="item.imageUrl" alt="" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <span v-else class="placeholder-img" />
          <span class="history-label">{{ item.posterType === 'xhs' ? $t('work_pages.social.label_xhs_short') : $t('work_pages.social.label_wechat_short') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import PromptEnhancer from '~/components/PromptEnhancer.vue'
const { t } = useI18n()

const { config: headerCfg } = useSiteConfig('page.social')
const toast = useToast()

const styleOptions = [
  { value: 'natural', nameKey: 'work_pages.social.style_natural' },
  { value: 'lifestyle', nameKey: 'work_pages.social.style_lifestyle' },
  { value: 'minimal', nameKey: 'work_pages.social.style_minimal' },
  { value: 'vibrant', nameKey: 'work_pages.social.style_vibrant' },
  { value: 'warm', nameKey: 'work_pages.social.style_warm' },
]

const types = [
  { key: 'xhs', icon: '📕', labelKey: 'work_pages.social.type_xhs', descKey: 'work_pages.social.type_xhs_desc', sizeText: '1080×1440', ratio: '3:4', placeholder: t('work_pages.social.type_xhs_placeholder') },
  { key: 'wechat', icon: '💬', labelKey: 'work_pages.social.type_wechat', descKey: 'work_pages.social.type_wechat_desc', sizeText: '900×383', ratio: '2.35:1', placeholder: t('work_pages.social.type_wechat_placeholder') },
]

const activeType = ref('xhs')
const prompt = ref('')
const style = ref('natural')
const refImage = ref(null)
const enhancedPrompt = ref('')
const enhancing = ref(false)
const submitting = ref(false)
const result = ref(null)
const history = ref([])
const loadingText = ref(t('work_pages.social.loading_generating'))

const activeTypeCfg = computed(() => types.find(ty => ty.key === activeType.value))

const loadingTexts = computed(() => [
  t('work_pages.social.loading_understanding'),
  t('work_pages.social.loading_generating'),
  t('work_pages.social.loading_optimizing'),
  t('work_pages.social.loading_finishing'),
])
let loadingTimer = null

async function doEnhance() {
  if (!prompt.value) return
  enhancing.value = true
  try {
    const res = await $fetch('/api/images/enhance-prompt', {
      method: 'POST',
      body: { prompt: prompt.value, type: 'social' },
      credentials: 'include',
    })
    enhancedPrompt.value = res.prompt || res.enhancedPrompt
  } catch (e) {
    toast.error(t('common.failed_optimize_prompt') + ' : ' + (e.message || t('common.unknown_error')))
  } finally {
    enhancing.value = false
  }
}
function onPromptEnhanced({ enhanced: val }: { original: string; enhanced: string }) {
  enhancedPrompt.value = val
}

function onRefImage(e) {
  refImage.value = e.target.files[0] || null
}

function doSubmit() {
  if (submitting.value) return
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
  submitting.value = true
  result.value = null
  enhancedPrompt.value = ''
  const texts = loadingTexts.value
  loadingText.value = texts[0]
  let i = 0
  const timer = setInterval(() => { i = (i + 1) % texts.length; loadingText.value = texts[i] }, 2500)
  loadingTimer = timer

  $fetch('/api/posters/generate', {
    method: 'POST',
    body: {
      posterType: activeType.value,
      prompt: prompt.value,
      style: style.value,
    },
    credentials: 'include',
  })
    .then((res) => {
      result.value = { ...res, posterType: activeType.value }
      history.value.unshift({ ...res, posterType: activeType.value })
    })
    .catch((e) => { toast.error(t('common.failed_generate') + ' : ' +  (e?.data?.msg || e.message || t('common.unknown_error'))) })
    .finally(() => { submitting.value = false; if (loadingTimer === timer) { clearInterval(loadingTimer); loadingTimer = null; } })
}

const { download } = useFileDownload()

function doDownload() {
  if (result.value?.imageUrl) {
    download(result.value.imageUrl, `social_cover_${Date.now()}.png`)
  }
}

function doRerun() { doSubmit() }
function loadHistory(item) { result.value = item; activeType.value = item.posterType || 'xhs' }

onMounted(async () => {
  try {
    const res = await $fetch('/api/posters/works', { query: { page: 1, pageSize: 20 }, credentials: 'include' })
    history.value = (res.list || res.data || []).filter(h => h.posterType === 'xhs' || h.posterType === 'wechat')
  } catch { history.value = [] }
})

onUnmounted(() => { clearInterval(loadingTimer) })
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.work-page { max-width: 1300px; margin: 0 auto; padding: 24px; color: var(--text-primary); }
.work-header { margin-bottom: 24px; }
.work-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; }
.work-header p { font-size: 14px; color: var(--text-secondary); margin: 0; }
.type-grid { display: flex; gap: 12px; margin-bottom: 24px; }
.type-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 24px; border: 2px solid var(--border-color); border-radius: 12px;
  background: var(--bg-card); cursor: pointer; transition: border-color .2s, transform .2s; min-width: 160px;
}
.type-card:hover { border-color: var(--brand); }
.type-card.active { border-color: var(--brand); background: color-mix(in srgb, var(--brand) 8%, var(--bg-card)); }
.type-icon { font-size: 28px; }
.type-label { font-weight: 600; font-size: 15px; }
.type-desc { font-size: 12px; color: var(--text-secondary); }
.type-size { font-size: 12px; color: var(--text-muted); background: var(--bg-input); padding: 2px 8px; border-radius: 4px; }
.work-panel { display: grid; grid-template-columns: 420px 1fr; gap: 24px; }
.input-section { display: flex; flex-direction: column; gap: 16px; }
.prompt-input { width: 100%; min-height: 100px; resize: vertical; }
.prompt-toolbar { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.area-label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; }
.input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); font-size: 14px; }
.enhanced-preview { margin-top: 8px; padding: 10px; background: color-mix(in srgb, var(--brand) 5%, var(--bg-card)); border-radius: 8px; font-size: 13px; color: var(--brand); line-height: 1.5; }
.ref-name { font-size: 12px; color: var(--text-muted); }
.empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; color: var(--text-muted); }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.loading-bar { width: 200px; height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden; }
.loading-bar::after { content: ''; display: block; width: 40%; height: 100%; background: var(--brand); border-radius: 2px; animation: slide 1.5s ease-in-out infinite; }
@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
.result-view { display: flex; flex-direction: column; gap: 12px; }
.result-image { width: 100%; background: var(--bg-input); border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.result-image img { width: 100%; height: 100%; object-fit: cover; }
.placeholder-img { font-size: 14px; color: var(--text-muted); padding: 40px; }
.result-meta { font-size: 13px; color: var(--text-secondary); }
.result-actions { display: flex; gap: 8px; }
.history-section { margin-top: 32px; }
.history-section h3 { font-size: 18px; font-weight: 600; margin: 0 0 12px; }
.history-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.history-card { width: 120px; height: 120px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); cursor: pointer; position: relative; background: var(--bg-input); padding: 0; }
.history-card img { width: 100%; height: 100%; object-fit: cover; }
.history-label { position: absolute; bottom: 4px; left: 4px; font-size: 10px; background: rgba(0,0,0,.6); color: #fff; padding: 2px 6px; border-radius: 4px; }
.btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
.btn-sm { padding: 6px 12px; font-size: 13px; }
.btn-lg { padding: 14px 24px; font-size: 16px; }
.w-full { width: 100%; }
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid transparent; border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
