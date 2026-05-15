<!--
  Movio AI v9.0 — 创作中心
  三层联动布局：板块标签 → 统一创作输入 → 动态子功能
  右侧可折叠结果面板（默认收起，生成时自动展开）
  上传图标内嵌 textarea 左上角
-->
<template>
  <div class="cc">
    <!-- ═══════════════════════════════════════════ -->
    <!-- LAYER 1: 五大板块标签 -->
    <!-- ═══════════════════════════════════════════ -->
    <nav class="cc-tabs" role="tablist" :aria-label="t('workspace.nav_creation')">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        role="tab"
        class="cc-tab"
        :class="{ sel: activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="switchTab(tab.key)"
      >
        <span class="cc-tab-icon">{{ tab.icon }}</span>
        <span class="cc-tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <div class="cc-layout">
      <!-- ═══════════════════════════════════════════ -->
      <!-- 主内容区 -->
      <!-- ═══════════════════════════════════════════ -->
      <div class="cc-content">
        <!-- LAYER 2: 统一创作输入卡片 -->
        <div class="cc-input-card" role="region" :aria-label="t('workspace.creation_input_region', { tab: activeTabLabel })">
          <div class="cc-input-main">
            <!-- 上传参考图：内嵌 textarea 左上角 -->
            <div class="cc-upload-inline" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
              <input ref="fileInputRef" type="file" multiple accept="image/*,video/*" style="display:none" @change="handleFileChange" />
              <span class="cc-upload-inline-icon">📎</span>
              <span class="cc-upload-inline-label">{{ t('workspace.creation_upload_label') }}</span>
            </div>
            <textarea
              ref="textareaRef"
              v-model="prompt"
              class="cc-textarea"
              :placeholder="activeTabPlaceholder"
              rows="3"
              @keydown.enter.exact.prevent="startGenerate"
            ></textarea>
          </div>

          <!-- 底部操作栏 -->
          <div class="cc-input-bottom">
            <div class="cc-param-row">
              <select
                v-for="(p, i) in activeParamSelects"
                :key="i"
                class="cc-param-sel"
                v-model="selectedParams[p.key]"
              >
                <option value="">{{ p.label }}</option>
                <option v-for="(o, j) in p.options" :key="j" :value="o.value">{{ o.label }}</option>
              </select>
            </div>

            <button
              class="cc-gen-btn"
              :disabled="!prompt.trim()"
              @click="startGenerate"
            >
              🚀 {{ t('workspace.slide_panel.generate_btn') }}
            </button>
          </div>

          <!-- 上传文件预览 -->
          <div v-if="uploadFiles.length" class="cc-upload-preview">
            <span v-for="(f, i) in uploadFiles" :key="i" class="cc-upload-tag">
              {{ f.name }}
              <button class="cc-upload-remove" @click="removeFile(i)">✕</button>
            </span>
          </div>
        </div>

        <!-- LAYER 3: 底部动态子功能区 -->
        <section class="cc-sub-panel" role="region" :aria-label="t('workspace.creation_tools_region', { tab: activeTabLabel })">
          <h2 class="cc-sub-title">{{ t('workspace.creation_quick_tools', { tab: activeTabLabel }) }}</h2>
          <div class="cc-sub-scroll">
            <div
              v-for="(card, i) in activeSubCards"
              :key="card.id || i"
              class="cc-sub-card"
              @click="openSubFunctionPanel(card)"
            >
              <div class="cc-sub-card-icon">{{ card.icon }}</div>
              <div class="cc-sub-card-info">
                <div class="cc-sub-card-name">{{ card.title }}</div>
                <div class="cc-sub-card-desc">{{ card.desc }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 右侧可折叠结果面板 -->
      <!-- ═══════════════════════════════════════════ -->
      <div class="cc-result-panel" :class="{ expanded: panelExpanded }">
        <!-- 折叠态：触发条 -->
        <button
          v-if="!panelExpanded"
          class="cc-panel-trigger"
          @click="togglePanel"
          :aria-label="t('workspace.slide_panel.expand_aria')"
        >
          <span class="cc-panel-trigger-icon">◀</span>
          <span class="cc-panel-trigger-label">结<wbr>果</span>
        </button>

        <!-- 展开态 -->
        <template v-else>
          <div class="cc-panel-hd">
            <h3 class="cc-panel-title">{{ t('workspace.slide_panel.result_preview') }}</h3>
            <button
              class="cc-panel-collapse"
              @click="panelExpanded = false"
              :aria-label="t('workspace.slide_panel.close_aria')"
            >▶</button>
          </div>

          <div class="cc-panel-body">
            <!-- 上传文件标签 -->
            <div v-if="uploadFiles.length" class="cc-panel-files">
              <span v-for="(f, i) in uploadFiles" :key="i" class="cc-panel-tag">{{ f.name }}</span>
            </div>

            <!-- 提示词 -->
            <div v-if="prompt" class="cc-panel-prompt">
              <div class="cc-panel-label">{{ t('workspace.slide_panel.prompt_label') }}</div>
              <div class="cc-panel-text">{{ prompt }}</div>
            </div>

            <!-- 参数调整 -->
            <div v-if="panelParams.length" class="cc-panel-params">
              <span class="cc-panel-label">{{ t('workspace.slide_panel.param_label') }}</span>
              <div class="cc-panel-param-row">
                <select
                  v-for="(p, i) in panelParams"
                  :key="i"
                  v-model="paramValues[i]"
                  class="cc-panel-sel"
                >
                  <option v-for="(o, j) in p.options" :key="j" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </div>

            <!-- 生成按钮 -->
            <button class="cc-panel-gen-btn" @click="handlePanelGenerate">
              🚀 开始生成
            </button>

            <!-- 进度条 -->
            <div v-if="generating" class="cc-panel-progress">
              <div class="cc-panel-progress-bar">
                <div class="cc-panel-progress-fill" :style="{ width: progress + '%' }" />
              </div>
              <div class="cc-panel-progress-pct">{{ progress }}%</div>
              <div class="cc-panel-steps">
                <span :class="{ done: progress >= 25 }">{{ t('workspace.slide_panel.step_upload_short') }}</span>
                <span :class="{ done: progress >= 50 }">{{ t('workspace.slide_panel.step_analyze_short') }}</span>
                <span :class="{ done: progress >= 75 }">{{ t('workspace.slide_panel.step_generate_short') }}</span>
                <span :class="{ done: progress >= 100 }">{{ t('workspace.slide_panel.step_done_short') }}</span>
              </div>
            </div>

            <!-- 空结果占位 -->
            <div v-if="!generating && !hasResult" class="cc-panel-empty">
              <div class="cc-panel-empty-icon">📭</div>
              <div>{{ t('workspace.creation_no_result') }}</div>
              <div class="cc-panel-empty-hint">{{ t('workspace.creation_empty_hint') }}</div>
            </div>

            <!-- 结果区 -->
            <div v-if="hasResult" class="cc-panel-result">
              <slot name="result">
                <div class="cc-panel-result-done">{{ t('workspace.slide_panel.generation_complete') }}</div>
              </slot>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- SlidePanel: 子功能弹窗（保留 overlay 模式） -->
    <!-- ═══════════════════════════════════════════ -->
    <SlidePanel
      v-if="showSubPanel"
      v-model="showSubPanel"
      :title="subPanelTitle"
      :show-params="true"
      :show-generate="true"
      :params="subPanelParams"
      @generate="handleSubPanelGenerate"
    />
  </div>
</template>

<script setup lang="ts">
type SubCard = { id?: string; icon: string; title: string; desc: string; route?: string; category?: string }

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
const { t, tm } = useI18n()

// ═══ State ═══
const prompt = ref('')
const activeTab = ref('video')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadFiles = ref<{ name: string }[]>([])
const selectedParams = ref<Record<string, string>>({})

// 右侧面板
const panelExpanded = ref(false)
const generating = ref(false)
const progress = ref(0)
const hasResult = ref(false)
const paramValues = ref<Record<string, string>>({})

// 子功能弹窗
const showSubPanel = ref(false)
const subPanelTitle = ref('')
const subPanelCard = ref<SubCard | null>(null)

// ═══ Tab definitions ═══
const tabs = [
  { key: 'video',   icon: '🎬', label: t('workspace.creation_tabs.video') },
  { key: 'image',   icon: '🖼️', label: t('workspace.creation_tabs.image') },
  { key: 'detail',  icon: '📄', label: t('workspace.creation_tabs.detail') },
  { key: 'copywrite', icon: '🎤', label: t('workspace.creation_tabs.copywrite') },
  { key: 'other',   icon: '🧩', label: t('workspace.creation_tabs.other') },
]

function buildOpts(cat: string, values: string[]): Array<{ value: string; label: string }> {
  return values.map(v => {
    const k = v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const label = t(`workspace.creation_options.${cat}.${k}`)
    return { value: v, label }
  })
}

// ═══ Param selects per tab ═══
const tabParams: Record<string, { key: string; label: string; options: Array<{ value: string; label: string }> }[]> = {
  video: [
    { key: 'duration', label: t('workspace.creation_param_video_duration'), options: buildOpts('duration', ['15s', '30s', '60s', '90s', '3min']) },
    { key: 'ratio', label: t('workspace.creation_param_video_ratio'), options: buildOpts('ratio', ['9:16', '16:9', '1:1', '4:3']) },
    { key: 'resolution', label: t('workspace.creation_param_video_resolution'), options: buildOpts('resolution', ['720p', '1080p', '2K', '4K']) },
    { key: 'style', label: t('workspace.creation_param_video_style'), options: buildOpts('style', ['Modern', 'Vintage', 'Minimal', 'Dynamic', 'Premium']) },
  ],
  image: [
    { key: 'size', label: t('workspace.creation_param_image_size'), options: buildOpts('size', ['1:1', '3:4', '4:3', '16:9', '9:16', 'Custom']) },
    { key: 'count', label: t('workspace.creation_param_image_count'), options: buildOpts('count', ['1', '2', '4', '6', '8']) },
    { key: 'style', label: t('workspace.creation_param_image_style'), options: buildOpts('style', ['Minimal', 'Premium', 'Guochao', 'Japanese', 'Cyber']) },
    { key: 'bg', label: t('workspace.creation_param_image_bg'), options: buildOpts('bg', ['White', 'Transparent', 'Scene', 'Custom']) },
  ],
  detail: [
    { key: 'platform', label: t('workspace.creation_param_detail_platform'), options: buildOpts('platform', ['Taobao', 'Pinduoduo', 'Douyin', 'Amazon', 'Temu', 'Shein']) },
    { key: 'style', label: t('workspace.creation_param_detail_style'), options: buildOpts('style', ['Minimal', 'Premium', 'Japanese', 'Korean', 'Western']) },
    { key: 'modules', label: t('workspace.creation_param_detail_modules'), options: buildOpts('modules', ['Full', 'Compact', 'Hero+USP', 'Custom']) },
  ],
  copywrite: [
    { key: 'type', label: t('workspace.creation_param_copywrite_type'), options: buildOpts('copy_type', ['Sales VO', 'Product Title', 'Detail Copy', 'Campaign Copy', 'Social Seeding']) },
    { key: 'lang', label: t('workspace.creation_param_copywrite_lang'), options: buildOpts('language', ['Chinese', 'English', 'Japanese', 'Korean', 'Spanish']) },
    { key: 'tone', label: t('workspace.creation_param_copywrite_tone'), options: buildOpts('tone', ['Professional', 'Friendly', 'Lively', 'Premium', 'Urgent']) },
    { key: 'voice', label: t('workspace.creation_param_copywrite_voice'), options: buildOpts('voice', ['Sweet Female', 'Deep Male', 'Energetic Female', 'Magnetic Male', 'Neutral']) },
  ],
  other: [
    { key: 'tool', label: t('workspace.creation_param_other_tool'), options: buildOpts('tool', ['Digital Human', 'Face Swap', 'Translate', 'Compliance', 'Viral Clone']) },
    { key: 'format', label: t('workspace.creation_param_other_format'), options: buildOpts('format', ['All', 'Image', 'Video', 'Copy', 'Audio']) },
    { key: 'sort', label: t('workspace.creation_param_other_sort'), options: buildOpts('sort', ['Recommended', 'Newest', 'Hottest', 'Free First']) },
  ],
}

// ═══ Sub cards per tab (from i18n) ═══
const activeSubCards = computed(() => {
  const cards = tm('workspace.creation_sub_cards.' + activeTab.value)
  return (Array.isArray(cards) ? cards : []) as SubCard[]
})

// ═══ Computed ═══
const activeTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '')

