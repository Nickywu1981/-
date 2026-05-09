<template>
  <div class="profile-page">
    <div class="page-header">
      <h1 class="page-title">个人中心</h1>
      <NuxtLink to="/account/settings" class="settings-link">编辑资料 →</NuxtLink>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="3" />

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchProfile">重试</button>
    </div>

    <template v-else-if="profile">
      <div class="profile-card">
        <div class="avatar-section">
          <div class="avatar">{{ (profile.nickname || profile.username || 'U')[0].toUpperCase() }}</div>
          <div class="user-info">
            <h2 class="nickname">{{ profile.nickname || profile.username }}</h2>
            <p class="role-badge">{{ profile.role === 'admin' ? '管理员' : '普通用户' }}</p>
            <p class="uid">ID: {{ profile.id || profile.user_id }}</p>
          </div>
        </div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">手机号</span>
            <span class="value">{{ profile.phone || '未绑定' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">邮箱</span>
            <span class="value">{{ profile.email || '未绑定' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">注册时间</span>
            <span class="value">{{ formatTime(profile.create_time) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">会员等级</span>
            <span class="value plan-name">{{ profile.plan_name || '免费版' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">剩余积分</span>
            <span class="value credits">{{ profile.credits || 0 }}</span>
          </div>
          <div class="detail-item">
            <span class="label">累计任务</span>
            <span class="value">{{ profile.task_count || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <NuxtLink to="/account/credits" class="action-card">
          <span class="action-icon">💎</span>
          <span class="action-text">积分明细</span>
        </NuxtLink>
        <NuxtLink to="/account/works" class="action-card">
          <span class="action-icon">📋</span>
          <span class="action-text">我的作品</span>
        </NuxtLink>
        <NuxtLink to="/account/orders" class="action-card">
          <span class="action-icon">📦</span>
          <span class="action-text">套餐订单</span>
        </NuxtLink>
        <NuxtLink to="/account/billing" class="action-card">
          <span class="action-icon">💳</span>
          <span class="action-text">消费账单</span>
        </NuxtLink>
        <NuxtLink to="/account/templates" class="action-card">
          <span class="action-icon">📄</span>
          <span class="action-text">我的模板</span>
        </NuxtLink>
        <NuxtLink to="/account/notifications" class="action-card">
          <span class="action-icon">🔔</span>
          <span class="action-text">消息通知</span>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const formatTime = formatDateTime

const profile = ref<any>(null);
const loading = ref(true);
const error = ref('');

async function fetchProfile() {
  loading.value = true; error.value = '';
  try {
    const res: any = await $fetch('/api/user/profile');
    profile.value = res.data || res;
  } catch (e: any) { error.value = '加载失败，请重试'; }
  loading.value = false;
}

onMounted(fetchProfile);
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
.action-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); text-decoration: none; color: var(--text-primary); transition: all var(--transition-fast); }
.action-card:hover { border-color: var(--brand); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.action-icon { font-size: 28px; }
.action-text { font-size: 13px; font-weight: 500; }
</style>