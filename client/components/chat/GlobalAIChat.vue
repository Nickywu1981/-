<script setup lang="ts">
/** GlobalAIChat — 全局 AI 对话入口按钮，左侧栏置顶，创作功能上方 */
import { ref } from 'vue'
import ChatPanel from './ChatPanel.vue'

const { t } = useI18n()

const panelOpen = ref(false)
const unread = ref(false)

const togglePanel = () => {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value) unread.value = false
}
</script>

<template>
  <div class="gac-root">
    <button
      class="gac-btn"
      :class="{ active: panelOpen, unread }"
      :aria-label="t('chat.entry_aria')"
      :title="t('chat.entry_title')"
      @click="togglePanel"
    >
      <span class="gac-icon">💬</span>
      <span class="gac-label">{{ t('chat.entry_label') }}</span>
      <span v-if="unread" class="gac-dot" aria-hidden="true" />
    </button>

    <ChatPanel
      v-model="panelOpen"
      @message-sent="unread = false"
      @notification="unread = true"
    />
  </div>
</template>

<style scoped>
.gac-root {
  padding: 0 12px;
  margin-bottom: 4px;
}
.gac-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: all var(--transition-fast, 0.2s);
  position: relative;
}
.gac-btn:hover { background: var(--brand-alpha, rgba(99,102,241,0.08)); }
.gac-btn.active { background: var(--brand-alpha, rgba(99,102,241,0.12)); color: var(--brand); }
.gac-icon { font-size: 20px; line-height: 1; }
.gac-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gac-dot {
  position: absolute;
  top: 8px; right: 8px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--danger, #ef4444);
  animation: gac-pulse 2s infinite;
}
@keyframes gac-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
