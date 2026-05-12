<!--
  ResultPanel — 创作类结果展示面板
  Props: imageUrl / loading / error / showDownload / showRetry / showShare
  Events: @retry / @download / @share
-->
<template>
  <div class="result-panel" :class="{ loading: loading, error: !!error }">
    <!-- 加载态 -->
    <div v-if="loading" class="rp-loading">
      <div class="rp-spinner" />
      <p>AI 正在生成中...</p>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error" class="rp-error">
      <p>{{ error }}</p>
      <button v-if="showRetry" class="btn btn-gradient btn-sm" @click="$emit('retry')">重试</button>
    </div>

    <!-- 结果 -->
    <div v-else-if="imageUrl" class="rp-result">
      <img :src="imageUrl" :alt="alt" class="rp-image" @click="lightbox = true" />
      <div class="rp-actions">
        <button v-if="showDownload" class="btn btn-secondary btn-sm" @click="handleDownload">下载</button>
        <button v-if="showRetry" class="btn btn-secondary btn-sm" @click="$emit('retry')">重新生成</button>
        <button v-if="showShare" class="btn btn-secondary btn-sm" @click="$emit('share')">分享</button>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else class="rp-empty">
      <p>点击生成按钮开始创作</p>
    </div>

    <!-- 灯箱 -->
    <ImageLightbox v-if="lightbox" :src="imageUrl!" :alt="alt" @close="lightbox = false" />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  imageUrl?: string
  alt?: string
  loading?: boolean
  error?: string
  showDownload?: boolean
  showRetry?: boolean
  showShare?: boolean
}>(), {
  alt: '生成结果',
  showDownload: true,
  showRetry: true,
  showShare: false,
})

defineEmits<{
  retry: []
  download: []
  share: []
}>()

const lightbox = ref(false)

async function handleDownload() {
  if (!props.imageUrl) return
  try {
    const res = await fetch(props.imageUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `movio-${Date.now()}.png`; a.click()
    URL.revokeObjectURL(url)
  } catch { /* fallback: open in new tab */ window.open(props.imageUrl, '_blank', 'noopener,noreferrer') }
}
</script>

<style scoped>
.result-panel {
  min-height: 320px;
  display: flex; align-items: center; justify-content: center;
  border: 1px dashed #dcdfe6; border-radius: 12px;
  background: #fafafa; overflow: hidden;
}
.result-panel.loading { border-style: solid; border-color: #e4e7ed; }
.result-panel.error { border-color: #f56c6c; background: #fef0f0; }

.rp-loading { text-align: center; padding: 40px; }
.rp-spinner {
  width: 36px; height: 36px; border: 3px solid #e4e7ed;
  border-top-color: #409eff; border-radius: 50%;
  animation: spin .8s linear infinite; margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.rp-loading p { color: #909399; font-size: 14px; margin: 0; }

.rp-error { text-align: center; padding: 40px; }
.rp-error p { color: #f56c6c; margin: 0 0 12px; }

.rp-result { width: 100%; }
.rp-image { width: 100%; display: block; cursor: zoom-in; }
.rp-actions { display: flex; gap: 8px; padding: 12px; justify-content: center; }

.rp-empty { text-align: center; padding: 60px; color: #c0c4cc; }
.rp-empty p { margin: 0; font-size: 15px; }
</style>
