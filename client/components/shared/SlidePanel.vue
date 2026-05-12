<!--
  Movio AI v8.0 — SlidePanel
  右侧滑出弹窗，统一承载：参数设置 / 生成进度 / 结果展示
  上传和文案输入由父组件 (creation.vue) 统一管理，不在弹窗内重复
-->
<template>
  <Teleport to="body">
    <Transition name="sp-overlay">
      <div v-if="modelValue" class="sp-overlay" @click.self="emit('update:modelValue', false)" />
    </Transition>
    <Transition name="sp-panel">
      <div v-if="modelValue" class="sp-panel" role="dialog" aria-modal="true" :aria-label="title">
        <!-- Header -->
        <div class="sp-hd">
          <h3 class="sp-title">{{ title }}</h3>
          <button class="sp-close" @click="emit('update:modelValue', false)" :aria-label="t('workspace.panel.close')">✕</button>
        </div>

        <!-- Content -->
        <div class="sp-body">
          <!-- Uploaded files summary (passed from parent) -->
          <div v-if="uploadedFiles.length" class="sp-file-summary">
            <span class="sp-file-label">📎 已上传 {{ uploadedFiles.length }} 个文件</span>
            <span v-for="(f, i) in uploadedFiles" :key="i" class="sp-file-tag">{{ f.name }}</span>
          </div>

          <!-- Prompt preview (from parent) -->
          <div v-if="promptText" class="sp-prompt-preview">
            <span class="sp-prompt-label">📝</span>
            <span class="sp-prompt-text">{{ promptText }}</span>
          </div>

          <!-- Params -->
          <div v-if="showParams && params.length" class="sp-params">
            <span class="sp-params-label">{{ t('workspace.panel.params_label') }}</span>
            <div class="sp-param-row">
              <select v-for="(p, i) in params" :key="i" class="sp-sel" v-model="selectedParams[p.key]">
                <option v-for="(o, j) in p.options" :key="j" :value="o">{{ o }}</option>
              </select>
            </div>
          </div>

          <!-- Generate Button -->
          <button v-if="showGenerate" class="sp-gen" @click="handleGenerate">
            {{ t('workspace.panel.generate') }}
          </button>

          <!-- Progress -->
          <div v-if="generating" class="sp-progress-area">
            <div class="sp-progress-bar">
              <div class="sp-progress-fill" :style="{ width: progress + '%' }" />
            </div>
            <div class="sp-progress-text">{{ t('workspace.panel.generating', { progress }) }}</div>
            <div class="sp-steps">
              <div class="sp-step" :class="{ done: progress >= 25 }">{{ t('workspace.panel.step_upload') }}</div>
              <div class="sp-step" :class="{ done: progress >= 50 }">{{ t('workspace.panel.step_analyze') }}</div>
              <div class="sp-step" :class="{ done: progress >= 75 }">{{ t('workspace.panel.step_generate') }}</div>
              <div class="sp-step" :class="{ done: progress >= 100 }">{{ t('workspace.panel.step_done') }}</div>
            </div>
          </div>

          <!-- Result -->
          <div v-if="showResult && !generating" class="sp-result">
            <div class="sp-result-preview">
              <div class="sp-result-placeholder">🖼️</div>
            </div>
            <div class="sp-result-info">
              <div class="sp-result-name">{{ t('workspace.panel.result_name') }}</div>
              <div v-if="resultMeta" class="sp-result-meta">{{ resultMeta }}</div>
            </div>
            <div class="sp-result-actions">
              <button class="sp-result-btn primary" @click="emit('download')">{{ t('workspace.panel.download') }}</button>
              <button class="sp-result-btn" @click="handleReuse">{{ t('workspace.panel.reuse') }}</button>
              <button class="sp-result-btn" @click="emit('update:modelValue', false)">{{ t('workspace.panel.close_btn') }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  showParams?: boolean
  showGenerate?: boolean
  params?: { key: string; label: string; options: string[] }[]
  uploadedFiles?: { name: string }[]
  promptText?: string
  resultMeta?: string
}>(), {
  title: '',
  showParams: false,
  showGenerate: false,
  params: () => [],
  uploadedFiles: () => [],
  promptText: '',
  resultMeta: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'generate': [params: Record<string, string>]
  'download': []
  'reuse': []
}>()

const generating = ref(false)
const showResult = ref(false)
const progress = ref(0)
const selectedParams = ref<Record<string, string>>({})

async function handleGenerate() {
  generating.value = true
  showResult.value = false
  progress.value = 0
  emit('generate', { ...selectedParams.value })
  await simulateProgress()
  generating.value = false
  showResult.value = true
}

async function simulateProgress() {
  return new Promise<void>(resolve => {
    const iv = setInterval(() => {
      progress.value += Math.random() * 12 + 8
      if (progress.value >= 100) { progress.value = 100; clearInterval(iv); resolve() }
    }, 400)
  })
}

function handleReuse() {
  showResult.value = false
  generating.value = false
  progress.value = 0
  selectedParams.value = {}
  emit('reuse')
}

