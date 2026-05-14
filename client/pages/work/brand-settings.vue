<template>
  <WorkLayout :title="$t('work_pages.brand_settings.title')" :subtitle="$t('work_pages.brand_settings.subtitle')" :steps="steps" :current-step="currentStep">
    <div v-if="task.status !== 2">
      <div class="ws-section"><div class="ws-section__title">{{ $t('work_pages.brand_settings.step_info') }}</div>
        <div class="form-grid"><div class="form-group"><label>{{ $t('work_pages.brand_settings.brand_name') }}</label><input v-model="form.brandName" class="input" :placeholder="$t('work_pages.brand_settings.brand_name_placeholder')" maxlength="100" /></div>
        <div class="form-group"><label>{{ $t('work_pages.brand_settings.brand_logo') }}</label><div class="upload-zone" @click="uploadLogo" tabindex="0" role="button" @keydown.enter="uploadLogo" @keydown.space.prevent="uploadLogo">
          <span v-if="!form.logoUrl">{{ $t('work_pages.brand_settings.upload_logo') }}</span>
          <img loading="lazy" v-else :src="form.logoUrl" :alt="$t('work_pages.brand_settings.logo_alt')" style="max-width:120px;max-height:60px" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        </div>
        <p v-if="logoUploading" class="hint">{{ $t('work_pages.brand_settings.uploading') }}</p>
        <input ref="logoInput" type="file" accept="image/*" hidden @change="onLogoChange" />
        </div></div>
      </div>
      <div class="ws-section"><div class="ws-section__title">{{ $t('work_pages.brand_settings.watermark_title') }}</div>
        <div class="form-grid"><div class="form-group"><label>{{ $t('work_pages.brand_settings.watermark_type') }}</label><select v-model="form.watermarkType" class="input"><option value="text">{{ $t('work_pages.brand_settings.watermark_text_type') }}</option><option value="image">{{ $t('work_pages.brand_settings.watermark_image_type') }}</option><option value="none">{{ $t('work_pages.brand_settings.watermark_none') }}</option></select></div>
        <div class="form-group" v-if="form.watermarkType==='text'"><label>{{ $t('work_pages.brand_settings.watermark_text') }}</label><input v-model="form.watermarkText" class="input" :placeholder="$t('work_pages.brand_settings.watermark_text_placeholder')" maxlength="200" /></div>
        <div class="form-group"><label>{{ $t('work_pages.brand_settings.watermark_position') }}</label><select v-model="form.watermarkPosition" class="input"><option value="bottomRight">{{ $t('work_pages.brand_settings.pos_bottom_right') }}</option><option value="bottomLeft">{{ $t('work_pages.brand_settings.pos_bottom_left') }}</option><option value="topRight">{{ $t('work_pages.brand_settings.pos_top_right') }}</option><option value="center">{{ $t('work_pages.brand_settings.pos_center') }}</option></select></div>
        <div class="form-group"><label>{{ $t('work_pages.brand_settings.watermark_opacity') }}</label><input v-model="form.watermarkOpacity" type="range" min="0" max="100" class="input" /><span>{{ form.watermarkOpacity }}%</span></div></div>
      </div>
      <div class="ws-section"><div class="ws-section__title">{{ $t('work_pages.brand_settings.badge_title') }}</div>
        <div class="checkbox-row"><label v-for="b in badgeOptions" :key="b.value" class="checkbox-label"><input type="checkbox" v-model="form.badges" :value="b.value" /> {{ b.label }}</label></div>
      </div>

      <div v-if="task.status===1" class="progress-box"><div class="spinner"/><p>{{ $t('work_pages.brand_settings.saving') }}</p></div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <button class="btn-primary" @click="saveSettings" :disabled="task.status===1">{{ $t('work_pages.brand_settings.save_btn') }}</button>
    </div>

    <div v-else class="result-box">
      <h3>{{ $t('work_pages.brand_settings.saved_title') }}</h3>
      <div class="preview-box" style="position:relative;display:inline-block">
        <img loading="lazy" :src="previewUrl || '/images/placeholder.png'" :alt="$t('work_pages.brand_settings.saved_preview_alt')" style="max-width:400px;border-radius:12px" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <span v-if="form.watermarkType==='text' && form.watermarkText" style="position:absolute;bottom:16px;right:16px;color:white;opacity:0.7;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;font-size:13px">{{ form.watermarkText }}</span>
      </div>
      <div style="margin-top:16px">
        <button class="btn-outline" @click="task.status=0; errorMsg=''">{{ $t('work_pages.brand_settings.continue_edit') }}</button>
      </div>
    </div>
  </WorkLayout>
</template>
<script setup lang="ts">const { t } = useI18n()


const toast = useToast()

const steps = computed(() => [t('work_pages.brand_settings.step_info'), t('work_pages.brand_settings.step_watermark'), t('work_pages.brand_settings.step_badge'), t('work_pages.brand_settings.step_save')])
const currentStep = ref(0)
const form = reactive({ brandName:'', logoUrl:'', watermarkType:'text', watermarkText:'', watermarkPosition:'bottomRight', watermarkOpacity:30, badges:[] })
const badgeOptions = computed(() => [{value:'hot',label:t('work_pages.brand_settings.badge_hot')},{value:'new',label:t('work_pages.brand_settings.badge_new')},{value:'sale',label:t('work_pages.brand_settings.badge_sale')},{value:'free_shipping',label:t('work_pages.brand_settings.badge_free_shipping')},{value:'limited',label:t('work_pages.brand_settings.badge_limited')}])
const task = reactive({ status:0, polling:false, progressMsg:'' })
const previewUrl = ref(''), errorMsg = ref('')
const logoInput = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)

const saveSettings = async () => {
  if (!form.brandName.trim()) { toast.warn(t('common.enter_brand_name')); return }
  task.status = 1
  task.progressMsg = t('work_pages.brand_settings.saving')
  errorMsg.value = ''
  try {
    const res: any = await $fetch('/api/brand', { method: 'PUT', body: { name: form.brandName, logo: form.logoUrl, watermarkType: form.watermarkType, watermarkText: form.watermarkText, watermarkPosition: form.watermarkPosition, watermarkOpacity: form.watermarkOpacity, badges: form.badges } })
    if (res?.code === 200 || res?.success || res?.data) {
      task.status = 2
      toast.success(t('common.brand_config_saved'))
    } else {
      task.status = 0
      errorMsg.value = (res as any)?.msg || t('work_pages.brand_settings.save_failed')
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    task.status = 0
    errorMsg.value = err?.data?.msg || err.message || t('work_pages.brand_settings.save_error')
    toast.error(errorMsg.value)
  }
}

const uploadLogo = () => { logoInput.value?.click() }

const onLogoChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  logoUploading.value = true
  try {
    const fd = new FormData(); fd.append('file', file)
    const res: any = await $fetch('/api/upload/image', { method: 'POST', body: fd })
    form.logoUrl = res.data?.url || res.url || ''
    if (form.logoUrl) toast.success(t('common.logo_upload_success'))
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || t('work_pages.brand_settings.logo_upload_failed'))
  } finally { logoUploading.value = false }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
