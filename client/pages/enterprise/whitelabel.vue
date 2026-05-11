<template>
  <div class="ent-whitelabel">
    <h1 class="page-title">{{ $t('enterprise.whitelabel.title') }}</h1>
    <p class="subtitle">{{ $t('enterprise.whitelabel.subtitle') }}</p>

    <div v-if="loading" class="empty">{{ $t('enterprise.common.loading') }}</div>

    <div v-else class="form-card">
      <div class="form-group">
        <label>{{ $t('enterprise.whitelabel.siteName') }}</label>
        <input v-model="form.siteName" :placeholder="$t('enterprise.whitelabel.siteNamePlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('enterprise.whitelabel.logoUrl') }}</label>
        <input v-model="form.logo" placeholder="https://your-cdn.com/logo.png" />
        <div class="preview-box" v-if="form.logo">
          <img :src="form.logo" alt="Logo Preview" class="logo-preview" @error="form.logo = ''" />
        </div>
      </div>
      <div class="form-group">
        <label>{{ $t('enterprise.whitelabel.themeColor') }}</label>
        <div class="color-row">
          <input v-model="form.primaryColor" placeholder="#667eea" class="color-input" />
          <input type="color" v-model="form.primaryColor" class="color-picker" />
        </div>
        <div class="color-preview" :style="{ background: form.primaryColor || '#667eea' }"></div>
      </div>
      <div class="form-group">
        <label>{{ $t('enterprise.whitelabel.customDomain') }}</label>
        <input v-model="form.domain" placeholder="ai.yourcompany.com" />
      </div>

      <div v-if="saveMsg" :class="['msg', saveOk ? 'success' : 'error']">{{ saveMsg }}</div>

      <button class="btn-primary" @click="handleSave" :disabled="saving">
        {{ saving ? $t('enterprise.common.saving') : $t('enterprise.whitelabel.saveBtn') }}
      </button>
    </div>
  </div>
</template>

<script setup>
const toast = useToast();
const { t } = useI18n();
const form = ref({ siteName: '', logo: '', primaryColor: '#667eea', domain: '' });
const loading = ref(true);
const saving = ref(false);
const saveMsg = ref('');
const saveOk = ref(false);

onMounted(async () => {
  try {
    const res = await $fetch('/api/enterprise/whitelabel', { credentials: 'include' });
    if (res.data && Object.keys(res.data).length) {
      form.value = { ...form.value, ...res.data };
    }
  } catch (e) { toast.error(t('enterprise.whitelabel.loadFailed')); }
  finally { loading.value = false; }
});

async function handleSave() {
  saveMsg.value = '';
  saving.value = true;
  try {
    await $fetch('/api/enterprise/whitelabel', { method: 'PUT', body: form.value, credentials: 'include' });
    saveOk.value = true;
    saveMsg.value = t('enterprise.whitelabel.saveSuccess');
  } catch (e) {
    saveOk.value = false;
    saveMsg.value = e?.data?.msg || t('enterprise.whitelabel.saveFailed');
  } finally { saving.value = false; }
}

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 8px; color: #1a1a2e; }
.subtitle { color: #666; margin: 0 0 28px; font-size: 14px; }

.form-card { background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); max-width: 560px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; color: #333; margin-bottom: 6px; font-weight: 500; }
.form-group input[type="text"] { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }

.color-row { display: flex; gap: 10px; align-items: center; }
.color-input { flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.color-picker { width: 44px; height: 44px; border: none; border-radius: 8px; cursor: pointer; }
.color-preview { width: 100%; height: 32px; border-radius: 8px; margin-top: 8px; transition: background 0.2s; }

.preview-box { margin-top: 8px; padding: 12px; background: #f5f5f5; border-radius: 8px; }
.logo-preview { max-height: 48px; }

.msg { padding: 10px; border-radius: 8px; font-size: 14px; margin-bottom: 14px; }
.msg.success { background: #e8f5e9; color: #27ae60; }
.msg.error { background: #fbe9e7; color: #e74c3c; }

.btn-primary { padding: 12px 28px; background: #667eea; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; }
.btn-primary:disabled { opacity: 0.6; }
</style>
