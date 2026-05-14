<script setup lang="ts">
/** QuickCommands — 快捷指令胶囊按钮组 */
import { ref } from 'vue'

const emit = defineEmits<{ select: [prompt: string] }>()

const { t } = useI18n()

const commands = ref([
  { id: 'main_image', label: t('chat.quick_main_image'), prompt: '帮我生成一张商品主图' },
  { id: 'scene', label: t('chat.quick_scene'), prompt: '把这张产品图放到使用场景中' },
  { id: 'remove_bg', label: t('chat.quick_remove_bg'), prompt: '帮我去掉背景' },
  { id: 'copywriting', label: t('chat.quick_copywriting'), prompt: '为这款产品写一段带货文案' },
  { id: 'video_clone', label: t('chat.quick_video_clone'), prompt: '分析这个爆款视频，生成复刻方案' },
  { id: 'translate', label: t('chat.quick_translate'), prompt: '翻译成英文和日文' },
])
</script>

<template>
  <div class="qc-root">
    <button
      v-for="cmd in commands"
      :key="cmd.id"
      class="qc-chip"
      @click="emit('select', cmd.prompt)"
    >
      {{ cmd.label }}
    </button>
  </div>
</template>

<style scoped>
.qc-root {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 0 8px 0;
}
.qc-chip {
  padding: 5px 12px;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
  white-space: nowrap;
}
.qc-chip:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--brand-alpha, rgba(99,102,241,0.06));
}
</style>
