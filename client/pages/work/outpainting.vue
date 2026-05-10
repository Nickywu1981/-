<template>
  <WorkLayout title="画面扩展" subtitle="AI 智能向外扩展画面边界">
    <div class="outpaint-workspace">
      <div class="upload-section">
        <div class="upload-card" @click="triggerUpload">
          <div class="upload-icon">↔️</div>
          <p>{{ uploadedFile ? uploadedFile.name : '上传图片' }}</p>
          <span>JPG/PNG，最大 20MB</span>
          <button class="btn-upload">{{ uploadedFile ? '更换图片' : '选择文件' }}</button>
        </div>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png" class="hidden-input" @change="onFileChange" />
      </div>
      <div class="direction-select">
        <h3>扩展方向</h3>
        <div class="direction-grid">
          <button v-for="d in directions" :key="d.key" class="dir-btn" :class="{active: activeDir === d.key}" @click="activeDir = d.key">{{ d.label }}</button>
        </div>
      </div>
      <button class="btn-generate" :disabled="!uploadedFile || processing" @click="startOutpaint">
        {{ processing ? '扩展中...' : '开始扩展' }}
      </button>
      <div class="result-area" v-if="resultUrl">
        <h3>扩展结果</h3>
        <img loading="lazy" :src="resultUrl" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
      </div>
      <div v-else class="result-area"><p>画面扩展结果将在此显示</p></div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </div>
  </WorkLayout>
</template>
<script setup lang="ts">
const directions = [{key:'all',label:'四周'},{key:'top',label:'向上'},{key:'bottom',label:'向下'},{key:'left',label:'向左'},{key:'right',label:'向右'}]
const activeDir = ref('all')
const uploadedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const processing = ref(false)
const resultUrl = ref('')
const errorMsg = ref('')

function triggerUpload() { fileInput.value?.click() }
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadedFile.value = file
}

async function startOutpaint() {
  if (!uploadedFile.value) return
  processing.value = true; errorMsg.value = ''; resultUrl.value = ''
  try {
    const formData = new FormData()
    formData.append('image', uploadedFile.value)
    formData.append('direction', activeDir.value)
    const data: any = await $fetch('/api/advanced/outpaint', { method: 'POST', body: formData, credentials: 'include' })
    resultUrl.value = data?.data?.url || data?.data?.result_url || ''
  } catch(e: any) { errorMsg.value = e.data?.msg || '扩展失败' }
  processing.value = false
}
</script>
<style scoped>
.outpaint-workspace { max-width: 800px; margin: 0 auto; }
.upload-card { background: var(--bg-card); border: 2px dashed var(--border-light); border-radius: var(--radius-xl); padding: 32px; text-align: center; cursor: pointer; transition: border-color var(--transition-base), background var(--transition-base); }
.upload-card:hover { border-color: var(--brand); background: var(--brand-light); }
.upload-icon { font-size: 40px; margin-bottom: 8px; }
.upload-card p { font-weight: 600; color: var(--text-primary); margin: 4px 0; }
.upload-card span { font-size: 12px; color: var(--text-muted); }
.btn-upload { margin-top: 12px; padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; }
.hidden-input { display: none; }
.direction-select { margin: 24px 0; }
.direction-select h3 { font-size: 15px; font-weight: 600; margin-bottom: 10px; color: var(--text-primary); }
.direction-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.dir-btn { padding: 8px 20px; border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast); }
.dir-btn:hover, .dir-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }
.btn-generate { width: 100%; padding: 14px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-md); font-size: 15px; font-weight: 600; cursor: pointer; transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast); }
.btn-generate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
.btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
.result-area { margin-top: 24px; text-align: center; padding: 24px; background: var(--bg-card); border-radius: var(--radius-lg); }
.result-area p { color: var(--text-muted); }
.result-area h3 { margin-bottom: 12px; }
.result-img { max-width: 100%; border-radius: var(--radius-md); }
.error-msg { margin-top: 12px; color: var(--danger); font-size: 13px; text-align: center; }
</style>
