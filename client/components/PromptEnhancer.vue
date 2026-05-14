<!--
  Movio AI v5.0 — Prompt Enhancer (P0 升级：自动意图识别)
  调用 POST /api/ai/gateway/pipeline/wrap 自动识别意图+封装提示词
  无需用户手动传 type 参数
-->
<template>
  <div class="pe-root">
    <button class="pe-trigger" @click="toggle" :aria-label="$t('promptEnhancer.triggerAria')">
      <span class="pe-icon">✨</span>
      <span>{{ $t('promptEnhancer.triggerLabel') }}</span>
      <span v-if="enhancing" class="pe-spin">⏳</span>
    </button>

    <div v-if="open" class="pe-panel">
      <div class="pe-header">
        <span>✍ {{ $t('promptEnhancer.panelHeader', { type: detectedLabel }) }}</span>
        <button class="pe-close" @click="open = false" :aria-label="$t('promptEnhancer.closeAria')">✕</button>
      </div>

      <div class="pe-body">
        <!-- 意图识别结果 -->
        <div v-if="intentResult" class="pe-intent-badge">
          <span class="pe-intent-icon">{{ categoryIcon }}</span>
          <span>{{ intentResult.label }}</span>
          <span class="pe-confidence">{{ Math.round(intentResult.confidence * 100) }}%</span>
        </div>

        <label class="pe-label">
          {{ $t('promptEnhancer.yourPrompt') }}
          <textarea
            v-model="draft"
            class="pe-textarea"
            rows="3"
            :placeholder="$t('promptEnhancer.promptPlaceholder')"
          ></textarea>
        </label>

        <!-- 合规警告 -->
        <div v-if="complianceWarnings.length" class="pe-compliance-warn">
          <div class="pe-comp-header">{{ $t('promptEnhancer.complianceWarnings', { n: complianceWarnings.length }) }}</div>
          <div v-for="w in complianceWarnings.slice(0, 3)" :key="w.matched" class="pe-comp-item">
            "{{ w.matched }}" — {{ w.suggestion }}
          </div>
        </div>

        <div v-if="enhanced" class="pe-result">
          <div class="pe-result-header">
            <span>{{ $t('promptEnhancer.enhancedResult') }}</span>
            <button class="pe-apply" @click="apply" :aria-label="$t('promptEnhancer.applyAria')">
              {{ applied ? $t('promptEnhancer.applied') : $t('promptEnhancer.apply') }}
            </button>
          </div>
          <div class="pe-output">{{ enhanced }}</div>
          <div class="pe-diff-hint" v-if="draft && enhanced !== draft">
            <details>
              <summary>{{ $t('promptEnhancer.compare') }}</summary>
              <div class="pe-compare">
                <div class="pe-before"><span>{{ $t('promptEnhancer.beforeEnhance') }}</span>{{ draft }}</div>
                <div class="pe-after"><span>{{ $t('promptEnhancer.afterEnhance') }}</span>{{ enhanced }}</div>
              </div>
            </details>
          </div>
        </div>

        <div class="pe-actions">
          <button class="pe-btn pe-btn-run" :disabled="enhancing || !draft.trim()" @click="run" :aria-label="$t('promptEnhancer.startEnhanceAria')">
            {{ enhancing ? $t('promptEnhancer.enhancing') : $t('promptEnhancer.startEnhance') }}
          </button>
          <button v-if="open" class="pe-btn pe-btn-ghost" @click="open = false" :aria-label="$t('promptEnhancer.closeAria')">{{ $t('promptEnhancer.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'enhanced', v: { original: string; enhanced: string; intent?: string }): void
}>()

const open = ref(false)
const draft = ref('')
const enhanced = ref('')
const applied = ref(false)
const enhancing = ref(false)

// 管线自动识别结果
const intentResult = ref<{ intentId: string; category: string; label: string; confidence: number } | null>(null)
const complianceWarnings = ref<Array<{ matched: string; suggestion: string }>>([])

const categoryIcon = computed(() => {
  const map: Record<string, string> = { image: '🖼', detail: '📄', video: '🎬', text: '📝', voice: '🔊' }
  return map[intentResult.value?.category || ''] || '🤖'
})

const detectedLabel = computed(() => intentResult.value?.label || t('promptEnhancer.typeGeneric'))

function toggle() {
  open.value = !open.value
  if (open.value) {
    draft.value = props.modelValue
    applied.value = false
    enhanced.value = ''
    intentResult.value = null
    complianceWarnings.value = []
  }
}

watch(() => props.modelValue, (val) => {
  if (open.value && !applied.value) draft.value = val
})

async function run() {
  enhancing.value = true
  try {
    // 调用新管线: 自动意图识别 + 合规校验 + 提示词封装
    const res = await $fetch<{
      code: number
      data: {
        blocked: boolean
        blockReason?: string
        intent: { intentId: string; category: string; label: string; confidence: number }
        compliance: { passed: boolean; violations: Array<{ matched: string; action: string; suggestion: string }> }
        wrapped: { system: string; prompt: string; intentId: string; category: string }
      }
    }>('/api/ai/gateway/pipeline/wrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: { input: draft.value, platform: 'taobao' },
    })

    if (res.code === 200 && res.data) {
      intentResult.value = res.data.intent
      complianceWarnings.value = (res.data.compliance?.violations || [])
        .filter((v: { action: string }) => v.action === 'warn')

      if (res.data.blocked) {
        enhanced.value = draft.value
        if (import.meta.dev) console.warn('[PromptEnhancer] 合规拦截:', res.data.blockReason)
      } else if (res.data.wrapped) {
        enhanced.value = res.data.wrapped.prompt
      } else {
        enhanced.value = draft.value
      }
    } else {
      enhanced.value = draft.value
    }
  } catch (err: unknown) {
    const e = err as { message?: string }
    if (import.meta.dev) console.warn('[PromptEnhancer] 增强失败，使用原始草稿', e?.message || err)
    enhanced.value = draft.value
  } finally {
    enhancing.value = false
  }
}

function apply() {
  emit('update:modelValue', enhanced.value)
  emit('enhanced', {
    original: draft.value,
    enhanced: enhanced.value,
    intent: intentResult.value?.intentId,
  })
  applied.value = true
}
</script>

<style scoped>
.pe-root { display: inline-flex; position: relative; }
.pe-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 6px; border: 1px dashed var(--brand, #90caf9);
  background: var(--brand-light, #e3f2fd); color: var(--brand, #1565c0); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background .15s, border-color .15s;
}
.pe-trigger:hover { background: var(--brand-lighter, #bbdefb); border-color: var(--brand, #42a5f5); }
[data-theme="dark"] .pe-trigger { background: rgba(91,95,227,.12); color: #a5b4fc; border-color: rgba(91,95,227,.3); }
[data-theme="dark"] .pe-trigger:hover { background: rgba(91,95,227,.2); }
.pe-icon { font-size: 16px; }
.pe-spin { animation: pe-spin 1s linear infinite; }
@keyframes pe-spin { to { transform: rotate(360deg); } }

.pe-panel {
  position: absolute; top: 100%; left: 0; margin-top: 8px; z-index: 100;
  width: 460px; background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border);
  border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,.1);
}
.pe-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--cfg-border);
  font-size: 14px; font-weight: 600;
}
.pe-close { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--cfg-text-muted); }
.pe-body { padding: 16px; }

