<template>
  <div class="ent-register">
    <div class="register-card">
      <h1>{{ $t('enterprise.register.title') }}</h1>
      <p class="subtitle">{{ $t('enterprise.register.subtitle') }}</p>

      <form @submit.prevent="handleRegister">
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('enterprise.register.enterpriseName') }} <span class="required">*</span></label>
            <input v-model="form.name" :placeholder="$t('enterprise.register.namePlaceholder')" required />
          </div>
          <div class="form-group">
            <label>{{ $t('enterprise.register.enterpriseCode') }} <span class="required">*</span></label>
            <input v-model="form.code" :placeholder="$t('enterprise.register.codePlaceholder')" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('enterprise.register.contactName') }} <span class="required">*</span></label>
            <input v-model="form.contactName" :placeholder="$t('enterprise.register.contactPlaceholder')" required />
          </div>
          <div class="form-group">
            <label>{{ $t('enterprise.register.phone') }} <span class="required">*</span></label>
            <input v-model="form.contactPhone" :placeholder="$t('enterprise.register.phonePlaceholder')" required />
          </div>
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.register.email') }}</label>
          <input v-model="form.contactEmail" type="email" :placeholder="$t('enterprise.register.emailPlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.register.password') }} <span class="required">*</span></label>
          <input v-model="form.password" type="password" :placeholder="$t('enterprise.register.passwordPlaceholder')" required minlength="6" />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.register.domain') }}</label>
          <input v-model="form.domain" :placeholder="$t('enterprise.register.domainPlaceholder')" />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <div v-if="success" class="success-msg">{{ success }}</div>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? $t('enterprise.register.submitting') : $t('enterprise.register.submitBtn') }}
        </button>
      </form>

      <div class="links">
        <NuxtLink to="/enterprise/login">{{ $t('enterprise.register.haveAccount') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n();
const form = ref({ name: '', code: '', contactName: '', contactPhone: '', contactEmail: '', password: '', domain: '' });
const loading = ref(false);
const error = ref('');
const success = ref('');
const router = useRouter();
const redirectTimer = ref(null);
onBeforeUnmount(() => { if (redirectTimer.value) clearTimeout(redirectTimer.value); });

async function handleRegister() {
  error.value = '';
  success.value = '';
  loading.value = true;
  try {
    const res = await $fetch('/api/enterprise/register', {
      method: 'POST',
      body: form.value,
      credentials: 'include',
    });
    if (res.code === 200) {
      success.value = t('enterprise.register.success');
      redirectTimer.value = setTimeout(() => router.push('/enterprise/login'), 3000);
    } else {
      error.value = res.msg || t('enterprise.register.failed');
    }
  } catch (e) {
    error.value = e?.data?.msg || t('enterprise.register.networkError');
  } finally {
    loading.value = false;
  }
}

definePageMeta({ layout: false });
</script>

<style scoped>
.ent-register {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-gradient);
  padding: 40px 0;
}

.register-card {
  width: 560px;
  padding: 40px;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

.register-card h1 { font-size: 24px; text-align: center; margin: 0 0 4px; color: var(--text-primary); }
.subtitle { text-align: center; color: var(--text-secondary); margin: 0 0 28px; font-size: 14px; }

.form-row { display: flex; gap: 16px; }
.form-row .form-group { flex: 1; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 6px; font-weight: 500; }
.form-group input { width: 100%; padding: 10px 14px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.form-group input:focus { border-color: var(--brand); outline: none; }
.required { color: var(--danger); }

.error-msg { color: var(--danger); font-size: 13px; margin: 8px 0; text-align: center; }
.success-msg { color: var(--success); font-size: 13px; margin: 8px 0; text-align: center; }

.submit-btn { width: 100%; padding: 12px; background: var(--brand-gradient); color: var(--text-on-brand); border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.links { text-align: center; margin-top: 16px; }
.links a { color: var(--brand); font-size: 13px; text-decoration: none; }
</style>
