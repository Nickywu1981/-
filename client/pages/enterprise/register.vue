<template>
  <div class="ent-register">
    <div class="register-card">
      <h1>企业入驻</h1>
      <p class="subtitle">开通企业账号，享受团队协作与白标定制</p>

      <form @submit.prevent="handleRegister">
        <div class="form-row">
          <div class="form-group">
            <label>企业名称 <span class="required">*</span></label>
            <input v-model="form.name" placeholder="请输入企业名称" required />
          </div>
          <div class="form-group">
            <label>企业编码 <span class="required">*</span></label>
            <input v-model="form.code" placeholder="英文/数字组合" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>联系人姓名 <span class="required">*</span></label>
            <input v-model="form.contactName" placeholder="请输入真实姓名" required />
          </div>
          <div class="form-group">
            <label>手机号码 <span class="required">*</span></label>
            <input v-model="form.contactPhone" placeholder="请输入手机号" required />
          </div>
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="form.contactEmail" type="email" placeholder="请输入邮箱" />
        </div>
        <div class="form-group">
          <label>登录密码 <span class="required">*</span></label>
          <input v-model="form.password" type="password" placeholder="至少6位" required minlength="6" />
        </div>
        <div class="form-group">
          <label>域名（可选，白标功能）</label>
          <input v-model="form.domain" placeholder="例如: ai.yourcompany.com" />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <div v-if="success" class="success-msg">{{ success }}</div>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '提交中...' : '立即入驻' }}
        </button>
      </form>

      <div class="links">
        <NuxtLink to="/enterprise/login">已有企业账号？立即登录</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount } from 'vue'
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
      success.value = '入驻成功！3秒后跳转登录页...';
      redirectTimer.value = setTimeout(() => router.push('/enterprise/login'), 3000);
    } else {
      error.value = res.msg || '入驻失败';
    }
  } catch (e) {
    error.value = e?.data?.msg || '入驻失败，请检查网络';
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 0;
}

.register-card {
  width: 560px;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}

.register-card h1 { font-size: 24px; text-align: center; margin: 0 0 4px; color: #1a1a2e; }
.subtitle { text-align: center; color: #888; margin: 0 0 28px; font-size: 14px; }

.form-row { display: flex; gap: 16px; }
.form-row .form-group { flex: 1; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; color: #333; margin-bottom: 6px; font-weight: 500; }
.form-group input { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.form-group input:focus { border-color: #667eea; outline: none; }
.required { color: #e74c3c; }

.error-msg { color: #e74c3c; font-size: 13px; margin: 8px 0; text-align: center; }
.success-msg { color: #27ae60; font-size: 13px; margin: 8px 0; text-align: center; }

.submit-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.links { text-align: center; margin-top: 16px; }
.links a { color: #667eea; font-size: 13px; text-decoration: none; }
</style>
