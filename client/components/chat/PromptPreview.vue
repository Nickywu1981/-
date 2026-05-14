<script setup lang="ts">
/** PromptPreview — 正向/反向提示词左右对比预览区 */
import { computed } from 'vue'

const props = defineProps<{
  positive: string
  negative: string
}>()

const { t } = useI18n()
const negItems = computed(() => props.negative.split(/[,，\s]+/).filter(Boolean))
</script>

<template>
  <div v-if="positive" class="pp-root">
    <div class="pp-pane pp-pos">
      <div class="pp-label pp-label-pos">{{ t('chat.positive_prompt') }}</div>
      <div class="pp-text">{{ positive }}</div>
    </div>
    <div v-if="negItems.length" class="pp-pane pp-neg">
      <div class="pp-label pp-label-neg">{{ t('chat.negative_prompt') }}</div>
      <div class="pp-text">
        <span v-for="(item, i) in negItems" :key="i" class="pp-tag">{{ item }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pp-root {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 12px 0;
  padding: 12px;
  border-radius: var(--radius-md, 8px);
  background: var(--bg-page, #f9fafb);
  border: 1px solid var(--border-light);
}
.pp-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}
.pp-label-pos { color: #16a34a; }
.pp-label-neg { color: #dc2626; }
.pp-text { font-size: 13px; color: var(--text-primary); line-height: 1.5; word-break: break-word; }
.pp-tag {
  display: inline-block;
  padding: 1px 8px;
  margin: 2px 3px;
  border-radius: 10px;
  font-size: 12px;
  background: rgba(220,38,38,0.08);
  color: #dc2626;
}
</style>
