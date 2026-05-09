<template>
  <div class="diy-editor" @keydown="onKeydown" tabindex="0">
    <!-- 顶部操作栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-ghost" @click="$router.back()">← 返回</button>
        <span class="page-title">{{ pageInfo.title || '未命名页面' }}</span>
        <span class="page-type">({{ pageInfo.page_type }})</span>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-icon-btn" :disabled="undoStack.length === 0" @click="editor.undo(); dirty=true" title="撤销" aria-label="撤销 Ctrl+Z">↩</button>
        <button class="btn btn-icon-btn" :disabled="redoStack.length === 0" @click="editor.redo(); dirty=true" title="重做" aria-label="重做 Ctrl+Y">↪</button>
        <button class="btn btn-outline btn-sm" @click="previewMode = previewMode === 'mobile' ? 'pc' : 'mobile'" :title="previewMode === 'mobile' ? '切换到PC预览' : '切换到移动端预览'" :aria-label="previewMode === 'mobile' ? '切换到PC预览' : '切换到移动端预览'">
          {{ previewMode === 'mobile' ? '📱' : '🖥' }}
        </button>
        <button class="btn btn-outline" :disabled="saving" @click="saveVersion">{{ saving ? '保存中...' : '保存版本' }}</button>
        <button class="btn btn-outline" :disabled="saving" @click="savePage">{{ saving ? '保存中...' : '保存' }}</button>
        <button class="btn btn-outline" @click="showVersions = true">版本历史</button>
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
            <div v-for="comp in componentsByCat[cat.key]" :key="comp.component_code" class="comp-item" draggable="true" @dragstart="onDragStart($event, comp)" @dragend="dragOverIdx = -1">
              <span class="comp-icon">{{ comp.icon || '◆' }}</span>
              <span>{{ comp.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：画布 -->
      <div class="center-canvas" :class="{ 'canvas-pc': previewMode === 'pc' }" @dragover.prevent @drop="onDrop" @click="selectedIdxs = []">
        <div v-if="!sections.length" class="canvas-placeholder">
          从左侧拖拽组件到这里开始搭建页面
        </div>
        <div v-for="(sec, idx) in sections" :key="sec.id" class="canvas-section" :class="{ selected: idx === selectedIdx }" :style="{ order: idx }" @click.stop="selectSection(idx)" draggable="true" @dragstart="onSectionDragStart($event, idx)" @dragover.prevent="onSectionDragOver($event, idx)" @drop.stop="onSectionDrop($event, idx)">
          <div class="section-toolbar">
            <span class="section-label">{{ getCompName(sec.component) }}</span>
            <div>
              <button class="btn-icon" @click.stop="moveSection(idx, -1)" :disabled="idx===0" aria-label="上移区块">↑</button>
              <button class="btn-icon" @click.stop="moveSection(idx, 1)" :disabled="idx===sections.length-1" aria-label="下移区块">↓</button>
              <button class="btn-icon btn-danger" @click.stop="removeSection(idx)" aria-label="删除区块">✕</button>
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

          <div v-for="prop in currentProps" :key="prop.key" class="prop-group">
            <label>{{ prop.label }}</label>
            <input v-if="prop.type === 'text'" v-model="sections[selectedIdx].config[prop.key]" @input="markDirty">
            <textarea v-else-if="prop.type === 'textarea'" v-model="sections[selectedIdx].config[prop.key]" rows="3" @input="markDirty"></textarea>
            <select v-else-if="prop.type === 'select'" v-model="sections[selectedIdx].config[prop.key]" @change="markDirty">
              <option v-for="opt in prop.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input v-else-if="prop.type === 'number'" type="number" v-model.number="sections[selectedIdx].config[prop.key]" :step="prop.step || 1" @input="markDirty">
            <input v-else-if="prop.type === 'color'" type="color" v-model="sections[selectedIdx].config[prop.key]" @input="markDirty">
            <input v-else-if="prop.type === 'checkbox'" type="checkbox" v-model="sections[selectedIdx].config[prop.key]" @change="markDirty">
            <input v-else type="text" v-model="sections[selectedIdx].config[prop.key]" @input="markDirty">
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

    <!-- 版本历史 Modal -->
    <Teleport to="body">
      <div v-if="showVersions" class="modal-overlay" @click.self="showVersions = false">
        <div class="modal version-modal">
          <h3>版本历史</h3>
          <div v-if="versionLoading" class="v-loading">加载中...</div>
          <div v-else-if="!versions.length" class="v-empty">暂无版本记录</div>
          <div v-else class="version-list">
            <div v-for="(v, i) in versions" :key="v.version" class="version-item" :class="{ selected: selectedVersions.includes(i) }" @click="toggleVersionSelect(i)">
              <div class="v-dot" :class="{ latest: i === 0 }" />
              <div class="v-info">
                <span class="v-version">v{{ v.version }}</span>
                <span class="v-time">{{ v.created_at?.slice(0, 19) || '-' }}</span>
                <span v-if="v.remark" class="v-remark">{{ v.remark }}</span>
                <span v-if="i === 0" class="v-latest-tag">最新</span>
              </div>
            </div>
          </div>
          <div v-if="diffResult" class="diff-panel">
            <h4>差异对比</h4>
            <div v-for="(d, di) in diffResult" :key="di" class="diff-item" :class="d.type">
              <span class="diff-type">{{ d.type === 'added' ? '+' : d.type === 'removed' ? '-' : '~' }}</span>
              <span>{{ d.path }}</span>
              <span v-if="d.aType || d.bType">({{ d.aType || '空' }} → {{ d.bType || '空' }})</span>
            </div>
          </div>
          <div class="modal-actions">
            <button v-if="selectedVersions.length === 2" class="btn btn-outline" @click="diffVersions">对比选中版本</button>
            <button v-if="selectedVersions.length === 1 && selectedVersions[0] !== 0" class="btn btn-outline" @click="rollbackVersion">回滚到此版本</button>
            <button class="btn-cancel" @click="showVersions = false; selectedVersions = []; diffResult = null">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { useDiyEditor } from '~/composables/useDiyEditor'
import { DIY_COMPONENTS, getComponentByCode } from '~/composables/useDiyComponents'
import { useDiyAutoSave } from '~/composables/useDiyAutoSave'

const route = useRoute()
const toast = useToast()
const editor = useDiyEditor()
const { sections, selectedIdxs, previewMode, undoStack, redoStack } = editor
const selectedIdx = computed(() => selectedIdxs.value[0] ?? -1)
const pageInfo = ref({})
const dragOverIdx = ref(-1)
const rightTab = ref('props')
const dirty = ref(false)
const publishing = ref(false)
const saving = ref(false)

// 版本管理
const showVersions = ref(false)
const versions = ref<any[]>([])
const versionLoading = ref(false)
const selectedVersions = ref<number[]>([])
const diffResult = ref<any[] | null>(null)

const componentCats = DIY_COMPONENTS.categories
const componentsByCat = computed(() => {
  const map: Record<string, typeof DIY_COMPONENTS.components> = {}
  for (const cat of componentCats) {
    map[cat.key] = DIY_COMPONENTS.components.filter(c => c.category === cat.key)
  }
  return map
})
function getCompName(code: string) { return getComponentByCode(code)?.name || code }
function getCompIcon(code: string) { return getComponentByCode(code)?.icon || '◆' }
const currentProps = computed(() => {
  const idx = selectedIdx.value
  if (idx < 0 || !sections.value[idx]) return []
  const comp = getComponentByCode(sections.value[idx].component)
  return comp?.props || []
})
function markDirty() { dirty.value = true }

function onKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey
  const target = e.target as HTMLElement
  const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

  if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); dirty.value = true }
  else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); editor.redo(); dirty.value = true }
  else if (ctrl && e.key === 's') { e.preventDefault(); savePage() }
  else if (!inInput && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); editor.removeSelected(); dirty.value = true }
}

