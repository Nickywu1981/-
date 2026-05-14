<template>
  <div class="tw-config">
    <!-- Category -->
    <div class="tw-row">
      <div class="tw-field">
        <label>{{ $t('test_workbench.test_category') }}</label>
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

    <!-- Custom: model sequence -->
    <div v-if="activeTab === 'custom'" class="tw-row">
      <div class="tw-field full-width">
        <label>{{ $t('test_workbench.model_sequence') }} <span class="hint">（{{ $t('test_workbench.sequence_hint') }}）</span></label>
        <div class="model-sequence">
          <div v-for="(m, i) in selectedSequence" :key="m" class="seq-chip">
            <span class="seq-num">{{ i + 1 }}</span>
            <span>{{ modelMap[m]?.name || m }}</span>
            <button class="seq-remove" :aria-label="$t('test_workbench.remove_from_seq')" @click="$emit('removeFromSequence', i)">×</button>
          </div>
          <div v-if="selectedSequence.length === 0" class="seq-empty">{{ $t('test_workbench.no_models_selected') }}</div>
        </div>
        <div class="model-pool">
          <span class="pool-label">{{ $t('test_workbench.available_models') }}</span>
          <button
            v-for="m in availableModels"
            :key="m.key"
            :class="['pool-chip', { used: selectedSequence.includes(m.key) }]"
            :disabled="!m.available"
            :title="m.available ? '' : $t('test_workbench.model_unavailable')"
            @click="$emit('toggleModelInSequence', m.key)"
          >
            {{ m.name }}
            <span v-if="!m.available" class="chip-badge">🚫</span>
            <span v-else-if="selectedSequence.includes(m.key)" class="chip-badge">✓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Custom: serial/parallel -->
    <div v-if="activeTab === 'custom'" class="tw-row">
      <div class="tw-field">
        <label>{{ $t('test_workbench.exec_mode') }}</label>
        <select v-model="customParallel" class="tw-select">
          <option :value="false">{{ $t('test_workbench.serial_desc') }}</option>
          <option :value="true">{{ $t('test_workbench.parallel_desc') }}</option>
        </select>
      </div>
    </div>

    <!-- Single: model select -->
    <div v-if="activeTab === 'single'" class="tw-row">
      <div class="tw-field">
        <label>{{ $t('test_workbench.select_model') }}</label>
        <select v-model="singleModelKey" class="tw-select">
          <option value="">{{ $t('test_workbench.select_model_placeholder') }}</option>
          <optgroup v-for="cat in categories" :key="cat.key" :label="cat.label">
            <option
              v-for="m in modelsByCategory(cat.key)"
              :key="m.key"
              :value="m.key"
              :disabled="!m.available"
            >
              {{ m.name }} {{ m.available ? '' : $t('test_workbench.unavailable') }}
            </option>
          </optgroup>
        </select>
      </div>
    </div>

    <!-- Compare: multi-select -->
    <div v-if="activeTab === 'compare'" class="tw-row">
      <div class="tw-field full-width">
        <label>{{ $t('test_workbench.compare_models') }} <span class="hint">（{{ $t('test_workbench.compare_hint') }}）</span></label>
        <div class="model-pool">
          <button
            v-for="m in availableModels"
            :key="m.key"
            :class="['pool-chip', { used: compareModels.includes(m.key) }]"
            :disabled="!m.available"
            @click="$emit('toggleCompareModel', m.key)"
          >
            {{ m.name }}
            <span v-if="!m.available" class="chip-badge">🚫</span>
            <span v-else-if="compareModels.includes(m.key)" class="chip-badge">✓</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mixed: task type -->
    <div v-if="activeTab === 'mixed'" class="tw-row">
      <div class="tw-field">
        <label>{{ $t('test_workbench.task_type_hint') }}</label>
        <input v-model="mixedTaskType" type="text" class="tw-input" :placeholder="$t('test_workbench.task_type_placeholder')" />
      </div>
    </div>

    <!-- Prompt -->
    <div class="tw-row">
      <div class="tw-field full-width">
        <label>
          {{ $t('test_workbench.prompt') }}
          <span class="prompt-actions">
            <button class="btn-mini" @click="$emit('loadPromptTemplate', 'product')">{{ $t('test_workbench.product_template') }}</button>
            <button class="btn-mini" @click="$emit('loadPromptTemplate', 'scene')">{{ $t('test_workbench.scene_template') }}</button>
            <button class="btn-mini" @click="$emit('loadPromptTemplate', 'poster')">{{ $t('test_workbench.poster_template') }}</button>
            <button class="btn-mini" @click="$emit('clear')">{{ $t('test_workbench.clear') }}</button>
          </span>
        </label>
        <textarea v-model="prompt" class="tw-textarea" rows="4" :placeholder="$t('test_workbench.prompt_placeholder')"></textarea>
        <span class="char-count">{{ prompt.length }}/5000</span>
      </div>
    </div>

    <!-- Advanced params -->
    <details class="tw-params">
      <summary>{{ $t('test_workbench.advanced_params') }}</summary>
      <textarea v-model="extraParamsStr" class="tw-textarea mono" rows="4" placeholder='{"width": 1024, "height": 1024}'></textarea>
      <span v-if="paramsError" class="param-error">{{ paramsError }}</span>
    </details>

    <!-- Run -->
    <div class="tw-actions">
      <button class="btn-run" :disabled="!canRun || running" @click="$emit('executeTest')">
        <span v-if="running" class="spinner"></span>
        <span v-else>{{ runButtonLabel }}</span>
      </button>
      <button class="btn-clear" @click="$emit('clearResult')">{{ $t('test_workbench.clear_result') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  activeTab: string
  paramsError: string
  running: boolean
  canRun: boolean
  runButtonLabel: string
  categories: Array<{ key: string; label: string; icon: string }>
  modelMap: Record<string, any>
  availableModels: any[]
  modelsByCategory: (cat: string) => any[]
  selectedSequence: string[]
  compareModels: string[]
}>(), {
  activeTab: 'text',
  paramsError: '',
  running: false,
  canRun: false,
  runButtonLabel: 'Run',
  categories: () => [],
  modelMap: () => ({}),
  availableModels: () => [],
  modelsByCategory: () => () => [],
  selectedSequence: () => [],
  compareModels: () => [],
})

