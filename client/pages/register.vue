<template>
  <div class="page">
    <div class="card">
      <h2>免费注册</h2>
      <p class="sub">新用户注册即送 50 算力点</p>

      <div class="mode-tabs">
        <button :class="{ active: mode === 'password' }" @click="mode = 'password'">密码注册</button>
        <button :class="{ active: mode === 'sms' }" @click="mode = 'sms'">手机注册</button>
        <button :class="{ active: mode === 'email' }" @click="mode = 'email'">邮箱注册</button>
      </div>

      <!-- 密码注册 -->
      <form v-if="mode === 'password'" @submit.prevent="handleRegister">
        <label for="reg-username" class="sr-only">用户名</label>
        <input id="reg-username" v-model="username" type="text" placeholder="用户名" required />
        <label for="reg-password" class="sr-only">密码</label>
        <input id="reg-password" v-model="password" type="password" placeholder="密码（至少8位）" required minlength="8" autocomplete="new-password" />
        <label for="reg-nickname" class="sr-only">昵称</label>
        <input id="reg-nickname" v-model="nickname" type="text" placeholder="昵称（选填）" />
        <button type="submit" class="btn" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
      </form>

      <!-- 手机注册 -->
      <form v-if="mode === 'sms'" @submit.prevent="handleSmsRegister">
        <label for="reg-sms-phone" class="sr-only">手机号</label>
        <input id="reg-sms-phone" v-model="smsPhone" type="tel" placeholder="手机号" required />
        <div class="sms-row">
          <label for="reg-sms-code" class="sr-only">验证码</label>
          <input id="reg-sms-code" v-model="smsCode" type="text" placeholder="验证码" required maxlength="6" />
          <button type="button" class="btn-sms" :disabled="smsCountdown > 0" @click="sendSmsCode('register')">
            {{ smsCountdown > 0 ? `${smsCountdown}秒` : '获取验证码' }}
          </button>
        </div>
        <label for="reg-sms-nickname" class="sr-only">昵称</label>
        <input id="reg-sms-nickname" v-model="smsNickname" type="text" placeholder="昵称（选填）" />
        <button type="submit" class="btn" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
      </form>

      <!-- 邮箱注册 -->
      <form v-if="mode === 'email'" @submit.prevent="handleEmailRegister">
        <label for="reg-email" class="sr-only">邮箱地址</label>
        <input id="reg-email" v-model="emailAddr" type="email" placeholder="邮箱地址" required />
        <div class="sms-row">
          <label for="reg-email-code" class="sr-only">验证码</label>
          <input id="reg-email-code" v-model="emailCode" type="text" placeholder="验证码" required maxlength="6" />
          <button type="button" class="btn-sms" :disabled="emailCountdown > 0" @click="sendEmailCode('register')">
            {{ emailCountdown > 0 ? `${emailCountdown}秒` : '获取验证码' }}
          </button>
        </div>
        <label for="reg-email-nickname" class="sr-only">昵称</label>
        <input id="reg-email-nickname" v-model="emailNickname" type="text" placeholder="昵称（选填）" />
        <button type="submit" class="btn" :disabled="loading">{{ loading ? '注册中...' : '注册' }}</button>
      </form>

      <p class="msg" :class="{ error: msgErr }" v-if="msg">{{ msg }}</p>
      <p class="link">已有账号？<NuxtLink to="/login">登录</NuxtLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCountdown } from '~/composables/useCountdown'
definePageMeta({ layout: 'landing' })

import { useAuthStore } from '~/stores/useAuthStore'

const mode = ref('password');
const username = ref('');
const password = ref('');
const nickname = ref('');
const smsPhone = ref('');
const smsCode = ref('');
const smsNickname = ref('');
const emailAddr = ref('');
const emailCode = ref('');
const emailNickname = ref('');
const loading = ref(false);
const msg = ref('');
const msgErr = ref(false);

const { countdown: smsCountdown, start: startSmsCd } = useCountdown(60)
const { countdown: emailCountdown, start: startEmailCd } = useCountdown(60)

function randomPassword() {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

async function handleRegister() {
  loading.value = true; msg.value = '';
  try {
    const isEmail = username.value.includes('@')
    const body = isEmail ? { email: username.value, password: password.value, nickname: nickname.value }
                         : { phone: username.value, password: password.value, nickname: nickname.value }
    const authStore = useAuthStore()
    await authStore.register(body)
    navigateTo('/workspace')
  } catch (e: any) { msg.value = e.data?.msg || e.message || '注册失败'; msgErr.value = true; }
  finally { loading.value = false; }
}

async function handleSmsRegister() {
  if (!smsPhone.value || !smsCode.value) { msg.value = '请填写手机号和验证码'; msgErr.value = true; return; }
  loading.value = true; msg.value = '';
  try {
    await $fetch('/api/sms/verify-code', { method: 'POST', body: { phone: smsPhone.value, scene: 'register', code: smsCode.value } });
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { phone: smsPhone.value, password: randomPassword(), nickname: smsNickname.value || smsPhone.value },
      credentials: 'include',
    });
    await useAuthStore().fetchUser();
    navigateTo('/workspace');
  } catch (e: any) { msg.value = e.data?.msg || '注册失败'; msgErr.value = true; }
  finally { loading.value = false; }
}

