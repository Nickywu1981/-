<template>
  <div class="page">
    <div class="page-header"><h1>推广链接</h1></div>
    <div class="card">
      <h3>专属推广链接</h3>
      <div class="link-box">
        <code>{{ inviteLink }}</code>
        <button class="btn-primary" @click="copyLink">复制链接</button>
      </div>
    </div>
    <div class="card">
      <h3>推广二维码</h3>
      <p class="hint">使用邀请码 <strong>{{ inviteCode }}</strong> 在注册页面填写即可绑定上下级关系</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from '~/composables/useToast';
const toast = useToast();

const inviteCode = ref('');
const inviteLink = ref('');

onMounted(async () => {
  try {
    const r = await $fetch('/api/distribution/invite-code', { credentials: 'include' });
    inviteCode.value = r.data?.code || '';
    if (inviteCode.value) {
      inviteLink.value = `${window.location.origin}/register?ref=${inviteCode.value}`;
    }
  } catch (e) { toast.error('邀请码加载失败，请刷新重试'); }
});

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    toast.success('链接已复制');
  } catch { /* 降级：用户手动复制 */ }
}
</script>

<style scoped>
.link-box { display: flex; gap: 12px; align-items: center; padding: 16px; background: #f8f9fa; border-radius: 8px; }
.link-box code { flex: 1; padding: 8px 12px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; word-break: break-all; }
.hint { color: #888; }
</style>
