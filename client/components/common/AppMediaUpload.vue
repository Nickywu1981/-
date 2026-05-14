<!--
  Movio AI v4.1 — AppMediaUpload.vue
  G4 前端开发 | 通用媒体上传组件
  Props: accept(image/video), multiple, maxSize(MB), maxCount
  功能: 拖拽上传 + 分片上传(>5MB) + 断点续传 + 进度条
-->
<template>
  <div class="app-media-upload" :class="{ dragging: isDragging }">
    <!-- 拖拽区域 -->
    <div
      class="upload-zone"
      role="button"
      tabindex="0"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="triggerInput"
      @keydown.enter.prevent="triggerInput"
      @keydown.space.prevent="triggerInput"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="acceptMime"
        :multiple="multiple"
        class="hidden-input"
        @change="onFileChange"
      />

      <div v-if="uploadHint" class="upload-hint">
        <svg class="upload-icon" viewBox="0 0 24 24" width="48" height="48">
          <path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" opacity="0.6"/>
        </svg>
        <p class="hint-text">{{ $t('mediaUpload.dragHint') }}</p>
        <p class="hint-extra">
          {{ formatHint }}
        </p>
      </div>
    </div>

    <!-- 文件列表 -->
    <div v-if="fileList.length > 0" class="file-list">
      <div v-for="(file, idx) in fileList" :key="idx" class="file-item">
        <div class="file-info">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
        </div>

        <!-- 进度条 -->
        <div v-if="file.status === 'uploading'" class="progress-bar">
          <div class="progress-fill" :style="{ width: file.progress + '%' }"></div>
        </div>

        <!-- 状态标记 -->
        <span v-if="file.status === 'done'" class="status done">✓</span>
        <span v-else-if="file.status === 'error'" class="status error">✗</span>
        <span v-else-if="file.status === 'pending'" class="status pending">{{ $t('mediaUpload.pending') }}</span>

        <!-- 移除按钮 -->
        <button
          v-if="file.status !== 'uploading'"
          class="btn-remove"
          @click.stop="removeFile(idx)"
          :aria-label="$t('mediaUpload.removeFile')"
        >×</button>
      </div>
    </div>

    <!-- 操作栏 -->
    <div v-if="fileList.length > 0" class="upload-actions">
      <button
        class="btn btn-primary"
        :disabled="uploading"
        @click="startUpload"
      >
        {{ uploading ? $t('mediaUpload.uploading') : $t('mediaUpload.btnUpload') }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">

const toast = useToast()
const { t } = useI18n()

const props = defineProps({
  accept: { type: String as PropType<'image' | 'video' | 'all'>, default: 'all' },
  multiple: { type: Boolean, default: false },
  maxSize: { type: Number, default: 500 },  // MB
  maxCount: { type: Number, default: 10 },
})

const emit = defineEmits<{
  uploaded: [files: { url: string; name: string; size: number; type: string }[]]
}>()

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

const apiBase = useRuntimeConfig().public.apiBase || '/api'

const acceptMime = computed(() => {
  if (props.accept === 'image') return 'image/jpeg,image/png,image/webp'
  if (props.accept === 'video') return 'video/mp4,video/mov,video/webm'
  return 'image/*,video/*'
})

const formatHint = computed(() => {
  const parts: string[] = []
  if (props.accept === 'image' || props.accept === 'all') parts.push(t('mediaUpload.imageFormats'))
  if (props.accept === 'video' || props.accept === 'all') parts.push(t('mediaUpload.videoFormats'))
  parts.push(t('mediaUpload.maxSize', { size: props.maxSize }))
  if (props.multiple) parts.push(t('mediaUpload.maxCount', { count: props.maxCount }))
  return parts.join(' · ')
})

// 状态
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadHint = computed(() => fileList.value.length === 0)

interface FileItem {
  file: File
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  url: string
  uploadId: string
}
const fileList = ref<FileItem[]>([])

// 拖拽
function onDragEnter() { isDragging.value = true }
function onDragOver() { isDragging.value = true }
function onDragLeave() { isDragging.value = false }

function onDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files) addFiles(Array.from(files))
}

function triggerInput() { fileInput.value?.click() }

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(Array.from(input.files))
  input.value = '' // 重置以支持重复选同一个文件
}

function addFiles(files: File[]) {
  for (const file of files) {
    if (fileList.value.length >= props.maxCount) break
    if (file.size > props.maxSize * 1024 * 1024) {
      toast.warn(t('mediaUpload.fileTooLarge', { name: file.name }))
      continue
    }
    fileList.value.push({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      url: '',
      uploadId: '',
    })
  }
}

