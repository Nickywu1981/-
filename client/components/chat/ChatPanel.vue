<script setup lang="ts">
/** ChatPanel — 全局 AI 对话面板，SlidePanel 风格，内嵌完整对话交互 */
import { ref, watch, nextTick, onUnmounted } from 'vue'
import ChatMessage from './ChatMessage.vue'
import PromptPreview from './PromptPreview.vue'
import QuickCommands from './QuickCommands.vue'
import { useAIChat } from '~/composables/useAIChat'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'messageSent': []
  'notification': []
}>()

const { t } = useI18n()

const {
  messages,
  streaming,
  prompts,
  send,
  clear,
} = useAIChat()

const input = ref('')
const msgList = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const attachments = ref<Array<{ type: 'image' | 'video' | 'link', url: string, name?: string }>>([])

const scrollToBottom = () => {
  nextTick(() => {
    if (msgList.value) msgList.value.scrollTop = msgList.value.scrollHeight
  })
}

const clearAttachments = () => {
  for (const a of attachments.value) {
    if (a.url.startsWith('blob:')) URL.revokeObjectURL(a.url)
  }
  attachments.value = []
}

const removeAttachment = (i: number) => {
  const a = attachments.value[i]
  if (a && a.url.startsWith('blob:')) URL.revokeObjectURL(a.url)
  attachments.value.splice(i, 1)
}

const handleSend = async () => {
  const text = input.value.trim()
  if (!text || streaming.value) return

  input.value = ''
  await send(text, attachments.value)
  clearAttachments()
  emit('messageSent')
  scrollToBottom()
}

const handleQuickSelect = (prompt: string) => {
  input.value = prompt
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const handleFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const url = URL.createObjectURL(file)

  attachments.value.push({
    type: isImage ? 'image' : isVideo ? 'video' : 'link',
    url,
    name: file.name,
  })

  target.value = ''
}

watch(() => props.modelValue, (v) => { if (v) scrollToBottom() })
watch(() => messages.length, scrollToBottom)

