/**
 * DIY 拖拽编辑器核心状态管理 (TypeScript)
 * 包含：undo/redo 栈、section 操作、剪贴板、选择状态、网格吸附
 */
import type { DiySection, DiyComponent } from '~/types/diy'

export function useDiyEditor() {
  const sections = ref<DiySection[]>([])
  const selectedIdxs = ref<number[]>([])
  const clipboard = ref<DiySection | null>(null)
  const previewMode = ref<'mobile' | 'pc'>('mobile')
  const snapEnabled = ref(true)
  const gridSize = 8

  // ── Undo / Redo ──
  const MAX_HISTORY = 60
  const undoStack = ref<DiySection[][]>([])
  const redoStack = ref<DiySection[][]>([])

  function pushHistory() {
    undoStack.value.push(structuredClone(sections.value))
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = []
  }

  function undo(): boolean {
    if (undoStack.value.length === 0) return false
    redoStack.value.push(structuredClone(sections.value))
    sections.value = undoStack.value.pop()!
    selectedIdxs.value = []
    return true
  }

  function redo(): boolean {
    if (redoStack.value.length === 0) return false
    undoStack.value.push(structuredClone(sections.value))
    sections.value = redoStack.value.pop()!
    selectedIdxs.value = []
    return true
  }

  // ── Section 操作 ──
  function addSection(comp: DiyComponent, insertIdx = -1): number {
    pushHistory()
    const config = structuredClone(comp.default_config || {})
    config.id = Date.now().toString(36)
    const section: DiySection = {
      id: 's' + Date.now(),
      component: comp.component_code,
      config,
      locked: false,
      hidden: false,
      _style: {},
    }
    const idx = insertIdx >= 0 ? insertIdx : sections.value.length
    sections.value.splice(idx, 0, section)
    selectedIdxs.value = [idx]
    return idx
  }

  function duplicateSection(idx: number) {
    if (idx < 0 || idx >= sections.value.length) return
    pushHistory()
    const clone = structuredClone(sections.value[idx])
    clone.id = 's' + Date.now()
    clone.config.id = Date.now().toString(36)
    sections.value.splice(idx + 1, 0, clone)
    selectedIdxs.value = [idx + 1]
  }

  function removeSection(idx: number) {
    if (idx < 0 || idx >= sections.value.length) return
    pushHistory()
    sections.value.splice(idx, 1)
    selectedIdxs.value = selectedIdxs.value.filter(i => i !== idx).map(i => i > idx ? i - 1 : i)
  }

  function removeSelected() {
    pushHistory()
    const sorted = [...selectedIdxs.value].sort((a, b) => b - a)
    sorted.forEach(i => sections.value.splice(i, 1))
    selectedIdxs.value = []
  }

  function moveSection(idx: number, direction: number) {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= sections.value.length) return
    pushHistory()
    const tmp = sections.value[newIdx]
    sections.value[newIdx] = sections.value[idx]
    sections.value[idx] = tmp
    const selSet = new Set(selectedIdxs.value)
    if (selSet.has(idx)) {
      selSet.delete(idx)
      selSet.add(newIdx)
      selectedIdxs.value = [...selSet]
    }
  }

  function reorderSection(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    pushHistory()
    const item = sections.value.splice(fromIdx, 1)[0]
    sections.value.splice(toIdx, 0, item)
    selectedIdxs.value = [toIdx]
  }

  function toggleHidden(idx: number) {
    sections.value[idx].hidden = !sections.value[idx].hidden
  }

  function toggleLock(idx: number) {
    sections.value[idx].locked = !sections.value[idx].locked
  }

  function copySection(idx: number) {
    if (idx < 0 || idx >= sections.value.length) return
    clipboard.value = structuredClone(sections.value[idx])
  }

  function pasteSection(insertIdx = -1) {
    if (!clipboard.value) return
    pushHistory()
    const clone = structuredClone(clipboard.value)
    clone.id = 's' + Date.now()
    const idx = insertIdx >= 0 ? insertIdx : sections.value.length
    sections.value.splice(idx, 0, clone)
    selectedIdxs.value = [idx]
  }

  function selectSection(idx: number, multi = false) {
    if (multi) {
      const pos = selectedIdxs.value.indexOf(idx)
      if (pos >= 0) selectedIdxs.value.splice(pos, 1)
      else selectedIdxs.value.push(idx)
    } else {
      selectedIdxs.value = selectedIdxs.value.includes(idx) && selectedIdxs.value.length === 1 ? [] : [idx]
    }
  }

  function clearSelection() { selectedIdxs.value = [] }
  function selectAll() { selectedIdxs.value = sections.value.map((_, i) => i) }

  // ── 网格吸附 ──
  function snapToGrid(val: number): number {
    if (!snapEnabled.value) return val
    return Math.round(val / gridSize) * gridSize
  }

  // ── 序列化 ──
  function toConfigJson(): { sections: DiySection[] } {
    return { sections: structuredClone(sections.value) }
  }

  function loadFromConfig(config: string | { sections?: DiySection[] }) {
    let cfg: any = config
    if (typeof config === 'string') { try { cfg = JSON.parse(config) } catch { return } }
    sections.value = (cfg?.sections || []).map(s => ({
      ...s,
      locked: s.locked ?? false,
      hidden: s.hidden ?? false,
      _style: s._style || {},
    }))
    undoStack.value = []
    redoStack.value = []
    selectedIdxs.value = []
  }

  return {
    sections, selectedIdxs, clipboard, previewMode, snapEnabled,
    undoStack, redoStack, MAX_HISTORY,
    addSection, duplicateSection, removeSection, removeSelected, moveSection, reorderSection,
    toggleHidden, toggleLock, copySection, pasteSection,
    selectSection, clearSelection, selectAll,
    undo, redo, pushHistory,
    snapToGrid, toConfigJson, loadFromConfig,
  }
}
