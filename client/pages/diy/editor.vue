<template>
  <div class="diy-editor" @keydown="onKeydown" tabindex="0">
    <!-- 顶部操作栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-ghost" @click="$router.back()">{{ $t('diy.editor_back') }}</button>
        <span class="page-title">{{ pageInfo.title || $t('diy.editor_untitled') }}</span>
        <span class="page-type">({{ pageInfo.page_type }})</span>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-icon-btn" :disabled="undoStack.length === 0" @click="editor.undo(); dirty=true" :title="$t('diy.editor_undo')" :aria-label="$t('diy.editor_undo_hint')">↩</button>
        <button class="btn btn-icon-btn" :disabled="redoStack.length === 0" @click="editor.redo(); dirty=true" :title="$t('diy.editor_redo')" :aria-label="$t('diy.editor_redo_hint')">↪</button>
        <button class="btn btn-outline btn-sm" @click="previewMode = previewMode === 'mobile' ? 'pc' : 'mobile'" :title="previewMode === 'mobile' ? $t('diy.editor_preview_pc') : $t('diy.editor_preview_mobile')" :aria-label="previewMode === 'mobile' ? $t('diy.editor_preview_pc') : $t('diy.editor_preview_mobile')">
          {{ previewMode === 'mobile' ? '📱' : '🖥' }}
        </button>
        <button class="btn btn-outline" :disabled="saving" @click="saveVersion">{{ saving ? $t('diy.editor_saving') : $t('diy.editor_save_version') }}</button>
        <button class="btn btn-outline" :disabled="saving" @click="savePage">{{ saving ? $t('diy.editor_saving') : $t('diy.editor_save') }}</button>
        <button class="btn btn-outline" @click="showVersions = true">{{ $t('diy.editor_version_history') }}</button>
        <button class="btn btn-primary" @click="publishPage" :disabled="publishing">{{ $t('diy.editor_publish') }}</button>
      </div>
    </div>

    <div class="editor-body">
      <!-- 左侧：组件库 -->
      <div class="left-panel">
        <h3>{{ $t('diy.editor_component_library') }}</h3>
        <div class="component-list">
          <div v-for="cat in componentCats" :key="cat.key" class="comp-category">
            <h4>{{ cat.label }}</h4>
            <div v-for="comp in componentsByCat[cat.key]" :key="comp.component_code" class="comp-item" draggable="true" @dragstart="onDragStart($event, comp)" @dragend="dragOverIdx = -1" @dblclick="editor.addSection(comp); dirty=true" :title="comp.name + ' — ' + $t('diy.editor_dblclick_insert')">
              <span class="comp-icon">{{ comp.icon || '◆' }}</span>
              <span>{{ comp.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：画布 -->
      <div class="center-canvas" :class="{ 'canvas-pc': previewMode === 'pc' }" @dragover.prevent @drop="onDrop" @click="selectedIdxs = []">
        <div v-if="pageLoading" class="canvas-placeholder">{{ $t('common.loading') }}...</div>
        <div v-else-if="!sections.length" class="canvas-placeholder">
          {{ $t('diy.editor_canvas_placeholder') }}
        </div>
        <div v-for="(sec, idx) in sections" :key="sec.id" class="canvas-section" :class="{ selected: idx === selectedIdx }" :style="{ order: idx }" @click.stop="selectSection(idx)" draggable="true" @dragstart="onSectionDragStart($event, idx)" @dragover.prevent="onSectionDragOver($event, idx)" @drop.stop="onSectionDrop($event, idx)">
          <div class="section-toolbar">
            <span class="section-label">{{ getCompName(sec.component) }}</span>
            <div>
              <button class="btn-icon" @click.stop="moveSection(idx, -1)" :disabled="idx===0" :aria-label="$t('diy.editor_move_up')">↑</button>
              <button class="btn-icon" @click.stop="moveSection(idx, 1)" :disabled="idx===sections.length-1" :aria-label="$t('diy.editor_move_down')">↓</button>
              <button class="btn-icon btn-danger" @click.stop="removeSection(idx)" :aria-label="$t('diy.editor_delete_section')">✕</button>
            </div>
          </div>
          <div class="section-preview">
            <DiySectionPreview :section="sec" />
          </div>
        </div>
        <!-- 拖拽插入指示器 -->
        <div v-if="dragOverIdx >= 0" class="drop-indicator" :style="{ order: dragOverIdx }"></div>
      </div>

      <!-- 右侧：属性面板 + 图层面板 -->
      <div class="right-panel">
        <div class="panel-tabs">
          <button :class="{ active: rightTab === 'props' }" @click="rightTab = 'props'">{{ $t('diy.editor_tab_props') }}</button>
          <button :class="{ active: rightTab === 'layers' }" @click="rightTab = 'layers'">{{ $t('diy.editor_tab_layers') }} ({{ sections.length }})</button>
        </div>

        <!-- 属性 Tab -->
        <div v-if="rightTab === 'props' && selectedIdx >= 0 && sections[selectedIdx]">
          <h3>{{ $t('diy.editor_props_config') }}</h3>
          <div class="prop-group">
            <label>{{ $t('diy.editor_prop_component_type') }}</label>
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
          <div v-if="!sections.length" class="empty-hint">{{ $t('diy.editor_layers_empty') }}</div>
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
            <button class="layer-visibility" @click.stop="sec.visible = !sec.visible" :title="sec.visible ? $t('diy.editor_hide') : $t('diy.editor_show')">
              {{ sec.visible ? '👁' : '👁‍🗨' }}
            </button>
            <button class="layer-delete" @click.stop="removeSection(idx)" :title="$t('diy.editor_delete_layer')" :aria-label="$t('diy.editor_delete_layer_label')">✕</button>
          </div>
        </div>

        <!-- 无选中提示 -->
        <div v-if="rightTab === 'props' && (selectedIdx < 0 || !sections[selectedIdx])" class="empty-hint">
          <p>{{ $t('diy.editor_click_to_view_props') }}</p>
        </div>
      </div>
    </div>

    <!-- 版本历史 Modal -->
    <VersionHistoryModal
      v-model="showVersions"
      :versions="versions"
      :loading="versionLoading"
      :diff-result="diffResult"
      @diff="onDiffVersions"
      @rollback="onRollbackVersion"
    />
  </div>
</template>

<script setup lang="ts">

const { confirm } = useConfirm()

import { DIY_COMPONENTS, getComponentByCode } from '~/composables/useDiyComponents'
import VersionHistoryModal from '~/components/diy/VersionHistoryModal.vue'
const { t } = useI18n()


const route = useRoute()
const toast = useToast()
const editor = useDiyEditor()
const { sections, selectedIdxs, undoStack, redoStack } = editor
const previewMode = ref<'mobile' | 'pc'>('mobile')
const selectedIdx = computed(() => selectedIdxs.value[0] ?? -1)
const pageInfo = ref<any>({})
const dragOverIdx = ref(-1)
const rightTab = ref('props')
const dirty = ref(false)
const publishing = ref(false)
const saving = ref(false)
const pageLoading = ref(false)

// 双端独立配置存储
const mobileSections = ref<any[]>([])
const pcSections = ref<any[]>([])

watch(previewMode, (newMode, oldMode) => {
  if (oldMode) {
    (oldMode === 'mobile' ? mobileSections : pcSections).value = structuredClone(sections.value)
  }
  const target = (newMode === 'mobile' ? mobileSections : pcSections).value
  editor.loadFromConfig({ sections: target.length ? target : [] })
})

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
// 属性编辑 undo: 首次编辑时捕获前置状态，后续编辑 800ms 内不再重复 push
let propEditTimer: ReturnType<typeof setTimeout> | null = null
function markDirty() {
  dirty.value = true
  if (!propEditTimer) editor.pushHistory()
  if (propEditTimer) clearTimeout(propEditTimer)
  propEditTimer = setTimeout(() => { propEditTimer = null }, 800)
}

function onKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey
  const target = e.target as HTMLElement
  const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

  if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); dirty.value = true }
  else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); editor.redo(); dirty.value = true }
  else if (ctrl && e.key === 's') { e.preventDefault(); savePage() }
  else if (!inInput && ctrl && e.key === 'c') { e.preventDefault(); if (selectedIdx.value >= 0) editor.copySection(selectedIdx.value) }
  else if (!inInput && ctrl && e.key === 'v') { e.preventDefault(); editor.pasteSection(selectedIdx.value + 1); dirty.value = true }
  else if (!inInput && ctrl && e.key === 'd') { e.preventDefault(); if (selectedIdx.value >= 0) editor.duplicateSection(selectedIdx.value); dirty.value = true }
  else if (!inInput && ctrl && e.key === 'a') { e.preventDefault(); editor.selectAll() }
  else if (!inInput && e.key === 'Escape') { editor.clearSelection() }
  else if (!inInput && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); editor.removeSelected(); dirty.value = true }
  else if (!inInput && e.key === 'ArrowUp') { e.preventDefault(); if (selectedIdx.value > 0) { editor.moveSection(selectedIdx.value, -1); dirty.value = true } }
  else if (!inInput && e.key === 'ArrowDown') { e.preventDefault(); if (selectedIdx.value < sections.value.length - 1) { editor.moveSection(selectedIdx.value, 1); dirty.value = true } }
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
  pageLoading.value = true
  try {
    const res: any = await $fetch(`/api/diy/${id}`, { credentials: 'include' })
    const data = res?.data
    if (!data) { toast.error(t('common.page_data_empty')); return }
    pageInfo.value = data
    const isPC = res.data.page_type === 'pc'
    const mCfg = res.data.mobile_config || { sections: [] }
    const pCfg = res.data.pc_config || { sections: [] }
    mobileSections.value = mCfg.sections || []
    pcSections.value = pCfg.sections || []
    previewMode.value = isPC ? 'pc' : 'mobile'
    editor.loadFromConfig(isPC ? pCfg : mCfg)
  } catch { toast.error(t('common.failed_load_page')) }
  finally { pageLoading.value = false }
}