function selectSection(idx: number) { editor.selectSection(idx) }
function removeSection(idx: number) { editor.removeSection(idx); dirty.value = true }
function moveSection(idx: number, dir: number) { editor.moveSection(idx, dir); dirty.value = true }

function onDrop(e: DragEvent) {
  const code = e.dataTransfer?.getData('component')
  if (!code) return
  const comp = getComponentByCode(code)
  if (!comp) return
  editor.addSection(comp, dragOverIdx.value >= 0 ? dragOverIdx.value : -1)
  selectedIdxs.value = [selectedIdxs.value[0] ?? sections.value.length - 1]
  dragOverIdx.value = -1
  dirty.value = true
}

function onDragStart(e: DragEvent, comp: any) {
  e.dataTransfer?.setData('component', comp.component_code)
  e.dataTransfer!.effectAllowed = 'copy'
}

function onSectionDragStart(e: DragEvent, idx: number) { e.dataTransfer?.setData('sectionIdx', String(idx)); e.dataTransfer!.effectAllowed = 'move' }
function onSectionDragOver(_e: DragEvent, idx: number) { dragOverIdx.value = idx }
function onSectionDrop(e: DragEvent, toIdx: number) {
  const fromIdx = parseInt(e.dataTransfer?.getData('sectionIdx') || '')
  if (!isNaN(fromIdx)) { editor.reorderSection(fromIdx, toIdx); dirty.value = true }
  dragOverIdx.value = -1
}

