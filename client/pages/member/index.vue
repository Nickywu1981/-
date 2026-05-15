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
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

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
      $fetch(`${apiBase}/user/stats`, { credentials: 'include' }).catch((err: unknown) => { if (import.meta.dev) console.warn(t('member.stats_load_failed'), (err as { message?: string })?.message || err); return null }),
    ])

    if ((profileRes as any).code === 200) profile.value = (profileRes as any).data
    if ((pointsRes as any).code === 200) pointsBalance.value = (pointsRes as any).data?.balance || 0
    if ((statsRes as any)?.code === 200) stats.value = (statsRes as any).data
    else stats.value = { todayTasks: '-', totalTasks: '-', thisMonthConsumed: '-' }
  } catch { toast.error(t('common.failed_load_member')) }
})
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: var(--space-8, 32px)) var(--space-4, 16px)); }
.page-header { text-align: center; margin-bottom: 28px; }
.page-header h1 { font-size: var(--text-2xl, 1.5rem)); margin: 0 0 6px; }
.page-header p { color: var(--text-muted, #9ca3af)); margin: 0; font-size: var(--text-base, 1rem)); }

.member-status-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; background: var(--bg-card, #ffffff)); border: 1px solid var(--border-color, #e5e7eb));
  border-radius: var(--radius-lg, 12px)); margin-bottom: 20px;
}
.plan-badge { padding: 4px 12px; border-radius: var(--radius-full, 9999px)); font-size: var(--text-sm, 0.875rem)); font-weight: 600); }
.plan-badge.free { background: var(--bg-tertiary, #f3f4f6)); color: var(--text-secondary, #6b7280)); }
.plan-badge.paid { background: var(--success-light); color: #059669; }
.expire-text { margin-left: 12px; font-size: var(--text-sm, 0.875rem)); color: var(--text-muted, #9ca3af)); }

.assets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
.asset-card { padding: 24px; border-radius: var(--radius-lg, 12px)); text-align: center; }
.asset-card.credits { background: linear-gradient(135deg, #4F46E5, #5b5fe3); color: #fff; }
.asset-card.points { background: linear-gradient(135deg, #F59E0B, #EF4444); color: #fff; }
.asset-label { font-size: var(--text-sm, 0.875rem)); opacity: 0.85; display: block; margin-bottom: 4px; }
.asset-value { font-size: 36px; font-weight: 700); display: block; margin-bottom: 8px; }
.asset-link { color: inherit; font-size: var(--text-sm, 0.875rem)); text-decoration: none; opacity: 0.8; }

.section { margin-bottom: 28px; }
.section h3 { font-size: var(--text-lg, 1.125rem)); margin: 0 0 16px; color: var(--text-primary, #1f2937)); }

.entry-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.entry-card {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-md, 8px));
  background: var(--bg-card, #ffffff)); text-decoration: none;
  transition: border-color var(--transition-fast, 0.15s ease));
}
.entry-card:hover { border-color: var(--brand, #5b5fe3)); }
.entry-icon { font-size: 24px; flex-shrink: 0; }
.entry-info { flex: 1; }
.entry-name { font-size: var(--text-base, 1rem)); font-weight: 500); color: var(--text-primary, #1f2937)); display: block; }
.entry-desc { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); }
.entry-arrow { font-size: 16px; color: var(--text-muted, #9ca3af)); }

.stats-grid { display: flex; gap: 20px; }
.stat-item { flex: 1; padding: 16px; text-align: center; border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-md, 8px)); background: var(--bg-card, #ffffff)); }
.stat-num { font-size: var(--text-xl, 1.25rem)); font-weight: 700); color: var(--text-primary, #1f2937)); display: block; }
.stat-text { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); margin-top: 4px; display: block; }

.empty-state { padding: 40px; text-align: center; color: var(--text-muted, #9ca3af)); }
</style>
