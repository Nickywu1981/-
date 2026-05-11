<template>
  <div class="ent-login">
    <div class="login-card">
      <h1>企业/代理登录</h1>
      <p class="subtitle">Movio AI 企业服务中心</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>手机号/邮箱</label>
          <input v-model="account" type="text" placeholder="请输入手机号或邮箱" required />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" required />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="links">
        <NuxtLink to="/enterprise/register">还没有企业账号？立即入驻</NuxtLink>
      </div>
      <div class="links">
        <NuxtLink to="/login">C端用户登录</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
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
      error.value = res.msg || '登录失败';
    }
  } catch (e) {
    error.value = e.data?.msg || '登录失败，请检查网络';
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