const activeTabPlaceholder = computed(() => {
  const key = `workspace.creation_placeholder_${activeTab.value}`
  const translated = t(key)
  return translated !== key ? translated : t('workspace.creation_placeholder_default')
})

const activeParamSelects = computed(() => tabParams[activeTab.value] || [])

const panelParams = computed(() => [
  { key: 'type', label: t('workspace.panel_param_type'), options: [
    { value: 'auto', label: t('workspace.panel_opt_auto') },
    { value: 'standard', label: t('workspace.panel_opt_standard') },
    { value: 'premium', label: t('workspace.panel_opt_premium') },
  ]},
  { key: 'quality', label: t('workspace.panel_param_quality'), options: [
    { value: 'sd', label: t('workspace.panel_opt_sd') },
    { value: 'hd', label: t('workspace.panel_opt_hd') },
    { value: 'uhd', label: t('workspace.panel_opt_uhd') },
  ]},
  { key: 'format', label: t('workspace.panel_param_format'), options: buildOpts('format', ['JPG', 'PNG', 'MP4', 'GIF']) },
])

const subPanelParams = computed(() => [
  { key: 'type', label: t('workspace.panel_param_type'), options: [
    { value: 'auto', label: t('workspace.panel_opt_auto') },
    { value: 'standard', label: t('workspace.panel_opt_standard') },
    { value: 'premium', label: t('workspace.panel_opt_premium') },
  ]},
])

