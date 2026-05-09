<template>
  <AdminLayout>
    <h2 class="ptitle">系统设置</h2>
    <LoadingSkeleton v-if="loading" type="card" :rows="6" />
    <div v-else class="settings-form">
      <div class="section">
        <h3>基本设置</h3>
        <div class="form-group"><label>站点名称</label><input v-model="form.siteName" class="input" /></div>
        <div class="form-group"><label>联系方式</label><input v-model="form.contact" class="input" placeholder="support@example.com" /></div>
        <div class="form-group"><label>单日调用上限</label><input v-model.number="form.dailyLimit" type="number" class="input" /></div>
        <div class="form-group"><label class="switch-label"><input v-model="form.maintenance" type="checkbox" /><span>维护模式</span></label></div>
      </div>
      <div class="section" v-if="otherConfigs.length">
        <h3>其他配置 ({{ otherConfigs.length }})</h3>
        <div v-for="c in otherConfigs" :key="c.id" class="other-item">
          <span class="other-key">{{ c.config_key }}</span>
          <span class="other-val">{{ truncate(c.config_value, 60) }}</span>
          <span class="other-type">{{ c.config_type }}</span>
        </div>
      </div>
      <div class="save-row">
        <button class="btn-save" :disabled="saving" @click="saveSettings">{{ saving ? '保存中...' : '保存设置' }}</button>
        <span v-if="savedMsg" class="saved-msg">{{ savedMsg }}</span>
      </div>
    </div>
  </AdminLayout>
</template>
<script setup lang="ts">
import { truncate } from '@/utils/format';

const toast = useToast()
const loading = ref(true), saving = ref(false), savedMsg = ref('')
const otherConfigs = ref<any[]>([])
const form = reactive({ siteName: 'Movio AI', contact: '', dailyLimit: 5000, maintenance: false })

onMounted(async () => {
  try {
    const data: any = await $fetch('/api/admin/site-config', { credentials: 'include' })
    const configs = data?.data?.list || data?.data || []
    if (Array.isArray(configs)) {
      const knownKeys = ['site_name', 'contact_email', 'daily_limit', 'maintenance_mode']
      for (const c of configs) {
        if (c.config_key === 'site_name') form.siteName = c.config_value
        else if (c.config_key === 'contact_email') form.contact = c.config_value
        else if (c.config_key === 'daily_limit') form.dailyLimit = Number(c.config_value) || 5000
        else if (c.config_key === 'maintenance_mode') form.maintenance = c.config_value === 'true' || c.config_value === '1'
        else otherConfigs.value.push(c)
      }
    }
  } catch(e) { /* empty */ }
  loading.value = false
})

async function saveSettings() {
  saving.value = true; savedMsg.value = ''
  const items = [
    { key: 'site_name', value: form.siteName, type: 'text', description: '站点名称' },
    { key: 'contact_email', value: form.contact, type: 'text', description: '联系方式' },
    { key: 'daily_limit', value: String(form.dailyLimit), type: 'text', description: '单日调用上限' },
    { key: 'maintenance_mode', value: String(form.maintenance), type: 'text', description: '维护模式' },
  ]
  try {
    for (const item of items) {
      const key = encodeURIComponent(item.key)
      await $fetch(`/api/admin/site-config/${key}`, { method: 'PUT', credentials: 'include', body: { config_value: item.value, config_type: item.type, description: item.description } })
    }
    savedMsg.value = '设置已保存'
    setTimeout(() => savedMsg.value = '', 3000)
  } catch(e: any) { toast.error(e.data?.msg || '保存失败') }
  saving.value = false
}
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 14px; }
.settings-form { max-width: 600px; }
.section { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.switch-label { display: flex !important; align-items: center; gap: 8px; cursor: pointer; font-size: 14px !important; color: var(--text-primary) !important; }
.switch-label input { width: 18px; height: 18px; accent-color: var(--brand); }
.input { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.save-row { display: flex; align-items: center; gap: 12px; }
.btn-save { padding: 10px 28px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.saved-msg { font-size: 13px; color: var(--success); }
.other-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--table-border); font-size: 13px; }
.other-key { font-weight: 600; color: var(--text-primary); min-width: 140px; font-family: monospace; font-size: 12px; }
.other-val { color: var(--text-muted); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.other-type { background: var(--tag-bg); padding: 2px 8px; border-radius: var(--radius-xs); font-size: 11px; color: var(--text-muted); }
</style>
