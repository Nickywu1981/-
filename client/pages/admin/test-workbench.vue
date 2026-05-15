<!--
  test-workbench.vue — AI 模型测试工作台（编排层）
  子组件: ConfigPanel / ResultPanel / HistoryPanel
-->
<template>
  <div class="test-workbench">
    <div class="tw-header">
      <h1>{{ $t('test_workbench.page_title') }}</h1>
      <p>{{ $t('test_workbench.page_subtitle') }}</p>
    </div>

    <div class="tw-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tw-tab', { active: activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <ConfigPanel
      v-model:test-category="testCategory"
      v-model:prompt="prompt"
      v-model:extra-params-str="extraParamsStr"
      v-model:single-model-key="singleModelKey"
      v-model:mixed-task-type="mixedTaskType"
      v-model:custom-parallel="customParallel"
      :active-tab="activeTab"
      :params-error="paramsError"
      :running="running"
      :can-run="canRun"
      :run-button-label="runButtonLabel"
      :categories="categories"
      :model-map="modelMap"
      :available-models="availableModels"
      :models-by-category="modelsByCategory"
      :selected-sequence="selectedSequence"
      :compare-models="compareModels"
      @toggle-model-in-sequence="toggleModelInSequence"
      @remove-from-sequence="removeFromSequence"
      @toggle-compare-model="toggleCompareModel"
      @load-prompt-template="loadPromptTemplate"
      @clear="prompt = ''"
      @execute-test="executeTest"
      @clear-result="clearResult"
    />

    <div v-if="running" class="tw-status running">
      <div class="status-bar"><div class="status-fill"></div></div>
      <span>{{ statusMessage }}</span>
    </div>

    <ResultPanel
      :last-result="lastResult"
      :running="running"
      :model-map="modelMap"
      @copy-result="copyResult"
      @rerun-last="rerunLast"
    />

    <HistoryPanel
      v-model:history-category="historyCategory"
      v-model:history-type="historyType"
      v-model:history-page="historyPage"
      :history-list="historyList"
      :history-loading="historyLoading"
      :history-page-size="historyPageSize"
      :history-total="historyTotal"
      :categories="categories"
      @load-history="loadHistory"
      @clear-history="clearHistory"
      @view-history="viewHistory"
      @delete-history-item="deleteHistoryItem"
    />
  </div>
</template>

<script setup lang="ts">
import ConfigPanel from '~/components/admin/test-workbench/ConfigPanel.vue'
import ResultPanel from '~/components/admin/test-workbench/ResultPanel.vue'
import HistoryPanel from '~/components/admin/test-workbench/HistoryPanel.vue'
import { copyToClipboard } from '@/utils/format'

const { confirm } = useConfirm()
const { t } = useI18n()
const toast = useToast()

// ---- Tab & State ----
const tabs = computed(() => [
  { key: 'single', label: t('test_workbench.tab_single') },
  { key: 'mixed', label: t('test_workbench.tab_mixed') },
  { key: 'custom', label: t('test_workbench.tab_custom') },
  { key: 'compare', label: t('test_workbench.tab_compare') },
])
const activeTab = ref('single')
const categories = computed(() => [
  { key: 'text', label: t('test_workbench.cat_text'), icon: '📝' },
  { key: 'image', label: t('test_workbench.cat_image'), icon: '🖼️' },
  { key: 'video', label: t('test_workbench.cat_video'), icon: '🎬' },
])
const testCategory = ref('image')

const prompt = ref('')
const extraParamsStr = ref('')
const paramsError = ref('')
const running = ref(false)
const statusMessage = ref('')
const lastResult = ref<any>(null)

const singleModelKey = ref('')
const mixedTaskType = ref('image_gen')
const selectedSequence = ref<string[]>([])
const customParallel = ref(false)
const compareModels = ref<string[]>([])

const modelMap = ref<Record<string, any>>({})
const allModels = ref<any[]>([])

const historyList = ref<any[]>([])
const historyLoading = ref(false)
const historyPage = ref(1)
const historyPageSize = 20
const historyTotal = ref(0)
const historyCategory = ref('')
const historyType = ref('')

