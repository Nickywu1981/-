<!--
  Movio AI v4.1 — Login Page
  G4 前端开发 | 配置驱动: 所有文案从 sys_config 读取
-->
<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>{{ config.page_title || '登录 Movio AI' }}</h1>
        <p>{{ config.subtitle || '欢迎回来，继续您的AI创作之旅' }}</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label>{{ config.phone_label || '手机号' }}</label>
          <input
            v-model="phone"
            type="tel"
            class="input"
            :placeholder="config.phone_placeholder || '请输入手机号'"
            maxlength="11"
          />
        </div>

        <div class="input-group">
          <label>{{ config.password_label || '密码' }}</label>
          <input
            v-model="password"
            type="password"
            class="input"
            :placeholder="config.password_placeholder || '请输入密码'"
          />
        </div>

        <div class="form-options">
          <label class="remember">
            <input v-model="rememberMe" type="checkbox" />
            {{ config.remember_me || '记住我' }}
          </label>
          <NuxtLink to="/auth/reset-password" class="forgot">
            {{ config.forgot_password || '忘记密码？' }}
          </NuxtLink>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '登录中...' : (config.btn_login || '登录') }}
        </button>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </form>

      <div class="auth-footer">
        <NuxtLink to="/auth/register">
          {{ config.btn_register || '还没有账号？立即注册' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSiteConfig } from '~/composables/useSiteConfig'

definePageMeta({ layout: 'landing' })

const { config } = useSiteConfig('page.auth.login')

const phone = ref('')
const password = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  if (!phone.value || !password.value) {
    errorMsg.value = '请填写手机号和密码'
    return
  }
  if (password.value.length < 8) {
    errorMsg.value = '密码至少8位'
    return
  }

  loading.value = true
  try {
    const res: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { phone: phone.value, password: password.value },
      credentials: 'include',
    })
    if (res.code === 200) {
      await navigateTo('/workspace')
    } else {
      errorMsg.value = res.msg || '登录失败'
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.msg || '登录失败，请重试'
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
.form-options { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: var(--cfg-font-size-sm); }
.remember { display: flex; align-items: center; gap: 6px; color: var(--cfg-text-secondary); cursor: pointer; }
.forgot { color: var(--cfg-primary); text-decoration: none; }
.btn-block { width: 100%; justify-content: center; padding: 12px; }
.error-msg { color: var(--cfg-error); font-size: var(--cfg-font-size-sm); text-align: center; margin-top: 12px; }
.auth-footer { text-align: center; margin-top: 24px; font-size: var(--cfg-font-size-sm); }
.auth-footer a { color: var(--cfg-primary); text-decoration: none; }
</style>
