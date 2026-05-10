<template>
  <Teleport to="body">
    <div class="toast-container" role="alert" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
          <span class="toast-icon">{{ iconMap[t.type] }}</span>
          <span class="toast-msg">{{ t.msg }}</span>
          <button v-if="t.closable" class="toast-close" @click="remove(t.id)" aria-label="关闭通知">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const toasts = ref<Array<{ id: number; msg: string; type: string; closable: boolean }>>([])
let _id = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const iconMap: Record<string, string> = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' }

function add(msg: string, type = 'info', duration = 3000, closable = true) {
  const id = ++_id
  toasts.value.push({ id, msg, type, closable })
  if (duration > 0) {
    const timer = setTimeout(() => remove(id), duration)
    timers.set(id, timer)
  }
}
function remove(id: number) {
  const timer = timers.get(id)
  if (timer) { clearTimeout(timer); timers.delete(id) }
  toasts.value = toasts.value.filter(t => t.id !== id)
}

const exposed = { success: (m: string) => add(m, 'success'), error: (m: string) => add(m, 'error', 5000), warn: (m: string) => add(m, 'warn', 4000), info: (m: string) => add(m, 'info') }
defineExpose(exposed)
onMounted(() => { (window as any).__toast = exposed })
onUnmounted(() => { for (const timer of timers.values()) clearTimeout(timer); timers.clear() })
</script>

<style scoped>
.toast-container { position: fixed; top: 70px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.toast-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  border-radius: var(--radius-lg); font-size: 14px;
  box-shadow: var(--shadow-dropdown); pointer-events: auto;
  min-width: 240px; max-width: 380px;
  background: var(--bg-card); color: var(--text-primary);
}
.toast-item.success { border-left: 4px solid var(--success); }
.toast-item.error   { border-left: 4px solid var(--danger); }
.toast-item.warn    { border-left: 4px solid var(--warning); }
.toast-item.info    { border-left: 4px solid var(--brand); }
.toast-icon { font-size: 16px; flex-shrink: 0; }
.toast-msg  { flex: 1; color: var(--text-primary); }
.toast-close {
  background: none; border: none; cursor: pointer; color: var(--text-muted);
  padding: 2px 6px; font-size: 14px; border-radius: var(--radius-xs);
  transition: background var(--transition-fast);
}
.toast-close:hover { background: var(--bg-hover); }

.toast-enter-active { transition: all var(--transition-slow); }
.toast-leave-active { transition: all var(--transition-base); }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to   { opacity: 0; transform: translateX(40px); }
</style>