// ---- Computed ----
const availableModels = computed(() =>
  allModels.value.filter(m => m.category === testCategory.value)
)

const modelsByCategory = computed(() => (cat: string) =>
  allModels.value.filter(m => m.category === cat)
)

const canRun = computed(() => {
  if (!prompt.value.trim()) return false
  if (activeTab.value === 'single') return !!singleModelKey.value
  if (activeTab.value === 'custom') return selectedSequence.value.length > 0
  if (activeTab.value === 'compare') return compareModels.value.length >= 2
  return true
})

const runButtonLabel = computed(() => {
  switch (activeTab.value) {
    case 'single': return t('test_workbench.run_single')
    case 'mixed': return t('test_workbench.run_mixed')
    case 'custom': return customParallel.value ? t('test_workbench.run_parallel') : t('test_workbench.run_serial')
    case 'compare': return t('test_workbench.run_compare')
    default: return t('test_workbench.run_default')
  }
})

// ---- Methods ----
function switchTab(key: string) {
  activeTab.value = key
  lastResult.value = null
}

function toggleModelInSequence(key: string) {
  const idx = selectedSequence.value.indexOf(key)
  if (idx >= 0) selectedSequence.value.splice(idx, 1)
  else selectedSequence.value.push(key)
}

function removeFromSequence(i: number) {
  selectedSequence.value.splice(i, 1)
}

function toggleCompareModel(key: string) {
  const idx = compareModels.value.indexOf(key)
  if (idx >= 0) compareModels.value.splice(idx, 1)
  else compareModels.value.push(key)
}

function loadPromptTemplate(type: string) {
  const templates: Record<string, string> = {
    product: '专业电商产品主图，白色背景，柔和摄影棚灯光，高分辨率，商业摄影风格',
    scene: '城市夜景，霓虹灯，雨中街道，电影感，4K画质，赛博朋克风格',
    poster: '促销海报设计，文字排版留白区，高级感配色，极简风格，电商大促氛围',
  }
  prompt.value = templates[type] || ''
}

function getExtraParams() {
  if (!extraParamsStr.value.trim()) return {}
  try {
    const parsed = JSON.parse(extraParamsStr.value)
    paramsError.value = ''
    return parsed
  } catch {
    paramsError.value = t('test_workbench.json_error')
    return {}
  }
}

async function executeTest() {
  paramsError.value = ''
  running.value = true
  statusMessage.value = t('test_workbench.calling_model')
  lastResult.value = null

  const extraParams = getExtraParams()
  if (paramsError.value) { running.value = false; return }

  let endpoint = ''
  let body: any = { category: testCategory.value, prompt: prompt.value, params: extraParams }

  switch (activeTab.value) {
    case 'single':
      endpoint = '/api/test/single'
      body.model_key = singleModelKey.value
      break
    case 'mixed':
      endpoint = '/api/test/mixed'
      body.task_type = mixedTaskType.value
      break
    case 'custom':
      endpoint = '/api/test/custom'
      body.task_type = testCategory.value + '_gen'
      body.model_sequence = [...selectedSequence.value]
      body.parallel = customParallel.value
      break
    case 'compare':
      endpoint = '/api/test/compare'
      body.model_keys = [...compareModels.value]
      break
  }

  try {
    const res: any = await $fetch(endpoint, { method: 'POST', body, credentials: 'include' })
    lastResult.value = res.data || res
    statusMessage.value = ''
    toast.success(t('test_workbench.test_complete_toast'))
    loadHistory()
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    lastResult.value = { error: e.message || t('test_workbench.request_failed'), type: activeTab.value, duration_ms: 0, created_at: new Date().toISOString() }
    toast.error(err.message || t('test_workbench.test_failed_toast'))
  } finally {
    running.value = false
  }
}

function clearResult() { lastResult.value = null }
function rerunLast() { executeTest() }

