<template>
  <div class="test-workbench">
    <!-- ========== Header ========== -->
    <div class="tw-header">
      <h1>🧪 内部测试工作台</h1>
      <p>单模型测试 · 混合调度 · 自定义编排 · 模型对比 · 效果预览</p>
    </div>

    <!-- ========== 模式选择 Tabs ========== -->
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

    <!-- ========== 共享配置区 ========== -->
    <div class="tw-config">
      <div class="tw-row">
        <div class="tw-field">
          <label>测试类别</label>
          <div class="category-tabs">
            <button
              v-for="cat in categories"
              :key="cat.key"
              :class="['cat-btn', { active: testCategory === cat.key }]"
              @click="testCategory = cat.key"
            >
              {{ cat.icon }} {{ cat.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 自定义模式：模型选择器 -->
      <div v-if="activeTab === 'custom'" class="tw-row">
        <div class="tw-field full-width">
          <label>模型编排顺序 <span class="hint">（拖拽排序、单选/多选组合）</span></label>
          <div class="model-sequence">
            <div v-for="(m, i) in selectedSequence" :key="m" class="seq-chip">
              <span class="seq-num">{{ i + 1 }}</span>
              <span>{{ modelMap[m]?.name || m }}</span>
              <button class="seq-remove" @click="removeFromSequence(i)">×</button>
            </div>
            <div v-if="selectedSequence.length === 0" class="seq-empty">尚未选择模型，请从下方添加</div>
          </div>
          <div class="model-pool">
            <span class="pool-label">可选模型：</span>
            <button
              v-for="m in availableModels"
              :key="m.key"
              :class="['pool-chip', { used: selectedSequence.includes(m.key) }]"
              :disabled="!m.available"
              :title="m.available ? '' : '模型不可用'"
              @click="toggleModelInSequence(m.key)"
            >
              {{ m.name }}
              <span v-if="!m.available" class="chip-badge">🚫</span>
              <span v-else-if="selectedSequence.includes(m.key)" class="chip-badge">✓</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 自定义模式：串行/并行 -->
      <div v-if="activeTab === 'custom'" class="tw-row">
        <div class="tw-field">
          <label>执行模式</label>
          <select v-model="customParallel" class="tw-select">
            <option :value="false">🔗 串行 — 按顺序依次执行，前置结果传递给后续模型</option>
            <option :value="true">⚡ 并行 — 所有模型同时执行，汇总全部结果</option>
          </select>
        </div>
      </div>

      <!-- 单模型模式：模型选择 -->
      <div v-if="activeTab === 'single'" class="tw-row">
        <div class="tw-field">
          <label>选择模型</label>
          <select v-model="singleModelKey" class="tw-select">
            <option value="">-- 选择模型 --</option>
            <optgroup
              v-for="cat in categories"
              :key="cat.key"
              :label="cat.label"
            >
              <option
                v-for="m in modelsByCategory(cat.key)"
                :key="m.key"
                :value="m.key"
                :disabled="!m.available"
              >
                {{ m.name }} {{ m.available ? '' : '(不可用)' }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <!-- 对比模式：多选模型 -->
      <div v-if="activeTab === 'compare'" class="tw-row">
        <div class="tw-field full-width">
          <label>对比模型 <span class="hint">（至少选择2个）</span></label>
          <div class="model-pool">
            <button
              v-for="m in availableModels"
              :key="m.key"
              :class="['pool-chip', { used: compareModels.includes(m.key) }]"
              :disabled="!m.available"
              @click="toggleCompareModel(m.key)"
            >
              {{ m.name }}
              <span v-if="!m.available" class="chip-badge">🚫</span>
              <span v-else-if="compareModels.includes(m.key)" class="chip-badge">✓</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 混合模式：任务类型 -->
      <div v-if="activeTab === 'mixed'" class="tw-row">
        <div class="tw-field">
          <label>任务类型（用于自动匹配最优模型）</label>
          <input
            v-model="mixedTaskType"
            type="text"
            class="tw-input"
            placeholder="如 image_gen, video_gen, text_gen"
          />
        </div>
      </div>

      <!-- 提示词 -->
      <div class="tw-row">
        <div class="tw-field full-width">
          <label>
            提示词
            <span class="prompt-actions">
              <button class="btn-mini" @click="loadPromptTemplate('product')">📦 商品模板</button>
              <button class="btn-mini" @click="loadPromptTemplate('scene')">🎬 场景模板</button>
              <button class="btn-mini" @click="loadPromptTemplate('poster')">🎨 海报模板</button>
              <button class="btn-mini" @click="prompt = ''">🗑 清空</button>
            </span>
          </label>
          <textarea
            v-model="prompt"
            class="tw-textarea"
            rows="4"
            placeholder="输入测试提示词..."
          ></textarea>
          <span class="char-count">{{ prompt.length }}/5000</span>
        </div>
      </div>

      <!-- 额外参数 -->
      <details class="tw-params">
        <summary>⚙️ 高级参数 (JSON)</summary>
        <textarea
          v-model="extraParamsStr"
          class="tw-textarea mono"
          rows="4"
          placeholder='{"width": 1024, "height": 1024}'
        ></textarea>
        <span v-if="paramsError" class="param-error">{{ paramsError }}</span>
      </details>

      <!-- 执行按钮 -->
      <div class="tw-actions">
        <button
          class="btn-run"
          :disabled="!canRun || running"
          @click="executeTest"
        >
          <span v-if="running" class="spinner"></span>
          <span v-else>{{ runButtonLabel }}</span>
        </button>
        <button class="btn-clear" @click="clearResult">清除结果</button>
      </div>
    </div>

    <!-- ========== 执行状态 ========== -->
    <div v-if="running" class="tw-status running">
      <div class="status-bar">
        <div class="status-fill"></div>
      </div>
      <span>{{ statusMessage }}</span>
    </div>

    <!-- ========== 结果区 ========== -->
    <div v-if="lastResult && !running" class="tw-result" :class="{ error: lastResult.error }">
      <div class="result-header">
        <h3>
          <span v-if="lastResult.error">❌ 测试失败</span>
          <span v-else>✅ 测试完成</span>
          <span class="result-meta">
            {{ lastResult.type }} · {{ formatDuration(lastResult.duration_ms) }}
            · {{ formatTime(lastResult.created_at) }}
          </span>
        </h3>
        <div class="result-actions">
          <button class="btn-mini" @click="copyResult">📋 复制结果</button>
          <button class="btn-mini" @click="rerunLast">🔄 重跑</button>
        </div>
      </div>

      <!-- 对比模式：并排展示 -->
      <template v-if="lastResult.type === 'compare' && lastResult.comparisons">
        <div class="compare-grid">
          <div v-for="c in lastResult.comparisons" :key="c.model_key" class="compare-card">
            <div class="compare-label">{{ modelMap[c.model_key]?.name || c.model_key }}</div>
            <div class="compare-dur">{{ formatDuration(c.duration_ms) }}</div>
            <div v-if="c.success" class="compare-body">
              <pre class="result-json">{{ formatResult(c.result) }}</pre>
            </div>
            <div v-else class="compare-error">{{ c.error }}</div>
          </div>
        </div>
      </template>

      <!-- 自定义模式：显示编排步骤 -->
      <template v-else-if="lastResult.type === 'custom' && lastResult.steps">
        <div class="pipeline-steps">
          <div
            v-for="(step, i) in lastResult.steps"
            :key="i"
            :class="['pipeline-step', step.success ? 'step-ok' : 'step-fail']"
          >
            <div class="step-header">
              <span class="step-order">Step {{ step.order ?? Number(i) + 1 }}</span>
              <span class="step-model">{{ modelMap[step.model_key]?.name || step.model_key }}</span>
              <span class="step-dur">{{ formatDuration(step.duration_ms) }}</span>
              <span class="step-status">{{ step.success ? '✅' : '❌' }}</span>
            </div>
            <div v-if="step.success" class="step-body">
              <pre class="result-json">{{ formatResult(step.result) }}</pre>
            </div>
            <div v-else class="step-error">{{ step.error }}</div>
          </div>
        </div>
        <!-- 最终结果 -->
        <div v-if="lastResult.result" class="final-result">
          <h4>📌 最终输出</h4>
          <pre class="result-json">{{ formatResult(lastResult.result) }}</pre>
        </div>
      </template>

      <!-- 单模型 / 混合模式 -->
      <template v-else>
        <div class="result-meta-row">
          <span v-if="lastResult.model_key">模型：{{ modelMap[lastResult.model_key]?.name || lastResult.model_key }}</span>
          <span v-if="lastResult.task_type">任务：{{ lastResult.task_type }}</span>
        </div>
        <div v-if="lastResult.result" class="result-body">
          <pre class="result-json">{{ formatResult(lastResult.result) }}</pre>
        </div>
        <div v-if="lastResult.error" class="result-error-block">{{ lastResult.error }}</div>
      </template>
    </div>

    <!-- ========== 测试历史 ========== -->
    <div class="tw-history">
      <div class="history-header">
        <h3>📜 测试历史</h3>
        <div class="history-filters">
          <select v-model="historyCategory" class="tw-select-sm" @change="loadHistory()">
            <option value="">全部类别</option>
            <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
          <select v-model="historyType" class="tw-select-sm" @change="loadHistory()">
            <option value="">全部模式</option>
            <option value="single">单模型</option>
            <option value="mixed">混合</option>
            <option value="custom">自定义</option>
            <option value="compare">对比</option>
          </select>
          <button class="btn-mini danger" @click="clearHistory">🗑 清空历史</button>
        </div>
      </div>

      <div v-if="historyLoading" class="loading-box">加载中...</div>

      <div v-else-if="historyList.length === 0" class="empty-box">
        暂无测试记录，跑一次测试吧
      </div>

      <div v-else class="history-list">
        <div
          v-for="h in historyList"
          :key="h.id"
          :class="['history-item', { error: h.error }]"
          @click="viewHistory(h)"
        >
          <span class="hi-type">
            <span v-if="h.type === 'single'">🔹 单模型</span>
            <span v-else-if="h.type === 'mixed'">🔶 混合</span>
            <span v-else-if="h.type === 'custom'">🔷 自定义</span>
            <span v-else>🔄 对比</span>
          </span>
          <span class="hi-model">{{ h.model_key || h.task_type || h.model_sequence?.join(' → ') }}</span>
          <span class="hi-prompt">{{ truncate(h.prompt, 60) }}</span>
          <span class="hi-dur">{{ formatDuration(h.duration_ms) }}</span>
          <span class="hi-status">{{ h.error ? '❌' : '✅' }}</span>
          <span class="hi-time">{{ formatTime(h.created_at) }}</span>
          <button class="hi-delete" @click.stop="deleteHistoryItem(h.id)">🗑</button>
        </div>
      </div>

      <div v-if="historyTotal > historyPageSize" class="history-pagination">
        <button :disabled="historyPage <= 1" @click="historyPage--; loadHistory()">上一页</button>
        <span>{{ historyPage }} / {{ Math.ceil(historyTotal / historyPageSize) }}</span>
        <button :disabled="historyPage >= Math.ceil(historyTotal / historyPageSize)" @click="historyPage++; loadHistory()">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime, copyToClipboard, truncate } from '@/utils/format';
const formatTime = (iso: string) => iso ? formatDateTime(iso, 'HH:mm:ss') : '';
const toast = useToast()

// ---- Tab & State ----
const tabs = [
  { key: 'single', label: '🔹 单模型测试' },
  { key: 'mixed', label: '🔶 混合调度测试' },
  { key: 'custom', label: '🔷 自定义编排测试' },
  { key: 'compare', label: '🔄 模型并行对比' },
]
const activeTab = ref('single')
const categories = [
  { key: 'text', label: '文本', icon: '📝' },
  { key: 'image', label: '图片', icon: '🖼️' },
  { key: 'video', label: '视频', icon: '🎬' },
]
const testCategory = ref('image')

// Shared
const prompt = ref('')
const extraParamsStr = ref('')
const paramsError = ref('')
const running = ref(false)
const statusMessage = ref('')
const lastResult = ref<any>(null)

// Single mode
const singleModelKey = ref('')

// Mixed mode
const mixedTaskType = ref('image_gen')

// Custom mode
const selectedSequence = ref<string[]>([])
const customParallel = ref(false)

// Compare mode
const compareModels = ref<string[]>([])

// Models
const modelMap = ref<Record<string, any>>({})
const allModels = ref<any[]>([])

// History
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
  return true // mixed
})