async function savePage() {
  saving.value = true
  try {
    if (previewMode.value === 'mobile') mobileSections.value = structuredClone(sections.value)
    else pcSections.value = structuredClone(sections.value)
    const body: Record<string, any> = {
      mobileConfig: { sections: mobileSections.value },
      pcConfig: { sections: pcSections.value },
    }
    await $fetch(`/api/diy/${pageInfo.value.id}`, { method: 'PUT', body, credentials: 'include' })
    dirty.value = false
    toast.success(t('common.success_save'))
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('common.failed_save') + ' : ' +  (err?.data?.msg || err.message)) }
  finally { saving.value = false }
}

async function saveVersion() {
  const remark = prompt(t('diy.editor_version_remark'))
  saving.value = true
  try {
    if (previewMode.value === 'mobile') mobileSections.value = structuredClone(sections.value)
    else pcSections.value = structuredClone(sections.value)
    const body: Record<string, any> = {
      mobileConfig: { sections: mobileSections.value },
      pcConfig: { sections: pcSections.value },
    }
    if (remark) body.remark = remark
    await $fetch(`/api/diy/${pageInfo.value.id}/versions`, { method: 'POST', body, credentials: 'include' })
    dirty.value = false
    toast.success(t('common.version_saved'))
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('common.failed_save_version') + ': ' + (err?.data?.msg || err.message)) }
  finally { saving.value = false }
}

