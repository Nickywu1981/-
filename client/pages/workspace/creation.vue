<!-- Movio AI v7.0 — 创作中心：顶部标签 → 统一输入 → 动态子功能 三层架构 -->
<template>
  <div class="cc">
    <!-- ═══════════════════════════════════════════ -->
    <!-- LAYER 1: 顶部固定五大核心板块标签栏 -->
    <!-- ═══════════════════════════════════════════ -->
    <nav class="cc-tabs" role="tablist" :aria-label="$t('workspace.nav_creation')">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        role="tab"
        class="cc-tab"
        :class="{ sel: activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        :tabindex="activeTab === tab.key ? 0 : -1"
        @click="switchTab(tab.key)"
      >
        <span class="cc-tab-icon">{{ tab.icon }}</span>
        <span class="cc-tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- ═══════════════════════════════════════════ -->
    <!-- LAYER 2: 中间统一创作输入框 -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="cc-input-panel" role="region" :aria-label="$t('workspace.start_create')">
      <!-- 主输入区 -->
      <div class="cc-input-main">
        <textarea
          ref="textareaRef"
          v-model="prompt"
          class="cc-textarea"
          :placeholder="activeTabPlaceholder"
          rows="3"
          @keydown.enter.exact.prevent="handleSubmit"
        ></textarea>
      </div>

      <!-- 底部操作栏：参数 + 上传 + 提交 -->
      <div class="cc-input-bar">
        <!-- 左侧：标签相关参数选项 -->
        <div class="cc-params">
          <span class="cc-params-label">{{ $t('workspace.creation_param_label') }}</span>
          <div class="cc-param-chips">
            <button
              v-for="opt in activeParamOptions"
              :key="opt.value"
              class="cc-chip"
              :class="{ on: activeParams[activeTab]?.[opt.key] === opt.value }"
              @click="toggleParam(opt.key, opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 右侧：上传 + 提交 -->
        <div class="cc-actions">
          <button class="cc-upload-btn" :title="$t('workspace.creation_upload_hint')">
            <span class="cc-upload-icon">📎</span>
            <span class="cc-upload-text">{{ $t('workspace.creation_upload_hint') }}</span>
          </button>
          <button
            class="cc-submit"
            :disabled="!prompt.trim()"
            @click="handleSubmit"
          >
            {{ $t('workspace.start_create') }} →
          </button>
        </div>
      </div>

      <!-- 提示文字 -->
      <div class="cc-hint-bar">
        <span class="cc-hint">{{ activeTabHint }}</span>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- LAYER 3: 底部动态子功能区（随标签联动） -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="loading" class="cc-loading">
      <div class="spinner"></div>
      <p>{{ $t('workspace.loading_tools') }}</p>
    </div>
    <section v-else class="cc-sub-panel" role="region" :aria-label="activeTabLabel + ' ' + $t('workspace.creation_tools')">
      <div class="cc-sub-hd">
        <h2 class="cc-sub-title">{{ activeTabLabel }} · {{ $t('workspace.creation_tools') }}</h2>
        <button class="cc-sub-more" @click="go(allCardsRoute)">
          {{ $t('workspace.view_all') }} →
        </button>
      </div>
      <div class="cc-sub-grid">
        <div
          v-for="(card, i) in activeSubCards"
          :key="card.id || i"
          class="cc-sub-card"
          @click="go(card.route)"
        >
          <div class="cc-sub-card-icon">{{ card.icon }}</div>
          <h3 class="cc-sub-card-title">{{ card.title }}</h3>
          <p class="cc-sub-card-desc">{{ card.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
type SubCard = { icon: string; title: string; desc: string; route: string }
type ParamOption = { key: string; label: string; value: string }

definePageMeta({ layout: 'workspace' })
const router = useRouter()
const { t } = useI18n()

const prompt = ref('')
const activeTab = ref('video')
const loading = ref(true)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 用户当前选择的参数值
const activeParams = ref<Record<string, Record<string, string>>>({})

// ═══ 五大核心板块定义 ═══
const tabs = [
  { key: 'video',   icon: '🎬', label: t('workspace.creation_tabs.video') },
  { key: 'image',   icon: '🖼️', label: t('workspace.creation_tabs.image') },
  { key: 'detail',  icon: '📄', label: t('workspace.creation_tabs.detail') },
  { key: 'copywrite', icon: '🎤', label: t('workspace.creation_tabs.copywrite') },
  { key: 'other',   icon: '🧩', label: t('workspace.creation_tabs.other') },
]

// ═══ 每个标签的快捷参数选项 ═══
const tabParamOptions: Record<string, ParamOption[]> = {
  video: [
    { key: 'duration', label: '15s', value: '15s' },
    { key: 'duration', label: '30s', value: '30s' },
    { key: 'duration', label: '60s', value: '60s' },
    { key: 'resolution', label: '720p', value: '720p' },
    { key: 'resolution', label: '1080p', value: '1080p' },
    { key: 'style', label: t('workspace.creation_param_video_style'), value: '' },
  ],
  image: [
    { key: 'size', label: '1:1', value: '1:1' },
    { key: 'size', label: '3:4', value: '3:4' },
    { key: 'size', label: '16:9', value: '16:9' },
    { key: 'count', label: '1张', value: '1' },
    { key: 'count', label: '4张', value: '4' },
    { key: 'style', label: t('workspace.creation_param_image_style'), value: '' },
  ],
  detail: [
    { key: 'platform', label: '淘宝', value: 'taobao' },
    { key: 'platform', label: '抖音', value: 'douyin' },
    { key: 'platform', label: '亚马逊', value: 'amazon' },
    { key: 'style', label: '简约', value: 'minimal' },
    { key: 'style', label: '高级', value: 'premium' },
    { key: 'modules', label: t('workspace.creation_param_detail_modules'), value: '' },
  ],
  copywrite: [
    { key: 'type', label: '口播脚本', value: 'script' },
    { key: 'type', label: '商品标题', value: 'title' },
    { key: 'type', label: '详情文案', value: 'detail' },
    { key: 'lang', label: '中文', value: 'zh' },
    { key: 'lang', label: 'English', value: 'en' },
    { key: 'tone', label: t('workspace.creation_param_copywrite_tone'), value: '' },
  ],
  other: [
    { key: 'tool', label: '数字人', value: 'digital' },
    { key: 'tool', label: '换脸', value: 'faceswap' },
    { key: 'tool', label: '翻译', value: 'translate' },
    { key: 'tool', label: '合规', value: 'compliance' },
    { key: 'tool', label: '爆款复刻', value: 'viral' },
    { key: 'tool', label: t('workspace.creation_param_other_tool'), value: '' },
  ],
}

// 路由映射
const CATEGORY_ROUTES: Record<string, string> = {
  video: '/work/video', image: '/work/image', detail: '/work/detail-page',
  copywrite: '/work/copywriting', other: '/work/digital-human',
}

// ═══ 从 i18n 加载子功能卡片 ═══
const subCards = ref<Record<string, SubCard[]>>({})

function loadSubCards() {
  try {
    const fromI18n = t('workspace.creation_sub_cards') as Record<string, SubCard[]>
    if (fromI18n && typeof fromI18n === 'object' && Object.keys(fromI18n).length) {
      subCards.value = fromI18n
      return
    }
  } catch { /* fall through */ }
  // 硬降级：最小卡片集
  subCards.value = {
    video: [{ icon:'🎥', title:'AI 短视频', desc:'商品图一键生成带货短视频', route:'/work/video' }],
    image: [{ icon:'🖼️', title:'AI 商品图', desc:'各平台商品主图一键生成', route:'/work/image' }],
    detail: [{ icon:'📄', title:'详情页设计', desc:'商品详情页智能排版设计', route:'/work/detail-page' }],
    copywrite: [{ icon:'🎙️', title:'带货口播', desc:'AI生成短视频口播脚本', route:'/work/script-gen' }],
    other: [{ icon:'🤖', title:'口播数字人', desc:'数字人24小时自动带货', route:'/work/digital-human' }],
  }
}

onMounted(() => {
  loadSubCards()
  loading.value = false

  // 入场动画
  let obs: IntersectionObserver | null = null
  let t1: ReturnType<typeof setTimeout> | undefined
  let t2: ReturnType<typeof setTimeout> | undefined
  if (process.client && window.IntersectionObserver) {
    obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('cc-in') })
    }, { threshold: 0.08 })
    t1 = setTimeout(() => {
      document.querySelectorAll('.cc-sub-card').forEach(el => obs!.observe(el))
    }, 150)
    t2 = setTimeout(() => {
      document.querySelectorAll('.cc-sub-card').forEach(el => el.classList.add('cc-in'))
    }, 2500)
  }
  onUnmounted(() => {
    if (obs) obs.disconnect()
    if (t1) clearTimeout(t1)
    if (t2) clearTimeout(t2)
  })
})