async function sendSmsCode(scene: string) {
  if (!smsPhone.value) { msg.value = '请输入手机号'; msgErr.value = true; return; }
  msg.value = '';
  try {
    await $fetch('/api/sms/send-code', { method: 'POST', body: { phone: smsPhone.value, scene } });
    startSmsCd(60);
    msg.value = '验证码已发送'; msgErr.value = false;
  } catch (e: any) { msg.value = e.data?.msg || '发送失败'; msgErr.value = true; }
}

async function handleEmailRegister() {
  if (!emailAddr.value || !emailCode.value) { msg.value = '请填写邮箱和验证码'; msgErr.value = true; return; }
  loading.value = true; msg.value = '';
  try {
    await $fetch('/api/email/verify-code', { method: 'POST', body: { email: emailAddr.value, code: emailCode.value } });
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email: emailAddr.value, password: randomPassword(), nickname: emailNickname.value || emailAddr.value },
      credentials: 'include',
    });
    await useAuthStore().fetchUser();
    navigateTo('/workspace');
  } catch (e: any) { msg.value = e.data?.msg || '注册失败'; msgErr.value = true; }
  finally { loading.value = false; }
}

async function sendEmailCode(scene: string) {
  if (!emailAddr.value) { msg.value = '请输入邮箱'; msgErr.value = true; return; }
  msg.value = '';
  try {
    await $fetch('/api/email/send-code', { method: 'POST', body: { email: emailAddr.value, scene } });
    startEmailCd(60);
    msg.value = '验证码已发送'; msgErr.value = false;
  } catch (e: any) { msg.value = e.data?.msg || '发送失败'; msgErr.value = true; }
}
</script>

<style scoped>
.page {
  display: flex; justify-content: center; align-items: center;
  min-height: calc(100vh - 200px); padding: 48px 16px;
  background: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.04) 0%, transparent 60%);
}
.card {
  background: var(--bg-card); padding: 40px; border-radius: var(--radius-xl);
  border: 1px solid var(--border-card); width: 100%; max-width: 420px;
  box-shadow: var(--shadow-card);
  animation: modal-enter var(--transition-slow);
}
.card h2 { font-size: 22px; text-align: center; margin-bottom: 4px; color: var(--text-primary); font-weight: 700; }
.sub { text-align: center; font-size: 13px; color: var(--brand); margin-bottom: 20px; }
.mode-tabs {
  display: flex; gap: 0; margin-bottom: 24px;
  border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden;
}
.mode-tabs button {
  flex: 1; padding: 10px; border: none; background: var(--bg-card);
  font-size: 13px; font-weight: 500; cursor: pointer; color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.mode-tabs button:hover { color: var(--brand); }
.mode-tabs button.active { background: var(--brand); color: #fff; font-weight: 600; }
form { display: flex; flex-direction: column; gap: 14px; }
input {
  padding: 11px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  font-size: 14px; outline: none; background: var(--bg-input); color: var(--text-primary);
  width: 100%; box-sizing: border-box;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
input:focus { border-color: var(--brand); box-shadow: var(--focus-ring); }
input::placeholder { color: var(--input-placeholder); }
.sms-row { display: flex; gap: 8px; }
.sms-row input { flex: 1; }
.btn-sms {
  padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--brand);
  color: var(--brand); border-radius: var(--radius-md); font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: all var(--transition-fast);
}
.btn-sms:hover { background: var(--brand-bg); }
.btn-sms:disabled { opacity: 0.4; cursor: not-allowed; background: var(--bg-hover); border-color: var(--border-light); color: var(--text-muted); }
.btn {
  padding: 12px; background: var(--brand-gradient); color: #fff; border: none;
  border-radius: var(--radius-md); font-size: 15px; cursor: pointer; font-weight: 600;
  transition: all var(--transition-fast); box-shadow: 0 4px 16px rgba(124,58,237,0.2);
}
.btn:hover { box-shadow: 0 6px 20px rgba(124,58,237,0.3); transform: translateY(-1px); }
.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
.msg { margin-top: 12px; font-size: 13px; text-align: center; color: var(--success); }
.msg.error { color: var(--danger); }
.link { text-align: center; margin-top: 18px; font-size: 13px; color: var(--text-muted); }
.link a { color: var(--text-link); font-weight: 500; text-decoration: none; }
.link a:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .card { max-width: 100%; padding: 24px 16px; }
  .mode-tabs button { font-size: 12px; padding: 8px 6px; }
  .card h2 { font-size: 20px; }
}
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