async function loadModels() {
  try {
    const res: any = await $fetch('/api/test/models', { credentials: 'include' })
    const data = res.data || res
    const flat: any[] = []
    if (data.models) {
      for (const cat of categories.value) {
        for (const m of data.models[cat.key] || []) {
          flat.push(m)
          modelMap.value[m.key] = m
        }
      }
    }
    allModels.value = flat
  } catch {
    toast.error(t('test_workbench.models_load_failed'))
    const fallback: any[] = [
      { key: 'tongyi_qwen', name: '千问 (Qwen)', category: 'text', available: true, state: 'ok', failedCount: 0 },
      { key: 'deepseek', name: 'DeepSeek', category: 'text', available: true, state: 'ok', failedCount: 0 },
      { key: 'tongyi_wanxiang', name: '通义万象', category: 'image', available: true, state: 'ok', failedCount: 0 },
      { key: 'seedance', name: 'Seedance', category: 'video', available: true, state: 'ok', failedCount: 0 },
    ]
    allModels.value = fallback
    fallback.forEach(m => { modelMap.value[m.key] = m })
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(historyPage.value))
    params.set('pageSize', String(historyPageSize))
    if (historyCategory.value) params.set('category', historyCategory.value)
    if (historyType.value) params.set('type', historyType.value)
    const res: any = await $fetch('/api/test/history?' + params.toString(), { credentials: 'include' })
    const data = res.data || res
    historyList.value = data.items || []
    historyTotal.value = data.total || 0
  } catch {
    toast.error(t('test_workbench.history_load_failed'))
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

async function deleteHistoryItem(id: string) {
  try {
    await $fetch('/api/test/history/' + id, { method: 'DELETE', credentials: 'include' })
    toast.success(t('test_workbench.deleted'))
    loadHistory()
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e.message || t('test_workbench.delete_failed'))
  }
}

async function clearHistory() {
  if (!await confirm({ message: t('test_workbench.clear_history_confirm') })) return
  try {
    await $fetch('/api/test/history', { method: 'DELETE', credentials: 'include' })
    toast.success(t('test_workbench.cleared'))
    loadHistory()
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e.message || t('test_workbench.clear_failed'))
  }
}

function viewHistory(h: any) {
  lastResult.value = h
  window.scrollTo({ top: 300, behavior: 'smooth' })
}

async function copyResult() {
  if (!lastResult.value) return
  const text = JSON.stringify(lastResult.value, null, 2)
  const ok = await copyToClipboard(text)
  if (ok) toast.success(t('test_workbench.copied'))
  else toast.error(t('test_workbench.copy_failed'))
}

onMounted(() => { loadModels(); loadHistory() })
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
.test-workbench { max-width: 1200px; margin: 0 auto; }
.tw-header h1 { font-size: 22px; margin: 0 0 4px; }
.tw-header p { color: var(--text-muted); font-size: 13px; margin: 0; }

.tw-tabs {
  display: flex; gap: 4px; margin: 20px 0 16px;
  border-bottom: 2px solid var(--border-light); padding-bottom: 0;
}
.tw-tab {
  padding: 10px 18px; font-size: 13px; border: none; background: none;
  color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: color var(--transition-fast), border-bottom-color var(--transition-fast);
}
.tw-tab:hover { color: var(--text-primary); }
.tw-tab.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }

.tw-status {
  padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px;
  display: flex; align-items: center; gap: 12px; font-size: 13px;
}
.tw-status.running { background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2); }
.status-bar { flex: 1; height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden; }
.status-fill { height: 100%; width: 60%; background: var(--brand); border-radius: 2px; animation: progress 1.5s ease-in-out infinite; }
@keyframes progress {
  0% { width: 10%; }
  50% { width: 70%; }
  100% { width: 10%; }
}

/* Shared across child components via deep selectors */
:deep(.btn-mini) {
  padding: 4px 10px; font-size: 11px; border: 1px solid var(--border-light);
  border-radius: var(--radius-sm); background: var(--bg-page); color: var(--text-secondary);
  cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast);
}
:deep(.btn-mini:hover) { border-color: var(--brand); color: var(--brand); }
:deep(.btn-mini.danger:hover) { border-color: var(--danger); color: var(--danger); }
</style>