// ═══ Computed ═══
const activeTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '')

const activeTabPlaceholder = computed(() => {
  const key = `workspace.creation_placeholder_${activeTab.value}` as string
  const fallback = t('workspace.creation_placeholder_default')
  const val = t(key)
  return val !== key ? val : fallback
})

const activeTabHint = computed(() => {
  const key = `workspace.creation_hint_${activeTab.value}` as string
  const val = t(key)
  return val !== key ? val : ''
})

const activeParamOptions = computed(() => tabParamOptions[activeTab.value] || [])

const activeSubCards = computed(() => subCards.value[activeTab.value] || Object.values(subCards.value)[0] || [])

const allCardsRoute = computed(() => CATEGORY_ROUTES[activeTab.value] || '/workspace/creation')

// ═══ Actions ═══
function switchTab(key: string) {
  activeTab.value = key
  if (textareaRef.value) textareaRef.value.focus()
}

function toggleParam(key: string, value: string) {
  if (!activeParams.value[activeTab.value]) {
    activeParams.value[activeTab.value] = {}
  }
  if (activeParams.value[activeTab.value][key] === value) {
    delete activeParams.value[activeTab.value][key]
  } else {
    activeParams.value[activeTab.value][key] = value
  }
}

function go(path: string) {
  router.push(path)
}

