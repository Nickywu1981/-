<!--
  Movio AI v4.1 — Password Reset Page
  G4 前端开发 | Security: requires SMS/email verification
-->
<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>{{ $t('auth.reset_title') }}</h1>
        <p>{{ verified ? $t('auth.reset_set_new') : $t('auth.reset_verify_first') }}</p>
      </div>

      <template v-if="!verified">
        <div class="input-group">
          <label for="reset-account">{{ $t('auth.reset_account_label') }}</label>
          <input id="reset-account" v-model="account" type="text" class="input" :placeholder="$t('auth.reset_account_placeholder')" autocomplete="username" />
        </div>
        <div class="input-group">
          <label for="reset-code">{{ $t('auth.code') }}</label>
          <div class="code-row">
            <input id="reset-code" v-model="code" type="text" class="input code-input" :placeholder="$t('auth.reset_code_placeholder')" maxlength="6" autocomplete="one-time-code" />
            <button type="button" class="btn btn-send" :disabled="sendCooldown > 0" @click="sendCode">
              {{ sendCooldown > 0 ? $t('auth.code_countdown', { n: sendCooldown }) : $t('auth.send_code') }}
            </button>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-block" :disabled="loading" @click="doVerify">
          {{ loading ? $t('auth.reset_verifying') : $t('auth.reset_verify_btn') }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </template>

      <form v-else @submit.prevent="handleReset">
        <div class="input-group">
          <label for="reset-new-pass">{{ $t('auth.reset_new_password') }}</label>
          <input id="reset-new-pass" v-model="newPassword" type="password" class="input" :placeholder="$t('auth.reset_new_pw_placeholder')" required autocomplete="new-password" />
          <p class="hint">{{ $t('auth.reset_pw_hint') }}</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? $t('auth.reset_submitting') : $t('auth.reset_submit') }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      </form>

      <div class="auth-footer">
        <NuxtLink to="/login">{{ $t('auth.reset_back_login') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'landing' })

const { t } = useI18n()

const account = ref('')
const code = ref('')
const newPassword = ref('')
const loading = ref(false)
const verified = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const navTimer = ref<ReturnType<typeof setTimeout> | null>(null)
onBeforeUnmount(() => { if (navTimer.value) clearTimeout(navTimer.value) })

const { countdown: sendCooldown, start: startCd } = useCountdown(60)

function getAccountInfo(): { phone?: string; email?: string; isEmail: boolean } {
  const val = account.value.trim()
  const isEmail = val.includes('@')
  return isEmail ? { email: val, isEmail: true } : { phone: val, isEmail: false }
}

async function sendCode() {
  errorMsg.value = ''
  if (!account.value.trim()) { errorMsg.value = t('auth.reset_enter_account'); return }
  loading.value = true
  try {
    const { phone, email, isEmail } = getAccountInfo()
    const url = isEmail ? '/api/email/send-code' : '/api/sms/send-code'
    const body = isEmail ? { email, scene: 'reset_password' } : { phone, scene: 'reset_password' }
    await $fetch(url, { method: 'POST', body, credentials: 'include' })
    startCd(60)
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; errorMsg.value = err?.data?.msg || t('auth.send_failed') }
  loading.value = false
}

async function doVerify() {
  errorMsg.value = ''
  if (!account.value.trim()) { errorMsg.value = t('auth.reset_enter_account'); return }
  if (!code.value.trim()) { errorMsg.value = t('auth.reset_enter_code'); return }
  loading.value = true
  try {
    const { phone, email, isEmail } = getAccountInfo()
    const url = isEmail ? '/api/email/verify-code' : '/api/sms/verify-code'
    const body = isEmail ? { email, code: code.value } : { phone, scene: 'reset_password', code: code.value }
    await $fetch(url, { method: 'POST', body, credentials: 'include' })
    verified.value = true
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; errorMsg.value = err?.data?.msg || t('auth.reset_verify_failed') }
  loading.value = false
}

async function handleReset() {
  errorMsg.value = ''; successMsg.value = ''
  if (!newPassword.value || newPassword.value.length < 8) { errorMsg.value = t('auth.reset_pw_short'); return }
  loading.value = true
  try {
    const { phone, email, isEmail } = getAccountInfo()
    const body = { phone: phone || undefined, email: email || undefined, new_password: newPassword.value }
    const res: any = await $fetch('/api/auth/reset-password', { method: 'POST', body, credentials: 'include' })
    if (res.code === 200) {
      successMsg.value = t('auth.reset_success')
      navTimer.value = setTimeout(() => navigateTo('/login'), 3000)
    } else {
      errorMsg.value = res.msg || t('auth.reset_failed')
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; errorMsg.value = err?.data?.msg || t('auth.reset_failed_retry') }
  loading.value = false
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary, #f9fafb)); padding: 24px; }
.auth-card { width: 100%; max-width: 420px; background: var(--bg-card, #ffffff)); border-radius: var(--radius-lg, 12px)); box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,.1))); padding: 40px 32px; }
.auth-header { text-align: center; margin-bottom: 32px; }
.auth-header h1 { font-size: var(--text-xl, 1.25rem)); color: var(--text-primary, #1f2937)); margin: 0 0 8px 0; }
.auth-header p { font-size: var(--text-sm, 0.875rem)); color: var(--text-muted, #9ca3af)); margin: 0; }
.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--text-sm, 0.875rem)); font-weight: 500); color: var(--text-secondary, #6b7280)); margin-bottom: 6px; }
.hint { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); margin: 4px 0 0 0; }
.code-row { display: flex; gap: 8px; }
.code-input { flex: 1; }
.btn-send { padding: 10px 16px; background: var(--bg-card, #ffffff)); color: var(--brand, #5b5fe3)); border: 1px solid var(--brand, #5b5fe3)); border-radius: var(--radius-md, 8px)-md); font-size: 13px; cursor: pointer; white-space: nowrap; transition: background var(--transition-fast, 0.15s ease)), border-color var(--transition-fast, 0.15s ease)), color var(--transition-fast, 0.15s ease)), opacity var(--transition-fast, 0.15s ease)); }
.btn-send:hover { background: var(--brand, #5b5fe3)-light); }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-block { width: 100%; justify-content: center; padding: 12px; }
.error-msg { color: var(--danger, #ef4444)); font-size: var(--text-sm, 0.875rem)); text-align: center; margin-top: 12px; }
.success-msg { color: var(--success, #10b981)); font-size: var(--text-sm, 0.875rem)); text-align: center; margin-top: 12px; }
.auth-footer { text-align: center; margin-top: 24px; font-size: var(--text-sm, 0.875rem)); }
.auth-footer a { color: var(--brand, #5b5fe3)); text-decoration: none; }
</style>
