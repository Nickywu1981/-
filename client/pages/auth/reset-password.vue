<!--
  Movio AI v4.1 — Password Reset Page
  G4 前端开发 | Security: requires SMS/email verification
-->
<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>重置密码</h1>
        <p>{{ verified ? '设置您的新密码' : '请先验证您的身份' }}</p>
      </div>

      <!-- Step 1: Identity verification -->
      <template v-if="!verified">
        <div class="input-group">
          <label>手机号 / 邮箱</label>
          <input v-model="account" type="text" class="input" placeholder="请输入手机号或邮箱" />
        </div>
        <div class="input-group">
          <label>验证码</label>
          <div class="code-row">
            <input v-model="code" type="text" class="input code-input" placeholder="6位验证码" maxlength="6" />
            <button type="button" class="btn btn-send" :disabled="sendCooldown > 0" @click="sendCode">
              {{ sendCooldown > 0 ? `${sendCooldown}s` : '发送验证码' }}
            </button>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-block" :disabled="loading" @click="doVerify">
          {{ loading ? '验证中...' : '验证并继续' }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </template>

      <!-- Step 2: Set new password -->
      <form v-else @submit.prevent="handleReset">
        <div class="input-group">
          <label>新密码</label>
          <input v-model="newPassword" type="password" class="input" placeholder="请输入新密码" required autocomplete="new-password" />
          <p class="hint">8-20位，含字母+数字+特殊字符</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '重置中...' : '重置密码' }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      </form>

      <div class="auth-footer">
        <NuxtLink to="/login">返回登录</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCountdown } from '~/composables/useCountdown'
definePageMeta({ layout: 'landing' })

const account = ref('')
const code = ref('')
const newPassword = ref('')
const loading = ref(false)
const verified = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const { countdown: sendCooldown, start: startCd } = useCountdown(60)

function getAccountInfo(): { phone?: string; email?: string; isEmail: boolean } {
  const val = account.value.trim()
  const isEmail = val.includes('@')
  return isEmail ? { email: val, isEmail: true } : { phone: val, isEmail: false }
}

async function sendCode() {
  errorMsg.value = ''
  if (!account.value.trim()) { errorMsg.value = '请输入手机号或邮箱'; return }
  loading.value = true
  try {
    const { phone, email, isEmail } = getAccountInfo()
    const url = isEmail ? '/api/email/send-code' : '/api/sms/send-code'
    const body = isEmail ? { email, scene: 'reset_password' } : { phone, scene: 'reset_password' }
    await $fetch(url, { method: 'POST', body, credentials: 'include' })
    startCd(60)
  } catch (e: any) { errorMsg.value = e?.data?.msg || '发送失败' }
  loading.value = false
}

async function doVerify() {
  errorMsg.value = ''
  if (!account.value.trim()) { errorMsg.value = '请输入手机号或邮箱'; return }
  if (!code.value.trim()) { errorMsg.value = '请输入验证码'; return }
  loading.value = true
  try {
    const { phone, email, isEmail } = getAccountInfo()
    const url = isEmail ? '/api/email/verify-code' : '/api/sms/verify-code'
    const body = isEmail ? { email, code: code.value } : { phone, scene: 'reset_password', code: code.value }
    await $fetch(url, { method: 'POST', body, credentials: 'include' })
    verified.value = true
  } catch (e: any) { errorMsg.value = e?.data?.msg || '验证失败' }
  loading.value = false
}

async function handleReset() {
  errorMsg.value = ''; successMsg.value = ''
  if (!newPassword.value || newPassword.value.length < 8) { errorMsg.value = '新密码至少8位'; return }
  loading.value = true
  try {
    const { phone, email, isEmail } = getAccountInfo()
    const body = { phone: phone || undefined, email: email || undefined, new_password: newPassword.value }
    const res: any = await $fetch('/api/auth/reset-password', { method: 'POST', body, credentials: 'include' })
    if (res.code === 200) {
      successMsg.value = '密码重置成功，3秒后跳转登录'
      setTimeout(() => navigateTo('/login'), 3000)
    } else {
      errorMsg.value = res.msg || '重置失败'
    }
  } catch (e: any) { errorMsg.value = e?.data?.msg || '重置失败，请重试' }
  loading.value = false
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--cfg-bg-secondary); padding: 24px; }
.auth-card { width: 100%; max-width: 420px; background: var(--cfg-bg-primary); border-radius: var(--cfg-radius-lg); box-shadow: var(--cfg-shadow-lg); padding: 40px 32px; }
.auth-header { text-align: center; margin-bottom: 32px; }
.auth-header h1 { font-size: var(--cfg-font-size-xl); color: var(--cfg-text-primary); margin: 0 0 8px 0; }
.auth-header p { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 0; }
.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-secondary); margin-bottom: 6px; }
.hint { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); margin: 4px 0 0 0; }
.code-row { display: flex; gap: 8px; }
.code-input { flex: 1; }
.btn-send { padding: 10px 16px; background: var(--cfg-bg-primary); color: var(--cfg-primary); border: 1px solid var(--cfg-primary); border-radius: var(--cfg-radius-md); font-size: 13px; cursor: pointer; white-space: nowrap; transition: all var(--cfg-transition-fast); }
.btn-send:hover { background: var(--cfg-primary-light); }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-block { width: 100%; justify-content: center; padding: 12px; }
.error-msg { color: var(--cfg-error); font-size: var(--cfg-font-size-sm); text-align: center; margin-top: 12px; }
.success-msg { color: var(--cfg-success); font-size: var(--cfg-font-size-sm); text-align: center; margin-top: 12px; }
.auth-footer { text-align: center; margin-top: 24px; font-size: var(--cfg-font-size-sm); }
.auth-footer a { color: var(--cfg-primary); text-decoration: none; }
</style>
