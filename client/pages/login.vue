<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <span class="login-logo">◆</span>
        <h2>{{ $t('auth.welcome_title') }}</h2>
        <p>{{ $t('auth.welcome_subtitle') }}</p>
      </div>

      <div class="mode-tabs">
        <button :class="{ active: mode === 'password' }" @click="mode = 'password'">{{ $t('auth.tab_password') }}</button>
        <button :class="{ active: mode === 'sms' }" @click="mode = 'sms'">{{ $t('auth.tab_sms') }}</button>
        <button :class="{ active: mode === 'email' }" @click="mode = 'email'">{{ $t('auth.tab_email') }}</button>
      </div>

      <form v-if="mode === 'password'" @submit.prevent="handlePasswordLogin">
        <div class="input-group">
          <span class="input-icon">👤</span>
          <label for="login-form-username" class="sr-only">{{ $t('auth.username') }}</label>
          <input id="login-form-username" v-model="username" type="text" :placeholder="$t('auth.username')" required maxlength="30" autocomplete="username" />
        </div>
        <div class="input-group">
          <span class="input-icon">🔒</span>
          <label for="login-form-password" class="sr-only">{{ $t('auth.password') }}</label>
          <input id="login-form-password" v-model="password" type="password" :placeholder="$t('auth.password')" required maxlength="128" autocomplete="current-password" />
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading" class="spinner-sm" />
          <span v-else>{{ $t('auth.login_btn') }}</span>
        </button>
      </form>

      <form v-if="mode === 'sms'" @submit.prevent="handleSmsLogin">
        <div class="input-group">
          <span class="input-icon">📱</span>
          <label for="login-form-sms-phone" class="sr-only">{{ $t('auth.phone') }}</label>
          <input id="login-form-sms-phone" v-model="smsPhone" type="tel" :placeholder="$t('auth.phone')" required maxlength="11" autocomplete="tel" inputmode="tel" />
        </div>
        <div class="sms-row">
          <label for="login-form-sms-code" class="sr-only">{{ $t('auth.code') }}</label>
          <input id="login-form-sms-code" v-model="smsCode" type="text" :placeholder="$t('auth.code')" required maxlength="6" />
          <button type="button" class="code-btn" :disabled="smsCountdown > 0" @click="sendSmsCode('login')">
            {{ smsCountdown > 0 ? $t('auth.code_countdown', { n: smsCountdown }) : $t('auth.get_code') }}
          </button>
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading" class="spinner-sm" />
          <span v-else>{{ $t('auth.tab_sms') }}</span>
        </button>
      </form>

      <form v-if="mode === 'email'" @submit.prevent="handleEmailLogin">
        <div class="input-group">
          <span class="input-icon">📧</span>
          <label for="login-form-email" class="sr-only">{{ $t('auth.email') }}</label>
          <input id="login-form-email" v-model="emailAddr" type="email" :placeholder="$t('auth.email')" required maxlength="254" autocomplete="email" inputmode="email" />
        </div>
        <div class="sms-row">
          <label for="login-form-email-code" class="sr-only">{{ $t('auth.code') }}</label>
          <input id="login-form-email-code" v-model="emailCode" type="text" :placeholder="$t('auth.code')" required maxlength="6" />
          <button type="button" class="code-btn" :disabled="emailCountdown > 0" @click="sendEmailCode('login')">
            {{ emailCountdown > 0 ? $t('auth.code_countdown', { n: emailCountdown }) : $t('auth.get_code') }}
          </button>
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading" class="spinner-sm" />
          <span v-else>{{ $t('auth.tab_email') }}</span>
        </button>
      </form>

      <p class="msg" :class="{ error: msgErr }" v-if="msg" role="alert" aria-live="assertive">{{ msg }}</p>
      <p class="link">
        {{ $t('auth.no_account') }}<NuxtLink to="/register">{{ $t('auth.free_register') }}</NuxtLink>
      </p>
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
const smsPhone = ref('');
const smsCode = ref('');
const emailAddr = ref('');
const emailCode = ref('');
const loading = ref(false);
const msg = ref('');
const msgErr = ref(false);

const { countdown: smsCountdown, start: startSmsCd } = useCountdown(60)
const { countdown: emailCountdown, start: startEmailCd } = useCountdown(60)

function safeRedirect(path: unknown): string {
  if (typeof path !== 'string' || !path) return '/workspace'
  // 仅允许站内相对路径，拦截 //evil.com 等绝对 URL 钓鱼跳转
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('\\\\')) return '/workspace'
  return path
}

async function handlePasswordLogin() {
  loading.value = true; msg.value = '';
  try {
    const authStore = useAuthStore()
    await authStore.login(username.value, password.value)
    await authStore.fetchUser()
    await navigateTo(safeRedirect(route.query.redirect))
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('auth.login_network_error'); msgErr.value = true; }
  finally { loading.value = false; }
}

