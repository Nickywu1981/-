/**
 * DIY 拖拽编辑器核心状态管理
 * 包含：undo/redo 栈、section 操作、剪贴板、选择状态、网格吸附
 */
export function useDiyEditor() {
  const sections = ref([])
  const selectedIdxs = ref([])            // 多选支持
  const clipboard = ref(null)             // 复制/粘贴
  const previewMode = ref('mobile')       // mobile | pc
  const snapEnabled = ref(true)           // 网格吸附
  const gridSize = 8

  // ── Undo / Redo ──
  const MAX_HISTORY = 60
  const undoStack = ref([])
  const redoStack = ref([])

  function pushHistory() {
    undoStack.value.push(JSON.parse(JSON.stringify(sections.value)))
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = []
  }

  function undo() {
    if (undoStack.value.length === 0) return false
    redoStack.value.push(JSON.parse(JSON.stringify(sections.value)))
    sections.value = undoStack.value.pop()
    selectedIdxs.value = []
    return true
  }

  function redo() {
    if (redoStack.value.length === 0) return false
    undoStack.value.push(JSON.parse(JSON.stringify(sections.value)))
    sections.value = redoStack.value.pop()
    selectedIdxs.value = []
    return true
  }

  // ── Section 操作 ──
  function addSection(comp, insertIdx = -1) {
    pushHistory()
    const config = JSON.parse(JSON.stringify(comp.default_config || { id: Date.now().toString(36), component: comp.component_code }))
    const section = {
      id: 's' + Date.now(),
      component: comp.component_code,
      config,
      locked: false,
      hidden: false,
      _style: {},   // 画布内联样式（圆角/阴影/间距）
    }
    const idx = insertIdx >= 0 ? insertIdx : sections.value.length
    sections.value.splice(idx, 0, section)
    selectedIdxs.value = [idx]
    return idx
  }

  function duplicateSection(idx) {
    if (idx < 0 || idx >= sections.value.length) return
    pushHistory()
    const clone = JSON.parse(JSON.stringify(sections.value[idx]))
    clone.id = 's' + Date.now()
    clone.config = { ...clone.config, id: Date.now().toString(36) }
    sections.value.splice(idx + 1, 0, clone)
    selectedIdxs.value = [idx + 1]
  }

  function removeSection(idx) {
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

  function moveSection(idx, direction) {
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

  function reorderSection(fromIdx, toIdx) {
    if (fromIdx === toIdx) return
    pushHistory()
    const item = sections.value.splice(fromIdx, 1)[0]
    sections.value.splice(toIdx, 0, item)
    selectedIdxs.value = [toIdx]
  }

  function toggleHidden(idx) {
    sections.value[idx].hidden = !sections.value[idx].hidden
  }

  function toggleLock(idx) {
    sections.value[idx].locked = !sections.value[idx].locked
  }

  function copySection(idx) {
    if (idx < 0 || idx >= sections.value.length) return
    clipboard.value = JSON.parse(JSON.stringify(sections.value[idx]))
  }

  function pasteSection(insertIdx = -1) {
    if (!clipboard.value) return
    pushHistory()
    const clone = JSON.parse(JSON.stringify(clipboard.value))
    clone.id = 's' + Date.now()
    const idx = insertIdx >= 0 ? insertIdx : sections.value.length
    sections.value.splice(idx, 0, clone)
    selectedIdxs.value = [idx]
  }

  function selectSection(idx, multi = false) {
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
  function snapToGrid(val) {
    if (!snapEnabled.value) return val
    return Math.round(val / gridSize) * gridSize
  }

  // ── 序列化 ──
  function toConfigJson() {
    return { sections: JSON.parse(JSON.stringify(sections.value)) }
  }

  function loadFromConfig(config) {
    let cfg = typeof config === 'string' ? JSON.parse(config) : config
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
