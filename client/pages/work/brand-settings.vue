<template>
  <WorkLayout title="品牌统一配置" subtitle="一键设置品牌VI/水印/角标，全局统一应用到全部素材" :steps="steps" :current-step="currentStep">
    <!-- Input: brand settings form -->
    <div v-if="task.status !== 2">
      <div class="ws-section"><div class="ws-section__title">品牌信息</div>
        <div class="form-grid"><div class="form-group"><label>品牌名称</label><input v-model="form.brandName" class="input" placeholder="输入品牌名称" maxlength="100" /></div>
        <div class="form-group"><label>品牌Logo</label><div class="upload-zone" @click="uploadLogo" tabindex="0" role="button" @keydown.enter="uploadLogo" @keydown.space.prevent="uploadLogo">
          <span v-if="!form.logoUrl">📷 上传Logo</span>
          <img loading="lazy" v-else :src="form.logoUrl" alt="品牌Logo" style="max-width:120px;max-height:60px" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        </div>
        <p v-if="logoUploading" class="hint">上传中...</p>
        <input ref="logoInput" type="file" accept="image/*" hidden @change="onLogoChange" />
        </div></div>
      </div>
      <div class="ws-section"><div class="ws-section__title">水印设置</div>
        <div class="form-grid"><div class="form-group"><label>水印类型</label><select v-model="form.watermarkType" class="input"><option value="text">文字水印</option><option value="image">图片水印</option><option value="none">无水印</option></select></div>
        <div class="form-group" v-if="form.watermarkType==='text'"><label>水印文字</label><input v-model="form.watermarkText" class="input" placeholder="品牌名称或网址" maxlength="200" /></div>
        <div class="form-group"><label>位置</label><select v-model="form.watermarkPosition" class="input"><option value="bottomRight">右下角</option><option value="bottomLeft">左下角</option><option value="topRight">右上角</option><option value="center">居中</option></select></div>
        <div class="form-group"><label>透明度</label><input v-model="form.watermarkOpacity" type="range" min="0" max="100" class="input" /><span>{{ form.watermarkOpacity }}%</span></div></div>
      </div>
      <div class="ws-section"><div class="ws-section__title">营销角标</div>
        <div class="checkbox-row"><label v-for="b in badgeOptions" :key="b.value" class="checkbox-label"><input type="checkbox" v-model="form.badges" :value="b.value" /> {{ b.label }}</label></div>
      </div>

      <!-- Processing / Error -->
      <div v-if="task.status===1" class="progress-box"><div class="spinner"/><p>正在保存品牌配置...</p></div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <button class="btn-primary" @click="saveSettings" :disabled="task.status===1">保存品牌配置</button>
    </div>

    <!-- Output: success -->
    <div v-else class="result-box">
      <h3>品牌配置已保存</h3>
      <div class="preview-box" style="position:relative;display:inline-block">
        <img loading="lazy" :src="previewUrl || '/images/placeholder.png'" alt="品牌配置预览" style="max-width:400px;border-radius:12px" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <span v-if="form.watermarkType==='text' && form.watermarkText" style="position:absolute;bottom:16px;right:16px;color:white;opacity:0.7;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;font-size:13px">{{ form.watermarkText }}</span>
      </div>
      <div style="margin-top:16px">
        <button class="btn-outline" @click="task.status=0; errorMsg=''">继续编辑</button>
      </div>
    </div>
  </WorkLayout>
</template>
<script setup lang="ts">

const toast = useToast()

const steps = ['品牌信息','水印设置','角标设置','确认保存'], currentStep = ref(0)
const form = reactive({ brandName:'', logoUrl:'', watermarkType:'text', watermarkText:'', watermarkPosition:'bottomRight', watermarkOpacity:30, badges:[] })
const badgeOptions = [{value:'hot',label:'热门'},{value:'new',label:'新品'},{value:'sale',label:'特惠'},{value:'free_shipping',label:'包邮'},{value:'limited',label:'限时'}]
const task = reactive({ status:0, polling:false, progressMsg:'' })
const previewUrl = ref(''), errorMsg = ref('')
const logoInput = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)

const saveSettings = async () => {
  if (!form.brandName.trim()) { toast.warn('请输入品牌名称'); return }
  task.status = 1
  task.progressMsg = '保存中...'
  errorMsg.value = ''
  try {
    const res: any = await $fetch('/api/brand', { method: 'PUT', body: { name: form.brandName, logo: form.logoUrl, watermarkType: form.watermarkType, watermarkText: form.watermarkText, watermarkPosition: form.watermarkPosition, watermarkOpacity: form.watermarkOpacity, badges: form.badges } })
    if (res?.code === 200 || res?.success || res?.data) {
      task.status = 2
      toast.success('品牌配置已保存')
    } else {
      task.status = 0
      errorMsg.value = (res as any)?.msg || '保存失败，请重试'
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    task.status = 0
    errorMsg.value = err?.data?.msg || err.message || '保存失败'
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
    if (form.logoUrl) toast.success('Logo 上传成功')
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || 'Logo 上传失败')
  } finally { logoUploading.value = false }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
