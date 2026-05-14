<template>
  <div class="ent-settings">
    <h1 class="page-title">{{ $t('enterprise.settings.title') }}</h1>

    <div v-if="loading" class="empty">{{ $t('enterprise.common.loading') }}</div>
    <div v-else-if="loadError" class="empty">
      <p>{{ $t('enterprise.settings.loadError') }}</p>
      <button class="btn" @click="loadProfile">{{ $t('enterprise.common.retry') }}</button>
    </div>

    <template v-else>
    <div class="form-card">
      <h2>{{ $t('enterprise.settings.enterpriseInfo') }}</h2>
      <div class="form-group">
        <label>{{ $t('enterprise.settings.enterpriseName') }}</label>
        <input v-model="profile.name" :placeholder="$t('enterprise.settings.enterpriseName')" />
      </div>
      <div class="form-group">
        <label>Logo URL</label>
        <input v-model="profile.logo" placeholder="https://..." />
      </div>
      <div class="form-group">
        <label>{{ $t('enterprise.settings.contactName') }}</label>
        <input v-model="profile.contactName" :placeholder="$t('enterprise.settings.contactPlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('enterprise.settings.contactEmail') }}</label>
        <input v-model="profile.contactEmail" type="email" :placeholder="$t('enterprise.settings.emailPlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ $t('enterprise.settings.customDomain') }}</label>
        <input v-model="profile.domain" placeholder="ai.yourcompany.com" />
      </div>

      <div v-if="msg" :class="['msg', ok ? 'success' : 'error']">{{ msg }}</div>
      <button class="btn-primary" @click="handleSave" :disabled="saving">
        {{ saving ? $t('enterprise.common.saving') : $t('enterprise.settings.saveBtn') }}
      </button>
    </div>

    <div class="info-card">
      <h2>{{ $t('enterprise.settings.accountOverview') }}</h2>
      <div class="info-grid">
        <div class="info-item"><span class="label">{{ $t('enterprise.dashboard.enterpriseCode') }}</span><span>{{ profile.code }}</span></div>
        <div class="info-item"><span class="label">{{ $t('enterprise.dashboard.enterpriseType') }}</span><span>{{ typeLabel }}</span></div>
        <div class="info-item"><span class="label">{{ $t('enterprise.settings.currentPlan') }}</span><span>{{ profile.planType }}</span></div>
        <div class="info-item"><span class="label">{{ $t('enterprise.dashboard.subAccounts') }}</span><span>{{ profile.userCount || 0 }}</span></div>
        <div class="info-item"><span class="label">{{ $t('enterprise.dashboard.accountBalance') }}</span><span>&yen;{{ profile.balance || 0 }}</span></div>
        <div class="info-item"><span class="label">{{ $t('enterprise.settings.expireTime') }}</span><span>{{ profile.expireTime || $t('enterprise.settings.expireNever') }}</span></div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
const { t } = useI18n();
const toast = useToast();
const profile = ref({});
const loading = ref(true);
const saving = ref(false);
const msg = ref('');
const ok = ref(false);
const loadError = ref(false);

const typeLabel = computed(() => {
  const map = { enterprise: t('enterprise.common.enterpriseLabel'), agent: t('enterprise.common.agentLabel'), partner: t('enterprise.common.partnerLabel') };
  return map[profile.value.type] || profile.value.type || '-';
});

onMounted(() => { loadProfile(); });
async function loadProfile() {
  loadError.value = false; loading.value = true;
  try {
    const res = await $fetch('/api/enterprise/profile', { credentials: 'include' });
    profile.value = res.data || res;
  } catch (e) { loadError.value = true; toast.error(t('enterprise.settings.loadFailed')); }
  finally { loading.value = false; }
};

async function handleSave() {
  msg.value = '';
  saving.value = true;
  try {
    await $fetch('/api/enterprise/profile', {
      method: 'PUT',
      body: {
        name: profile.value.name,
        logo: profile.value.logo,
        domain: profile.value.domain,
        contactName: profile.value.contactName,
        contactEmail: profile.value.contactEmail,
      },
      credentials: 'include',
    });
    ok.value = true;
    msg.value = t('enterprise.settings.saveSuccess');
  } catch (e) {
    ok.value = false;
    msg.value = e?.data?.msg || t('enterprise.settings.saveFailed');
  } finally { saving.value = false; }
}

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 28px; color: var(--text-primary); }

.form-card, .info-card { background: var(--bg-card); border-radius: 16px; padding: 28px; box-shadow: var(--shadow-md); max-width: 560px; margin-bottom: 24px; }
.form-card h2, .info-card h2 { font-size: 16px; margin: 0 0 18px; color: var(--text-primary); }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input { width: 100%; padding: 10px 14px; border: 1px solid var(--input-border); border-radius: 8px; font-size: 14px; box-sizing: border-box; }

.msg { padding: 10px; border-radius: 8px; font-size: 14px; margin-bottom: 14px; }
.msg.success { background: var(--success-bg); color: var(--color-success-500); }
.msg.error { background: var(--danger-bg); color: var(--color-danger-500); }

.btn-primary { padding: 12px 28px; background: var(--color-brand-600); color: var(--text-on-brand); border: none; border-radius: 8px; cursor: pointer; font-size: 15px; }
.btn-primary:disabled { opacity: 0.6; }

.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.info-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-light); font-size: 14px; }
.info-item .label { color: var(--text-muted); }
</style>