async function handleSmsLogin() {
  if (!smsPhone.value || !smsCode.value) { msg.value = t('auth.enter_phone_and_code'); msgErr.value = true; return; }
  loading.value = true; msg.value = '';
  try {
    await $fetch('/api/sms/verify-code', { method: 'POST', credentials: 'include', body: { phone: smsPhone.value, scene: 'login', code: smsCode.value } });
    await $fetch('/api/auth/login-by-code', { method: 'POST', credentials: 'include', body: { phone: smsPhone.value, code: smsCode.value } });
    await useAuthStore().fetchUser();
    await navigateTo(safeRedirect(route.query.redirect));
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('auth.login_network_error'); msgErr.value = true; }
  finally { loading.value = false; }
}

async function sendSmsCode(scene: string) {
  if (!smsPhone.value) { msg.value = t('auth.enter_phone'); msgErr.value = true; return; }
  msg.value = '';
  try {
    await $fetch('/api/sms/send-code', { method: 'POST', credentials: 'include', body: { phone: smsPhone.value, scene } });
    startSmsCd(60);
    msg.value = t('auth.code_sent'); msgErr.value = false;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('auth.send_failed'); msgErr.value = true; }
}

async function handleEmailLogin() {
  if (!emailAddr.value || !emailCode.value) { msg.value = t('auth.enter_email_and_code'); msgErr.value = true; return; }
  loading.value = true; msg.value = '';
  try {
    await $fetch('/api/email/verify-code', { method: 'POST', credentials: 'include', body: { email: emailAddr.value, code: emailCode.value } });
    await $fetch('/api/auth/login-by-code', { method: 'POST', credentials: 'include', body: { email: emailAddr.value, code: emailCode.value } });
    await useAuthStore().fetchUser();
    await navigateTo(safeRedirect(route.query.redirect));
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('auth.login_network_error'); msgErr.value = true; }
  finally { loading.value = false; }
}

async function sendEmailCode(scene: string) {
  if (!emailAddr.value) { msg.value = t('auth.enter_email'); msgErr.value = true; return; }
  msg.value = '';
  try {
    await $fetch('/api/email/send-code', { method: 'POST', credentials: 'include', body: { email: emailAddr.value, scene } });
    startEmailCd(60);
    msg.value = t('auth.code_sent'); msgErr.value = false;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('auth.send_failed'); msgErr.value = true; }
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - 200px);
  display: flex; align-items: center; justify-content: center;
  padding: 48px 16px;
  background:
    radial-gradient(ellipse 60% 50% at 50% 40%, rgba(var(--brand-rgb, 91,95,227), 0.04) 0%, transparent 60%);
}
.login-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-xl); padding: 40px; width: 100%; max-width: 420px;
  box-shadow: var(--shadow-card);
  animation: modal-enter var(--transition-slow);
}
.login-header { text-align: center; margin-bottom: 28px; }
.login-logo { font-size: 32px; color: var(--brand); }
.login-header h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 12px 0 6px; }
.login-header p { font-size: 13px; color: var(--text-muted); }

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
.input-group { position: relative; }
.input-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 15px; opacity: 0.6; pointer-events: none;
}
.input-group input { padding-left: 40px; }

input {
  padding: 11px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  font-size: 14px; outline: none; background: var(--bg-input); color: var(--text-primary);
  width: 100%; box-sizing: border-box; transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
input:focus { border-color: var(--brand); box-shadow: var(--focus-ring); }
input::placeholder { color: var(--input-placeholder); }

.sms-row { display: flex; gap: 8px; }
.sms-row input { flex: 1; }
.code-btn {
  padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--brand);
  color: var(--brand); border-radius: var(--radius-md); font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap; transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
}
.code-btn:hover { background: var(--brand-light); }
.code-btn:disabled { opacity: 0.4; cursor: not-allowed; background: var(--bg-hover); border-color: var(--border-light); color: var(--text-muted); }

.login-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px; background: var(--brand-gradient); color: #fff; border: none;
  border-radius: var(--radius-md); font-size: 15px; font-weight: 600; cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast); box-shadow: 0 4px 16px rgba(var(--brand-rgb, 91,95,227), 0.2);
}
.login-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(var(--brand-rgb, 91,95,227), 0.3); }
.login-btn:active { transform: scale(0.98); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

.spinner-sm {
  width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: var(--white); border-radius: 50%; animation: anim-spin 0.6s linear infinite;
}

.msg { margin-top: 12px; font-size: 13px; text-align: center; color: var(--success); }
.msg.error { color: var(--danger); }
.link { text-align: center; margin-top: 18px; font-size: 13px; color: var(--text-muted); }
.link a { color: var(--text-link); font-weight: 500; text-decoration: none; }
.link a:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .login-card { max-width: 100%; padding: 24px 16px; }
  .mode-tabs button { font-size: 12px; padding: 8px 6px; }
  .login-header h2 { font-size: 20px; }
}
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
</style>