function onLayerDragStart(e: DragEvent, idx: number) { e.dataTransfer?.setData('layerIdx', String(idx)); e.dataTransfer!.effectAllowed = 'move' }
function onLayerDragOver(_e: DragEvent, _idx: number) { e.dataTransfer!.dropEffect = 'move' }
function onLayerDrop(e: DragEvent, targetIdx: number) {
  const fromIdx = parseInt(e.dataTransfer?.getData('layerIdx') || '')
  if (!isNaN(fromIdx) && fromIdx !== targetIdx) { editor.reorderSection(fromIdx, targetIdx); dirty.value = true }
}

async function loadPage() {
  const id = route.query.id
  if (!id) { navigateTo('/diy'); return }
  try {
    const res = await $fetch(`/api/diy/${id}`)
    pageInfo.value = res.data
    editor.loadFromConfig(res.data.mobile_config || res.data.pc_config)
  } catch { toast.error('加载页面失败') }
}

async function savePage() {
  saving.value = true
  try {
    const body = { mobileConfig: editor.toConfigJson() }
    await $fetch(`/api/diy/${pageInfo.value.id}`, { method: 'PUT', body })
    dirty.value = false
    toast.success('保存成功')
  } catch (e) { toast.error('保存失败: ' + (e.data?.msg || e.message)) }
  finally { saving.value = false }
}

async function saveVersion() {
  const remark = prompt('版本备注 (可选):')
  saving.value = true
  try {
    await $fetch(`/api/diy/${pageInfo.value.id}/versions`, { method: 'POST', body: { configJson: editor.toConfigJson(), remark: remark || undefined } })
    toast.success('版本已保存')
  } catch (e) { toast.error('保存版本失败: ' + (e.data?.msg || e.message)) }
  finally { saving.value = false }
}

async function publishPage() {
  publishing.value = true
  try {
    await $fetch(`/api/diy/${pageInfo.value.id}`, { method: 'PUT', body: { config_json: editor.toConfigJson() } })
    await $fetch(`/api/diy/${pageInfo.value.id}/publish`, { method: 'POST' })
    dirty.value = false
    toast.success('发布成功！访问地址：/diy/preview?slug=' + pageInfo.value.slug)
  } catch (e) { toast.error('发布失败: ' + (e.data?.msg || e.message)) }
  finally { publishing.value = false }
}

watch(showVersions, async (val) => {
  if (!val) { selectedVersions.value = []; diffResult.value = null; return }
  versionLoading.value = true
  try {
    const res: any = await $fetch(`/api/diy/${pageInfo.value.id}/versions`)
    versions.value = res?.data || []
  } catch { toast.error('加载版本历史失败') }
  versionLoading.value = false
})

