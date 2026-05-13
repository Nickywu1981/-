/**
 * Dashboard clock composable — real-time clock and date display
 */
export function useDashboardClock() {
  const currentTime = ref('')
  const currentDate = ref('')
  let _clockTimer: ReturnType<typeof setInterval> | null = null

  function start() {
    const tick = () => {
      const now = new Date()
      currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    }
    tick()
    _clockTimer = setInterval(tick, 1000)
  }

  function stop() {
    if (_clockTimer) { clearInterval(_clockTimer); _clockTimer = null }
  }

  return { currentTime, currentDate, start, stop }
}