onUnmounted(() => {
  clear()
  clearAttachments()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cp-overlay">
      <div v-if="modelValue" class="cp-overlay" @click.self="emit('update:modelValue', false)" />
    </Transition>
    <Transition name="cp-panel">
      <div v-if="modelValue" class="cp-panel" role="dialog" aria-modal="true" :aria-label="t('chat.panel_title')">
        <!-- Header -->
        <div class="cp-hd">
          <h3 class="cp-title">{{ t('chat.panel_title') }}</h3>
          <div class="cp-hd-actions">
            <button class="cp-btn-icon" :title="t('chat.clear')" :aria-label="t('chat.clear')" @click="clear">🗑</button>
            <button class="cp-btn-icon cp-close" :aria-label="t('chat.close')" @click="emit('update:modelValue', false)">✕</button>
          </div>
        </div>

        <!-- Quick Commands -->
        <QuickCommands @select="handleQuickSelect" />

        <!-- Messages -->
        <div ref="msgList" class="cp-msgs">
          <div v-if="messages.length === 0" class="cp-welcome">
            <div class="cp-welcome-icon">🤖</div>
            <div class="cp-welcome-title">{{ t('chat.welcome_title') }}</div>
            <div class="cp-welcome-desc">{{ t('chat.welcome_desc') }}</div>
          </div>

          <ChatMessage
            v-for="(m, i) in messages"
            :key="i"
            :role="m.role"
            :content="m.content"
            :streaming="m.streaming"
            :timestamp="m.timestamp"
          />

          <!-- Prompt Preview (shown when AI returns prompts) -->
          <PromptPreview
            v-if="prompts.positive"
            :positive="prompts.positive"
            :negative="prompts.negative"
          />

          <!-- Inline Progress -->
          <div v-if="streaming && messages[messages.length - 1]?.content === ''" class="cp-typing">
            <span class="cp-typing-dot" /><span class="cp-typing-dot" /><span class="cp-typing-dot" />
          </div>
        </div>

        <!-- Attachments Preview -->
        <div v-if="attachments.length" class="cp-attachments">
          <div v-for="(a, i) in attachments" :key="i" class="cp-attach-tag">
            <span>{{ a.type === 'image' ? '🖼' : a.type === 'video' ? '🎬' : '🔗' }}</span>
            <span class="cp-attach-name">{{ a.name || a.url.slice(0, 30) }}</span>
            <button class="cp-attach-rm" @click="removeAttachment(i)">✕</button>
          </div>
        </div>

        <!-- Input Area -->
        <div class="cp-input-area">
          <input
            ref="fileInput"
            type="file"
            accept="image/*,video/*"
            hidden
            @change="handleFileUpload"
          />
          <button class="cp-btn-icon" :aria-label="t('chat.attach')" :title="t('chat.attach')" @click="fileInput?.click()">📎</button>
          <textarea
            v-model="input"
            class="cp-input"
            :placeholder="t('chat.input_placeholder')"
            rows="1"
            :disabled="streaming"
            @keydown="handleKeydown"
          />
          <button
            class="cp-send"
            :disabled="!input.trim() || streaming"
            :aria-label="t('chat.send')"
            @click="handleSend"
          >
            {{ streaming ? '⏳' : '➤' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cp-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,0.3);
}
.cp-panel {
  position: fixed;
  top: 0; left: 260px; bottom: 0;
  width: 420px;
  z-index: 1101;
  display: flex; flex-direction: column;
  background: var(--bg-page);
  border-right: 1px solid var(--border-light);
  box-shadow: 4px 0 24px rgba(0,0,0,0.08);
}
.cp-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
}
.cp-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
.cp-hd-actions { display: flex; gap: 4px; }
.cp-btn-icon {
  width: 32px; height: 32px;
  border: none; border-radius: 6px;
  background: transparent;
  font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
}
.cp-btn-icon:hover { background: var(--bg-card); }
.cp-close { font-size: 18px; }

/* Messages */
.cp-msgs {
  flex: 1; overflow-y: auto;
  padding: 12px 16px;
}
.cp-welcome { text-align: center; padding: 32px 16px; }
.cp-welcome-icon { font-size: 40px; margin-bottom: 12px; }
.cp-welcome-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.cp-welcome-desc { font-size: 13px; color: var(--text-secondary); }

/* Typing */
.cp-typing { display: flex; gap: 4px; padding: 10px 14px; }
.cp-typing-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: cp-typing-bounce 1.4s infinite both;
}
.cp-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.cp-typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes cp-typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* Attachments */
.cp-attachments { padding: 6px 16px; display: flex; gap: 6px; flex-wrap: wrap; }
.cp-attach-tag {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--bg-card);
  font-size: 12px;
}
.cp-attach-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-attach-rm { border: none; background: none; cursor: pointer; font-size: 12px; color: var(--text-secondary); }

/* Input */
.cp-input-area {
  display: flex; align-items: flex-end; gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
}
.cp-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md, 8px);
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-page);
  outline: none;
  min-height: 38px;
  max-height: 120px;
}
.cp-input:focus { border-color: var(--brand); }
.cp-send {
  width: 38px; height: 38px;
  border: none; border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: opacity var(--transition-fast, 0.2s);
}
.cp-send:disabled { opacity: 0.4; cursor: not-allowed; }

/* Transitions */
.cp-overlay-enter-active { transition: opacity 0.2s; }
.cp-overlay-leave-active { transition: opacity 0.15s; }
.cp-overlay-enter-from, .cp-overlay-leave-to { opacity: 0; }
.cp-panel-enter-active { transition: transform 0.25s; }
.cp-panel-leave-active { transition: transform 0.2s; }
.cp-panel-enter-from { transform: translateX(-100%); }
.cp-panel-leave-to { transform: translateX(-100%); }

/* Responsive */
@media (max-width: 768px) {
  .cp-panel { left: 0; width: 100vw; }
}
</style>
