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

<script setup>
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

.login-card h1 {
  font-size: 24px;
  text-align: center;
  margin: 0 0 4px;
  color: #1a1a2e;
}

.subtitle {
  text-align: center;
  color: #888;
  margin: 0 0 28px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #667eea;
  outline: none;
}

.error-msg {
  color: #e74c3c;
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
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
  color: #667eea;
  font-size: 13px;
  text-decoration: none;
}
</style>
