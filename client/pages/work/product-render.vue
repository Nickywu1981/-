<template>
  <WorkLayout :title="$t('work_pages.product_render.title')" :subtitle="$t('work_pages.product_render.subtitle')">
    <div class="render-workspace">
      <div class="upload-section">
        <div class="upload-card" @click="triggerUpload">
          <div class="upload-icon">📦</div>
          <p>{{ uploadedFile ? uploadedFile.name : $t('work_pages.product_render.upload_placeholder') }}</p>
          <span>{{ $t('work_pages.product_render.upload_hint') }}</span>
          <button class="btn-upload">{{ $t('work_pages.product_render.select_file') }}</button>
        </div>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png" class="hidden-input" @change="onFileChange" />
      </div>
      <div class="render-options">
        <h3>{{ $t('work_pages.product_render.render_mode') }}</h3>
        <div class="option-grid">
          <button v-for="m in modes" :key="m.key" class="option-card" :class="{selected: activeMode === m.key}" @click="activeMode = m.key">{{ m.label }}</button>
        </div>
      </div>
      <button class="btn-generate" :disabled="!uploadedFile || processing" @click="startRender">
        {{ processing ? $t('work_pages.product_render.rendering') : $t('work_pages.product_render.start_render') }}
      </button>
      <div class="result-area" v-if="resultUrl">
        <h3>{{ $t('work_pages.product_render.result_title') }}</h3>
        <img loading="lazy" :src="resultUrl" :alt="$t('work_pages.product_render.result_img_alt')" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      </div>
      <div v-else class="result-area"><p>{{ $t('work_pages.product_render.result_placeholder') }}</p></div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </div>
  </WorkLayout>
</template>
<script setup lang="ts">const { t } = useI18n()

const modes = computed(() => [
  { key:'studio', label: t('work_pages.product_render.mode_studio') },
  { key:'scene', label: t('work_pages.product_render.mode_scene') },
  { key:'clay', label: t('work_pages.product_render.mode_clay') },
  { key:'exploded', label: t('work_pages.product_render.mode_exploded') },
])
const activeMode = ref('studio')
const uploadedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const processing = ref(false), resultUrl = ref(''), errorMsg = ref('')

function triggerUpload() { fileInput.value?.click() }
function onFileChange(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) uploadedFile.value = file }

async function startRender() {
  if (!uploadedFile.value) return
  processing.value = true; errorMsg.value = ''; resultUrl.value = ''
  try {
    const fd = new FormData(); fd.append('image', uploadedFile.value); fd.append('mode', activeMode.value)
    const data: any = await $fetch('/api/advanced/model-generate', { method: 'POST', body: fd, credentials: 'include' })
    resultUrl.value = data?.data?.url || data?.data?.result_url || ''
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; errorMsg.value = err?.data?.msg || t('work_pages.product_render.error_render_failed') }
  finally { processing.value = false }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
<style scoped>
.render-workspace { max-width: 800px; margin: 0 auto; }
.upload-card { background: var(--bg-card); border: 2px dashed var(--border-light); border-radius: var(--radius-xl); padding: 32px; text-align: center; cursor: pointer; transition: border-color var(--transition-base), background var(--transition-base); }
.upload-card:hover { border-color: var(--brand); background: var(--brand-light); }
.upload-icon { font-size: 48px; margin-bottom: 8px; }
.upload-card p { font-weight: 600; color: var(--text-primary); margin: 4px 0; }
.upload-card span { font-size: 12px; color: var(--text-muted); }
.btn-upload { margin-top: 12px; padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; }
.hidden-input { display: none; }
.render-options { margin: 24px 0; }
.render-options h3 { font-size: 15px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary); }
.option-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.option-card { padding: 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 14px; text-align: center; transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast); }
.option-card:hover, .option-card.selected { border-color: var(--brand); background: var(--brand-light); color: var(--brand); font-weight: 600; }
.btn-generate { width: 100%; padding: 14px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-md); font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 24px; transition: transform var(--transition-fast), box-shadow var(--transition-fast); }
.btn-generate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
.btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
.result-area { margin-top: 24px; text-align: center; padding: 24px; background: var(--bg-card); border-radius: var(--radius-lg); }
.result-area p { color: var(--text-muted); }
.result-area h3 { margin-bottom: 12px; }
.result-img { max-width: 100%; border-radius: var(--radius-md); }
.error-msg { margin-top: 12px; color: var(--danger); font-size: 13px; text-align: center; }
</style>
