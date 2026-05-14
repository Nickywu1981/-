<!-- AI 助手 — 数据问答 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('ai_assistant.data.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('ai_assistant.data.subtitle') }}</p>
      </div>
    </div>

    <div class="card data-card">
      <div class="hint-row">
        <span v-for="h in hints" :key="h" class="hint-chip" @click="question = h">{{ h }}</span>
      </div>
      <div class="data-input-row">
        <input v-model="question" class="chat-input" :placeholder="$t('ai_assistant.data.placeholder')" @keyup.enter="ask" />
        <button class="btn btn-gradient btn-sm" @click="ask" :disabled="loading">{{ $t('ai_assistant.data.analyze') }}</button>
      </div>
    </div>

    <div v-if="answer" class="card data-card data-answer-card">
      <div class="answer-box">{{ answer.answer }}</div>
      <div v-if="answer.data" class="data-grid">
        <div v-for="(v, k) in answer.data" :key="k" class="data-chip">
          <span class="data-chip-label">{{ k }}</span>
          <span class="data-chip-value">{{ typeof v === 'number' ? v.toLocaleString() : v }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const { t } = useI18n()

const question = ref('')
const loading = ref(false)
const answer = ref<any>(null)
const hints = computed(() => (t('ai_assistant.data.hints') as string[]) || [])

async function ask() {
  const q = question.value.trim()
  if (!q || loading.value) return
  loading.value = true
  try {
    const res = await $fetch('/api/ai-assistant/data', { method: 'POST', credentials: 'include', body: { question: q } })
    answer.value = (res as any).data
  } catch { answer.value = { answer: t('ai_assistant.data.service_unavailable') }
  } finally { loading.value = false }
}
</script>

<style scoped>
.data-card { max-width: 700px; }
.data-answer-card { margin-top: var(--space-4); }

.data-input-row { display: flex; gap: 8px; margin-top: 12px; }
.data-input-row .chat-input { flex: 1; }

.hint-row { display: flex; gap: 8px; flex-wrap: wrap; }
.hint-chip {
  padding: 4px 12px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: background .2s;
  background: var(--brand-light, #ecf5ff);
  color: var(--color-brand-500, #409eff);
}
.hint-chip:hover { background: var(--brand-lighter, #d9ecff); }

.answer-box {
  font-size: 15px; line-height: 1.8; padding: 12px; border-radius: 8px; margin-bottom: 12px;
  background: var(--brand-lightest, #f0f9ff);
  border-left: 3px solid var(--color-brand-500, #409eff);
  color: var(--text-primary, #303133);
}

.data-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.data-chip {
  padding: 8px 14px; border-radius: 8px; text-align: center; min-width: 100px;
  background: var(--bg-hover, #f5f7fa);
}
.data-chip-label { display: block; font-size: 12px; color: var(--text-muted, #909399); margin-bottom: 2px; }
.data-chip-value { font-size: 18px; font-weight: 700; color: var(--text-primary, #303133); }

/* Dark */
:root[data-theme="dark"] .hint-chip, :root.dark .hint-chip { background: rgba(64, 158, 255, .15); }
:root[data-theme="dark"] .answer-box, :root.dark .answer-box { background: rgba(64, 158, 255, .08); }
:root[data-theme="dark"] .data-chip, :root.dark .data-chip { background: var(--bg-card, #1a1a1a); }
:root[data-theme="dark"] .data-chip-value, :root.dark .data-chip-value { color: var(--text-primary, #eee); }
</style>
