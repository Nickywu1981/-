/**
 * 临时消息显示 — 自动清除 + 多次调用防抖
 * 用法: const { message, show } = useTimedMessage()
 *       show('保存成功')
 *       show('保存成功', 3000)
 */
export function useTimedMessage(duration = 2000) {
  const message = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  function show(msg: string, dur?: number) {
    if (timer) clearTimeout(timer)
    message.value = msg
    timer = setTimeout(() => { message.value = '' }, dur ?? duration)
  }

  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

  return { message, show }
}
