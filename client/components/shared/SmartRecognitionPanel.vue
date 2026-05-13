<!--
  SmartRecognitionPanel — 参考图 AI 智能识别面板
  嵌入任意创作页面：上传参考图 → AI识别 → 可编辑确认 → emit 结果
-->
<template>
  <div class="smart-panel">
    <div v-if="!collapsed" class="smart-body">
      <p class="hint">{{ hint }}</p>
      <slot name="upload" :onUpload="onUpload">
        <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onUpload" />
      </slot>

      <div v-if="refUrl" class="preview-row">
	        <img :src="refUrl" alt="Reference" class="ref-preview" />
        <button class="btn btn-primary" :disabled="loading" @click="extract">
	          {{ loading ? $t('smart_recognition.recognizing') : $t('smart_recognition.start_recognize') }}
        </button>
      </div>

      <div v-if="result" class="smart-result">
        <div class="input-group">
	          <label>{{ nameLabel }}</label>
          <input v-model="result.productName" type="text" class="input" maxlength="200" />
        </div>
        <div class="input-group">
	          <label>{{ $t('smart_recognition.category') }}</label>
          <select v-model="result.category" class="input">
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="input-group">
          <label>{{ featuresLabel }}</label>
	          <textarea v-model="featuresText" class="input" rows="4" maxlength="2000" :placeholder="$t('smart_recognition.features_hint')" />
        </div>

        <slot name="extra-options" :result="result" :features="featuresText" />

        <button class="btn btn-primary btn-lg" style="margin-top:12px" :disabled="!submitReady" @click="onConfirm">
          {{ confirmLabel }}
        </button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>

    <button v-else class="btn btn-secondary btn-sm" @click="collapsed = false">
      {{ toggleLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">

const props = withDefaults(defineProps<{
  hint?: string
  nameLabel?: string
  featuresLabel?: string
  confirmLabel?: string
  toggleLabel?: string
}>(), {
	  hint: 'Upload a reference image, AI will identify product info',
	  nameLabel: 'Product name & category (editable)',
	  featuresLabel: 'Key features (editable, one per line)',
	  confirmLabel: 'Confirm & Apply',
	  toggleLabel: '+ Smart Recognize',
})

const emit = defineEmits<{
  confirm: [info: { productName: string; category: string; features: string[]; refUrl: string }]
}>()

const { refUrl, loading, error, result, featuresText, setRefImage, extract, reset } = useSmartRecognition()
const collapsed = ref(true)
const submitReady = computed(() => !!(result.value?.productName && featuresText.value.trim()))

	const CATEGORIES = ['Womenswear', 'Menswear', 'Shoes', 'Bags', 'Beauty', 'Electronics', 'Home', 'Food', 'Sports', 'Baby', 'Jewelry', 'Auto', 'Other' ]

function onUpload(files: any[]) {
  if (files.length > 0) { setRefImage(files[0].url); collapsed.value = false }
}

function onConfirm() {
  if (!result.value) return
  emit('confirm', {
    productName: result.value.productName,
    category: result.value.category,
    features: featuresText.value.split('\n').filter(l => l.trim()),
    refUrl: refUrl.value,
  })
  reset()
  collapsed.value = true
}
</script>

<style scoped>
.smart-panel { margin: 12px 0; }
.smart-body { border: 1px dashed var(--cfg-border); border-radius: var(--cfg-radius-base); padding: 16px; background: #fafbfc; }
:global([data-theme="dark"]) .smart-body { background: #1e1f22; }
.hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 0 0 12px; }
.preview-row { display: flex; align-items: center; gap: 16px; margin: 12px 0; }
.ref-preview { width: 120px; height: 120px; object-fit: contain; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--bg-card); }
.smart-result { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--cfg-border); }
.input-group { margin-bottom: 12px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 4px; }
.error-msg { color: var(--cfg-error); font-size: var(--cfg-font-size-sm); margin-top: 8px; }
.btn-lg { width: 100%; }
</style>
