<!--
  Movio AI v5.0 — Prompt Enhancer
  内置于所有创作模块：图片/视频/文案 提示词润色
  API: POST /api/ai/enhance-prompt { prompt, type }
-->
<template>
  <div class="pe-root">
    <button class="pe-trigger" @click="toggle">
      <span class="pe-icon">✨</span>
      <span>提示词润色</span>
      <span v-if="enhancing" class="pe-spin">⏳</span>
    </button>

    <div v-if="open" class="pe-panel">
      <div class="pe-header">
        <span>✍ 润色提示词 ({{ typeLabel }})</span>
        <button class="pe-close" @click="open = false" aria-label="关闭面板">✕</button>
      </div>

      <div class="pe-body">
        <label class="pe-label">
          你的原始提示词
          <textarea
            v-model="draft"
            class="pe-textarea"
            rows="3"
            placeholder="输入你想表达的内容，AI 帮你优化成专业提示词..."
          ></textarea>
        </label>

        <div v-if="enhanced" class="pe-result">
          <div class="pe-result-header">
            <span>✨ 润色后</span>
            <button class="pe-apply" @click="apply">
              {{ applied ? '✅ 已应用' : '📥 应用' }}
            </button>
          </div>
          <div class="pe-output">{{ enhanced }}</div>
          <div class="pe-diff-hint" v-if="draft && enhanced !== draft">
            <details>
              <summary>查看对比</summary>
              <div class="pe-compare">
                <div class="pe-before"><span>润色前</span>{{ draft }}</div>
                <div class="pe-after"><span>润色后</span>{{ enhanced }}</div>
              </div>
            </details>
          </div>
        </div>

        <div class="pe-actions">
          <button class="pe-btn pe-btn-run" :disabled="enhancing || !draft.trim()" @click="run">
            {{ enhancing ? '润色中...' : '🚀 开始润色' }}
          </button>
          <button v-if="open" class="pe-btn pe-btn-ghost" @click="open = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string
  type?: 'image' | 'video' | 'detail' | 'poster' | 'social'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'enhanced', v: { original: string; enhanced: string }): void
}>()

const open = ref(false)
const draft = ref('')
const enhanced = ref('')
const applied = ref(false)
const enhancing = ref(false)

const typeLabel = computed(() => {
  const map: Record<string, string> = { image:'图片', video:'视频', detail:'详情图', poster:'海报', social:'社媒' }
  return map[props.type || 'image'] || '通用'
})

function toggle() {
  open.value = !open.value
  if (open.value) {
    draft.value = props.modelValue
    applied.value = false
    enhanced.value = ''
  }
}

// 面板打开时同步父组件更新
watch(() => props.modelValue, (val) => {
  if (open.value && !applied.value) draft.value = val
})

async function run() {
  enhancing.value = true
  try {
    const res: any = await $fetch('/api/ai/enhance-prompt', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: { prompt: draft.value, type: props.type || 'image' }
    })
    if (res.code === 200) {
      enhanced.value = res.data.enhanced_prompt
    } else {
      enhanced.value = draft.value
    }
  } catch (err: any) {
    console.warn('[PromptEnhancer] 增强失败，使用原始草稿', err?.message || err)
    enhanced.value = draft.value
  } finally {
    enhancing.value = false
  }
}

function apply() {
  emit('update:modelValue', enhanced.value)
  emit('enhanced', { original: draft.value, enhanced: enhanced.value })
  applied.value = true
}
</script>

<style scoped>
.pe-root { display: inline-flex; position: relative; }
.pe-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 6px; border: 1px dashed #90caf9;
  background: #e3f2fd; color: #1565c0; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all .15s;
}
.pe-trigger:hover { background: #bbdefb; border-color: #42a5f5; }
.pe-icon { font-size: 16px; }
.pe-spin { animation: pe-spin 1s linear infinite; }
@keyframes pe-spin { to { transform: rotate(360deg); } }

.pe-panel {
  position: absolute; top: 100%; left: 0; margin-top: 8px; z-index: 100;
  width: 420px; background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border);
  border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,.1);
}
.pe-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--cfg-border);
  font-size: 14px; font-weight: 600;
}
.pe-close { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--cfg-text-muted); }
.pe-body { padding: 16px; }
.pe-label { font-size: 12px; color: var(--cfg-text-muted); display: flex; flex-direction: column; gap: 6px; }
.pe-textarea {
  width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--cfg-border);
  font-size: 13px; resize: vertical; font-family: inherit;
}
.pe-result { margin-top: 12px; }
.pe-result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: var(--cfg-text-muted); }
.pe-apply { padding: 2px 10px; border-radius: 4px; border: 1px solid #4caf50; background: #e8f5e9; color: #2e7d32; font-size: 12px; cursor: pointer; }
.pe-output {
  padding: 10px; border-radius: 6px; background: #f5f5f5; font-size: 13px;
  line-height: 1.6; white-space: pre-wrap;
}
.pe-diff-hint { margin-top: 8px; }
.pe-diff-hint details { font-size: 12px; color: var(--cfg-text-muted); }
.pe-compare { display: flex; gap: 8px; margin-top: 6px; }
.pe-before, .pe-after { flex: 1; padding: 8px; border-radius: 4px; font-size: 12px; }
.pe-before { background: #fff3e0; border: 1px solid #ffe0b2; }
.pe-after  { background: #e8f5e9; border: 1px solid #c8e6c9; }
.pe-before > span, .pe-after > span { display: block; font-weight: 600; margin-bottom: 4px; }

.pe-actions { display: flex; gap: 8px; margin-top: 12px; }
.pe-btn { padding: 8px 16px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; font-weight: 500; }
.pe-btn-run { background: var(--cfg-primary); color: #fff; }
.pe-btn-run:disabled { opacity: .5; cursor: not-allowed; }
.pe-btn-ghost { background: transparent; color: var(--cfg-text-muted); }
</style>