watch(() => props.modelValue, (val) => {
  if (!val) {
    setTimeout(() => {
      generating.value = false
      showResult.value = false
      progress.value = 0
      selectedParams.value = {}
    }, 300)
  }
})
</script>

<style scoped>
.sp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 200; }
.sp-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: 480px; max-width: 100vw;
  background: #fff; z-index: 201; display: flex; flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,0.12);
}

.sp-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-bottom: 1px solid #ebebea; flex-shrink: 0;
}
.sp-title { font-size: 16px; font-weight: 600; color: #171717; margin: 0; }
.sp-close {
  width: 32px; height: 32px; border: none; background: none; font-size: 18px;
  color: #999; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center;
}
.sp-close:hover { background: #f5f5f5; color: #171717; }

.sp-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 18px; }

/* File summary */
.sp-file-summary { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 10px 14px; background: #fafaf9; border-radius: 8px; border: 1px solid #ebebea; }
.sp-file-label { font-size: 12px; color: #6b6b70; font-weight: 500; }
.sp-file-tag { background: #f5f3ff; color: #5b5fe3; padding: 2px 8px; border-radius: 5px; font-size: 11px; }

/* Prompt preview */
.sp-prompt-preview { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; background: #fafaf9; border-radius: 8px; border: 1px solid #ebebea; }
.sp-prompt-label { font-size: 14px; flex-shrink: 0; }
.sp-prompt-text { font-size: 13px; color: #6b6b70; line-height: 1.5; word-break: break-word; }

/* Params */
.sp-params { display: flex; flex-direction: column; gap: 8px; }
.sp-params-label { font-size: 12px; color: #999; font-weight: 500; letter-spacing: .3px; }
.sp-param-row { display: flex; gap: 8px; flex-wrap: wrap; }
.sp-sel {
  background: #f5f5f4; border: 1px solid #ebebea; border-radius: 7px; padding: 7px 26px 7px 10px;
  font-size: 13px; color: #555; cursor: pointer; outline: none; font-family: inherit;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 8px center;
}
.sp-sel:focus { border-color: #5b5fe3; }

/* Generate Button */
.sp-gen {
  width: 100%; padding: 14px; border: none; border-radius: 10px;
  background: #5b5fe3; color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.sp-gen:hover { background: #4a4ed6; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(91,95,227,.3); }

/* Progress */
.sp-progress-area { display: flex; flex-direction: column; gap: 12px; }
.sp-progress-bar { height: 6px; background: #f0f0ef; border-radius: 3px; overflow: hidden; }
.sp-progress-fill { height: 100%; background: #5b5fe3; border-radius: 3px; transition: width .3s; }
.sp-progress-text { font-size: 13px; color: #5b5fe3; font-weight: 500; text-align: center; }
.sp-steps { display: flex; justify-content: space-between; }
.sp-step { font-size: 11px; color: #ccc; position: relative; padding-top: 8px; }
.sp-step.done { color: #5b5fe3; font-weight: 500; }

/* Result */
.sp-result { display: flex; flex-direction: column; gap: 16px; }
.sp-result-preview {
  aspect-ratio: 9/16; max-height: 360px; background: #f5f5f4; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.sp-result-placeholder { font-size: 48px; }
.sp-result-name { font-size: 14px; font-weight: 600; color: #171717; }
.sp-result-meta { font-size: 12px; color: #999; margin-top: 4px; }
.sp-result-actions { display: flex; gap: 8px; }
.sp-result-btn {
  flex: 1; padding: 12px; border-radius: 9px; font-size: 13px; font-weight: 500;
  border: 1px solid #ebebea; background: #fff; color: #6b6b70; cursor: pointer; font-family: inherit;
}
.sp-result-btn.primary { background: #5b5fe3; color: #fff; border-color: #5b5fe3; }
.sp-result-btn:hover { opacity: .85; }

/* Transitions */
.sp-overlay-enter-active, .sp-overlay-leave-active { transition: opacity .3s; }
.sp-overlay-enter-from, .sp-overlay-leave-to { opacity: 0; }
.sp-panel-enter-active, .sp-panel-leave-active { transition: transform .3s cubic-bezier(.22,1,.36,1); }
.sp-panel-enter-from, .sp-panel-leave-to { transform: translateX(100%); }

/* Dark */
:root[data-theme="dark"] .sp-panel, :root.dark .sp-panel { background: #1a1a1a; }
:root[data-theme="dark"] .sp-hd, :root.dark .sp-hd { border-color: #2a2a2a; }
:root[data-theme="dark"] .sp-title, :root.dark .sp-title { color: #eee; }
:root[data-theme="dark"] .sp-file-summary, :root.dark .sp-file-summary,
:root[data-theme="dark"] .sp-prompt-preview, :root.dark .sp-prompt-preview { background: #222; border-color: #2a2a2a; color: #bbb; }
:root[data-theme="dark"] .sp-sel, :root.dark .sp-sel { background: #222; color: #ccc; border-color: #2a2a2a; }
:root[data-theme="dark"] .sp-result-preview, :root.dark .sp-result-preview { background: #222; }

/* Responsive */
@media (max-width: 520px) {
  .sp-panel { width: 100vw; }
}
</style>
