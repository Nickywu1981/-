<template>
  <div class="page">
    <div class="card">
      <h2>{{ $t('auth.register_title') }}</h2>
      <p class="sub">{{ $t('auth.register_subtitle') }}</p>

      <div class="mode-tabs">
        <button :class="{ active: mode === 'password' }" @click="mode = 'password'">{{ $t('auth.tab_password_register') }}</button>
        <button :class="{ active: mode === 'sms' }" @click="mode = 'sms'">{{ $t('auth.tab_sms_register') }}</button>
        <button :class="{ active: mode === 'email' }" @click="mode = 'email'">{{ $t('auth.tab_email_register') }}</button>
      </div>

      <!-- 密码注册 -->
      <form v-if="mode === 'password'" @submit.prevent="handleRegister">
        <label for="reg-username" class="sr-only">{{ $t('auth.username') }}</label>
        <input id="reg-username" v-model="username" type="text" :placeholder="$t('auth.username')" required autocomplete="username" />
        <label for="reg-password" class="sr-only">{{ $t('auth.password') }}</label>
        <input id="reg-password" v-model="password" type="password" :placeholder="$t('auth.password_hint')" required minlength="8" autocomplete="new-password" />
        <label for="reg-nickname" class="sr-only">{{ $t('auth.nickname') }}</label>
        <input id="reg-nickname" v-model="nickname" type="text" :placeholder="$t('auth.nickname')" />
        <button type="submit" class="btn" :disabled="loading">{{ loading ? $t('auth.registering') : $t('auth.register_btn') }}</button>
      </form>

      <!-- 手机注册 -->
      <form v-if="mode === 'sms'" @submit.prevent="handleSmsRegister">
        <label for="reg-sms-phone" class="sr-only">{{ $t('auth.phone') }}</label>
        <input id="reg-sms-phone" v-model="smsPhone" type="tel" :placeholder="$t('auth.phone')" required autocomplete="tel" inputmode="tel" />
        <div class="sms-row">
          <label for="reg-sms-code" class="sr-only">{{ $t('auth.code') }}</label>
          <input id="reg-sms-code" v-model="smsCode" type="text" :placeholder="$t('auth.code')" required maxlength="6" />
          <button type="button" class="btn-sms" :disabled="smsCountdown > 0" @click="sendSmsCode('register')">
            {{ smsCountdown > 0 ? $t('auth.code_countdown', { n: smsCountdown }) : $t('auth.get_code') }}
          </button>
        </div>
        <label for="reg-sms-nickname" class="sr-only">{{ $t('auth.nickname') }}</label>
        <input id="reg-sms-nickname" v-model="smsNickname" type="text" :placeholder="$t('auth.nickname')" />
        <button type="submit" class="btn" :disabled="loading">{{ loading ? $t('auth.registering') : $t('auth.register_btn') }}</button>
      </form>

      <!-- 邮箱注册 -->
      <form v-if="mode === 'email'" @submit.prevent="handleEmailRegister">
        <label for="reg-email" class="sr-only">{{ $t('auth.email') }}</label>
        <input id="reg-email" v-model="emailAddr" type="email" :placeholder="$t('auth.email')" required autocomplete="email" inputmode="email" />
        <div class="sms-row">
          <label for="reg-email-code" class="sr-only">{{ $t('auth.code') }}</label>
          <input id="reg-email-code" v-model="emailCode" type="text" :placeholder="$t('auth.code')" required maxlength="6" />
          <button type="button" class="btn-sms" :disabled="emailCountdown > 0" @click="sendEmailCode('register')">
            {{ emailCountdown > 0 ? $t('auth.code_countdown', { n: emailCountdown }) : $t('auth.get_code') }}
          </button>
        </div>
        <label for="reg-email-nickname" class="sr-only">{{ $t('auth.nickname') }}</label>
        <input id="reg-email-nickname" v-model="emailNickname" type="text" :placeholder="$t('auth.nickname')" />
        <button type="submit" class="btn" :disabled="loading">{{ loading ? $t('auth.registering') : $t('auth.register_btn') }}</button>
      </form>

      <p class="msg" :class="{ error: msgErr }" v-if="msg" role="alert" aria-live="assertive">{{ msg }}</p>
      <p class="link">{{ $t('auth.have_account') }}<NuxtLink to="/login">{{ $t('auth.go_login') }}</NuxtLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'landing' })

