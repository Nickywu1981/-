<template>
  <div class="profile-page">
    <div class="page-header">
      <h1 class="page-title">{{ $t('account.profile.page_title') }}</h1>
      <NuxtLink to="/account/settings" class="settings-link">{{ $t('account.profile.edit_profile') }}</NuxtLink>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="3" />

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchProfile">{{ $t('account.profile.retry') }}</button>
    </div>

    <template v-else-if="profile">
      <div class="profile-card">
        <div class="avatar-section">
          <div class="avatar">{{ (profile.nickname || profile.username || 'U')[0].toUpperCase() }}</div>
          <div class="user-info">
            <h2 class="nickname">{{ profile.nickname || profile.username }}</h2>
            <p class="role-badge">{{ profile.role === 'admin' ? $t('account.profile.role_admin') : $t('account.profile.role_user') }}</p>
            <p class="uid">ID: {{ profile.id || profile.user_id }}</p>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">{{ $t('account.profile.phone') }}</span>
            <span class="value">{{ profile.phone || $t('account.profile.not_bound') }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ $t('account.profile.email') }}</span>
            <span class="value">{{ profile.email || $t('account.profile.not_bound') }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ $t('account.profile.register_time') }}</span>
            <span class="value">{{ formatDateTime(profile.create_time) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ $t('account.profile.member_level') }}</span>
            <span class="value plan-name">{{ profile.plan_name || $t('account.profile.free_plan') }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ $t('account.profile.credits') }}</span>
            <span class="value credits">{{ profile.credits || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ $t('account.profile.task_count') }}</span>
            <span class="value">{{ profile.task_count || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <NuxtLink to="/account/credits" class="action-card">
          <span class="action-icon">💎</span>
          <span class="action-text">{{ $t('account.profile.credit_details') }}</span>
        </NuxtLink>
        <NuxtLink to="/account/works" class="action-card">
          <span class="action-icon">📋</span>
          <span class="action-text">{{ $t('account.profile.my_works') }}</span>
        </NuxtLink>
        <NuxtLink to="/account/orders" class="action-card">
          <span class="action-icon">📦</span>
          <span class="action-text">{{ $t('account.profile.plan_orders') }}</span>
        </NuxtLink>
        <NuxtLink to="/account/billing" class="action-card">
          <span class="action-icon">💳</span>
          <span class="action-text">{{ $t('account.profile.billing') }}</span>
        </NuxtLink>
        <NuxtLink to="/account/templates" class="action-card">
          <span class="action-icon">📄</span>
          <span class="action-text">{{ $t('account.profile.my_templates') }}</span>
        </NuxtLink>
        <NuxtLink to="/account/notifications" class="action-card">
          <span class="action-icon">🔔</span>
          <span class="action-text">{{ $t('account.profile.notifications') }}</span>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()

const profile = ref<any>(null);
const loading = ref(true);
const error = ref('');

async function fetchProfile() {
  loading.value = true; error.value = '';
  try {
    const res: any = await $fetch('/api/user/profile', { credentials: 'include' });
    profile.value = res.data || res;
  } catch (e: unknown) { error.value = t('account.profile.load_failed'); }
  loading.value = false;
}

onMounted(fetchProfile);
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.profile-page { max-width: 800px; margin: 40px auto; padding: 0 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.settings-link { font-size: 14px; color: var(--brand); text-decoration: none; font-weight: 500; transition: opacity var(--transition-fast); }
.settings-link:hover { opacity: 0.8; }
.error-state { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
.retry-btn { margin-top: 12px; padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; }

.profile-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-xl); padding: 28px; }
.avatar-section { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light); }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: var(--brand-gradient); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; flex-shrink: 0; }
.nickname { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.role-badge { display: inline-block; padding: 2px 10px; background: var(--brand-bg); color: var(--brand); border-radius: var(--badge-radius); font-size: 12px; margin-bottom: 4px; }
.uid { font-size: 12px; color: var(--text-muted); }

.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 640px) { .detail-grid { grid-template-columns: repeat(2, 1fr); } }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 12px; color: var(--text-muted); }
.value { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.plan-name { color: var(--brand); }
.credits { color: var(--warning); }

.quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; }
@media (max-width: 640px) { .quick-actions { grid-template-columns: repeat(2, 1fr); } }
.action-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); text-decoration: none; color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast); }
.action-card:hover { border-color: var(--brand); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.action-icon { font-size: 28px; }
.action-text { font-size: 13px; font-weight: 500; }
</style>
