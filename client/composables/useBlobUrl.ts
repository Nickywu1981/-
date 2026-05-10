/**
 * Auto-revoke blob URLs on component unmount to prevent memory leaks.
 * Usage: const { createBlobUrl } = useBlobUrl()
 *        previewUrl.value = createBlobUrl(file)
 */
export function useBlobUrl() {
  const urls: string[] = []

  function createBlobUrl(file: File | Blob | MediaSource): string {
    const url = URL.createObjectURL(file)
    urls.push(url)
    return url
  }

  function revoke(url: string) {
    const idx = urls.indexOf(url)
    if (idx !== -1) {
      URL.revokeObjectURL(url)
      urls.splice(idx, 1)
    }
  }

  if (typeof window !== 'undefined') {
    onUnmounted(() => {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.length = 0
    })
  }

  return { createBlobUrl, revoke }
}
