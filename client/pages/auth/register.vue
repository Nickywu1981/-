<!--
  Movio AI v4.1 — Register Page
  G4 前端开发 | 配置驱动 + 邀请码分销绑定
-->
<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>{{ config.page_title || 'Register Movio AI' }}</h1>
        <p>{{ config.subtitle || 'Start your AI e-commerce journey' }}</p>
      </div>

      <form @submit.prevent="handleRegister">
        <div class="input-group">
          <label for="reg-phone">{{ config.phone_label || 'Phone' }}</label>
          <input id="reg-phone" v-model="phone" type="tel" class="input" placeholder="Enter phone number" maxlength="11" autocomplete="tel" inputmode="tel" />
        </div>

        <div class="input-group">
          <label for="reg-email">{{ config.email_label || 'Email' }}</label>
          <input id="reg-email" v-model="email" type="email" class="input" placeholder="Optional" autocomplete="email" inputmode="email" />
        </div>

        <div class="input-group">
          <label for="reg-password">{{ config.password_label || 'Password' }}</label>
          <input id="reg-password" v-model="password" type="password" class="input" placeholder="Enter password" required autocomplete="new-password" />
          <p class="hint">{{ config.password_hint || '8-20 chars, letters + numbers + special chars' }}</p>
        </div>

        <div class="input-group">
          <label for="reg-invite">{{ config.invite_label || 'Invite Code (optional)' }}</label>
          <input id="reg-invite" v-model="inviteCode" type="text" class="input" placeholder="Enter invite code" maxlength="8" autocomplete="off" />
        </div>

        <p class="agreement">{{ config.agreement || 'By registering you agree to the Terms and Privacy Policy' }}</p>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? 'Registering...' : (config.btn_submit || 'Register') }}
        </button>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
      </form>

      <div class="auth-footer">
        <NuxtLink to="/login">
          {{ config.btn_to_login || 'Already have an account? Log in' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">


definePageMeta({ layout: 'landing' })

const { config } = useSiteConfig('page.auth.register')

const phone = ref('')
const email = ref('')
const password = ref('')
const inviteCode = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const navTimer = ref<ReturnType<typeof setTimeout> | null>(null)
onBeforeUnmount(() => { if (navTimer.value) clearTimeout(navTimer.value) })

async function handleRegister() {
  errorMsg.value = ''
  successMsg.value = ''

  if (!phone.value && !email.value) {
    errorMsg.value = 'Please enter phone or email'
    return
  }
  if (!password.value || password.value.length < 8) {
    errorMsg.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true
  try {
    const res: any = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        phone: phone.value || undefined,
        email: email.value || undefined,
        password: password.value,
        invite_code: inviteCode.value || undefined,
      },
      credentials: 'include',
    })
    if (res.code === 200) {
      successMsg.value = 'Registration successful, redirecting...'
      navTimer.value = setTimeout(() => navigateTo('/workspace'), 1000)
    } else {
      errorMsg.value = res.msg || 'Registration failed'
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    errorMsg.value = err?.data?.msg || 'Registration failed, please retry'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--cfg-bg-secondary, #f9fafb); padding: 24px;
}
.auth-card {
  width: 100%; max-width: 420px;
  background: var(--cfg-bg-primary, #fff);
  border-radius: var(--cfg-radius-lg, 16px);
  box-shadow: var(--cfg-shadow-lg);
  padding: 40px 32px;
}
.auth-header { text-align: center; margin-bottom: 32px; }
.auth-header h1 { font-size: var(--cfg-font-size-xl); color: var(--cfg-text-primary); margin: 0 0 8px 0; }
.auth-header p { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 0; }
.input-group { margin-bottom: 16px; }
.input-group label { display: block; font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-secondary); margin-bottom: 6px; }
.hint { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); margin: 4px 0 0 0; }
.agreement { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); text-align: center; margin-bottom: 16px; }
.btn-block { width: 100%; justify-content: center; padding: 12px; }
.error-msg { color: var(--cfg-error); font-size: var(--cfg-font-size-sm); text-align: center; margin-top: 12px; }
.success-msg { color: var(--cfg-success); font-size: var(--cfg-font-size-sm); text-align: center; margin-top: 12px; }
.auth-footer { text-align: center; margin-top: 24px; font-size: var(--cfg-font-size-sm); }
.auth-footer a { color: var(--cfg-primary); text-decoration: none; }
</style>
