<!--
  Movio AI v4.1 — Member Center (会员中心)
  G4 前端开发 | W4
  会员套餐 / 积分余额 / 点数余额 / 快速入口
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>会员中心</h1>
      <p>管理您的会员套餐、积分与点数</p>
    </header>

    <!-- 会员状态 -->
    <div class="member-status-card">
      <div class="status-left">
        <span class="plan-badge" :class="profile?.plan_type > 0 ? 'paid' : 'free'">
          {{ profile?.plan_type > 0 ? '付费会员' : '免费用户' }}
        </span>
        <span v-if="profile?.plan_type > 0" class="expire-text">到期：{{ profile?.end_time?.slice(0, 10) || '-' }}</span>
      </div>
      <div class="status-right">
        <NuxtLink to="/account/membership" class="btn btn-primary btn-sm">升级套餐</NuxtLink>
      </div>
    </div>

    <!-- 资产概览 -->
    <div class="assets-grid">
      <div class="asset-card credits">
        <span class="asset-label">剩余点数</span>
        <span class="asset-value">{{ profile?.credit_balance || 0 }}</span>
        <NuxtLink to="/account/credits" class="asset-link">查看详情 →</NuxtLink>
      </div>
      <div class="asset-card points">
        <span class="asset-label">积分余额</span>
        <span class="asset-value">{{ pointsBalance }}</span>
        <NuxtLink to="/account/points" class="asset-link">积分中心 →</NuxtLink>
      </div>
    </div>

    <!-- 快速入口 -->
    <div class="section">
      <h3>快速入口</h3>
      <div class="entry-grid">
        <NuxtLink v-for="entry in entries" :key="entry.path" :to="entry.path" class="entry-card">
          <span class="entry-icon">{{ entry.icon }}</span>
          <div class="entry-info">
            <span class="entry-name">{{ entry.name }}</span>
            <span class="entry-desc">{{ entry.desc }}</span>
          </div>
          <span class="entry-arrow">→</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 用量统计 -->
    <div class="section">
      <h3>用量统计</h3>
      <div v-if="!stats" class="empty-state">加载中...</div>
      <div v-else class="stats-grid">
        <div class="stat-item">
          <span class="stat-num">{{ stats.todayTasks || 0 }}</span>
          <span class="stat-text">今日任务</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.totalTasks || 0 }}</span>
          <span class="stat-text">累计任务</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ stats.thisMonthConsumed || 0 }}</span>
          <span class="stat-text">本月消耗点数</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'workspace' })

const apiBase = useRuntimeConfig().public.apiBase || '/api'

const profile = ref<any>(null)
const pointsBalance = ref(0)

const entries = [
  { path: '/account/membership', icon: '💳', name: '套餐管理', desc: '升级/续费会员套餐' },
  { path: '/account/points', icon: '🎁', name: '积分中心', desc: '赚积分、兑换点数' },
  { path: '/account/credits', icon: '⚡', name: '点数记录', desc: '点数消费与充值记录' },
  { path: '/account/billing', icon: '📋', name: '账单记录', desc: '套餐购买与充值账单' },
  { path: '/account/distribution', icon: '💰', name: '分销中心', desc: '邀请好友赚佣金' },
  { path: '/account/bind-platform', icon: '🔗', name: '平台绑定', desc: '绑定淘宝/抖音/拼多多店铺' },
]

const stats = ref<any>(null)

onMounted(async () => {
  try {
    const [profileRes, pointsRes, statsRes] = await Promise.all([
      $fetch(`${apiBase}/user/profile`),
      $fetch(`${apiBase}/points/account`),
      $fetch(`${apiBase}/user/stats`).catch(() => null),
    ])

    if ((profileRes as any).code === 200) profile.value = (profileRes as any).data
    if ((pointsRes as any).code === 200) pointsBalance.value = (pointsRes as any).data?.balance || 0
    if ((statsRes as any)?.code === 200) stats.value = (statsRes as any).data
    else stats.value = { todayTasks: '-', totalTasks: '-', thisMonthConsumed: '-' }
  } catch {}
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
.plan-badge.paid { background: #d1fae5; color: #059669; }
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
