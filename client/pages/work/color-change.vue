<template>
  <WorkLayout title="颜色替换" :steps="['上传图片', '选择颜色', '生成']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">🎨</p>
        <p>上传商品图片进行颜色替换</p>
        <p class="hint">精准识别商品区域，替换为指定颜色</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">选择图片</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img loading="lazy" :src="previewUrl" alt="preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
      <p v-if="uploading" class="hint uploading">⏳ 上传中...</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">✓ 已上传</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">下一步：选择颜色</button>
    </div>
    <div v-else-if="step === 1" class="select-section">
      <h3>选择目标颜色</h3>
      <div class="color-picker">
        <input v-model="targetColor" type="color" />
        <span>{{ targetColor }}</span>
      </div>
      <div class="preset-colors">
        <button v-for="c in presetColors" :key="c.value" class="color-swatch" :style="{ background: c.value }" :class="{ active: targetColor === c.value }" @click="targetColor = c.value" :title="c.name" />
      </div>
      <p class="cost-hint">成本：3 点/次</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">开始替换</button>
      </div>
    </div>
    <div v-else class="result-section">
      <div v-if="processing" class="processing"><span class="spinner" /> 处理中...</div>
      <div v-else-if="resultUrl">
        <img loading="lazy" :src="resultUrl" alt="result" class="result-image" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <button class="btn" @click="downloadImage">下载</button>
      </div>
      <div v-else class="empty-result">
        <p>暂无替换结果</p>
        <button class="btn-outline" @click="step = 1">重新配置颜色</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const step = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const uploading = ref(false)
const processing = ref(false)
const resultUrl = ref('')
const targetColor = ref('#7C3AED')
const fileInput = ref<HTMLInputElement | null>(null)

const presetColors = [
  { name: '经典红', value: '#DC2626' }, { name: '活力橙', value: '#EA580C' },
  { name: '阳光黄', value: '#CA8A04' }, { name: '森林绿', value: '#16A34A' },
  { name: '海洋蓝', value: '#2563EB' }, { name: '皇家紫', value: '#7C3AED' },
  { name: '玫瑰粉', value: '#DB2777' }, { name: '经典黑', value: '#171717' },
]

const toast = useToast()
async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  previewUrl.value = createBlobUrl(file)
  uploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res: any = await $fetch('/api/upload/image', { method: 'POST', body: fd })
    uploadedUrl.value = res.data?.url || res.url
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '上传失败')
    previewUrl.value = ''
  } finally { uploading.value = false }
}

function handleDrop(e: DragEvent) {
  if (e.dataTransfer?.files[0]) {
    handleFile(e.dataTransfer.files[0])
  }
}

async function submitTask() {
  processing.value = true; step.value = 2
  try {
    const res: any = await $fetch('/api/advanced/color-swap', { method: 'POST', body: { image_url: uploadedUrl.value, target_color: targetColor.value } })
    resultUrl.value = res.data?.result_url || res.result_url
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '颜色替换失败，请重试')
    step.value = 1
  } finally { processing.value = false }
}

function downloadImage() {
  if (resultUrl.value) { download(resultUrl.value, 'color-changed.png') }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
