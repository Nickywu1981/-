<template>
  <div class="page">
    <div class="tabs">
      <button :class="{ active: tab === 'profile' }" @click="tab = 'profile'">个人资料</button>
      <button :class="{ active: tab === 'phone' }" @click="tab = 'phone'">手机绑定</button>
      <button :class="{ active: tab === 'password' }" @click="tab = 'password'">修改密码</button>
    </div>

    <LoadingSkeleton v-if="loading" type="form" :rows="4" />

    <template v-else>
    <!-- 个人资料 -->
    <div v-if="tab === 'profile'" class="card">
      <div class="form-group">
        <label for="prof-nickname">用户名</label>
        <input id="prof-nickname" v-model="form.nickname" type="text" placeholder="昵称" autocomplete="nickname" />
      </div>
      <div class="form-group">
        <label for="prof-phone">手机号</label>
        <input id="prof-phone" v-model="form.phone" type="tel" placeholder="选填" autocomplete="tel" inputmode="tel" />
      </div>
      <div class="form-group">
        <label for="prof-email">邮箱</label>
        <input id="prof-email" v-model="form.email" type="email" placeholder="选填" inputmode="email" />
      </div>
      <button class="btn-save" :disabled="saving" @click="saveProfile">{{ saving ? '保存中...' : '保存' }}</button>
      <p v-if="msg" class="msg" :class="{ error: msgErr }">{{ msg }}</p>
    </div>

    <!-- 手机绑定 -->
    <div v-if="tab === 'phone'" class="card">
      <div v-if="boundPhone" class="bound-info">
        <div class="bound-label">已绑定手机号</div>
        <div class="bound-phone">{{ boundPhone }}</div>
        <button class="btn-text" @click="unbinding = true">解绑</button>
      </div>
      <div v-else>
        <div class="form-group">
          <label for="bind-phone">手机号</label>
          <input id="bind-phone" v-model="phoneForm.phone" type="text" maxlength="11" placeholder="请输入手机号" />
        </div>
        <div class="form-group">
          <label for="bind-code">验证码</label>
          <div class="code-row">
            <input id="bind-code" v-model="phoneForm.code" type="text" maxlength="6" placeholder="6位验证码" class="code-input" />
            <button class="btn-code" :disabled="codeCooldown > 0" @click="sendBindCode">{{ codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}</button>
          </div>
        </div>
        <button class="btn-save" :disabled="phoneSaving" @click="bindPhone">{{ phoneSaving ? '绑定中...' : '绑定手机号' }}</button>
        <p v-if="phoneMsg" class="msg" :class="{ error: phoneMsgErr }">{{ phoneMsg }}</p>
      </div>

      <!-- 解绑确认 -->
      <div v-if="unbinding" class="unbind-confirm">
        <p>确定要解绑手机号吗？解绑后将无法接收任务完成短信通知。</p>
        <div class="unbind-actions">
          <button class="btn-cancel" @click="unbinding = false">取消</button>
          <button class="btn-danger" :disabled="phoneSaving" @click="unbindPhone">{{ phoneSaving ? '解绑中...' : '确认解绑' }}</button>
        </div>
      </div>
    </div>

    <!-- 修改密码 -->
    <div v-if="tab === 'password'" class="card">
      <div class="form-group">
        <label for="pw-old">原密码</label>
        <input id="pw-old" v-model="pw.oldPassword" type="password" placeholder="请输入原密码" autocomplete="current-password" />
      </div>
      <div class="form-group">
        <label for="pw-new">新密码</label>
        <input id="pw-new" v-model="pw.newPassword" type="password" placeholder="至少6位" autocomplete="new-password" />
      </div>
      <button class="btn-save" :disabled="pwSaving" @click="savePassword">{{ pwSaving ? '修改中...' : '修改密码' }}</button>
      <p v-if="pwMsg" class="msg" :class="{ error: pwMsgErr }">{{ pwMsg }}</p>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">



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
    const res: any = await $fetch('/api/user/profile');
    Object.assign(form, { nickname: res.data?.nickname || '', phone: res.data?.phone || '', email: res.data?.email || '' });
    if (res.data?.phone) boundPhone.value = res.data.phone;
  } catch { toast.error('加载用户信息失败') }
  finally { loading.value = false }
});

async function saveProfile() {
  saving.value = true; msg.value = '';
  try {
    await $fetch('/api/user/profile', { method: 'PUT', body: { nickname: form.nickname, phone: form.phone, email: form.email } });
    msg.value = '保存成功'; msgErr.value = false;
  } catch (e: any) { msg.value = e?.data?.msg || '保存失败'; msgErr.value = true; }
  saving.value = false;
}

async function savePassword() {
  if (!pw.oldPassword || pw.newPassword.length < 8) { pwMsg.value = '新密码至少8位'; pwMsgErr.value = true; return; }
  pwSaving.value = true; pwMsg.value = '';
  try {
    await $fetch('/api/user/change-password', { method: 'PUT', body: { oldPassword: pw.oldPassword, newPassword: pw.newPassword } });
    pwMsg.value = '密码修改成功'; pwMsgErr.value = false;
    pw.oldPassword = ''; pw.newPassword = '';
  } catch (e: any) { pwMsg.value = e?.data?.msg || '修改失败'; pwMsgErr.value = true; }
  pwSaving.value = false;
}

async function sendBindCode() {
  if (!phoneForm.phone || !/^1[3-9]\d{9}$/.test(phoneForm.phone)) {
    phoneMsg.value = '请输入正确的手机号'; phoneMsgErr.value = true; return;
  }
  phoneMsg.value = '';
  try {
    await $fetch('/api/sms/send-code', { method: 'POST', body: { phone: phoneForm.phone, scene: 'bind' } });
    phoneMsg.value = '验证码已发送'; phoneMsgErr.value = false;
    startCodeCd(60);
  } catch (e: any) { phoneMsg.value = e?.data?.msg || '发送失败'; phoneMsgErr.value = true; }
}

async function bindPhone() {
  if (!phoneForm.phone || !phoneForm.code) { phoneMsg.value = '请填写手机号和验证码'; phoneMsgErr.value = true; return; }
  phoneSaving.value = true; phoneMsg.value = '';
  try {
    const verify: any = await $fetch('/api/sms/verify-code', { method: 'POST', body: { phone: phoneForm.phone, scene: 'bind', code: phoneForm.code } });
    if (!verify.data?.valid) { phoneMsg.value = '验证码错误或已过期'; phoneMsgErr.value = true; phoneSaving.value = false; return; }
    await $fetch('/api/user/profile', { method: 'PUT', body: { phone: phoneForm.phone } });
    boundPhone.value = phoneForm.phone;
    form.phone = phoneForm.phone;
    phoneForm.phone = ''; phoneForm.code = '';
    phoneMsg.value = '手机号绑定成功'; phoneMsgErr.value = false;
  } catch (e: any) { phoneMsg.value = e?.data?.msg || '绑定失败'; phoneMsgErr.value = true; }
  phoneSaving.value = false;
}

async function unbindPhone() {
  phoneSaving.value = true;
  try {
    await $fetch('/api/user/profile', { method: 'PUT', body: { phone: '' } });
    boundPhone.value = ''; form.phone = ''; unbinding.value = false;
    phoneMsg.value = '已解绑'; phoneMsgErr.value = false;
  } catch (e: any) { phoneMsg.value = e?.data?.msg || '解绑失败'; phoneMsgErr.value = true; }
  phoneSaving.value = false;
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
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
.btn-save:hover { box-shadow: 0 4px 12px rgba(124,58,237,0.3); transform: translateY(-1px); }
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
