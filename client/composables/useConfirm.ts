/**
 * useConfirm — 全局确认弹窗 composable
 * 替换原生 window.confirm()，提供统一样式的异步确认对话框
 *
 * 用法:
 *   const { confirm } = useConfirm()
 *   const ok = await confirm({ message: '确认删除该数据？' })
 *   if (!ok) return
 */
interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
}

let _globalDialog: Ref<any> | null = null

export function registerConfirmDialog(dialogRef: Ref<any>) {
  _globalDialog = dialogRef
}

export function useConfirm() {
  const injected = inject<{ show: (opts: ConfirmOptions) => Promise<boolean> } | undefined>('$confirm', undefined)

  async function confirm(opts: ConfirmOptions): Promise<boolean> {
    if (injected) return injected.show(opts)
    if (_globalDialog?.value) return _globalDialog.value.show(opts)
    // Fallback: native confirm — 在 ConfirmDialog 未挂载时降级
    if (!import.meta.client) return false
    return window.confirm(opts.message)
  }

  return { confirm }
}
