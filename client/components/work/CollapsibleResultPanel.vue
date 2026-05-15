<!-- CollapsibleResultPanel — 右侧可折叠结果预览面板 -->
<template>
  <div class="crp-root" :class="{ collapsed: !expanded }">
    <button class="crp-toggle" :aria-label="expanded ? t('result.collapse') : t('result.expand')" @click="toggle">
      <span class="crp-toggle-icon">{{ expanded ? '▶' : '◀' }}</span>
      <span v-if="!expanded && hasResults" class="crp-toggle-dot" />
    </button>

    <Transition name="crp-slide">
      <div v-if="expanded" class="crp-panel">
        <div class="crp-hd">
          <h4 class="crp-title">{{ title || t('result.title') }}</h4>
          <button class="crp-close" :aria-label="t('result.collapse')" @click="expanded = false">✕</button>
        </div>
        <div class="crp-bd">
          <slot />
          <div v-if="!hasResults" class="crp-empty">{{ t('result.empty') }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  title?: string
  hasResults?: boolean
  autoExpand?: boolean
  persistKey?: string
}>()

const { t } = useI18n()

const expanded = ref(false)

// 恢复上次状态
onMounted(() => {
  if (props.persistKey) {
    const saved = localStorage.getItem(`crp_${props.persistKey}`)
    if (saved !== null) expanded.value = saved === '1'
  }
})

// 自动展开：有新结果时弹出
watch(() => props.hasResults, (v) => {
  if (v && props.autoExpand !== false) expanded.value = true
})

function toggle() {
  expanded.value = !expanded.value
  if (props.persistKey) {
    localStorage.setItem(`crp_${props.persistKey}`, expanded.value ? '1' : '0')
  }
}
</script>

<style scoped>
.crp-root {
  position: fixed; right: 0; top: 0; bottom: 0; z-index: 2000;
  display: flex; flex-direction: row;
}
.crp-root.collapsed { right: auto; }

.crp-toggle {
  width: 28px; height: 64px;
  margin-top: 50vh; transform: translateY(-50%);
  border: 1px solid var(--border, #e5e5e5); border-right: none;
  border-radius: 8px 0 0 8px;
  background: var(--bg-card); color: var(--text-secondary);
  font-size: 10px; cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  position: relative; flex-shrink: 0; transition: background .15s;
}
.crp-toggle:hover { background: var(--bg-hover); color: var(--brand); }
.crp-toggle-dot {
  position: absolute; top: 8px; right: 4px;
  width: 7px; height: 7px; border-radius: 50%; background: #ef4444;
}

.crp-panel {
  width: 380px; background: var(--bg-page);
  border-left: 1px solid var(--border, #e5e5e5);
  display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,.06);
}
.crp-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border, #e5e5e5);
}
.crp-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.crp-close {
  width: 24px; height: 24px; border: none; border-radius: 4px;
  background: none; font-size: 14px; cursor: pointer; color: var(--text-secondary);
}
.crp-close:hover { background: var(--bg-hover); }
.crp-bd { flex: 1; overflow-y: auto; padding: 16px; }
.crp-empty {
  display: flex; align-items: center; justify-content: center;
  height: 100%; font-size: 13px; color: var(--text-muted);
}

.crp-slide-enter-active, .crp-slide-leave-active { transition: width .2s ease, opacity .15s; overflow: hidden; }
.crp-slide-enter-from, .crp-slide-leave-to { width: 0; opacity: 0; }
</style>