const runButtonLabel = computed(() => {
  switch (activeTab.value) {
    case 'single': return '▶ 单模型测试'
    case 'mixed': return '▶ 混合调度测试'
    case 'custom': return customParallel.value ? '▶ 并行编排测试' : '▶ 串行编排测试'
    case 'compare': return '▶ 模型对比测试'
    default: return '▶ 执行'
  }
})

// ---- Methods ----
function switchTab(key: string) {
  activeTab.value = key
  lastResult.value = null
}

function toggleModelInSequence(key: string) {
  const idx = selectedSequence.value.indexOf(key)
  if (idx >= 0) {
    selectedSequence.value.splice(idx, 1)
  } else {
    selectedSequence.value.push(key)
  }
}

function removeFromSequence(i: number) {
  selectedSequence.value.splice(i, 1)
}

function toggleCompareModel(key: string) {
  const idx = compareModels.value.indexOf(key)
  if (idx >= 0) {
    compareModels.value.splice(idx, 1)
  } else {
    compareModels.value.push(key)
  }
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
    paramsError.value = 'JSON 格式错误'
    return {}
  }
}

async function executeTest() {
  paramsError.value = ''
  running.value = true
  statusMessage.value = '正在调用模型...'
  lastResult.value = null

  const extraParams = getExtraParams()
  if (paramsError.value) {
    running.value = false
    return
  }

  let endpoint = ''
  let body: any = {
    category: testCategory.value,
    prompt: prompt.value,
    params: extraParams,
  }

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
    const res: any = await $fetch(endpoint, {
      method: 'POST',
      body,
      credentials: 'include',
    })
    lastResult.value = res.data || res
    statusMessage.value = ''
    toast.success('测试完成')
    loadHistory()
  } catch (err: any) {
    lastResult.value = { error: err.message || '请求失败', type: activeTab.value, duration_ms: 0, created_at: new Date().toISOString() }
    toast.error(err.message || '测试失败')
  } finally {
    running.value = false
  }
}

