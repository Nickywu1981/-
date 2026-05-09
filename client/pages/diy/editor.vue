<template>
  <div class="diy-editor">
    <!-- 顶部操作栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-ghost" @click="$router.back()">← 返回</button>
        <span class="page-title">{{ pageInfo.title || '未命名页面' }}</span>
        <span class="page-type">({{ pageInfo.page_type }})</span>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-outline" @click="saveVersion">保存版本</button>
        <button class="btn btn-outline" @click="savePage">保存</button>
        <button class="btn btn-primary" @click="publishPage" :disabled="publishing">发布</button>
      </div>
    </div>

    <div class="editor-body">
      <!-- 左侧：组件库 -->
      <div class="left-panel">
        <h3>组件库</h3>
        <div class="component-list">
          <div v-for="cat in componentCats" :key="cat.key" class="comp-category">
            <h4>{{ cat.label }}</h4>
            <div v-for="comp in componentsByCat(cat.key)" :key="comp.component_code" class="comp-item" draggable="true" @dragstart="onDragStart($event, comp)" @dragend="dragOverIdx = -1">
              <span class="comp-icon">{{ comp.icon || '◆' }}</span>
              <span>{{ comp.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：画布 -->
      <div class="center-canvas" @dragover.prevent @drop="onDrop" @click="selectedIdx = -1">
        <div v-if="!sections.length" class="canvas-placeholder">
          从左侧拖拽组件到这里开始搭建页面
        </div>
        <div v-for="(sec, idx) in sections" :key="sec.id" class="canvas-section" :class="{ selected: idx === selectedIdx }" :style="{ order: idx }" @click.stop="selectSection(idx)" draggable="true" @dragstart="onSectionDragStart($event, idx)" @dragover.prevent="onSectionDragOver($event, idx)" @drop.stop="onSectionDrop($event, idx)">
          <div class="section-toolbar">
            <span class="section-label">{{ getCompName(sec.component) }}</span>
            <div>
              <button class="btn-icon" @click.stop="moveSection(idx, -1)" :disabled="idx===0">↑</button>
              <button class="btn-icon" @click.stop="moveSection(idx, 1)" :disabled="idx===sections.length-1">↓</button>
              <button class="btn-icon btn-danger" @click.stop="removeSection(idx)">✕</button>
            </div>
          </div>
          <div class="section-preview">
            <div v-if="sec.component === 'banner_slider'" class="preview-banner">
              <div v-for="(s, si) in (sec.config.slides||[{}])" :key="si" class="preview-slide">{{ s.img ? '🖼️ 图片'+(si+1) : '空幻灯片'+(si+1) }}</div>
            </div>
            <div v-else-if="sec.component === 'text_block'" class="preview-text">{{ sec.config.content || '文本段落' }}</div>
            <div v-else-if="sec.component === 'title_bar'" class="preview-title">{{ sec.config.title || '标题' }}</div>
            <div v-else-if="sec.component === 'product_list'" class="preview-products">📦 商品列表 ({{ sec.config.columns || 2 }}列)</div>
            <div v-else-if="sec.component === 'image_showcase'" class="preview-gallery">🖼️ 图片展示</div>
            <div v-else-if="sec.component === 'video_player'" class="preview-video">▶️ 视频播放</div>
            <div v-else-if="sec.component === 'countdown'" class="preview-countdown">⏰ 倒计时</div>
            <div v-else-if="sec.component === 'coupon_card'" class="preview-coupon">🎫 优惠券</div>
            <div v-else-if="sec.component === 'button_group'" class="preview-buttons">🔘 按钮组</div>
            <div v-else-if="sec.component === 'nav_bar'" class="preview-nav">📍 导航栏</div>
            <div v-else-if="sec.component === 'form_container'" class="preview-form">📝 表单容器</div>
            <div v-else-if="sec.component === 'hotzone_image'" class="preview-hotzone">🗺️ 热区图片</div>
            <div v-else class="preview-unknown">{{ sec.component }}</div>
          </div>
        </div>
        <!-- 拖拽插入指示器 -->
        <div v-if="dragOverIdx >= 0" class="drop-indicator" :style="{ order: dragOverIdx }"></div>
      </div>

      <!-- 右侧：属性面板 + 图层面板 -->
      <div class="right-panel">
        <div class="panel-tabs">
          <button :class="{ active: rightTab === 'props' }" @click="rightTab = 'props'">属性</button>
          <button :class="{ active: rightTab === 'layers' }" @click="rightTab = 'layers'">图层 ({{ sections.length }})</button>
        </div>

        <!-- 属性 Tab -->
        <div v-if="rightTab === 'props' && selectedIdx >= 0 && sections[selectedIdx]">
          <h3>属性配置</h3>
          <div class="prop-group">
            <label>组件类型</label>
            <span class="prop-static">{{ getCompName(sections[selectedIdx].component) }}</span>
          </div>

        <!-- 通用属性 -->
        <div class="prop-group" v-if="hasProp('title')">
          <label>标题</label>
          <input v-model="sections[selectedIdx].config.title" @input="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('subtitle')">
          <label>副标题</label>
          <input v-model="sections[selectedIdx].config.subtitle" @input="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('content')">
          <label>文本内容</label>
          <textarea v-model="sections[selectedIdx].config.content" rows="3" @input="markDirty"></textarea>
        </div>
        <div class="prop-group" v-if="hasProp('align')">
          <label>对齐方式</label>
          <select v-model="sections[selectedIdx].config.align" @change="markDirty">
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
        </div>
        <div class="prop-group" v-if="hasProp('columns')">
          <label>列数</label>
          <select v-model.number="sections[selectedIdx].config.columns" @change="markDirty">
            <option :value="1">1列</option>
            <option :value="2">2列</option>
            <option :value="3">3列</option>
            <option :value="4">4列</option>
          </select>
        </div>
        <div class="prop-group" v-if="hasProp('color')">
          <label>颜色</label>
          <input type="color" v-model="sections[selectedIdx].config.color" @input="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('direction')">
          <label>排列方向</label>
          <select v-model="sections[selectedIdx].config.direction" @change="markDirty">
            <option value="row">水平</option>
            <option value="column">垂直</option>
          </select>
        </div>
        <div class="prop-group" v-if="hasProp('gap')">
          <label>间距 (px)</label>
          <input type="number" v-model.number="sections[selectedIdx].config.gap" @input="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('radius')">
          <label>圆角 (px)</label>
          <input type="number" v-model.number="sections[selectedIdx].config.radius" @input="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('fontSize')">
          <label>字号 (px)</label>
          <input type="number" v-model.number="sections[selectedIdx].config.fontSize" @input="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('bgColor')">
          <label>背景色</label>
          <input type="color" v-model="sections[selectedIdx].config.bgColor" @input="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('autoplay')">
          <label>自动播放</label>
          <input type="checkbox" v-model="sections[selectedIdx].config.autoplay" @change="markDirty" />
        </div>
        <div class="prop-group" v-if="hasProp('showPrice')">
          <label>显示价格</label>
          <input type="checkbox" v-model="sections[selectedIdx].config.showPrice" @change="markDirty" />
        </div>
        </div>

        <!-- 图层 Tab -->
        <div v-if="rightTab === 'layers'" class="layers-panel">
          <div v-if="!sections.length" class="empty-hint">暂无图层，从左侧拖入组件</div>
          <div v-for="(sec, idx) in sections" :key="sec.id"
               class="layer-item"
               :class="{ selected: idx === selectedIdx, hidden: !sec.visible }"
               @click="selectSection(idx)"
               draggable="true"
               @dragstart="onLayerDragStart($event, idx)"
               @dragover.prevent="onLayerDragOver($event, idx)"
               @drop.stop="onLayerDrop($event, idx)">
            <div class="layer-handle">⋮⋮</div>
            <span class="layer-icon">{{ getCompIcon(sec.component) }}</span>
            <span class="layer-name">{{ getCompName(sec.component) || sec.component }}</span>
            <button class="layer-visibility" @click.stop="sec.visible = !sec.visible" :title="sec.visible ? '隐藏' : '显示'">
              {{ sec.visible ? '👁' : '👁‍🗨' }}
            </button>
            <button class="layer-delete" @click.stop="removeSection(idx)" title="删除">✕</button>
          </div>
        </div>

        <!-- 无选中提示 -->
        <div v-if="rightTab === 'props' && (selectedIdx < 0 || !sections[selectedIdx])" class="empty-hint">
          <p>点击画布或图层面板中的组件查看属性</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>

const route = useRoute()
const pageInfo = ref({})
const sections = ref([])
const components = ref([])
const selectedIdx = ref(-1)
const dragOverIdx = ref(-1)
const rightTab = ref('props')
const dirty = ref(false)
const publishing = ref(false)

const componentCats = [
  { key: 'banner', label: '横幅/轮播' },
  { key: 'product', label: '商品/营销' },
  { key: 'gallery', label: '图片/视频' },
  { key: 'text', label: '文本' },
  { key: 'form', label: '表单' },
  { key: 'nav', label: '导航' },
]

function componentsByCat(cat) { return components.value.filter(c => c.category === cat) }
function getCompName(code) { return components.value.find(c => c.component_code === code)?.name || code }
function getCompIcon(code) {
  const icons = { banner_slider:'🖼', text_block:'📝', title_bar:'📌', product_list:'📦', image_showcase:'🖼️', video_player:'▶️', countdown:'⏰', coupon_card:'🎫', button_group:'🔘', nav_bar:'📍', form_container:'📋', hotzone_image:'🗺️' }
  return icons[code] || '◆'
}
function hasProp(key) { return selectedIdx.value >= 0 && sections.value[selectedIdx.value]?.config && key in sections.value[selectedIdx.value].config }
function markDirty() { dirty.value = true }

function selectSection(idx) { selectedIdx.value = idx }
function removeSection(idx) { sections.value.splice(idx, 1); if (selectedIdx.value === idx) selectedIdx.value = -1; dirty.value = true }
function moveSection(idx, dir) {
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= sections.value.length) return
  const tmp = sections.value[newIdx]
  sections.value[newIdx] = sections.value[idx]
  sections.value[idx] = tmp
  if (selectedIdx.value === idx) selectedIdx.value = newIdx
  dirty.value = true
}

function onDragStart(e, comp) {
  e.dataTransfer.setData('component', comp.component_code)
  e.dataTransfer.effectAllowed = 'copy'
}

function onDrop(e) {
  const code = e.dataTransfer.getData('component')
  if (!code) return
  const comp = components.value.find(c => c.component_code === code)
  if (!comp) return
  const config = typeof comp.default_config === 'string' ? JSON.parse(comp.default_config) : { ...(comp.default_config || {}) }
  const newSection = { id: 's' + Date.now(), component: code, config }
  const insertAt = dragOverIdx.value >= 0 ? dragOverIdx.value : sections.value.length
  sections.value.splice(insertAt, 0, newSection)
  selectedIdx.value = insertAt
  dragOverIdx.value = -1
  dirty.value = true
}

function onSectionDragStart(e, idx) { e.dataTransfer.setData('sectionIdx', String(idx)); e.dataTransfer.effectAllowed = 'move' }
function onSectionDragOver(e, idx) { dragOverIdx.value = idx }
function onSectionDrop(e, idx) {
  const fromIdx = parseInt(e.dataTransfer.getData('sectionIdx'))
  if (!isNaN(fromIdx) && fromIdx !== idx) {
    const item = sections.value.splice(fromIdx, 1)[0]
    sections.value.splice(idx, 0, item)
    selectedIdx.value = idx
    dirty.value = true
  }
  dragOverIdx.value = -1
}

// 图层面板拖拽排序
function onLayerDragStart(e, idx) { e.dataTransfer.setData('layerIdx', String(idx)); e.dataTransfer.effectAllowed = 'move' }
function onLayerDragOver(e, idx) { e.dataTransfer.dropEffect = 'move' }
function onLayerDrop(e, targetIdx) {
  const fromIdx = parseInt(e.dataTransfer.getData('layerIdx'))
  if (isNaN(fromIdx) || fromIdx === targetIdx) return
  const [moved] = sections.value.splice(fromIdx, 1)
  sections.value.splice(targetIdx, 0, moved)
  if (selectedIdx.value === fromIdx) selectedIdx.value = targetIdx
  dirty.value = true
}

async function loadComponents() {
  try { const res = await $fetch('/api/diy/components'); components.value = res.data || [] }
  catch (e) { toast.error('加载组件库失败') }
}

async function loadPage() {
  const id = route.query.id
  if (!id) { $router.replace('/diy'); return }
  try {
    const res = await $fetch(`/api/diy/${id}`)
    pageInfo.value = res.data
    const config = typeof res.data.config_json === 'string' ? JSON.parse(res.data.config_json) : res.data.config_json
    sections.value = config?.sections || []
  } catch (e) { toast.error('加载页面失败') }
}

async function savePage() {
  try {
    const body = { config_json: { sections: sections.value } }
    await $fetch(`/api/diy/${pageInfo.value.id}`, { method: 'PUT', body })
    dirty.value = false
    toast.success('保存成功')
  } catch (e) { toast.error('保存失败: ' + (e.data?.msg || e.message)) }
}

async function saveVersion() {
  const remark = prompt('版本备注 (可选):')
  try {
    await $fetch(`/api/diy/${pageInfo.value.id}/versions`, { method: 'POST', body: { configJson: { sections: sections.value }, remark: remark || undefined } })
    toast.success('版本已保存')
  } catch (e) { toast.error('保存版本失败: ' + (e.data?.msg || e.message)) }
}

async function publishPage() {
  publishing.value = true
  try {
    await $fetch(`/api/diy/${pageInfo.value.id}`, { method: 'PUT', body: { config_json: { sections: sections.value } } })
    await $fetch(`/api/diy/${pageInfo.value.id}/publish`, { method: 'POST' })
    dirty.value = false
    toast.success('发布成功！访问地址：/diy/preview?slug=' + pageInfo.value.slug)
  } catch (e) { toast.error('发布失败: ' + (e.data?.msg || e.message)) }
  finally { publishing.value = false }
}

onMounted(async () => { await loadComponents(); await loadPage() })
</script>

<style scoped>
.diy-editor { height: 100vh; display: flex; flex-direction: column; background: var(--bg-page); }
.editor-toolbar { height: 52px; background: var(--bg-card); border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; padding: 0 16px; flex-shrink: 0; }
.toolbar-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-weight: 600; font-size: 15px; }
.page-type { font-size: 12px; color: var(--text-muted); }
.toolbar-right { display: flex; gap: 8px; }
.editor-body { flex: 1; display: flex; overflow: hidden; }
.left-panel { width: 220px; background: var(--bg-card); border-right: 1px solid var(--border-light); overflow-y: auto; padding: 12px; flex-shrink: 0; }
.left-panel h3 { font-size: 14px; margin-bottom: 10px; color: var(--text-secondary); }
.comp-category { margin-bottom: 14px; }
.comp-category h4 { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; }
.comp-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: grab; font-size: 13px; transition: background .15s; border: 1px solid transparent; }
.comp-item:hover { background: var(--brand-light); border-color: var(--brand); }
.comp-icon { font-size: 16px; width: 20px; text-align: center; }
.center-canvas { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; max-width: 430px; margin: 0 auto; }
.canvas-placeholder { text-align: center; padding: 80px 20px; color: var(--text-muted); font-size: 15px; border: 2px dashed var(--border-light); border-radius: 12px; }
.canvas-section { background: var(--bg-card); border-radius: 8px; border: 2px solid transparent; overflow: hidden; cursor: pointer; transition: border-color .15s; }
.canvas-section.selected { border-color: var(--brand); }
.canvas-section:hover { border-color: var(--border); }
.section-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--bg-hover); border-bottom: 1px solid var(--border-light); }
.section-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.btn-icon { border: none; background: none; cursor: pointer; padding: 2px 6px; font-size: 12px; border-radius: 3px; }
.btn-icon:hover { background: var(--bg-hover); }
.btn-icon.btn-danger:hover { background: var(--danger-light, #fff0f0); color: var(--danger); }
.btn-icon:disabled { opacity: .3; cursor: not-allowed; }
.section-preview { padding: 16px; min-height: 60px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 14px; }
.preview-banner { display: flex; gap: 8px; }
.preview-slide { padding: 20px 30px; background: var(--bg-hover); border-radius: 6px; font-size: 12px; }
.drop-indicator { height: 3px; background: var(--brand); border-radius: 2px; }
.right-panel { width: 260px; background: var(--bg-card); border-left: 1px solid var(--border-light); overflow-y: auto; padding: 16px; flex-shrink: 0; }
.right-panel h3 { font-size: 14px; margin-bottom: 14px; color: var(--text-secondary); }
.right-panel.empty-hint { display: flex; align-items: center; justify-content: center; }
.right-panel .empty-hint p { color: var(--text-muted); font-size: 13px; text-align: center; }

.panel-tabs { display: flex; gap: 0; margin-bottom: 14px; border-bottom: 1px solid var(--border-light); }
.panel-tabs button { flex: 1; padding: 8px 0; border: none; background: none; font-size: 13px; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; }
.panel-tabs button.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }

.layers-panel { max-height: calc(100vh - 200px); overflow-y: auto; }
.layer-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 4px; border: 1px solid transparent; }
.layer-item:hover { background: var(--bg-hover); }
.layer-item.selected { background: var(--brand-light, #e6f7ff); border-color: var(--brand); }
.layer-item.hidden { opacity: .4; }
.layer-handle { cursor: grab; color: var(--text-muted); font-size: 12px; user-select: none; }
.layer-icon { font-size: 14px; }
.layer-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer-visibility, .layer-delete { border: none; background: none; cursor: pointer; font-size: 14px; padding: 2px 4px; opacity: .6; }
.layer-visibility:hover, .layer-delete:hover { opacity: 1; }
.layer-delete:hover { color: #ff4d4f; }
.prop-group { margin-bottom: 14px; }
.prop-group label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.prop-group input, .prop-group select, .prop-group textarea { width: 100%; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; }
.prop-group textarea { resize: vertical; }
.prop-group input[type="checkbox"] { width: auto; }
.prop-static { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.btn { padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-outline { background: var(--bg-card); border: 1px solid var(--border-light); color: var(--text-primary); }
.btn-ghost { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 13px; }
</style>
