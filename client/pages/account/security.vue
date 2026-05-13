<template>
  <div class="account-page"><h1>{{ $t('account.security.page_title') }}</h1>
    <div class="security-section"><h3>{{ $t('account.security.change_password') }}</h3>
      <div class="form-group"><label for="sec-current-pwd">{{ $t('account.security.current_password') }}</label><input id="sec-current-pwd" v-model="form.currentPwd" type="password" class="text-input" autocomplete="current-password" /></div>
      <div class="form-group"><label for="sec-new-pwd">{{ $t('account.security.new_password') }}</label><input id="sec-new-pwd" v-model="form.newPwd" type="password" class="text-input" autocomplete="new-password" minlength="8" /></div>
      <div class="form-group"><label for="sec-confirm-pwd">{{ $t('account.security.confirm_password') }}</label><input id="sec-confirm-pwd" v-model="form.confirmPwd" type="password" class="text-input" autocomplete="new-password" /></div>
      <button class="btn-primary" :disabled="saving" @click="changePwd">{{ saving ? $t('account.security.changing') : $t('account.security.change_pwd_btn') }}</button>
      <p v-if="msg" class="msg" :class="{ error: msgErr }">{{ msg }}</p>
    </div>
    <div class="security-section"><h3>{{ $t('account.security.two_factor') }}</h3><p>{{ $t('account.security.two_factor_hint') }}</p><button class="btn-secondary" disabled>{{ $t('account.security.enable_2fa') }}</button></div>
    <div class="security-section"><h3>{{ $t('account.security.login_devices') }}</h3><p v-if="!devices.length && !devicesLoading" class="empty-hint">{{ $t('account.security.no_devices') }}</p><div v-if="devicesLoading" class="skeleton-line w-60"></div><ul v-else><li v-for="d in devices" :key="d.id">{{ d.device }} — {{ d.location }} — {{ d.time }}</li></ul></div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const form = ref({ currentPwd: '', newPwd: '', confirmPwd: '' })
const devices = ref<any[]>([])
const devicesLoading = ref(false)
const saving = ref(false), msg = ref(''), msgErr = ref(false)

onMounted(async () => {
  devicesLoading.value = true
  try {
    const data: any = await $fetch('/api/user/profile', { credentials: 'include' })
    if (data?.code === 200 && data.data?.devices) devices.value = data.data.devices
  } catch { toast.error(t('account.security.load_devices_failed')) }
  finally { devicesLoading.value = false }
})

async function changePwd() {
  msg.value = ''; msgErr.value = false
  if (!form.value.currentPwd) { msg.value = t('account.security.current_pwd_required'); msgErr.value = true; return }
  if (form.value.newPwd.length < 8) { msg.value = t('account.security.pwd_min_length'); msgErr.value = true; return }
  if (form.value.newPwd !== form.value.confirmPwd) { msg.value = t('account.security.pwd_mismatch'); msgErr.value = true; return }
  saving.value = true
  try {
    await $fetch('/api/user/change-password', { method: 'PUT', credentials: 'include', body: { oldPassword: form.value.currentPwd, newPassword: form.value.newPwd } })
    msg.value = t('account.security.pwd_changed'); msgErr.value = false
    form.value = { currentPwd: '', newPwd: '', confirmPwd: '' }
  } catch(e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || err.message || t('account.security.change_failed'); msgErr.value = true }
  finally { saving.value = false }
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.account-page { max-width: 640px; margin: 0 auto; padding: 40px 24px; }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: var(--text-primary); }
.security-section { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 20px; }
.security-section h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.security-section p { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.text-input { width: 100%; padding: 9px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.text-input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.btn-primary { padding: 10px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { padding: 10px 24px; background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border-light); border-radius: var(--radius-md); cursor: not-allowed; font-size: 14px; }
.btn-secondary:disabled { opacity: 0.6; }
.msg { margin-top: 12px; font-size: 13px; color: var(--success); }
.msg.error { color: var(--danger); }
ul { list-style: none; padding: 0; margin: 0; }
li { padding: 10px 0; border-bottom: 1px solid var(--table-border); font-size: 13px; color: var(--text-secondary); }
.empty-hint { font-style: italic; }
.skeleton-line { height: 12px; background: var(--bg-hover); border-radius: 4px; margin-bottom: 8px; animation: shimmer 1.5s infinite; }
.skeleton-line.w-60 { width: 60%; }
@keyframes shimmer { 0% { opacity: .5; } 50% { opacity: 1; } 100% { opacity: .5; } }
</style>