// ═══ Actions ═══
function switchTab(key: string) {
  activeTab.value = key
  if (textareaRef.value) textareaRef.value.focus()
}

function triggerUpload() { fileInputRef.value?.click() }

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    uploadFiles.value = Array.from(target.files).map(f => ({ name: f.name }))
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.files) {
    uploadFiles.value = Array.from(e.dataTransfer.files).map(f => ({ name: f.name }))
  }
}

function removeFile(i: number) { uploadFiles.value.splice(i, 1) }

function togglePanel() {
  panelExpanded.value = !panelExpanded.value
}

function startGenerate() {
  if (!prompt.value.trim()) return
  // 展开右侧面板
  panelExpanded.value = true
  generating.value = false
  hasResult.value = false
  progress.value = 0
}

function openSubFunctionPanel(card: SubCard) {
  subPanelCard.value = card
  subPanelTitle.value = card.title
  showSubPanel.value = true
}

function handlePanelGenerate() {
  generating.value = true
  hasResult.value = false
  progress.value = 0
  // 模拟进度
  const timer = setInterval(() => {
    progress.value += Math.random() * 25 + 5
    if (progress.value >= 100) {
      progress.value = 100
      generating.value = false
      hasResult.value = true
      clearInterval(timer)
    }
  }, 500)
}

