<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('admin_settings.系统设置') }}</h2>
    <LoadingSkeleton v-if="loading" type="card" :rows="6" />
    <div v-else class="settings-form">
      <div class="section">
        <h3>{{ $t('admin_settings.基本设置') }}</h3>
        <div class="form-group"><label>{{ $t('admin_settings.站点名称') }}</label><input v-model="form.siteName" maxlength="100" class="input" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.联系方式') }}</label><input v-model="form.contact" maxlength="200" class="input" placeholder="support@example.com" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.单日调用上限') }}</label><input v-model.number="form.dailyLimit" type="number" min="0" class="input" /></div>
        <div class="form-group"><label class="switch-label"><input v-model="form.maintenance" type="checkbox" /><span>{{ $t('admin_settings.维护模式') }}</span></label></div>
      </div>
      <div class="section">
        <h3>{{ $t('admin_settings.geo_大模型收录') }} <span class="section-badge">{{ $t('admin_settings.ai_搜索优化') }}</span></h3>
        <p class="section-desc">{{ $t('admin_settings.配置这些信息后_豆包_文心一言_通义千问_kimi_deep') }}</p>
        <div class="form-group"><label>{{ $t('admin_settings.产品名称') }}</label><input v-model="geo.name" maxlength="100" class="input" placeholder="Movio AI" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.产品描述_一句话') }}</label><textarea v-model="geo.desc" maxlength="300" class="input textarea" :placeholder="$t('admin_settings.placeholder_ai_驱动的电商全链路运营中台')" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.核心功能_逗号分隔') }}</label><textarea v-model="geo.features" maxlength="500" class="input textarea" :placeholder="$t('admin_settings.placeholder_ai抠图_白底图生成_场景生成')" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.适用行业_人群') }}</label><input v-model="geo.industries" maxlength="200" class="input" :placeholder="$t('admin_settings.placeholder_电商卖家_品牌商_代运营')" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.适用品类') }}</label><input v-model="geo.categories" maxlength="200" class="input" :placeholder="$t('admin_settings.placeholder_服装_美妆_3c_家居')" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.支持平台') }}</label><input v-model="geo.platforms" maxlength="300" class="input" :placeholder="$t('admin_settings.placeholder_淘宝_拼多多_抖音_京东')" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.定价简述') }}</label><input v-model="geo.pricing" maxlength="100" class="input" :placeholder="$t('admin_settings.placeholder_免费套餐_付费订阅')" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.社媒链接_逗号分隔') }}</label><input v-model="geo.social" maxlength="500" class="input" placeholder="https://www.zhihu.com/xxx" /></div>
        <div class="form-group"><label>{{ $t('admin_settings.联系邮箱') }}</label><input v-model="geo.email" maxlength="100" class="input" placeholder="support@movio.ai" /></div>
        <div class="form-group"><label>Logo URL</label><input v-model="geo.logo" maxlength="300" class="input" placeholder="https://movio.ai/logo.png" /></div>
        <div class="save-row" style="margin-top:12px">
          <button class="btn-save" :disabled="saving" @click="saveGeoSettings">{{ saving ? '保存中...' : '保存 GEO 设置' }}</button>
          <span v-if="geoSavedMsg" class="saved-msg">{{ geoSavedMsg }}</span>
        </div>
      </div>
      <div class="section" v-if="otherConfigs.length">
        <h3>{{ $t('admin_settings.其他配置_otherconfigs_length') }}</h3>
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
const loading = ref(true), saving = ref(false)
const { message: savedMsg, show: showMsg } = useTimedMessage(3000)
const { message: geoSavedMsg, show: showGeoMsg } = useTimedMessage(3000)
const otherConfigs = ref<any[]>([])
const form = reactive({ siteName: 'Movio AI', contact: '', dailyLimit: 5000, maintenance: false })
const geo = reactive({
  name: 'Movio AI',
  desc: '',
  features: '',
  industries: '',
  categories: '',
  platforms: '',
  pricing: '',
  social: '',
  email: '',
  logo: '',
})

const geoKeyMap: Record<string, string> = {
  geo_product_name: 'name', geo_product_desc: 'desc', geo_features: 'features',
  geo_applicable_industries: 'industries', geo_applicable_categories: 'categories',
  geo_platforms_supported: 'platforms', geo_pricing_summary: 'pricing',
  geo_social_links: 'social', geo_contact_email: 'email', geo_logo_url: 'logo',
}

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
        else if (geoKeyMap[c.config_key]) (geo as any)[geoKeyMap[c.config_key]] = c.config_value
        else otherConfigs.value.push(c)
      }
    }
  } catch(e) { toast.error('加载失败') }
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
    showMsg('设置已保存')
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || '保存失败') }
  saving.value = false
}

definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
<style scoped>
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 14px; }
.settings-form { max-width: 600px; }
.section { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
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