async function handleSubmit() {
  if (!prompt.value.trim()) return
  const target = CATEGORY_ROUTES[activeTab.value] || '/work/image'
  router.push({ path: target, query: { prompt: prompt.value } })
}
</script>

<style scoped>
/* ═══ Root ═══ */
.cc {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 28px;
  --cc-bg: #fff;
  --cc-brd: #ebebea;
  --cc-shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
  --cc-shadow-md: 0 8px 24px rgba(0,0,0,0.08);
  --cc-hover-bg: rgba(0,0,0,0.04);
  --cc-brand: #5b5fe3;
  --cc-brand-text: #fff;
  --cc-tx: #171717;
  --cc-tx2: #6b6b70;
  --cc-tx3: #9d9da3;
}

/* ═══ LAYER 1: 顶部标签栏 ═══ */
.cc-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  background: var(--cc-bg);
  border: 1px solid var(--cc-brd);
  border-radius: 12px;
  padding: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.cc-tab {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: none;
  border-radius: 9px;
  background: none;
  color: var(--cc-tx2);
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  white-space: nowrap;
}

.cc-tab:hover { background: var(--cc-hover-bg); color: var(--cc-tx); }
.cc-tab:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: -2px; border-radius: 9px; }

.cc-tab.sel {
  background: var(--cc-brand);
  color: var(--cc-brand-text);
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(91,95,227,0.25);
}

.cc-tab-icon { font-size: 16px; flex-shrink: 0; }
.cc-tab-label { overflow: hidden; text-overflow: ellipsis; }

/* ═══ LAYER 2: 中间统一创作输入区 ═══ */
.cc-input-panel {
  background: var(--cc-bg);
  border: 1px solid var(--cc-brd);
  border-radius: 14px;
  padding: 20px 20px 16px;
  box-shadow: var(--cc-shadow-sm);
  margin-bottom: 28px;
}

.cc-textarea {
  width: 100%;
  border: none;
  resize: none;
  font-size: 15px;
  line-height: 1.7;
  color: var(--cc-tx);
  font-family: inherit;
  outline: none;
  background: none;
  min-height: 72px;
}

.cc-textarea::placeholder { color: var(--cc-tx3); }
.cc-textarea:focus-visible {
  outline: 2px solid var(--cc-brand);
  outline-offset: 4px;
  border-radius: 4px;
}

/* 操作栏 */
.cc-input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  gap: 12px;
  flex-wrap: wrap;
}