function handleSubPanelGenerate() {
  showSubPanel.value = false
}
</script>

<style scoped>
/* ═══ Root ═══ */
.cc {
  --cc-bg: #fff; --cc-brd: #ebebea; --cc-brand: #5b5fe3;
  --cc-tx: #171717; --cc-tx2: #6b6b70; --cc-tx3: #9d9da3;
  --cc-radius: 12px;
  padding: 24px 28px; height: 100%;
}

/* ═══ Layout: content + panel ═══ */
.cc-layout { display: flex; gap: 0; height: 100%; max-width: 1200px; margin: 0 auto; }
.cc-content { flex: 1; min-width: 0; }

/* ═══ LAYER 1: 板块标签 ═══ */
.cc-tabs {
  display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
}
.cc-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 500;
  border: 1.5px solid var(--cc-brd); background: #fff; color: #8a8a8a;
  cursor: pointer; transition: all .2s; font-family: inherit; user-select: none;
}
.cc-tab:hover { border-color: var(--cc-brand); color: var(--cc-brand); }
.cc-tab:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: 2px; }
.cc-tab.sel {
  background: var(--cc-brand); border-color: var(--cc-brand); color: #fff;
  font-weight: 600; box-shadow: 0 2px 10px rgba(91,95,227,.25);
}
.cc-tab-icon { font-size: 16px; }
.cc-tab-label { white-space: nowrap; }

/* ═══ LAYER 2: 创作输入卡片 ═══ */
.cc-input-card {
  background: #fff; border: 1.5px solid var(--cc-brd); border-radius: var(--cc-radius);
  overflow: hidden; transition: border .2s, box-shadow .2s; margin-bottom: 24px;
}
.cc-input-card:focus-within {
  border-color: var(--cc-brand); box-shadow: 0 0 0 3px rgba(91,95,227,.06);
}

/* 输入区（上传内嵌） */
.cc-input-main { position: relative; }

/* 内嵌上传按钮 */
.cc-upload-inline {
  position: absolute; top: 10px; left: 14px; z-index: 2;
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 6px;
  background: rgba(91,95,227,.07); color: var(--cc-brand);
  font-size: 12px; cursor: pointer; transition: all .15s; user-select: none;
}
.cc-upload-inline:hover { background: rgba(91,95,227,.14); }
.cc-upload-inline-icon { font-size: 13px; }
.cc-upload-inline-label { font-weight: 500; }