async function publishPage() {
  publishing.value = true
  try {
    await $fetch(`/api/diy/${pageInfo.value.id}/publish`, { method: 'POST', credentials: 'include' })
    dirty.value = false
    toast.success(t('common.success_publish') + ' ' + t('common.visit_url') + ' /diy/preview?slug=' +  pageInfo.value.slug)
  } catch (e) { toast.error(t('common.failed_submit') + ' : ' +  (e?.data?.msg || e.message)) }
  finally { publishing.value = false }
}

watch(showVersions, async (val) => {
  if (!val) { diffResult.value = null; return }
  versionLoading.value = true
  try {
    const res: any = await $fetch(`/api/diy/${pageInfo.value.id}/versions`, { credentials: 'include' })
    versions.value = res?.data || []
  } catch { toast.error(t('common.failed_load_version_history')) }
  versionLoading.value = false
})

async function onDiffVersions(a: number, b: number) {
  const [vA, vB] = [a, b].sort((x, y) => x - y)
  try {
    const res: any = await $fetch(`/api/diy/${pageInfo.value.id}/versions/diff`, {
      method: 'POST', body: { versionA: versions.value[vA].version, versionB: versions.value[vB].version }, credentials: 'include',
    })
    diffResult.value = res?.data?.diff || []
  } catch { toast.error(t('common.failed_compare')) }
}

async function onRollbackVersion(idx: number) {
  const v = versions.value[idx]
  if (!await confirm({ message: t('common.confirm_rollback_version', { version: v.version }) })) return
  try {
    await $fetch(`/api/diy/${pageInfo.value.id}/versions/${v.version}/rollback`, { method: 'POST', credentials: 'include' })
    showVersions.value = false; diffResult.value = null
    await loadPage()
    dirty.value = false
    toast.success(t('common.rolled_back'))
  } catch { toast.error(t('common.failed_rollback')) }
}

// 自动保存
const autoSave = useDiyAutoSave(
  computed(() => pageInfo.value?.id),
  () => editor.toConfigJson(),
  previewMode,
)
autoSave.start()

onMounted(async () => {
  try {
    const id = route.query.id
    if (!id) { navigateTo('/diy'); return }
    const numId = Number(id)
    if (isNaN(numId)) { navigateTo('/diy'); return }
    pageInfo.value = { id: numId }

    const recovered = await autoSave.checkRecovery()
    if (recovered) {
      try {
        const isPC = pageInfo.value.page_type === 'pc'
        const config = recovered.mobile_config || recovered.pc_config || recovered.mobileConfig || recovered.pcConfig
        editor.loadFromConfig(isPC ? (recovered.pc_config || recovered.mobile_config) : (recovered.mobile_config || recovered.pc_config))
        toast.info(t('common.unsaved_changes_restored'))
      } catch {
        toast.warn(t('common.recovery_format_error'))
        await loadPage()
      }
      return
    }
    await loadPage()
  } catch (e: unknown) {
    console.error('[DIY Editor] Failed to load page:', e)
    toast.error(t('common.load_failed'))
  }
})
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
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
.section-preview { min-height: 50px; }
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
.btn-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; font-size: 16px; color: var(--text-secondary); }
.btn-icon-btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-icon-btn:disabled { opacity: .3; cursor: not-allowed; }
.btn-ghost { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 13px; }

</style>
