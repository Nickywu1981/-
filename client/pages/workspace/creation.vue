<!--
  Movio AI v8.0 — 创作中心
  三层联动布局：板块标签 → 统一创作输入 → 动态子功能
  右侧 SlidePanel 弹窗承载所有结果展示与子功能操作
  主页面不跳转，所有交互统一在弹窗内完成
-->
<template>
  <div class="cc">
    <!-- ═══════════════════════════════════════════ -->
    <!-- LAYER 1: 五大板块标签（创作输入框正上方） -->
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

    <!-- ═══════════════════════════════════════════ -->
    <!-- LAYER 2: 统一创作输入卡片 -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="cc-input-card" role="region" :aria-label="activeTabLabel + ' — 创作输入区'">
      <div class="cc-input-top">
        <!-- 左侧：上传参考素材入口 -->
        <div class="cc-upload-zone" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
          <input ref="fileInputRef" type="file" multiple accept="image/*,video/*" style="display:none" @change="handleFileChange" />
          <div class="cc-upload-icon">📎</div>
          <div class="cc-upload-label">上传素材</div>
        </div>

        <!-- 中间：文案输入区 -->
        <div class="cc-input-main">
          <textarea
            ref="textareaRef"
            v-model="prompt"
            class="cc-textarea"
            :placeholder="activeTabPlaceholder"
            rows="3"
            @keydown.enter.exact.prevent="openGeneratePanel"
          ></textarea>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="cc-input-bottom">
        <!-- 左侧：参数下拉框 -->
        <div class="cc-param-row">
          <select
            v-for="(p, i) in activeParamSelects"
            :key="i"
            class="cc-param-sel"
            v-model="selectedParams[p.key]"
          >
            <option value="">{{ p.label }}</option>
            <option v-for="(o, j) in p.options" :key="j" :value="o">{{ o }}</option>
          </select>
        </div>

        <!-- 右侧：开始生成按钮 -->
        <button
          class="cc-gen-btn"
          :disabled="!prompt.trim()"
          @click="openGeneratePanel"
        >
          ⚡ 开始生成
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

    <!-- ═══════════════════════════════════════════ -->
    <!-- LAYER 3: 底部动态子功能区（横向长方形卡片） -->
    <!-- ═══════════════════════════════════════════ -->
    <section class="cc-sub-panel" role="region" :aria-label="activeTabLabel + ' — 快捷工具'">
      <h2 class="cc-sub-title">{{ activeTabLabel }} · 快捷工具</h2>
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

    <!-- ═══════════════════════════════════════════ -->
    <!-- SLIDE PANEL: 生成结果弹窗 -->
    <!-- ═══════════════════════════════════════════ -->
    <SlidePanel
      v-model="showPanel"
      :title="panelTitle"
      :show-params="true"
      :show-generate="panelMode === 'sub' || panelMode === 'generate'"
      :params="panelParams"
      :uploaded-files="uploadFiles"
      :prompt-text="prompt"
      @generate="handlePanelGenerate"
    />
  </div>
</template>

<script setup lang="ts">
type SubCard = { id?: string; icon: string; title: string; desc: string; route?: string; category?: string }

definePageMeta({ layout: 'workspace' })
const { t, tm } = useI18n()

// ═══ State ═══
const prompt = ref('')
const activeTab = ref('video')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadFiles = ref<{ name: string }[]>([])
const selectedParams = ref<Record<string, string>>({})

// Panel state
const showPanel = ref(false)
const panelMode = ref<'generate' | 'sub'>('generate')
const panelTitle = ref('')
const panelCard = ref<SubCard | null>(null)

// ═══ Tab definitions ═══
const tabs = [
  { key: 'video',   icon: '🎬', label: t('workspace.creation_tabs.video') },
  { key: 'image',   icon: '🖼️', label: t('workspace.creation_tabs.image') },
  { key: 'detail',  icon: '📄', label: t('workspace.creation_tabs.detail') },
  { key: 'copywrite', icon: '🎤', label: t('workspace.creation_tabs.copywrite') },
  { key: 'other',   icon: '🧩', label: t('workspace.creation_tabs.other') },
]

