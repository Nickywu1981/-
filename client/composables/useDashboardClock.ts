/**
 * Dashboard clock composable — real-time clock and date display
 * Auto-cleans up on component unmount via onUnmounted hook.
 */
export function useDashboardClock() {
  const currentTime = ref('')
  const currentDate = ref('')
  let _clockTimer: ReturnType<typeof setInterval> | null = null
  let _prevDate = ''

  function start() {
    const tick = () => {
      const now = new Date()
      currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
      if (dateStr !== _prevDate) { _prevDate = dateStr; currentDate.value = dateStr }
    }
    tick()
    _clockTimer = setInterval(tick, 1000)
  }

  function stop() {
    if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null }
  }

  onUnmounted(() => { stop() })

  return { currentTime, currentDate, start, stop }
}
