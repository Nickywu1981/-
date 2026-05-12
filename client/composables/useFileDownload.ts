/**
 * 统一下载工具 — 替代 document.createElement('a') 内联模式
 *
 *   const { download, downloadBlob } = useFileDownload()
 *   download('/api/file/result.png', 'output.png')
 *   downloadBlob(blob, 'export.csv')
 */
export function useFileDownload() {
  let revokeTimer: ReturnType<typeof setTimeout> | null = null;

  function trigger(url: string, filename: string) {
    if (!import.meta.client) return
    const a = document.createElement('a')
    a.href = url
    a.download = filename || ''
    a.click()
  }

  function download(url: string, filename: string) {
    trigger(url, filename)
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    trigger(url, filename)
    if (revokeTimer) clearTimeout(revokeTimer)
    revokeTimer = setTimeout(() => { URL.revokeObjectURL(url); revokeTimer = null; }, 1000)
  }

  onUnmounted(() => {
    if (revokeTimer) { clearTimeout(revokeTimer); revokeTimer = null; }
  })

  return { download, downloadBlob }
}
