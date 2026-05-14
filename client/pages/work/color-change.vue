<template>
  <WorkLayout :title="$t('work_pages.color_change.title')" :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">🎨</p>
        <p>{{ $t('work_pages.color_change.drop_title') }}</p>
        <p class="hint">{{ $t('work_pages.color_change.drop_hint') }}</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.color_change.select_image') }}</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img loading="lazy" :src="previewUrl" alt="preview" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" /></div>
      <p v-if="uploading" class="hint uploading">{{ $t('work_pages.color_change.uploading') }}</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">{{ $t('work_pages.color_change.uploaded') }}</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">{{ $t('work_pages.color_change.next_color') }}</button>
    </div>
    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.color_change.select_color') }}</h3>
      <div class="color-picker">
        <input v-model="targetColor" type="color" />
        <span>{{ targetColor }}</span>
      </div>
      <div class="preset-colors">
        <button v-for="c in presetColors" :key="c.value" class="color-swatch" :style="{ background: c.value }" :class="{ active: targetColor === c.value }" @click="targetColor = c.value" :title="c.name" />
      </div>
      <p class="cost-hint">{{ $t('work_pages.color_change.cost_hint') }}</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.color_change.back') }}</button>
        <button class="btn" @click="submitTask">{{ $t('work_pages.color_change.start_replace') }}</button>
      </div>
    </div>
    <div v-else class="result-section">
      <div v-if="processing" class="processing"><span class="spinner" /> {{ $t('work_pages.color_change.processing') }}</div>
      <div v-else-if="resultUrl">
        <img loading="lazy" :src="resultUrl" alt="result" class="result-image" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <button class="btn" @click="downloadImage">{{ $t('work_pages.color_change.download') }}</button>
      </div>
      <div v-else class="empty-result">
        <p>{{ $t('work_pages.color_change.no_result') }}</p>
        <button class="btn-outline" @click="step = 1">{{ $t('work_pages.color_change.reconfigure_color') }}</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()

const steps = computed(() => [t('work_pages.color_change.step_upload'), t('work_pages.color_change.step_color'), t('work_pages.color_change.step_generate')])
const step = ref(0)
const previewUrl = ref('')
const uploadedUrl = ref('')
const uploading = ref(false)
const processing = ref(false)
const resultUrl = ref('')
const targetColor = ref('#7C3AED')
const fileInput = ref<HTMLInputElement | null>(null)

const presetColors = computed(() => [
  { name: t('work_pages.color_change.preset_red'), value: '#DC2626' },
  { name: t('work_pages.color_change.preset_orange'), value: '#EA580C' },
  { name: t('work_pages.color_change.preset_yellow'), value: '#CA8A04' },
  { name: t('work_pages.color_change.preset_green'), value: '#16A34A' },
  { name: t('work_pages.color_change.preset_blue'), value: '#2563EB' },
  { name: t('work_pages.color_change.preset_purple'), value: '#7C3AED' },
  { name: t('work_pages.color_change.preset_pink'), value: '#DB2777' },
  { name: t('work_pages.color_change.preset_black'), value: '#171717' },
])

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
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_upload'))
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
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('work_pages.color_change.replace_failed'))
    step.value = 1
  } finally { processing.value = false }
}

function downloadImage() {
  if (resultUrl.value) { download(resultUrl.value, 'color-changed.png') }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
