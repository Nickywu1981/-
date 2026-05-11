/**
 * 文件上传 composable — 统一处理预览 + 上传到服务器
 */
export function useUpload(options?: { maxFiles?: number; acceptVideo?: boolean }) {
  const maxFiles = options?.maxFiles ?? 9;
  const acceptVideo = options?.acceptVideo ?? false;

  const previews = ref<string[]>([]);
  const uploadedUrls = ref<string[]>([]);
  const uploading = ref(false);
  const error = ref('');

  const blobUrls: string[] = [];

  function reset() {
    for (const url of blobUrls) URL.revokeObjectURL(url);
    blobUrls.length = 0;
    previews.value = [];
    uploadedUrls.value = [];
    uploading.value = false;
    error.value = '';
  }

  async function uploadFile(file: File): Promise<string> {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || '/api';
    const formData = new FormData();
    formData.append('file', file);
    const res: any = await $fetch(`${apiBase}/upload/image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    return res.data?.url;
  }

  async function handleFiles(files: FileList | File[]) {
    error.value = '';
    const fileArr = Array.from(files).filter(f => {
      if (acceptVideo) return f.type.startsWith('image/') || f.type.startsWith('video/');
      return f.type.startsWith('image/');
    });
    if (!fileArr.length) { error.value = '请选择图片文件'; return; }
    if (previews.value.length + fileArr.length > maxFiles) {
      error.value = `最多上传 ${maxFiles} 张图片`;
      return;
    }

    // 立即显示预览
    for (const f of fileArr) {
      const url = URL.createObjectURL(f);
      blobUrls.push(url);
      previews.value.push(url);
    }

    // 上传到服务器
    uploading.value = true;
    try {
      for (const f of fileArr) {
        const url = await uploadFile(f);
        uploadedUrls.value.push(url);
      }
    } catch (e: any) {
      error.value = e?.data?.msg || '上传失败';
      // 移除失败的预览
      previews.value = previews.value.slice(0, uploadedUrls.value.length);
    }
    uploading.value = false;
  }

  function handleInput(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files?.length) handleFiles(files);
  }

  function handleDrop(e: DragEvent) {
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }

  onUnmounted(() => {
    for (const url of blobUrls) URL.revokeObjectURL(url);
    blobUrls.length = 0;
  });

  return {
    previews,
    uploadedUrls,
    uploading,
    error,
    reset,
    handleFiles,
    handleInput,
    handleDrop,
  };
}