/* 意图识别 badge */
.pe-intent-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 20px; margin-bottom: 10px;
  background: var(--brand-light, #e8f0fe); font-size: 12px; font-weight: 500;
}
.pe-intent-icon { font-size: 14px; }
.pe-confidence { color: var(--cfg-text-muted); font-size: 11px; }
[data-theme="dark"] .pe-intent-badge { background: rgba(91,95,227,.15); }

/* 合规警告 */
.pe-compliance-warn {
  margin-top: 8px; padding: 10px 12px; border-radius: 6px;
  background: var(--warning-light, #fff8e1); border: 1px solid var(--warning-border, #ffecb3);
  font-size: 12px;
}
.pe-comp-header { font-weight: 600; margin-bottom: 4px; color: var(--warning, #f57c00); }
.pe-comp-item { padding: 2px 0; color: var(--cfg-text-secondary); }
[data-theme="dark"] .pe-compliance-warn { background: rgba(234,179,8,.1); border-color: rgba(234,179,8,.2); }

.pe-label { font-size: 12px; color: var(--cfg-text-muted); display: flex; flex-direction: column; gap: 6px; }
.pe-textarea {
  width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--cfg-border);
  font-size: 13px; resize: vertical; font-family: inherit;
}
.pe-result { margin-top: 12px; }
.pe-result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: var(--cfg-text-muted); }
.pe-apply { padding: 2px 10px; border-radius: 4px; border: 1px solid var(--success, #4caf50); background: var(--success-light, #e8f5e9); color: var(--success, #2e7d32); font-size: 12px; cursor: pointer; }
.pe-output {
  padding: 10px; border-radius: 6px; background: var(--bg-card, #f5f5f5); font-size: 13px;
  line-height: 1.6; white-space: pre-wrap;
}
[data-theme="dark"] .pe-output { background: var(--bg-card, #1e1e1e); }
.pe-diff-hint { margin-top: 8px; }
.pe-diff-hint details { font-size: 12px; color: var(--cfg-text-muted); }
.pe-compare { display: flex; gap: 8px; margin-top: 6px; }
.pe-before, .pe-after { flex: 1; padding: 8px; border-radius: 4px; font-size: 12px; }
.pe-before { background: var(--warning-light, #fff3e0); border: 1px solid var(--warning-border, #ffe0b2); }
.pe-after  { background: var(--success-light, #e8f5e9); border: 1px solid var(--success-border, #c8e6c9); }
[data-theme="dark"] .pe-before { background: rgba(234,179,8,.1); border-color: rgba(234,179,8,.25); }
[data-theme="dark"] .pe-after { background: rgba(34,197,94,.1); border-color: rgba(34,197,94,.25); }
.pe-before > span, .pe-after > span { display: block; font-weight: 600; margin-bottom: 4px; }

.pe-actions { display: flex; gap: 8px; margin-top: 12px; }
.pe-btn { padding: 8px 16px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; font-weight: 500; }
.pe-btn-run { background: var(--cfg-primary); color: #fff; }
.pe-btn-run:disabled { opacity: .5; cursor: not-allowed; }
.pe-btn-ghost { background: transparent; color: var(--cfg-text-muted); }
</style>
