interface ToastInstance {
  success(msg: string): void
  error(msg: string): void
  warn(msg: string): void
  info(msg: string): void
}

export function useToast() {
  const _toast = ref<ToastInstance | null>(null)
  const _queue: Array<{ type: keyof ToastInstance; msg: string }> = []
  const MAX_QUEUE = 100

  function _emit(type: keyof ToastInstance, msg: string) {
    if (_toast.value) {
      try { _toast.value[type](msg) } catch { /* toast unavailable */ }
    } else if (_queue.length < MAX_QUEUE) {
      _queue.push({ type, msg })
    }
  }

  onMounted(() => {
    _toast.value = window.__toast ?? null
    if (_toast.value && _queue.length) {
      const q = _queue.splice(0)
      q.forEach(({ type, msg }) => { try { _toast.value![type](msg) } catch { /* skip */ } })
    }
  })

  onUnmounted(() => { _toast.value = null })

  return {
    success: (msg: string) => _emit('success', msg),
    error: (msg: string) => _emit('error', msg),
    warn: (msg: string) => _emit('warn', msg),
    info: (msg: string) => _emit('info', msg),
  }
}
