export function useToast() {
  const _toast = ref<any>(null)
  onMounted(() => { _toast.value = (window as any).__toast })
  return {
    success: (msg: string) => _toast.value?.success(msg),
    error: (msg: string) => _toast.value?.error(msg),
    warn: (msg: string) => _toast.value?.warn(msg),
    info: (msg: string) => _toast.value?.info(msg),
  }
}
// Auto-register toast ref
export function registerToast(ref: any) { (window as any).__toast = ref; }