// ═══ Param selects per tab ═══
const tabParams: Record<string, { key: string; label: string; options: string[] }[]> = {
  video: [
    { key: 'duration', label: '时长', options: ['15s', '30s', '60s', '90s', '3分钟'] },
    { key: 'ratio', label: '比例', options: ['9:16', '16:9', '1:1', '4:3'] },
    { key: 'resolution', label: '分辨率', options: ['720p', '1080p', '2K', '4K'] },
    { key: 'style', label: '风格', options: ['现代', '复古', '简约', '动感', '高级'] },
  ],
  image: [
    { key: 'size', label: '尺寸', options: ['1:1', '3:4', '4:3', '16:9', '9:16', '自定义'] },
    { key: 'count', label: '数量', options: ['1张', '2张', '4张', '6张', '8张'] },
    { key: 'style', label: '风格', options: ['简约', '高级', '国潮', '日系', '赛博'] },
    { key: 'bg', label: '背景', options: ['白底', '透明', '场景', '自定义'] },
  ],
  detail: [
    { key: 'platform', label: '平台', options: ['淘宝', '拼多多', '抖音', '亚马逊', 'Temu', 'Shein'] },
    { key: 'style', label: '风格', options: ['简约', '高级', '日式', '韩式', '欧美'] },
    { key: 'modules', label: '模块', options: ['完整版', '精简版', '仅主图+卖点', '自定义'] },
  ],
  copywrite: [
    { key: 'type', label: '类型', options: ['带货口播', '商品标题', '详情文案', '营销文案', '社媒种草'] },
    { key: 'lang', label: '语种', options: ['中文', 'English', '日本語', '한국어', 'Español'] },
    { key: 'tone', label: '风格', options: ['专业', '亲切', '活泼', '高级感', '紧迫感'] },
    { key: 'voice', label: '音色', options: ['甜美女声', '沉稳男声', '活力女声', '磁性男声', '中性'] },
  ],
  other: [
    { key: 'tool', label: '工具', options: ['数字人', '换脸', '翻译', '合规检查', '爆款复刻'] },
    { key: 'format', label: '格式', options: ['全部', '图片', '视频', '文案', '音频'] },
    { key: 'sort', label: '排序', options: ['推荐', '最新', '最热', '免费优先'] },
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
  const map: Record<string, string> = {
    video: '描述你想要的带货视频，例如：护肤品展示视频，15秒口播...',
    image: '描述你想要的商品图，例如：夏季连衣裙白底图，简约高级风格...',
    detail: '描述你的详情页需求，例如：面膜产品详情页，日式极简风...',
    copywrite: '描述你的文案需求，例如：618 大促女装促销标题...',
    other: '描述你的其他创作需求，例如：数字人带货、合规检查...',
  }
  return map[activeTab.value] || '描述你的创作需求...'
})

const activeParamSelects = computed(() => tabParams[activeTab.value] || [])

const panelParams = computed(() => {
  if (panelMode.value === 'generate') return activeParamSelects.value
  // Sub function panel — generic params
  return [
    { key: 'type', label: '类型', options: ['自动', '标准', '高级'] },
    { key: 'quality', label: '质量', options: ['标清', '高清', '超清'] },
    { key: 'format', label: '格式', options: ['JPG', 'PNG', 'MP4', 'GIF'] },
  ]
})

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

function openGeneratePanel() {
  if (!prompt.value.trim()) return
  panelMode.value = 'generate'
  panelTitle.value = activeTabLabel.value + ' — 生成结果'
  showPanel.value = true
}

function openSubFunctionPanel(card: SubCard) {
  panelMode.value = 'sub'
  panelCard.value = card
  panelTitle.value = card.title
  showPanel.value = true
}

function handlePanelGenerate() {
  // SlidePanel handles its own internal progress/result flow
}
</script>

