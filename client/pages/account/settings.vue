<template>
  <div class="page">
    <div class="tabs">
      <button :class="{ active: tab === 'profile' }" @click="tab = 'profile'">{{ $t('account.settings.tab_profile') }}</button>
      <button :class="{ active: tab === 'phone' }" @click="tab = 'phone'">{{ $t('account.settings.tab_phone') }}</button>
      <button :class="{ active: tab === 'password' }" @click="tab = 'password'">{{ $t('account.settings.tab_password') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="form" :rows="4" />

    <template v-else>
    <div v-if="tab === 'profile'" class="card">
      <div class="form-group">
        <label for="prof-nickname">{{ $t('account.settings.username_label') }}</label>
        <input id="prof-nickname" v-model="form.nickname" type="text" :placeholder="$t('account.settings.nickname_placeholder')" autocomplete="nickname" />
      </div>
      <div class="form-group">
        <label for="prof-phone">{{ $t('account.settings.phone_label') }}</label>
        <input id="prof-phone" v-model="form.phone" type="tel" :placeholder="$t('account.settings.phone_optional')" autocomplete="tel" inputmode="tel" />
      </div>
      <div class="form-group">
        <label for="prof-email">{{ $t('account.settings.email_label') }}</label>
        <input id="prof-email" v-model="form.email" type="email" :placeholder="$t('account.settings.email_optional')" inputmode="email" />
      </div>
      <button class="btn-save" :disabled="saving" @click="saveProfile">{{ saving ? $t('account.settings.saving') : $t('account.settings.save') }}</button>
      <p v-if="msg" class="msg" :class="{ error: msgErr }">{{ msg }}</p>
    </div>

    <div v-if="tab === 'phone'" class="card">
      <div v-if="boundPhone" class="bound-info">
        <div class="bound-label">{{ $t('account.settings.bound_phone') }}</div>
        <div class="bound-phone">{{ boundPhone }}</div>
        <button class="btn-text" @click="unbinding = true">{{ $t('account.settings.unbind') }}</button>
      </div>
      <div v-else>
        <div class="form-group">
          <label for="bind-phone">{{ $t('account.settings.phone_label') }}</label>
          <input id="bind-phone" v-model="phoneForm.phone" type="text" maxlength="11" :placeholder="$t('account.settings.phone_placeholder')" />
        </div>
        <div class="form-group">
          <label for="bind-code">{{ $t('account.settings.code_label') }}</label>
          <div class="code-row">
            <input id="bind-code" v-model="phoneForm.code" type="text" maxlength="6" :placeholder="$t('account.settings.code_placeholder')" class="code-input" />
            <button class="btn-code" :disabled="codeCooldown > 0" @click="sendBindCode">{{ codeCooldown > 0 ? `${codeCooldown}s` : $t('account.settings.get_code') }}</button>
          </div>
        </div>
        <button class="btn-save" :disabled="phoneSaving" @click="bindPhone">{{ phoneSaving ? $t('account.settings.binding') : $t('account.settings.bind_phone') }}</button>
        <p v-if="phoneMsg" class="msg" :class="{ error: phoneMsgErr }">{{ phoneMsg }}</p>
      </div>

      <div v-if="unbinding" class="unbind-confirm">
        <p>{{ $t('account.settings.unbind_confirm') }}</p>
        <div class="unbind-actions">
          <button class="btn-cancel" @click="unbinding = false">{{ $t('account.settings.cancel') }}</button>
          <button class="btn-danger" :disabled="phoneSaving" @click="unbindPhone">{{ phoneSaving ? $t('account.settings.unbinding') : $t('account.settings.confirm_unbind') }}</button>
        </div>
      </div>
    </div>

    <div v-if="tab === 'password'" class="card">
      <div class="form-group">
        <label for="pw-old">{{ $t('account.settings.old_password') }}</label>
        <input id="pw-old" v-model="pw.oldPassword" type="password" :placeholder="$t('account.settings.old_password_placeholder')" autocomplete="current-password" />
      </div>
      <div class="form-group">
        <label for="pw-new">{{ $t('account.settings.new_password') }}</label>
        <input id="pw-new" v-model="pw.newPassword" type="password" :placeholder="$t('account.settings.new_password_placeholder')" autocomplete="new-password" />
      </div>
      <button class="btn-save" :disabled="pwSaving" @click="savePassword">{{ pwSaving ? $t('account.settings.changing') : $t('account.settings.change_password') }}</button>
      <p v-if="pwMsg" class="msg" :class="{ error: pwMsgErr }">{{ pwMsg }}</p>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">

const { t } = useI18n()

const tab = ref('profile');
const loading = ref(true)
const form = reactive({ nickname: '', phone: '', email: '' });
const pw = reactive({ oldPassword: '', newPassword: '' });
const phoneForm = reactive({ phone: '', code: '' });
const saving = ref(false);
const pwSaving = ref(false);
const phoneSaving = ref(false);
const boundPhone = ref('');
const unbinding = ref(false);
const msg = ref('');
const msgErr = ref(false);
const pwMsg = ref('');
const pwMsgErr = ref(false);
const phoneMsg = ref('');
const phoneMsgErr = ref(false);
const { countdown: codeCooldown, start: startCodeCd } = useCountdown(60)
const toast = useToast()

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/user/profile', { credentials: 'include' });
    Object.assign(form, { nickname: res.data?.nickname || '', phone: res.data?.phone || '', email: res.data?.email || '' });
    if (res.data?.phone) boundPhone.value = res.data.phone;
  } catch { toast.error(t('account.settings.load_failed')) }
  finally { loading.value = false }
});