.cc-textarea {
  width: 100%; border: none; resize: none; font-size: 15px; line-height: 1.7;
  color: var(--cc-tx); font-family: inherit; outline: none; background: none;
  min-height: 90px; padding: 40px 16px 14px 16px;
}
.cc-textarea::placeholder { color: #c8c8c8; }

/* 底部操作栏 */
.cc-input-bottom {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px 14px; gap: 12px; flex-wrap: wrap; border-top: 1px solid #f0f0ef;
}
.cc-param-row { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 0; }
.cc-param-sel {
  background: var(--bg-hover); border: 1px solid var(--border-light); border-radius: 7px;
  padding: 7px 28px 7px 10px; font-size: 12.5px; color: #555; cursor: pointer;
  outline: none; font-family: inherit; min-width: 90px;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
}
.cc-param-sel:focus { border-color: var(--cc-brand); }

.cc-gen-btn {
  padding: 10px 28px; border-radius: 9px; font-size: 14px; font-weight: 600;
  border: none; background: var(--cc-brand); color: #fff;
  cursor: pointer; transition: all .15s; font-family: inherit; white-space: nowrap;
}
.cc-gen-btn:hover { background: #4a4ed6; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(91,95,227,.3); }
.cc-gen-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.cc-gen-btn:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: 2px; }

/* 上传预览 */
.cc-upload-preview { padding: 0 16px 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.cc-upload-tag {
  display: flex; align-items: center; gap: 4px; padding: 3px 8px 3px 10px;
  background: var(--brand-light); color: var(--cc-brand); border-radius: 6px; font-size: 11px;
}
.cc-upload-remove {
  border: none; background: none; color: var(--text-secondary); cursor: pointer; font-size: 12px; padding: 0;
}

/* ═══ LAYER 3: 子功能卡片 ═══ */
.cc-sub-panel { }
.cc-sub-title {
  font-size: 13px; font-weight: 600; color: var(--cc-tx); margin: 0 0 12px 0;
}
.cc-sub-scroll {
  display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;
  -webkit-overflow-scrolling: touch; scrollbar-width: none;
}
.cc-sub-scroll::-webkit-scrollbar { display: none; }

.cc-sub-card {
  display: flex; align-items: center; gap: 12px;
  background: #fff; border: 1px solid var(--cc-brd); border-radius: 10px;
  padding: 14px 18px; min-width: 210px; flex-shrink: 0;
  cursor: pointer; transition: all .2s;
}
.cc-sub-card:hover {
  border-color: var(--cc-brand); transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(91,95,227,.1);
}
.cc-sub-card:focus-visible { outline: 2px solid var(--cc-brand); outline-offset: 2px; }

.cc-sub-card-icon {
  font-size: 22px; width: 40px; height: 40px; border-radius: 8px;
  background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cc-sub-card-info { min-width: 0; }
.cc-sub-card-name { font-size: 13.5px; font-weight: 500; color: var(--cc-tx); }
.cc-sub-card-desc { font-size: 11.5px; color: var(--cc-tx3); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ═══════════════════════════════════════════ */
/* 右侧可折叠结果面板 */
/* ═══════════════════════════════════════════ */
.cc-result-panel {
  width: 40px; flex-shrink: 0; transition: width .25s ease;
  border-left: 1px solid var(--cc-brd); background: #fafafa;
  border-radius: 0 12px 12px 0; display: flex; flex-direction: column; overflow: hidden;
}
.cc-result-panel.expanded { width: 270px; }

/* 折叠触发条 */
.cc-panel-trigger {
  width: 40px; flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 8px; border: none; background: none;
  cursor: pointer; color: #9d9da3; font-family: inherit; transition: all .15s;
}
.cc-panel-trigger:hover { background: #f0f0ef; color: var(--cc-brand); }
.cc-panel-trigger-icon { font-size: 11px; }
.cc-panel-trigger-label { font-size: 11px; writing-mode: vertical-lr; letter-spacing: 2px; font-weight: 500; }

/* 展开头 */
.cc-panel-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #ebebea;
}
.cc-panel-title { font-size: 14px; font-weight: 600; color: var(--cc-tx); margin: 0; }
.cc-panel-collapse {
  width: 28px; height: 28px; border-radius: 6px; border: none; background: none;
  cursor: pointer; font-size: 13px; color: #9d9da3; display: flex; align-items: center;
  justify-content: center; transition: all .15s;
}
.cc-panel-collapse:hover { background: #e5e5e5; color: #171717; }

/* 展开体 */
.cc-panel-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }

.cc-panel-files { display: flex; gap: 4px; flex-wrap: wrap; }
.cc-panel-tag {
  padding: 2px 8px; border-radius: 4px; background: var(--brand-light); color: var(--cc-brand);
  font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px;
}

.cc-panel-prompt { }
.cc-panel-label { font-size: 10px; font-weight: 600; color: #9d9da3; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.cc-panel-text { font-size: 12.5px; color: var(--cc-tx2); line-height: 1.6; }

.cc-panel-params { }
.cc-panel-param-row { display: flex; flex-direction: column; gap: 6px; }
.cc-panel-sel {
  width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid var(--cc-brd);
  font-size: 12px; color: #555; background: #fff; outline: none; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
}
.cc-panel-sel:focus { border-color: var(--cc-brand); }

.cc-panel-gen-btn {
  width: 100%; padding: 10px; border-radius: 9px; border: none;
  background: var(--cc-brand); color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.cc-panel-gen-btn:hover { background: #4a4ed6; }

/* 进度 */
.cc-panel-progress { }
.cc-panel-progress-bar {
  height: 6px; border-radius: 3px; background: #ebebea; overflow: hidden; margin-bottom: 6px;
}
.cc-panel-progress-fill {
  height: 100%; border-radius: 3px; background: var(--cc-brand);
  transition: width .3s ease;
}
.cc-panel-progress-pct { font-size: 12px; font-weight: 600; color: var(--cc-brand); margin-bottom: 6px; }
.cc-panel-steps {
  display: flex; justify-content: space-between; font-size: 10px; color: #c8c8c8;
}
.cc-panel-steps span.done { color: var(--cc-brand); font-weight: 600; }

/* 空结果 */
.cc-panel-empty { text-align: center; padding: 24px 0; color: #c8c8c8; }
.cc-panel-empty-icon { font-size: 36px; margin-bottom: 8px; }
.cc-panel-empty-hint { font-size: 11px; margin-top: 4px; }

.cc-panel-result { }
.cc-panel-result-done { text-align: center; padding: 24px 0; font-size: 15px; }

/* ═══ Dark ═══ */
:root[data-theme="dark"] .cc, :root.dark .cc {
  --cc-bg: #1a1a1a; --cc-brd: #2a2a2a; --cc-tx: #eee; --cc-tx2: #767676; --cc-tx3: #767676;
}
:root[data-theme="dark"] .cc-input-card, :root.dark .cc-input-card,
:root[data-theme="dark"] .cc-sub-card, :root.dark .cc-sub-card,
:root[data-theme="dark"] .cc-result-panel, :root.dark .cc-result-panel { background: #1a1a1a; }
:root[data-theme="dark"] .cc-param-sel, :root.dark .cc-param-sel,
:root[data-theme="dark"] .cc-panel-sel, :root.dark .cc-panel-sel { background: #222; color: #aaa; }
:root[data-theme="dark"] .cc-tab, :root.dark .cc-tab { background: #1a1a1a; }
:root[data-theme="dark"] .cc-panel-trigger:hover, :root.dark .cc-panel-trigger:hover { background: #222; }
:root[data-theme="dark"] .cc-upload-inline, :root.dark .cc-upload-inline { background: rgba(139,149,255,.12); }

/* ═══ Responsive ═══ */
@media (max-width: 900px) {
  .cc { padding: 16px; }
  .cc-layout { flex-direction: column; }
  .cc-result-panel { display: none; }
  .cc-result-panel.expanded {
    display: flex; position: fixed; top: 0; right: 0; bottom: 0; width: 280px;
    z-index: 100; border-radius: 0; box-shadow: -4px 0 20px rgba(0,0,0,.1);
  }
  .cc-tab-label { display: none; }
  .cc-tab { padding: 10px 14px; }
  .cc-tab-icon { font-size: 18px; }
  .cc-upload-inline-label { display: none; }
}
@media (max-width: 600px) {
  .cc-tabs { gap: 4px; }
  .cc-tab { padding: 8px 12px; font-size: 12px; }
  .cc-input-bottom { flex-direction: column; align-items: stretch; }
  .cc-gen-btn { text-align: center; }
}
</style>
