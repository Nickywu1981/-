/**
 * 统一下载工具 — 替代 document.createElement('a') 内联模式
 *
 *   const { download, downloadBlob } = useFileDownload()
 *   download('/api/file/result.png', 'output.png')
 *   downloadBlob(blob, 'export.csv')
 */
export function useFileDownload() {
  const blobUrls: string[] = []

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
    blobUrls.push(url)
    trigger(url, filename)
    setTimeout(() => {
      URL.revokeObjectURL(url)
      const idx = blobUrls.indexOf(url)
      if (idx !== -1) blobUrls.splice(idx, 1)
    }, 1000)
  }

  onUnmounted(() => {
    blobUrls.forEach(u => URL.revokeObjectURL(u))
    blobUrls.length = 0
  })

  return { download, downloadBlob }
}
