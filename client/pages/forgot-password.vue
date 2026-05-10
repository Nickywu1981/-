<template>
  <div class="page">
    <div class="card">
      <h2>找回密码</h2>
      <template v-if="verified">
        <div class="form-group">
          <label>新密码</label>
          <input v-model="newPassword" type="password" placeholder="至少8位" maxlength="128" autocomplete="new-password" @keyup.enter="doReset" />
        </div>
        <div class="form-group">
          <label>确认新密码</label>
          <input v-model="confirmPassword" type="password" placeholder="再次输入新密码" maxlength="128" autocomplete="new-password" @keyup.enter="doReset" />
        </div>
        <button class="btn-save" :disabled="loading" @click="doReset">{{ loading ? '重置中...' : '重置密码' }}</button>
      </template>
      <template v-else>
        <div class="form-group">
          <label>手机号或邮箱</label>
          <input v-model="account" type="text" placeholder="请输入注册时使用的手机号或邮箱" maxlength="254" />
        </div>
        <div class="form-group code-row">
          <label>验证码</label>
          <div class="code-input-row">
            <input v-model="code" type="text" placeholder="6位验证码" maxlength="6" @keyup.enter="doVerify" />
            <button class="btn-send" :disabled="sendCooldown > 0" @click="sendCode">
              {{ sendCooldown > 0 ? `${sendCooldown}s` : '发送验证码' }}
            </button>
          </div>
        </div>
        <button class="btn-save" :disabled="loading" @click="doVerify">{{ loading ? '验证中...' : '验证并继续' }}</button>
      </template>
      <p v-if="msg" class="msg" :class="{ error: msgErr }">{{ msg }}</p>
      <p class="tip"><NuxtLink to="/login">想起密码了？去登录</NuxtLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCountdown } from '~/composables/useCountdown'
definePageMeta({ layout: 'landing' })

const account = ref(''), code = ref(''), newPassword = ref(''), confirmPassword = ref('')
const loading = ref(false), verified = ref(false)
const msg = ref(''), msgErr = ref(false)

const { countdown: sendCooldown, start: startCd } = useCountdown(60)

async function sendCode() {
  if (!account.value.trim()) { msg.value = '请输入手机号或邮箱'; msgErr.value = true; return }
  loading.value = true; msg.value = ''
  try {
    const isEmail = account.value.includes('@')
    const url = isEmail ? '/api/email/send-code' : '/api/sms/send-code'
    const body = isEmail ? { email: account.value.trim(), scene: 'reset_password' } : { phone: account.value.trim(), scene: 'reset_password' }
    await $fetch(url, { method: 'POST', body, credentials: 'include' })
    msg.value = '验证码已发送'; msgErr.value = false
    startCd(60)
  } catch (e: any) { msg.value = e.data?.msg || '发送失败'; msgErr.value = true }
  loading.value = false
}

async function doVerify() {
  if (!account.value.trim()) { msg.value = '请输入手机号或邮箱'; msgErr.value = true; return }
  if (!code.value.trim() || code.value.length < 4) { msg.value = '请输入验证码'; msgErr.value = true; return }
  loading.value = true; msg.value = ''
  try {
    const isEmail = account.value.includes('@')
    const url = isEmail ? '/api/email/verify-code' : '/api/sms/verify-code'
    const body = isEmail ? { email: account.value.trim(), code: code.value } : { phone: account.value.trim(), scene: 'reset_password', code: code.value }
    await $fetch(url, { method: 'POST', body, credentials: 'include' })
    verified.value = true
    msg.value = ''; msgErr.value = false
  } catch (e: any) { msg.value = e.data?.msg || '验证失败'; msgErr.value = true }
  loading.value = false
}

async function doReset() {
  if (newPassword.value.length < 8) { msg.value = '新密码至少8位'; msgErr.value = true; return }
  if (newPassword.value !== confirmPassword.value) { msg.value = '两次密码不一致'; msgErr.value = true; return }
  loading.value = true; msg.value = ''
  let navTimer: ReturnType<typeof setTimeout> | null = null
  try {
    const isEmail = account.value.includes('@')
    const body = isEmail ? { email: account.value.trim(), new_password: newPassword.value } : { phone: account.value.trim(), new_password: newPassword.value }
    await $fetch('/api/auth/reset-password', { method: 'POST', body, credentials: 'include' })
    msg.value = '密码重置成功，跳转登录...'; msgErr.value = false
    navTimer = setTimeout(() => navigateTo('/login'), 1500)
  } catch (e: any) { msg.value = e.data?.msg || '重置失败'; msgErr.value = true }
  loading.value = false
  onBeforeUnmount(() => { if (navTimer) clearTimeout(navTimer) })
}
</script>

<style scoped>
.page { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 200px); padding: 48px 16px; background: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.04) 0%, transparent 60%); }
.card { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-xl); padding: 40px; width: 100%; max-width: 420px; box-shadow: var(--shadow-card); animation: modal-enter var(--transition-slow); }
.card h2 { font-size: 22px; font-weight: 700; margin-bottom: 24px; text-align: center; color: var(--text-primary); }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.form-group input { width: 100%; padding: 11px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 14px; outline: none; box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-group input:focus { border-color: var(--brand); box-shadow: var(--focus-ring); }
.form-group input::placeholder { color: var(--input-placeholder); }
.code-row label { margin-bottom: 6px; }
.code-input-row { display: flex; gap: 8px; }
.code-input-row input { flex: 1; }
.btn-send { padding: 11px 16px; background: var(--bg-card); color: var(--brand); border: 1px solid var(--brand); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; white-space: nowrap; transition: all var(--transition-fast); }
.btn-send:hover { background: var(--brand-light); }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-save { width: 100%; padding: 12px; background: var(--brand-gradient); color: #fff; border: none; border-radius: var(--radius-md); font-size: 15px; cursor: pointer; font-weight: 600; transition: all var(--transition-fast); box-shadow: 0 4px 16px rgba(124,58,237,0.2); }
.btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
.btn-save:active { transform: scale(0.98); }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
.msg { margin-top: 12px; font-size: 13px; text-align: center; color: var(--success); }
.msg.error { color: var(--danger); }
.tip { margin-top: 12px; font-size: 12px; color: var(--text-muted); text-align: center; }
.tip a { color: var(--text-link); font-weight: 500; }
.tip a:hover { text-decoration: underline; }
</style>
