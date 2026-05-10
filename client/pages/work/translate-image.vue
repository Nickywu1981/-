<template>
  <WorkLayout title="图片翻译" description="AI 识别图片中的文字并翻译成目标语言">
    <div class="translate-workspace">
      <div class="upload-zone" @dragover.prevent @drop.prevent="onDrop">
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
        <div class="zone-content" @click="fileInput?.click()">
          <span class="zone-icon">🌐</span>
          <h3>上传含文字的图片</h3>
          <p>支持 JPG/PNG/WebP，最大 10MB</p>
          <button class="btn-upload">选择图片</button>
        </div>
      </div>

      <div class="options-bar" v-if="previewUrl">
        <label>
          源语言：
          <select v-model="sourceLang" class="select-sm">
            <option value="auto">自动检测</option>
            <option value="zh">中文</option>
            <option value="en">英语</option>
            <option value="ja">日语</option>
            <option value="ko">韩语</option>
          </select>
        </label>
        <label>
          目标语言：
          <select v-model="targetLang" class="select-sm">
            <option value="en">英语</option>
            <option value="zh">中文</option>
            <option value="ja">日语</option>
            <option value="ko">韩语</option>
            <option value="fr">法语</option>
            <option value="de">德语</option>
            <option value="es">西班牙语</option>
            <option value="ar">阿拉伯语</option>
          </select>
        </label>
        <button class="btn-primary" :disabled="translating" @click="startTranslate">
          {{ translating ? '翻译中...' : '开始翻译' }}
        </button>
      </div>

      <div class="preview-area" v-if="previewUrl">
        <div class="preview-card">
          <img loading="lazy" :src="previewUrl" alt="原图" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <span class="label-badge">原图</span>
        </div>
        <div class="preview-card" v-if="resultUrl">
          <img loading="lazy" :src="resultUrl" alt="翻译结果" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <span class="label-badge result">翻译结果</span>
        </div>
      </div>

      <div v-if="resultUrl" class="result-actions">
        <button class="btn-primary" @click="downloadResult">下载结果</button>
        <button class="btn-outline" @click="resetAll">重新翻译</button>
        <QuickSaveButton :work-id="taskId" work-type="translate" :work-url="resultUrl" work-title="图片翻译" />
      </div>
    </div>

    <EmptyState
      v-if="!previewUrl"
      icon="🌐"
      title="图片翻译"
      description="智能识别图片中的文字区域，自动翻译为目标语言并保留原有排版风格"
      action-label="上传图片开始"
      @action="fileInput?.click()"
    />
  </WorkLayout>
</template>

<script setup lang="ts">

const toast = useToast()
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
  } catch (e: any) {
    toast.error(e?.data?.msg || e?.message || '上传失败')
    throw e
  }
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { toast.error('图片不能超过10MB'); return }
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
    toast.success('翻译完成')
  } catch (e: any) { toast.error(e.data?.msg || e.message || '翻译失败') }
  finally { translating.value = false }
}

function downloadResult() {
  if (resultUrl.value) { download(resultUrl.value, 'translated.png') }
}

function resetAll() { previewUrl.value = ''; resultUrl.value = '' }
</script>

<style scoped>
.translate-workspace { max-width: 900px; margin: 0 auto; }
.upload-zone { border: 2px dashed var(--border-light); border-radius: var(--radius-xl); padding: 48px 24px; text-align: center; cursor: pointer; transition: all var(--transition-fast); background: var(--bg-card); margin-bottom: 16px; }
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
