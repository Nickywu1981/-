<template>
  <AdminLayout>
    <h2 class="ptitle">品牌配置</h2>
    <LoadingSkeleton v-if="loading" type="card" :rows="5" />
    <div v-else class="form-wrap">
      <div class="section">
        <h3>品牌信息</h3>
        <div class="form-group"><label>品牌名称</label><input v-model="form.brand_name" class="input" placeholder="如：Movio AI" /></div>
        <div class="form-group"><label>Logo URL</label><input v-model="form.logo_url" class="input" placeholder="https://..." /></div>
        <div class="form-group"><label>品牌主色</label><div class="color-row"><input v-model="form.primary_color" type="color" class="color-picker" /><code class="color-code">{{ form.primary_color }}</code></div></div>
      </div>
      <div class="section">
        <h3>水印设置</h3>
        <div class="form-group"><label class="switch-label"><input v-model="form.watermark_enabled" type="checkbox" /><span>启用水印</span></label></div>
        <div class="form-group"><label>水印透明度 ({{ form.watermark_opacity }}%)</label><input v-model.number="form.watermark_opacity" type="range" min="10" max="100" class="range-input" /></div>
        <div class="form-group"><label>水印位置</label>
          <select v-model="form.watermark_position" class="input">
            <option value="tl">左上</option><option value="tr">右上</option>
            <option value="bl">左下</option><option value="br">右下</option>
            <option value="center">居中</option>
          </select>
        </div>
      </div>
      <button class="btn-save" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存配置' }}</button>
      <span v-if="savedMsg" class="saved-msg">{{ savedMsg }}</span>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const toast = useToast()
const loading = ref(true), saving = ref(false), savedMsg = ref('')
const form = reactive({ brand_name: '', logo_url: '', primary_color: '#7C3AED', watermark_enabled: false, watermark_opacity: 30, watermark_position: 'br' })

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/brand', { credentials: 'include' })
    if (data?.code === 200 && data.data) Object.assign(form, data.data)
  } catch(e) { /* empty */ }
  loading.value = false
})

async function save() {
  saving.value = true; savedMsg.value = ''
  try {
    const data: any = await $fetch('/api/brand', { method: 'PUT', credentials: 'include', body: form })
    savedMsg.value = data?.msg || '保存成功'
    setTimeout(() => savedMsg.value = '', 3000)
  } catch(e: any) { toast.error(e.data?.msg || '保存失败') }
  saving.value = false
}
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 14px; }
.form-wrap { max-width: 640px; }
.section { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.input { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.color-row { display: flex; align-items: center; gap: 10px; }
.color-picker { width: 40px; height: 36px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); cursor: pointer; padding: 2px; background: var(--bg-input); }
.color-code { font-size: 13px; color: var(--text-muted); background: var(--tag-bg); padding: 4px 10px; border-radius: var(--radius-xs); }
.switch-label { display: flex !important; align-items: center; gap: 8px; cursor: pointer; font-size: 14px !important; color: var(--text-primary) !important; }
.switch-label input { width: 18px; height: 18px; accent-color: var(--brand); }
.range-input { width: 100%; accent-color: var(--brand); }
.btn-save { padding: 10px 28px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.saved-msg { display: inline-block; margin-left: 12px; font-size: 13px; color: var(--success); }
</style>
