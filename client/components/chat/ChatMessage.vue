<script setup lang="ts">
/** ChatMessage — 对话消息气泡组件，用户/AI 双态 + 流式打字动画 */
import { computed } from 'vue'

const props = defineProps<{
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming?: boolean
  timestamp?: string
}>()

const isUser = computed(() => props.role === 'user')
const timeStr = computed(() => {
  if (!props.timestamp) return ''
  return new Date(props.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="cm-row" :class="isUser ? 'cm--user' : 'cm--ai'">
    <div class="cm-avatar" :aria-label="isUser ? 'You' : 'Movio AI'">
      {{ isUser ? '👤' : '🤖' }}
    </div>
    <div class="cm-body">
      <div class="cm-bubble" :class="{ streaming }">
        <span v-if="content">{{ content }}</span>
        <span v-else-if="streaming" class="cm-cursor" aria-label="AI is typing">|</span>
        <span v-else class="cm-empty">...</span>
      </div>
      <div v-if="timeStr" class="cm-time">{{ timeStr }}</div>
    </div>
  </div>
</template>

<style scoped>
.cm-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  align-items: flex-start;
}
.cm--user { flex-direction: row-reverse; }
.cm-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: var(--bg-card);
}
.cm-body { max-width: 80%; }
.cm--user .cm-body { text-align: right; }
.cm-bubble {
  padding: 10px 14px;
  border-radius: var(--radius-lg, 12px);
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}
.cm--ai .cm-bubble { background: var(--bg-card); color: var(--text-primary); border-bottom-left-radius: 4px; }
.cm--user .cm-bubble { background: var(--brand); color: #fff; border-bottom-right-radius: 4px; }
.cm-bubble.streaming .cm-cursor {
  animation: cm-blink 1s infinite;
  font-weight: 700;
}
@keyframes cm-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.cm-time { font-size: 11px; color: var(--text-secondary); margin-top: 3px; }
</style>
