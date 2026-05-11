export function useToast() {
  const _toast = ref<any>(null)
  const _queue: Array<{ type: string; msg: string }> = []
  function _emit(type: string, msg: string) {
    if (_toast.value) { try { (_toast.value as any)[type](msg) } catch { /* toast unavailable */ } }
    else { _queue.push({ type, msg }) }
  }
  onMounted(() => {
    _toast.value = (window as any).__toast
    if (_toast.value && _queue.length) {
      const q = _queue.splice(0)
      q.forEach(({ type, msg }) => { try { (_toast.value as any)[type](msg) } catch { /* skip */ } })
    }
  })
  return {
    success: (msg: string) => _emit('success', msg),
    error: (msg: string) => _emit('error', msg),
    warn: (msg: string) => _emit('warn', msg),
    info: (msg: string) => _emit('info', msg),
  }
}