defineEmits<{
  'toggleModelInSequence': [key: string]
  'removeFromSequence': [i: number]
  'toggleCompareModel': [key: string]
  'loadPromptTemplate': [type: string]
  'clear': []
  'executeTest': []
  'clearResult': []
}>()

const testCategory = defineModel<string>('testCategory', { required: true })
const prompt = defineModel<string>('prompt', { default: '' })
const extraParamsStr = defineModel<string>('extraParamsStr', { default: '' })
const singleModelKey = defineModel<string>('singleModelKey', { default: '' })
const mixedTaskType = defineModel<string>('mixedTaskType', { default: '' })
const customParallel = defineModel<boolean>('customParallel', { default: false })
</script>

<style scoped>
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
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}
.cat-btn:hover { border-color: var(--brand); }
.cat-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }

.tw-select { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-page); color: var(--text-primary); }
.tw-input { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-page); color: var(--text-primary); }
.tw-textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; font-family: inherit; background: var(--bg-page); color: var(--text-primary); resize: vertical; }
.tw-textarea.mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; }
.char-count { font-size: 11px; color: var(--text-muted); align-self: flex-end; }
.prompt-actions { margin-left: 12px; display: inline-flex; gap: 4px; }

.model-sequence { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 12px; background: var(--bg-page); border-radius: var(--radius-md); min-height: 44px; border: 1px dashed var(--border-light); align-items: center; }
.seq-empty { color: var(--text-muted); font-size: 12px; }
.seq-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--brand); color: #fff; border-radius: var(--radius-md); font-size: 12px; }
.seq-num { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.seq-remove { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 14px; padding: 0; line-height: 1; }
.seq-remove:hover { color: #fff; }

.model-pool { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 0; }
.pool-label { font-size: 12px; color: var(--text-muted); align-self: center; }
.pool-chip { padding: 5px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-page); cursor: pointer; font-size: 12px; color: var(--text-secondary); transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast); }
.pool-chip:hover:not(:disabled) { border-color: var(--brand); }
.pool-chip.used { background: var(--brand); color: #fff; border-color: var(--brand); }
.pool-chip:disabled { opacity: 0.4; cursor: not-allowed; }
.chip-badge { margin-left: 4px; font-size: 11px; }

.tw-params { margin-top: 4px; margin-bottom: 14px; }
.tw-params summary { font-size: 12px; color: var(--text-muted); cursor: pointer; }
.tw-params textarea { margin-top: 6px; }
.param-error { color: var(--danger); font-size: 12px; }

.tw-actions { display: flex; gap: 10px; }
.btn-run { padding: 10px 28px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; transition: filter var(--transition-fast); display: flex; align-items: center; gap: 8px; }
.btn-run:hover:not(:disabled) { filter: brightness(1.1); }
.btn-run:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-clear { padding: 10px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-page); color: var(--text-secondary); cursor: pointer; font-size: 13px; }
.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
