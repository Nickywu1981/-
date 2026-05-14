<!--
  Movio AI v4.1 — Member Center (会员中心)
  G4 前端开发 | W4
  会员套餐 / 积分余额 / 点数余额 / 快速入口
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ $t('member.title') }}</h1>
      <p>{{ $t('member.subtitle') }}</p>
    </header>

    <!-- 会员状态 -->
    <div class="member-status-card">
      <div class="status-left">
        <span class="plan-badge" :class="(profile?.plan_type ?? 0) > 0 ? 'paid' : 'free'">
          {{ (profile?.plan_type ?? 0) > 0 ? $t('member.paid_user') : $t('member.free_user') }}
        </span>
        <span v-if="profile?.plan_type > 0" class="expire-text">{{ $t('member.expire_prefix') }}{{ profile?.end_time?.slice(0, 10) || '-' }}</span>
      </div>
      <div class="status-right">
        <NuxtLink to="/account/membership" class="btn btn-primary btn-sm">{{ $t('member.upgrade_plan') }}</NuxtLink>
      </div>
    </div>

    <!-- 资产概览 -->
    <div class="assets-grid">
      <div class="asset-card credits">
        <span class="asset-label">{{ $t('member.credits_balance') }}</span>
        <span class="asset-value">{{ profile?.credit_balance || 0 }}</span>
        <NuxtLink to="/account/credits" class="asset-link">{{ $t('member.view_detail') }}</NuxtLink>
      </div>
      <div class="asset-card points">
        <span class="asset-label">{{ $t('member.points_balance') }}</span>
        <span class="asset-value">{{ pointsBalance }}</span>
        <NuxtLink to="/account/points" class="asset-link">{{ $t('member.points_center') }}</NuxtLink>
      </div>
    </div>

    <!-- 快速入口 -->
    <div class="section">
      <h3>{{ $t('member.quick_entries') }}</h3>
      <div class="entry-grid">
        <NuxtLink v-for="entry in entries" :key="entry.path" :to="entry.path" class="entry-card">
          <span class="entry-icon">{{ entry.icon }}</span>
          <div class="entry-info">
            <span class="entry-name">{{ $t(entry.nameKey) }}</span>
            <span class="entry-desc">{{ $t(entry.descKey) }}</span>
          </div>
          <span class="entry-arrow">→</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 用量统计 -->
    <div class="section">
      <h3>{{ $t('member.usage_stats') }}</h3>
      <div v-if="!stats" class="empty-state">{{ $t('common.loading') }}</div>
      <div v-else class="stats-grid">
        <div class="stat-item">
          <span class="stat-num">{{ stats.todayTasks || 0 }}</span>
          <span class="stat-text">{{ $t('member.stat_today_tasks') }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.totalTasks || 0 }}</span>
          <span class="stat-text">{{ $t('member.stat_total_tasks') }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.thisMonthConsumed || 0 }}</span>
          <span class="stat-text">{{ $t('member.stat_month_consumed') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">const { t } = useI18n()


const toast = useToast()
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const apiBase = useRuntimeConfig().public.apiBase || '/api'

const profile = ref<any>(null)
const pointsBalance = ref(0)

const entries = [
  { path: '/account/membership', icon: '💳', nameKey: 'member.entry_membership', descKey: 'member.entry_membership_desc' },
  { path: '/account/points', icon: '🎁', nameKey: 'member.entry_points', descKey: 'member.entry_points_desc' },
  { path: '/account/credits', icon: '⚡', nameKey: 'member.entry_credits', descKey: 'member.entry_credits_desc' },
  { path: '/account/billing', icon: '📋', nameKey: 'member.entry_billing', descKey: 'member.entry_billing_desc' },
  { path: '/account/distribution', icon: '💰', nameKey: 'member.entry_distribution', descKey: 'member.entry_distribution_desc' },
  { path: '/account/bind-platform', icon: '🔗', nameKey: 'member.entry_bind_platform', descKey: 'member.entry_bind_platform_desc' },
]

const stats = ref<any>(null)

onMounted(async () => {
  try {
    const [profileRes, pointsRes, statsRes] = await Promise.all([
      $fetch(`${apiBase}/user/profile`, { credentials: 'include' }),
      $fetch(`${apiBase}/points/account`, { credentials: 'include' }),
      $fetch(`${apiBase}/user/stats`, { credentials: 'include' }).catch((err: any) => { if (import.meta.dev) console.warn(t('member.stats_load_failed'), err?.message || err); return null }),
    ])

    if ((profileRes as any).code === 200) profile.value = (profileRes as any).data
    if ((pointsRes as any).code === 200) pointsBalance.value = (pointsRes as any).data?.balance || 0
    if ((statsRes as any)?.code === 200) stats.value = (statsRes as any).data
    else stats.value = { todayTasks: '-', totalTasks: '-', thisMonthConsumed: '-' }
  } catch { toast.error(t('common.failed_load_member')) }
})
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.page-header { text-align: center; margin-bottom: 28px; }
.page-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 6px; }
.page-header p { color: var(--cfg-text-muted); margin: 0; font-size: var(--cfg-font-size-base); }

.member-status-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border);
  border-radius: var(--cfg-radius-lg); margin-bottom: 20px;
}
.plan-badge { padding: 4px 12px; border-radius: var(--cfg-radius-full); font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-semibold); }
.plan-badge.free { background: var(--cfg-bg-tertiary); color: var(--cfg-text-secondary); }
.plan-badge.paid { background: var(--success-light); color: #059669; }
.expire-text { margin-left: 12px; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); }

.assets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
.asset-card { padding: 24px; border-radius: var(--cfg-radius-lg); text-align: center; }
.asset-card.credits { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff; }
.asset-card.points { background: linear-gradient(135deg, #F59E0B, #EF4444); color: #fff; }
.asset-label { font-size: var(--cfg-font-size-sm); opacity: 0.85; display: block; margin-bottom: 4px; }
.asset-value { font-size: 36px; font-weight: var(--cfg-font-weight-bold); display: block; margin-bottom: 8px; }
.asset-link { color: inherit; font-size: var(--cfg-font-size-sm); text-decoration: none; opacity: 0.8; }

.section { margin-bottom: 28px; }
.section h3 { font-size: var(--cfg-font-size-lg); margin: 0 0 16px; color: var(--cfg-text-primary); }

.entry-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.entry-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base);
  background: var(--cfg-bg-primary); text-decoration: none;
  transition: border-color var(--cfg-transition-fast);
}
.entry-card:hover { border-color: var(--cfg-primary); }
.entry-icon { font-size: 24px; flex-shrink: 0; }
.entry-info { flex: 1; }
.entry-name { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-primary); display: block; }
.entry-desc { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.entry-arrow { font-size: 16px; color: var(--cfg-text-muted); }

.stats-grid { display: flex; gap: 20px; }
.stat-item { flex: 1; padding: 16px; text-align: center; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); }
.stat-num { font-size: var(--cfg-font-size-xl); font-weight: var(--cfg-font-weight-bold); color: var(--cfg-text-primary); display: block; }
.stat-text { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); margin-top: 4px; display: block; }

.empty-state { padding: 40px; text-align: center; color: var(--cfg-text-muted); }
</style>
