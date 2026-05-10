/**
 * 统一下载工具 — 替代 document.createElement('a') 内联模式
 *
 *   const { download, downloadBlob } = useFileDownload()
 *   download('/api/file/result.png', 'output.png')
 *   downloadBlob(blob, 'export.csv')
 */
export function useFileDownload() {
  function trigger(url: string, filename: string) {
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
    // 延迟 revoke 确保浏览器已开始下载
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return { download, downloadBlob }
}