function clearResult() {
  lastResult.value = null
}

function rerunLast() {
  executeTest()
}

async function loadModels() {
  try {
    const res: any = await $fetch('/api/test/models', { credentials: 'include' })
    const data = res.data || res
    const flat: any[] = []
    if (data.models) {
      for (const cat of categories) {
        for (const m of data.models[cat.key] || []) {
          flat.push(m)
          modelMap.value[m.key] = m
        }
      }
    }
    allModels.value = flat
  } catch {
    // fallback: use hardcoded
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
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

async function deleteHistoryItem(id: string) {
  try {
    await $fetch('/api/test/history/' + id, { method: 'DELETE', credentials: 'include' })
    toast.success('已删除')
    loadHistory()
  } catch (err: any) {
    toast.error(err.message || '删除失败')
  }
}

async function clearHistory() {
  if (!confirm('确认清空全部测试历史？')) return
  try {
    await $fetch('/api/test/history', { method: 'DELETE', credentials: 'include' })
    toast.success('已清空')
    loadHistory()
  } catch (err: any) {
    toast.error(err.message || '清空失败')
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
  if (ok) toast.success('已复制'); else toast.error('复制失败')
}

// ---- Formatting ----
function formatDuration(ms: number) {
  if (!ms) return '0ms'
  if (ms < 1000) return ms + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

function formatResult(r: any) {
  if (typeof r === 'string') return r
  return JSON.stringify(r, null, 2)
}

// ---- Init ----
onMounted(() => {
  loadModels()
  loadHistory()
})
</script>

<style scoped>
.test-workbench {
  max-width: 1200px;
  margin: 0 auto;
}

/* ---- Header ---- */
.tw-header h1 { font-size: 22px; margin: 0 0 4px; }
.tw-header p { color: var(--text-muted); font-size: 13px; margin: 0; }

/* ---- Tabs ---- */
.tw-tabs {
  display: flex; gap: 4px; margin: 20px 0 16px;
  border-bottom: 2px solid var(--border-light); padding-bottom: 0;
}
.tw-tab {
  padding: 10px 18px; font-size: 13px; border: none; background: none;
  color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all var(--transition-fast);
}
.tw-tab:hover { color: var(--text-primary); }
.tw-tab.active {
  color: var(--brand); border-bottom-color: var(--brand); font-weight: 600;
}

/* ---- Config Area ---- */
.tw-config {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px;
}
.tw-row { display: flex; gap: 16px; margin-bottom: 14px; flex-wrap: wrap; }
.tw-field { display: flex; flex-direction: column; gap: 6px; min-width: 200px; flex: 1; }
.tw-field.full-width { flex: 1 1 100%; }
.tw-field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.hint { font-weight: 400; color: var(--text-muted); font-size: 12px; }

.category-tabs { display: flex; gap: 6px; }
.cat-btn {
  padding: 7px 16px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  background: var(--bg-page); cursor: pointer; font-size: 13px; color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.cat-btn:hover { border-color: var(--brand); }
.cat-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }

.tw-select, .tw-select-sm {
  width: 100%; padding: 8px 12px; border: 1px solid var(--input-border);
  border-radius: var(--radius-md); font-size: 13px; background: var(--bg-page);
  color: var(--text-primary);
}
.tw-select-sm { width: auto; min-width: 120px; padding: 6px 10px; font-size: 12px; }

.tw-input {
  width: 100%; padding: 8px 12px; border: 1px solid var(--input-border);
  border-radius: var(--radius-md); font-size: 13px; background: var(--bg-page);
  color: var(--text-primary);
}

.tw-textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--input-border);
  border-radius: var(--radius-md); font-size: 13px; font-family: inherit;
  background: var(--bg-page); color: var(--text-primary); resize: vertical;
}
.tw-textarea.mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; }

.char-count { font-size: 11px; color: var(--text-muted); align-self: flex-end; }

.prompt-actions { margin-left: 12px; display: inline-flex; gap: 4px; }

.btn-mini {
  padding: 4px 10px; font-size: 11px; border: 1px solid var(--border-light);
  border-radius: var(--radius-sm); background: var(--bg-page); color: var(--text-secondary);
  cursor: pointer; transition: all var(--transition-fast);
}
.btn-mini:hover { border-color: var(--brand); color: var(--brand); }
.btn-mini.danger:hover { border-color: #ef4444; color: #ef4444; }

/* ---- Model Sequence ---- */
.model-sequence {
  display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 12px;
  background: var(--bg-page); border-radius: var(--radius-md); min-height: 44px;
  border: 1px dashed var(--border-light); align-items: center;
}
.seq-empty { color: var(--text-muted); font-size: 12px; }

.seq-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; background: var(--brand); color: #fff;
  border-radius: var(--radius-md); font-size: 12px;
}
.seq-num {
  width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center; font-size: 11px;
  font-weight: 700;
}
.seq-remove {
  background: none; border: none; color: rgba(255,255,255,0.7);
  cursor: pointer; font-size: 14px; padding: 0; line-height: 1;
}
.seq-remove:hover { color: #fff; }

.model-pool {
  display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 0;
}
.pool-label { font-size: 12px; color: var(--text-muted); align-self: center; }

.pool-chip {
  padding: 5px 12px; border: 1px solid var(--border-light);
  border-radius: var(--radius-md); background: var(--bg-page);
  cursor: pointer; font-size: 12px; color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.pool-chip:hover:not(:disabled) { border-color: var(--brand); }
.pool-chip.used { background: var(--brand); color: #fff; border-color: var(--brand); }
.pool-chip:disabled { opacity: 0.4; cursor: not-allowed; }
.chip-badge { margin-left: 4px; font-size: 11px; }

/* ---- Advanced Params ---- */
.tw-params {
  margin-top: 4px; margin-bottom: 14px;
}
.tw-params summary {
  font-size: 12px; color: var(--text-muted); cursor: pointer;
}
.tw-params textarea { margin-top: 6px; }
.param-error { color: #ef4444; font-size: 12px; }

/* ---- Actions ---- */
.tw-actions { display: flex; gap: 10px; }
.btn-run {
  padding: 10px 28px; background: var(--brand); color: #fff; border: none;
  border-radius: var(--radius-md); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all var(--transition-fast);
  display: flex; align-items: center; gap: 8px;
}
.btn-run:hover:not(:disabled) { filter: brightness(1.1); }
.btn-run:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-clear {
  padding: 10px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  background: var(--bg-page); color: var(--text-secondary); cursor: pointer;
  font-size: 13px;
}

.spinner {
  width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ---- Status Bar ---- */
.tw-status {
  padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px;
  display: flex; align-items: center; gap: 12px; font-size: 13px;
}
.tw-status.running {
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
}
.status-bar {
  flex: 1; height: 4px; background: var(--border-light);
  border-radius: 2px; overflow: hidden;
}
.status-fill {
  height: 100%; width: 60%; background: var(--brand);
  border-radius: 2px; animation: progress 1.5s ease-in-out infinite;
}
@keyframes progress {
  0% { width: 10%; }
  50% { width: 70%; }
  100% { width: 10%; }
}

/* ---- Result ---- */
.tw-result {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px;
}
.tw-result.error { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.03); }

.result-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.result-header h3 { font-size: 16px; margin: 0; display: flex; align-items: center; gap: 10px; }
.result-meta { font-size: 12px; color: var(--text-muted); font-weight: 400; }
.result-actions { display: flex; gap: 6px; }

.result-meta-row {
  display: flex; gap: 20px; font-size: 13px; color: var(--text-muted);
  margin-bottom: 10px;
}

.result-json {
  background: var(--bg-page); padding: 14px; border-radius: var(--radius-md);
  font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px;
  line-height: 1.6; overflow-x: auto; max-height: 500px; overflow-y: auto;
  white-space: pre-wrap; word-break: break-all; color: var(--text-primary);
}

.result-error-block {
  padding: 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--radius-md); color: #ef4444; font-size: 13px;
}

/* ---- Compare Grid ---- */
.compare-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
}
.compare-card {
  border: 1px solid var(--border-light); border-radius: var(--radius-md);
  overflow: hidden;
}
.compare-label {
  padding: 8px 12px; background: var(--bg-page); font-weight: 600; font-size: 13px;
}
.compare-dur { font-size: 11px; color: var(--text-muted); padding: 0 12px; }
.compare-body { padding: 0 12px 12px; }
.compare-body pre { max-height: 300px; margin: 0; }
.compare-error { padding: 16px; color: #ef4444; font-size: 13px; }

/* ---- Pipeline Steps ---- */
.pipeline-steps { display: flex; flex-direction: column; gap: 10px; }
.pipeline-step {
  border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden;
}
.pipeline-step.step-ok { border-left: 3px solid #22c55e; }
.pipeline-step.step-fail { border-left: 3px solid #ef4444; }
.step-header {
  display: flex; align-items: center; gap: 12px; padding: 8px 12px;
  background: var(--bg-page); font-size: 12px;
}
.step-order { font-weight: 700; color: var(--brand); }
.step-model { font-weight: 600; }
.step-dur { color: var(--text-muted); margin-left: auto; }
.step-body, .step-error { padding: 10px 12px; }
.step-body pre { max-height: 250px; margin: 0; }
.step-error { color: #ef4444; font-size: 12px; }

.final-result {
  margin-top: 14px; padding: 14px; background: rgba(124,58,237,0.05);
  border: 1px solid rgba(124,58,237,0.2); border-radius: var(--radius-md);
}
.final-result h4 { margin: 0 0 8px; font-size: 14px; }

/* ---- History ---- */
.tw-history {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); padding: 20px;
}
.history-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px; flex-wrap: wrap; gap: 10px;
}
.history-header h3 { font-size: 16px; margin: 0; }
.history-filters { display: flex; gap: 8px; align-items: center; }

.loading-box, .empty-box { text-align: center; padding: 32px; color: var(--text-muted); font-size: 13px; }

.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border: 1px solid var(--border-light); border-radius: var(--radius-md);
  cursor: pointer; transition: all var(--transition-fast);
  font-size: 12px;
}
.history-item:hover { border-color: var(--brand); background: rgba(124,58,237,0.03); }
.history-item.error { border-left: 2px solid #ef4444; }
.hi-type { min-width: 70px; }
.hi-model { font-weight: 600; min-width: 80px; }
.hi-prompt { flex: 1; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hi-dur { color: var(--text-muted); min-width: 60px; text-align: right; }
.hi-time { color: var(--text-muted); min-width: 70px; text-align: right; }
.hi-delete {
  background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0;
  transition: opacity var(--transition-fast);
}
.history-item:hover .hi-delete { opacity: 1; }

.history-pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 12px; margin-top: 14px; font-size: 13px;
}
.history-pagination button {
  padding: 6px 14px; border: 1px solid var(--border-light);
  border-radius: var(--radius-md); background: var(--bg-page);
  cursor: pointer; color: var(--text-secondary);
}
.history-pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