function toggleVersionSelect(i: number) {
  const idx = selectedVersions.value.indexOf(i)
  if (idx >= 0) { selectedVersions.value.splice(idx, 1); diffResult.value = null }
  else if (selectedVersions.value.length < 2) { selectedVersions.value.push(i); diffResult.value = null }
  else { selectedVersions.value = [selectedVersions.value[1], i]; diffResult.value = null }
}

async function diffVersions() {
  if (selectedVersions.value.length !== 2) return
  const [a, b] = selectedVersions.value.sort((x, y) => x - y)
  try {
    const res: any = await $fetch(`/api/diy/${pageInfo.value.id}/versions/diff`, {
      method: 'POST', body: { versionA: versions.value[a].version, versionB: versions.value[b].version },
    })
    diffResult.value = res?.data?.diff || []
  } catch { toast.error('对比失败') }
}

async function rollbackVersion() {
  const idx = selectedVersions.value[0]
  const v = versions.value[idx]
  if (!confirm(`确定回滚到版本 v${v.version}？当前未保存的更改将丢失。`)) return
  try {
    const res: any = await $fetch(`/api/diy/${pageInfo.value.id}/versions/${v.version}/rollback`, { method: 'POST' })
    sections.value = res?.data?.sections || []
    dirty.value = false; showVersions.value = false; selectedVersions.value = []; diffResult.value = null
    toast.success('已回滚')
  } catch { toast.error('回滚失败') }
}

// 自动保存
const autoSave = useDiyAutoSave(
  computed(() => pageInfo.value?.id),
  () => editor.toConfigJson(),
)
autoSave.start()

onMounted(async () => {
  const id = route.query.id
  if (!id) { navigateTo('/diy'); return }
  pageInfo.value = { id: Number(id) }

  const recovered = await autoSave.checkRecovery()
  if (recovered) {
    try {
      editor.loadFromConfig(recovered.mobile_config || recovered.pc_config)
      toast.info('检测到未保存的更改，已自动恢复')
    } catch {
      toast.warn('恢复数据格式异常，已加载最新服务端版本')
      await loadPage()
    }
    return
  }
  await loadPage()
})
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
.center-canvas.canvas-pc { max-width: 960px; }
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
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-icon-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; font-size: 16px; color: var(--text-secondary); }
.btn-icon-btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-icon-btn:disabled { opacity: .3; cursor: not-allowed; }
.btn-ghost { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 13px; }

/* ── 版本历史 Modal ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 5000; display: flex; align-items: center; justify-content: center; }
.modal { background: var(--bg-card); border-radius: 12px; padding: 24px; width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); }
.v-loading, .v-empty { text-align: center; padding: 32px; color: var(--text-muted); font-size: 14px; }
.version-list { display: flex; flex-direction: column; gap: 2px; max-height: 320px; overflow-y: auto; margin-bottom: 16px; }
.version-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background .15s; border: 1px solid transparent; }
.version-item:hover { background: var(--bg-hover); }
.version-item.selected { background: var(--brand-light); border-color: var(--brand); }
.v-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); margin-top: 5px; flex-shrink: 0; }
.v-dot.latest { background: var(--success); }
.v-info { flex: 1; display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
.v-version { font-weight: 600; font-size: 13px; color: var(--text-primary); }
.v-time { font-size: 12px; color: var(--text-muted); }
.v-remark { font-size: 12px; color: var(--text-secondary); }
.v-latest-tag { padding: 0 6px; border-radius: 3px; background: var(--success); color: #fff; font-size: 10px; font-weight: 600; }
.diff-panel { border-top: 1px solid var(--border-light); padding-top: 12px; margin-bottom: 12px; }
.diff-panel h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-secondary); }
.diff-item { display: flex; gap: 8px; padding: 4px 0; font-size: 12px; }
.diff-item.added { color: var(--success); }
.diff-item.removed { color: var(--danger); }
.diff-item.modified { color: var(--warning); }
.diff-type { font-weight: 700; width: 16px; }
.modal-actions { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: 6px; background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-cancel:hover { border-color: var(--text-muted); }
</style>
