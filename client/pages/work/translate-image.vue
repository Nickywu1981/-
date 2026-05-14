<template>
  <WorkLayout :title="$t('work_pages.translate_image.title')" :description="$t('work_pages.translate_image.description')">
    <div class="translate-workspace">
      <div class="upload-zone" @dragover.prevent @drop.prevent="onDrop">
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
        <div class="zone-content" @click="fileInput?.click()">
          <span class="zone-icon">🌐</span>
          <h3>{{ $t('work_pages.translate_image.upload_heading') }}</h3>
          <p>{{ $t('work_pages.translate_image.upload_desc') }}</p>
          <button class="btn-upload">{{ $t('work_pages.translate_image.select_btn') }}</button>
        </div>
      </div>

      <div class="options-bar" v-if="previewUrl">
        <label>
          {{ $t('work_pages.translate_image.source_lang_label') }}
          <select v-model="sourceLang" class="select-sm">
            <option value="auto">{{ $t('work_pages.translate_image.auto_detect') }}</option>
            <option value="zh">{{ $t('work_pages.translate_image.lang_zh') }}</option>
            <option value="en">{{ $t('work_pages.translate_image.lang_en') }}</option>
            <option value="ja">{{ $t('work_pages.translate_image.lang_ja') }}</option>
            <option value="ko">{{ $t('work_pages.translate_image.lang_ko') }}</option>
          </select>
        </label>
        <label>
          {{ $t('work_pages.translate_image.target_lang_label') }}
          <select v-model="targetLang" class="select-sm">
            <option value="en">{{ $t('work_pages.translate_image.lang_en') }}</option>
            <option value="zh">{{ $t('work_pages.translate_image.lang_zh') }}</option>
            <option value="ja">{{ $t('work_pages.translate_image.lang_ja') }}</option>
            <option value="ko">{{ $t('work_pages.translate_image.lang_ko') }}</option>
            <option value="fr">{{ $t('work_pages.translate_image.lang_fr') }}</option>
            <option value="de">{{ $t('work_pages.translate_image.lang_de') }}</option>
            <option value="es">{{ $t('work_pages.translate_image.lang_es') }}</option>
            <option value="ar">{{ $t('work_pages.translate_image.lang_ar') }}</option>
          </select>
        </label>
        <button class="btn-primary" :disabled="translating" @click="startTranslate">
          {{ translating ? $t('work_pages.translate_image.translating') : $t('work_pages.translate_image.start_translate') }}
        </button>
      </div>

      <div class="preview-area" v-if="previewUrl">
        <div class="preview-card">
          <img loading="lazy" :src="previewUrl" :alt="$t('work_pages.translate_image.original_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <span class="label-badge">{{ $t('work_pages.translate_image.original_img') }}</span>
        </div>
        <div class="preview-card" v-if="resultUrl">
          <img loading="lazy" :src="resultUrl" :alt="$t('work_pages.translate_image.translated_alt')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <span class="label-badge result">{{ $t('work_pages.translate_image.translated_img') }}</span>
        </div>
      </div>

      <div v-if="resultUrl" class="result-actions">
        <button class="btn-primary" @click="downloadResult">{{ $t('work_pages.translate_image.download_result') }}</button>
        <button class="btn-outline" @click="resetAll">{{ $t('work_pages.translate_image.retranslate') }}</button>
        <QuickSaveButton :work-id="taskId" work-type="translate" :work-url="resultUrl" :work-title="$t('work_pages.translate_image.title')" />
      </div>
    </div>

    <EmptyState
      v-if="!previewUrl"
      icon="🌐"
      :title="$t('work_pages.translate_image.title')"
      :description="$t('work_pages.translate_image.description')"
      :action-label="$t('work_pages.translate_image.empty_action')"
      @action="fileInput?.click()"
    />
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()


const toast = useToast()
const { download } = useFileDownload()
const fileInput = ref<HTMLInputElement>()
const previewUrl = ref('')
const resultUrl = ref('')
const translating = ref(false)
const taskId = ref('')
const sourceLang = ref('auto')
const targetLang = ref('en')

async function uploadFile(file: File) {
  const fd = new FormData(); fd.append('file', file)
  try {
    const res: any = await $fetch('/api/upload', { method: 'POST', body: fd })
    return res.data?.url || ''
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || e?.message || t('common.failed_upload'))
    throw e
  }
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { toast.error(t('common.image_size_limit')); return }
  try {
    const url = await uploadFile(file)
    previewUrl.value = url
    resultUrl.value = ''
  } catch { /* toast already shown in uploadFile */ }
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    const dt = new DataTransfer(); dt.items.add(file)
    if (fileInput.value) { fileInput.value.files = dt.files; onFileChange({ target: fileInput.value } as any) }
  }
}

async function startTranslate() {
  translating.value = true
  try {
    const res: any = await $fetch('/api/advanced/image-translate', {
      method: 'POST',
      body: { imageUrl: previewUrl.value, sourceLang: sourceLang.value, targetLang: targetLang.value },
    })
    resultUrl.value = res.data?.outputUrl || res.data?.url || ''
    taskId.value = res.data?.taskId || ''
    toast.success(t('common.translation_complete'))
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || err.message || t('common.failed_translate')) }
  finally { translating.value = false }
}

function downloadResult() {
  if (resultUrl.value) { download(resultUrl.value, 'translated.png') }
}

function resetAll() { previewUrl.value = ''; resultUrl.value = '' }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.translate-workspace { max-width: 900px; margin: 0 auto; }
.upload-zone { border: 2px dashed var(--border-light); border-radius: var(--radius-xl); padding: 48px 24px; text-align: center; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); background: var(--bg-card); margin-bottom: 16px; }
.upload-zone:hover { border-color: var(--brand); background: var(--brand-light); }
.zone-content h3 { font-size: 18px; color: var(--text-primary); margin-bottom: 8px; }
.zone-content p { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }
.btn-upload { padding: 10px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; }

.options-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; }
.options-bar label { font-size: 13px; color: var(--text-secondary); }
.select-sm { padding: 6px 10px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); font-size: 13px; margin-left: 4px; }

.preview-area { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.preview-card { position: relative; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-light); }
.preview-card img { width: 100%; display: block; }
.label-badge { position: absolute; top: 8px; left: 8px; padding: 2px 10px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 10px; font-size: 11px; }
.label-badge.result { background: var(--brand); }

.result-actions { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
.btn-primary { padding: 10px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; font-weight: 500; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { padding: 10px 24px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 14px; }
.btn-outline:hover { border-color: var(--brand); }

@media (max-width: 640px) {
  .preview-area { grid-template-columns: 1fr; }
}
</style>