<style scoped>
/* ═══ Root ═══ */
.cc {
  max-width: 1120px; margin: 0 auto; padding: 24px 28px;
  --cc-bg: #fff; --cc-brd: #ebebea; --cc-brand: #5b5fe3;
  --cc-tx: #171717; --cc-tx2: #6b6b70; --cc-tx3: #9d9da3;
  --cc-radius: 12px;
}

/* ═══ LAYER 1: 板块标签卡片 ═══ */
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

/* ═══ LAYER 2: 统一创作输入卡片 ═══ */
.cc-input-card {
  background: #fff; border: 1.5px solid var(--cc-brd); border-radius: var(--cc-radius);
  overflow: hidden; transition: border .2s, box-shadow .2s; margin-bottom: 24px;
}
.cc-input-card:focus-within {
  border-color: var(--cc-brand); box-shadow: 0 0 0 3px rgba(91,95,227,.06);
}

.cc-input-top { display: flex; align-items: stretch; min-height: 80px; }

/* 左侧上传区 */
.cc-upload-zone {
  width: 68px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; border-right: 1px solid #f0f0ef;
  cursor: pointer; transition: background .15s; flex-shrink: 0;
}
.cc-upload-zone:hover { background: #fafaf9; }
.cc-upload-icon { font-size: 20px; width: 32px; height: 32px; border-radius: 8px; background: #f5f3ff; display: flex; align-items: center; justify-content: center; }
.cc-upload-label { font-size: 10px; color: #999; font-weight: 500; }

/* 中间输入区 */
.cc-input-main { flex: 1; padding: 14px 16px; }
.cc-textarea {
  width: 100%; border: none; resize: none; font-size: 15px; line-height: 1.7;
  color: var(--cc-tx); font-family: inherit; outline: none; background: none; min-height: 60px;
}
.cc-textarea::placeholder { color: #c8c8c8; }

/* 底部操作栏 */
.cc-input-bottom {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px 14px; gap: 12px; flex-wrap: wrap;
}
.cc-param-row { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 0; }
.cc-param-sel {
  background: #f5f5f4; border: 1px solid #ebebea; border-radius: 7px;
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
  background: #f5f3ff; color: var(--cc-brand); border-radius: 6px; font-size: 11px;
}
.cc-upload-remove {
  border: none; background: none; color: #999; cursor: pointer; font-size: 12px; padding: 0;
}

/* ═══ LAYER 3: 底部子功能横向长方形卡片 ═══ */
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
  background: #f5f3ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cc-sub-card-info { min-width: 0; }
.cc-sub-card-name { font-size: 13.5px; font-weight: 500; color: var(--cc-tx); }
.cc-sub-card-desc { font-size: 11.5px; color: var(--cc-tx3); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ═══ Dark ═══ */
:root[data-theme="dark"] .cc, :root.dark .cc {
  --cc-bg: #1a1a1a; --cc-brd: #2a2a2a; --cc-tx: #eee; --cc-tx2: #999; --cc-tx3: #777;
}
:root[data-theme="dark"] .cc-input-card, :root.dark .cc-input-card,
:root[data-theme="dark"] .cc-sub-card, :root.dark .cc-sub-card { background: #1a1a1a; }
:root[data-theme="dark"] .cc-param-sel, :root.dark .cc-param-sel { background: #222; }
:root[data-theme="dark"] .cc-tab, :root.dark .cc-tab { background: #1a1a1a; }

/* ═══ Responsive ═══ */
@media (max-width: 900px) {
  .cc { padding: 16px; }
  .cc-tab-label { display: none; }
  .cc-tab { padding: 10px 14px; }
  .cc-tab-icon { font-size: 18px; }
  .cc-upload-label { display: none; }
  .cc-upload-zone { width: 48px; }
}
@media (max-width: 600px) {
  .cc-tabs { gap: 4px; }
  .cc-tab { padding: 8px 12px; font-size: 12px; }
  .cc-input-bottom { flex-direction: column; align-items: stretch; }
  .cc-gen-btn { text-align: center; }
}
</style>