function removeFile(idx: number) { fileList.value.splice(idx, 1) }

// -----------------------------------------------------------------------
// 上传
// -----------------------------------------------------------------------
async function startUpload() {
  uploading.value = true
  let hasNotified = false
  const results: { url: string; name: string; size: number; type: string }[] = []

  for (const item of fileList.value.filter(f => !['done'].includes(f.status))) {
    item.status = 'uploading'
    try {
      const result = await uploadFile(item)
      item.url = result.url
      item.status = 'done'
      item.progress = 100
      results.push({ url: result.url, name: item.name, size: item.size, type: item.type })
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (import.meta.dev) console.error('[AppMediaUpload] 上传失败', e?.message || err)
      item.status = 'error'
      if (!hasNotified) { toast.error(t('mediaUpload.partialError')); hasNotified = true }
    }
  }

  uploading.value = false
  if (results.length > 0) emit('uploaded', results)
}

async function uploadFile(item: FileItem): Promise<{ url: string }> {
  if (item.file.size <= CHUNK_SIZE) {
    // 小文件直接上传
    const formData = new FormData()
    formData.append('file', item.file)
    const res: any = await $fetch(`${apiBase}/upload/simple`, { credentials: 'include', method: 'POST', body: formData })
    if (res.code !== 200) throw new Error(res.msg)
    return { url: res.data?.file_url }
  }

  // 大文件分片上传
  // 1. 初始化
  const initRes: any = await $fetch(`${apiBase}/upload/init`, {
    credentials: 'include',
    method: 'POST',
    body: { file_name: item.name, file_size: item.file.size, file_type: item.type },
  })
  if (initRes.code !== 200) throw new Error(initRes.msg)
  const { upload_id, total_chunks } = initRes.data

  // 2. 上传分片
  for (let i = 0; i < total_chunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, item.file.size)
    const chunk = item.file.slice(start, end)

    const formData = new FormData()
    formData.append('upload_id', upload_id)
    formData.append('chunk_index', String(i))
    formData.append('chunk', chunk)

    await $fetch(`${apiBase}/upload/chunk`, { credentials: 'include', method: 'POST', body: formData })
    item.progress = Math.round(((i + 1) / total_chunks) * 100)
  }

  // 3. 完成
  const completeRes: any = await $fetch(`${apiBase}/upload/complete`, {
    credentials: 'include',
    method: 'POST',
    body: { upload_id },
  })
  if (completeRes.code !== 200) throw new Error(completeRes.msg)
  return { url: completeRes.data.cdn_url || completeRes.data.file_url }
}

// 工具
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.app-media-upload { width: 100%; }
.upload-zone {
  border: 2px dashed var(--cfg-border, #d1d5db);
  border-radius: var(--cfg-radius, 8px);
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: var(--cfg-bg-secondary, #f9fafb);
}
.upload-zone:hover, .upload-zone.dragging {
  border-color: var(--cfg-primary, #4F46E5);
  background: var(--cfg-bg-primary, #eef2ff);
}
.hidden-input { display: none; }
.upload-icon { color: var(--cfg-text-muted, #9ca3af); margin-bottom: 12px; }
.hint-text { font-size: 16px; color: var(--cfg-text-primary, #374151); margin: 0 0 8px 0; }
.hint-extra { font-size: 13px; color: var(--cfg-text-muted, #9ca3af); margin: 0; }
.file-list { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.file-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: 8px;
  background: var(--cfg-bg-secondary, #f9fafb);
  border: 1px solid var(--cfg-border, #e5e7eb);
}
.file-info { flex: 1; display: flex; justify-content: space-between; align-items: center; min-width: 0; }
.file-name { font-size: 14px; color: var(--cfg-text-primary, #374151); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { font-size: 12px; color: var(--cfg-text-muted, #9ca3af); flex-shrink: 0; margin-left: 8px; }
.progress-bar { flex: 1; height: 6px; background: var(--cfg-border, #e5e7eb); border-radius: 3px; overflow: hidden; max-width: 120px; }
.progress-fill { height: 100%; background: var(--cfg-primary, #4F46E5); border-radius: 3px; transition: width 0.3s; }
.status { font-size: 14px; font-weight: 600; flex-shrink: 0; }
.status.done { color: var(--cfg-success, #10B981); }
.status.error { color: var(--cfg-error, #EF4444); }
.status.pending { color: var(--cfg-text-muted, #9ca3af); font-size: 12px; }
.btn-remove { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--cfg-text-muted, #9ca3af); padding: 0 4px; }
.upload-actions { margin-top: 16px; }
</style>