async function saveProfile() {
  saving.value = true; msg.value = '';
  try {
    await $fetch('/api/user/profile', { method: 'PUT', credentials: 'include', body: { nickname: form.nickname, phone: form.phone, email: form.email } });
    msg.value = t('account.settings.save_success'); msgErr.value = false;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || err.message || t('account.settings.save_failed'); msgErr.value = true; }
  saving.value = false;
}

async function savePassword() {
  if (!pw.oldPassword || pw.newPassword.length < 8) { pwMsg.value = t('account.settings.password_min_length'); pwMsgErr.value = true; return; }
  pwSaving.value = true; pwMsg.value = '';
  try {
    await $fetch('/api/user/change-password', { method: 'PUT', credentials: 'include', body: { oldPassword: pw.oldPassword, newPassword: pw.newPassword } });
    pwMsg.value = t('account.settings.password_changed'); pwMsgErr.value = false;
    pw.oldPassword = ''; pw.newPassword = '';
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; pwMsg.value = err?.data?.msg || err.message || t('account.settings.change_failed'); pwMsgErr.value = true; }
  pwSaving.value = false;
}

async function sendBindCode() {
  if (!phoneForm.phone || !/^1[3-9]\d{9}$/.test(phoneForm.phone)) {
    phoneMsg.value = t('account.settings.invalid_phone'); phoneMsgErr.value = true; return;
  }
  phoneMsg.value = '';
  try {
    await $fetch('/api/sms/send-code', { method: 'POST', credentials: 'include', body: { phone: phoneForm.phone, scene: 'bind' } });
    phoneMsg.value = t('account.settings.code_sent'); phoneMsgErr.value = false;
    startCodeCd(60);
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; phoneMsg.value = err?.data?.msg || err.message || t('account.settings.send_failed'); phoneMsgErr.value = true; }
}

async function bindPhone() {
  if (!phoneForm.phone || !phoneForm.code) { phoneMsg.value = t('account.settings.fill_phone_code'); phoneMsgErr.value = true; return; }
  phoneSaving.value = true; phoneMsg.value = '';
  try {
    const verify: any = await $fetch('/api/sms/verify-code', { method: 'POST', credentials: 'include', body: { phone: phoneForm.phone, scene: 'bind', code: phoneForm.code } });
    if (!verify.data?.valid) { phoneMsg.value = t('account.settings.code_invalid'); phoneMsgErr.value = true; phoneSaving.value = false; return; }
    await $fetch('/api/user/profile', { method: 'PUT', credentials: 'include', body: { phone: phoneForm.phone } });
    boundPhone.value = phoneForm.phone;
    form.phone = phoneForm.phone;
    phoneForm.phone = ''; phoneForm.code = '';
    phoneMsg.value = t('account.settings.phone_bound'); phoneMsgErr.value = false;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; phoneMsg.value = err?.data?.msg || err.message || t('account.settings.bind_failed'); phoneMsgErr.value = true; }
  phoneSaving.value = false;
}

async function unbindPhone() {
  phoneSaving.value = true;
  try {
    await $fetch('/api/user/profile', { method: 'PUT', credentials: 'include', body: { phone: '' } });
    boundPhone.value = ''; form.phone = ''; unbinding.value = false;
    phoneMsg.value = t('account.settings.unbound'); phoneMsgErr.value = false;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; phoneMsg.value = err?.data?.msg || err.message || t('account.settings.unbind_failed'); phoneMsgErr.value = true; }
  phoneSaving.value = false;
}
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 520px; margin: 0 auto; padding: 24px 16px; }
.tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid var(--border-light); }
.tabs button { flex: 1; padding: 12px; border: none; background: none; font-size: 15px; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color var(--transition-fast); }
.tabs button:hover { color: var(--text-primary); }
.tabs button.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }
.card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-group input:focus { border-color: var(--brand); box-shadow: var(--focus-ring); }
.btn-save { width: 100%; padding: 12px; background: var(--brand-gradient); color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600; transition: box-shadow var(--transition-fast), transform var(--transition-fast), opacity var(--transition-fast); }
.btn-save:hover { box-shadow: 0 4px 12px rgba(var(--brand-rgb, 91,95,227), 0.3); transform: translateY(-1px); }
.btn-save:active { transform: scale(0.98); }
.btn-save:disabled { opacity: 0.6; transform: none; box-shadow: none; }
.code-row { display: flex; gap: 12px; }
.code-input { flex: 1; }
.btn-code { flex-shrink: 0; padding: 10px 16px; background: var(--bg-card); color: var(--brand); border: 1px solid var(--brand); border-radius: 8px; font-size: 13px; cursor: pointer; white-space: nowrap; transition: background var(--transition-fast), opacity var(--transition-fast); }
.btn-code:hover { background: var(--brand-bg); }
.btn-code:disabled { opacity: 0.5; cursor: not-allowed; }
.bound-info { text-align: center; padding: 16px 0; }
.bound-label { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
.bound-phone { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
.btn-text { background: none; border: none; color: var(--text-link); font-size: 13px; cursor: pointer; }
.unbind-confirm { margin-top: 20px; padding: 16px; background: var(--danger-light, #fef2f2); border-radius: 8px; }
.unbind-confirm p { font-size: 13px; color: var(--danger); margin-bottom: 12px; }
.unbind-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn-cancel { padding: 8px 20px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-danger:disabled { opacity: 0.6; }
.msg { margin-top: 12px; font-size: 13px; color: var(--success); text-align: center; }
.msg.error { color: var(--danger); }
</style>
