<template>
  <div class="page">
    <div class="page-header"><h1>{{ $t('enterprise.distribution.links.title') }}</h1></div>
    <div class="card">
      <h3>{{ $t('enterprise.distribution.links.exclusiveLink') }}</h3>
      <div class="link-box">
        <code>{{ inviteLink }}</code>
        <button class="btn-primary" @click="copyLink">{{ $t('enterprise.distribution.links.copyLink') }}</button>
      </div>
    </div>
    <div class="card">
      <h3>{{ $t('enterprise.distribution.links.qrCode') }}</h3>
      <p class="hint">{{ $t('enterprise.distribution.links.useInviteCode', { code: inviteCode }) }}</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'user-workspace' });
const toast = useToast();
const { t } = useI18n();

const inviteCode = ref('');
const inviteLink = ref('');

onMounted(async () => {
  try {
    const r = await $fetch('/api/distribution/invite-code', { credentials: 'include' });
    inviteCode.value = r.data?.code || '';
    if (inviteCode.value) {
      inviteLink.value = `${window.location.origin}/register?ref=${inviteCode.value}`;
    }
  } catch (e) { toast.error(t('enterprise.distribution.links.loadError')); }
});

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    toast.success(t('enterprise.distribution.links.linkCopied'));
  } catch { /* 降级：用户手动复制 */ }
}
</script>

<style scoped>
.link-box { display: flex; gap: 12px; align-items: center; padding: 16px; background: var(--bg-input); border-radius: 8px; }
.link-box code { flex: 1; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: 4px; word-break: break-all; }
.hint { color: var(--text-muted); }
</style>
