/**
 * 倒计时 composable — 验证码/重发等场景通用
 * 用法: const { countdown, start } = useCountdown(60)
 */
export function useCountdown(seconds = 60) {
  const countdown = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  function start(s?: number) {
    stop()
    countdown.value = s ?? seconds
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        stop()
      }
    }, 1000)
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null }
    countdown.value = 0
  }

  onUnmounted(stop)

  return { countdown, start, stop }
}
