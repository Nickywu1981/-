<!-- AI 助手 — FAQ 智能客服 -->
<template>
  <div class="pg ai-chat-container">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('ai_assistant.faq.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('ai_assistant.faq.subtitle') }}</p>
      </div>
    </div>

    <div class="chat-panel">
      <div class="chat-messages" ref="msgBox">
        <div v-if="messages.length === 0" class="chat-welcome">
          <p>{{ $t('ai_assistant.faq.welcome') }}</p>
          <small>{{ $t('ai_assistant.faq.welcome_hint') }}</small>
        </div>
        <div v-for="(m, i) in messages" :key="i" :class="['chat-msg', m.role]">
          <div class="chat-bubble">{{ m.content }}</div>
        </div>
      </div>
      <div class="chat-input-row">
        <input v-model="query" class="chat-input" :placeholder="$t('ai_assistant.faq.placeholder')" @keyup.enter="ask" />
        <button class="btn btn-gradient btn-sm" @click="ask" :disabled="loading">{{ $t('ai_assistant.faq.send') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const query = ref('')
const loading = ref(false)
const messages = ref<{ role: string; content: string }[]>([])

async function ask() {
  const q = query.value.trim()
  if (!q || loading.value) return
  messages.value.push({ role: 'user', content: q })
  query.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/ai-assistant/faq', { method: 'POST', body: { question: q } })
    const results = (res as any).data?.results || []
    if (results.length) {
      results.forEach((r: any) => messages.value.push({ role: 'assistant', content: `📌 ${r.question}\n\n${r.answer}` }))
    } else {
      messages.value.push({ role: 'assistant', content: t('ai_assistant.faq.no_results') })
    }
  } catch {
    messages.value.push({ role: 'assistant', content: t('ai_assistant.faq.service_unavailable') })
  } finally { loading.value = false }
}
</script>

<style scoped>
.ai-chat-container { max-width: 700px; margin: 0 auto; }
.chat-panel { border: 1px solid var(--border-color, #e4e7ed); border-radius: 12px; overflow: hidden; }
.chat-messages { min-height: 400px; max-height: 500px; overflow-y: auto; padding: 16px; background: var(--bg-input); }
.chat-welcome { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.chat-welcome p { font-size: 18px; margin: 0 0 8px; }
.chat-msg { margin-bottom: 12px; display: flex; }
.chat-msg.user { justify-content: flex-end; }
.chat-msg.user .chat-bubble { background: var(--brand); color: #fff; border-radius: 12px 12px 4px 12px; }
.chat-msg.assistant .chat-bubble { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 4px 12px 12px 12px; white-space: pre-line; }
.chat-bubble { max-width: 80%; padding: 10px 14px; font-size: 14px; line-height: 1.6; }
.chat-input-row { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--border-color, #e4e7ed); background: var(--bg-card); }
.chat-input { flex: 1; padding: 8px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; outline: none; }
.chat-input:focus { border-color: var(--brand); }
</style>
