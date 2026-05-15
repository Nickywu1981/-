<template>
  <div class="ent-login">
    <div class="login-card">
      <h1>{{ $t('enterprise.login.title') }}</h1>
      <p class="subtitle">{{ $t('enterprise.login.subtitle') }}</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>{{ $t('enterprise.login.account') }}</label>
          <input v-model="account" type="text" :placeholder="$t('enterprise.login.accountPlaceholder')" required />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.login.password') }}</label>
          <input v-model="password" type="password" :placeholder="$t('enterprise.login.passwordPlaceholder')" required />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? $t('enterprise.login.loggingIn') : $t('enterprise.login.loginBtn') }}
        </button>
      </form>

      <div class="links">
        <NuxtLink to="/enterprise/register">{{ $t('enterprise.login.noAccount') }}</NuxtLink>
      </div>
      <div class="links">
        <NuxtLink to="/login">{{ $t('enterprise.login.cUserLogin') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const account = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    const res = await $fetch('/api/enterprise/login', {
      method: 'POST',
      body: { account: account.value, password: password.value },
      credentials: 'include',
    });
    if (res.code === 200) {
      router.push('/enterprise/dashboard');
    } else {
      error.value = res.msg || t('enterprise.login.loginFailed');
    }
  } catch (e) {
    error.value = e?.data?.msg || t('enterprise.login.loginNetworkError');
  } finally {
    loading.value = false;
  }
}

definePageMeta({ layout: false });
</script>

<style scoped>
.ent-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-brand);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
}

.login-card h1 {
  font-size: 24px;
  text-align: center;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.subtitle {
  text-align: center;
  color: var(--text-muted);
  margin: 0 0 28px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: var(--input-focus-border);
  outline: none;
}

.error-msg {
  color: var(--color-danger-500);
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: var(--gradient-brand);
  color: var(--text-on-brand);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.links {
  text-align: center;
  margin-top: 16px;
}

.links a {
  color: var(--text-link);
  font-size: 13px;
  text-decoration: none;
}
</style>