import { useAuthStore } from '~/stores/useAuthStore'

const { t } = useI18n()

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
  } catch (e: any) { msg.value = e?.data?.msg || e.message || t('auth.register_failed'); msgErr.value = true; }
  finally { loading.value = false; }
}

async function handleSmsRegister() {
  if (!smsPhone.value || !smsCode.value) { msg.value = t('auth.enter_phone_and_code_reg'); msgErr.value = true; return; }
  loading.value = true; msg.value = '';
  try {
    await $fetch('/api/sms/verify-code', { method: 'POST', credentials: 'include', body: { phone: smsPhone.value, scene: 'register', code: smsCode.value } });
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { phone: smsPhone.value, password: randomPassword(), nickname: smsNickname.value || smsPhone.value },
      credentials: 'include',
    });
    await useAuthStore().fetchUser();
    navigateTo('/workspace');
  } catch (e: any) { msg.value = e?.data?.msg || t('auth.register_failed'); msgErr.value = true; }
  finally { loading.value = false; }
}

async function sendSmsCode(scene: string) {
  if (!smsPhone.value) { msg.value = t('auth.enter_phone'); msgErr.value = true; return; }
  msg.value = '';
  try {
    await $fetch('/api/sms/send-code', { method: 'POST', credentials: 'include', body: { phone: smsPhone.value, scene } });
    startSmsCd(60);
    msg.value = t('auth.code_sent'); msgErr.value = false;
  } catch (e: any) { msg.value = e?.data?.msg || t('auth.send_failed'); msgErr.value = true; }
}

async function handleEmailRegister() {
  if (!emailAddr.value || !emailCode.value) { msg.value = t('auth.enter_email_and_code_reg'); msgErr.value = true; return; }
  loading.value = true; msg.value = '';
  try {
    await $fetch('/api/email/verify-code', { method: 'POST', credentials: 'include', body: { email: emailAddr.value, code: emailCode.value } });
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email: emailAddr.value, password: randomPassword(), nickname: emailNickname.value || emailAddr.value },
      credentials: 'include',
    });
    await useAuthStore().fetchUser();
    navigateTo('/workspace');
  } catch (e: any) { msg.value = e?.data?.msg || t('auth.register_failed'); msgErr.value = true; }
  finally { loading.value = false; }
}

async function sendEmailCode(scene: string) {
  if (!emailAddr.value) { msg.value = t('auth.enter_email'); msgErr.value = true; return; }
  msg.value = '';
  try {
    await $fetch('/api/email/send-code', { method: 'POST', credentials: 'include', body: { email: emailAddr.value, scene } });
    startEmailCd(60);
    msg.value = t('auth.code_sent'); msgErr.value = false;
  } catch (e: any) { msg.value = e?.data?.msg || t('auth.send_failed'); msgErr.value = true; }
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
  transition: background var(--transition-fast), color var(--transition-fast);
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
  cursor: pointer; white-space: nowrap; transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
}
.btn-sms:hover { background: var(--brand-bg); }
.btn-sms:disabled { opacity: 0.4; cursor: not-allowed; background: var(--bg-hover); border-color: var(--border-light); color: var(--text-muted); }
.btn {
  padding: 12px; background: var(--brand-gradient); color: #fff; border: none;
  border-radius: var(--radius-md); font-size: 15px; cursor: pointer; font-weight: 600;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast); box-shadow: 0 4px 16px rgba(124,58,237,0.2);
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