/* 参数 chips */
.cc-params {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.cc-params-label {
  font-size: 11px;
  color: var(--cc-tx3);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.cc-param-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.cc-chip {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid var(--cc-brd);
  background: var(--cc-bg);
  color: var(--cc-tx2);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.cc-chip:hover { border-color: var(--cc-brand); color: var(--cc-brand); }
.cc-chip:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: 1px; }

.cc-chip.on {
  background: var(--cc-brand);
  color: var(--cc-brand-text);
  border-color: var(--cc-brand);
}

/* 右侧操作 */
.cc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cc-upload-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px dashed var(--cc-brd);
  background: none;
  color: var(--cc-tx2);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  font-family: inherit;
}

.cc-upload-btn:hover { border-color: var(--cc-brand); color: var(--cc-brand); }
.cc-upload-btn:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: 2px; }

.cc-upload-icon { font-size: 14px; }

.cc-submit {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  background: var(--cc-brand);
  color: var(--cc-brand-text);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.cc-submit:hover { opacity: 0.85; transform: scale(1.02); }
.cc-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.cc-submit:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: 2px; }

/* 提示栏 */
.cc-hint-bar { margin-top: 10px; }
.cc-hint { font-size: 11px; color: var(--cc-tx3); }

/* ═══ LAYER 3: 底部动态子功能区 ═══ */
.cc-sub-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cc-sub-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--cc-tx);
  margin: 0;
}

.cc-sub-more {
  font-size: 12px;
  color: var(--cc-tx3);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s;
}

.cc-sub-more:hover { color: var(--cc-tx); }
.cc-sub-more:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: 2px; border-radius: 4px; }

.cc-sub-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.cc-sub-card {
  background: var(--cc-bg);
  border-radius: 11px;
  padding: 18px 16px;
  border: 1px solid var(--cc-brd);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.cc-sub-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--cc-shadow-md);
  border-color: #d4d4d4;
}

.cc-sub-card:focus-visible {
  outline: 2px solid var(--cc-brand);
  outline-offset: 2px;
}

.cc-sub-card-icon { font-size: 24px; margin-bottom: 8px; }
.cc-sub-card-title { font-size: 13px; font-weight: 500; color: var(--cc-tx); margin: 0 0 4px 0; }
.cc-sub-card-desc { font-size: 12px; color: var(--cc-tx3); line-height: 1.4; margin: 0; }

/* ═══ Loading ═══ */
.cc-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--cc-tx2);
  font-size: 13px;
  gap: 12px;
}

.spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--cc-brd);
  border-top-color: var(--cc-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ═══ Responsive ═══ */
@media (max-width: 1000px) {
  .cc-sub-grid { grid-template-columns: repeat(3, 1fr); }
  .cc-tab-label { display: none; }
  .cc-tab { padding: 10px; }
  .cc-tab-icon { font-size: 18px; }
}

@media (max-width: 700px) {
  .cc { padding: 16px; }
  .cc-sub-grid { grid-template-columns: repeat(2, 1fr); }
  .cc-input-bar { flex-direction: column; align-items: stretch; }
  .cc-actions { justify-content: flex-end; }
  .cc-upload-text { display: none; }
}

@media (max-width: 480px) {
  .cc-sub-grid { grid-template-columns: 1fr; }
  .cc-tabs { gap: 2px; padding: 3px; }
}

/* ═══ Dark mode ═══ */
:root[data-theme="dark"] .cc, :root.dark .cc {
  --cc-bg: #1a1a1a;
  --cc-brd: #2a2a2a;
  --cc-shadow-sm: 0 1px 3px rgba(0,0,0,0.2);
  --cc-shadow-md: 0 8px 24px rgba(0,0,0,0.3);
  --cc-hover-bg: rgba(255,255,255,0.06);
  --cc-tx: #eee;
  --cc-tx2: #999;
  --cc-tx3: #777;
}

/* ═══ Entrance animations ═══ */
.cc-sub-card {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.cc-sub-card.cc-in { opacity: 1; transform: translateY(0); }

.cc-sub-card:nth-child(1) { transition-delay: 0s; }
.cc-sub-card:nth-child(2) { transition-delay: 0.04s; }
.cc-sub-card:nth-child(3) { transition-delay: 0.08s; }
.cc-sub-card:nth-child(4) { transition-delay: 0.12s; }
.cc-sub-card:nth-child(5) { transition-delay: 0.16s; }
.cc-sub-card:nth-child(6) { transition-delay: 0.20s; }
.cc-sub-card:nth-child(7) { transition-delay: 0.24s; }
.cc-sub-card:nth-child(8) { transition-delay: 0.28s; }

@media (scripting: none) {
  .cc-sub-card { opacity: 1; transform: none; }
}
</style>
