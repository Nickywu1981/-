<template>
  <div class="ent-settings">
    <h1 class="page-title">账户设置</h1>

    <div class="form-card">
      <h2>企业信息</h2>
      <div class="form-group">
        <label>企业名称</label>
        <input v-model="profile.name" placeholder="企业名称" />
      </div>
      <div class="form-group">
        <label>Logo URL</label>
        <input v-model="profile.logo" placeholder="https://..." />
      </div>
      <div class="form-group">
        <label>联系人姓名</label>
        <input v-model="profile.contactName" placeholder="联系人" />
      </div>
      <div class="form-group">
        <label>联系邮箱</label>
        <input v-model="profile.contactEmail" type="email" placeholder="联系邮箱" />
      </div>
      <div class="form-group">
        <label>自定义域名</label>
        <input v-model="profile.domain" placeholder="ai.yourcompany.com" />
      </div>

      <div v-if="msg" :class="['msg', ok ? 'success' : 'error']">{{ msg }}</div>
      <button class="btn-primary" @click="handleSave" :disabled="saving">
        {{ saving ? '保存中...' : '保存修改' }}
      </button>
    </div>

    <div class="info-card">
      <h2>账户概览</h2>
      <div class="info-grid">
        <div class="info-item"><span class="label">企业编码</span><span>{{ profile.code }}</span></div>
        <div class="info-item"><span class="label">企业类型</span><span>{{ typeLabel }}</span></div>
        <div class="info-item"><span class="label">当前套餐</span><span>{{ profile.planType }}</span></div>
        <div class="info-item"><span class="label">子账号数</span><span>{{ profile.userCount || 0 }}</span></div>
        <div class="info-item"><span class="label">账户余额</span><span>¥{{ profile.balance || 0 }}</span></div>
        <div class="info-item"><span class="label">到期时间</span><span>{{ profile.expireTime || '长期有效' }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const profile = ref({});
const saving = ref(false);
const msg = ref('');
const ok = ref(false);

const typeLabel = computed(() => {
  const map = { enterprise: '企业', agent: '代理商', partner: '合作伙伴' };
  return map[profile.value.type] || profile.value.type || '-';
});

onMounted(async () => {
  try {
    const res = await $fetch('/api/enterprise/profile', { credentials: 'include' });
    profile.value = res.data || res;
  } catch (e) { console.error(e); }
});

async function handleSave() {
  msg.value = '';
  saving.value = true;
  try {
    await $fetch('/api/enterprise/profile', {
      method: 'PUT',
      body: {
        name: profile.value.name,
        logo: profile.value.logo,
        domain: profile.value.domain,
        contactName: profile.value.contactName,
        contactEmail: profile.value.contactEmail,
      },
      credentials: 'include',
    });
    ok.value = true;
    msg.value = '设置已保存';
  } catch (e) {
    ok.value = false;
    msg.value = e?.data?.msg || '保存失败';
  } finally { saving.value = false; }
}

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-title { font-size: 24px; margin: 0 0 28px; color: #1a1a2e; }

.form-card, .info-card { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); max-width: 560px; margin-bottom: 24px; }
.form-card h2, .info-card h2 { font-size: 16px; margin: 0 0 18px; color: #333; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; color: #555; margin-bottom: 4px; }
.form-group input { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }

.msg { padding: 10px; border-radius: 8px; font-size: 14px; margin-bottom: 14px; }
.msg.success { background: #e8f5e9; color: #27ae60; }
.msg.error { background: #fbe9e7; color: #e74c3c; }

.btn-primary { padding: 12px 28px; background: #667eea; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; }
.btn-primary:disabled { opacity: 0.6; }

.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.info-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.info-item .label { color: #888; }
</style>
