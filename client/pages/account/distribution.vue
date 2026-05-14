<!--
  Movio AI v4.1 — Distribution Center (分销中心)
  G4 前端开发 | W4
  邀请码 / 推广团队 / 佣金余额 / 提现 / 佣金流水
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ headerCfg.title || $t('account_pages.distribution.title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('account_pages.distribution.subtitle') }}</p>
    </header>

    <LoadingSkeleton v-if="pageLoading" />

    <template v-else>
      <!-- 邀请码卡片 -->
      <div class="invite-card">
        <div class="invite-header">
          <span class="invite-label">{{ $t('account_pages.distribution.invite_code_label') }}</span>
          <button class="btn btn-ghost btn-xs" @click="copyInviteCode">📋 {{ $t('account_pages.distribution.copy') }}</button>
        </div>
        <div class="invite-code">{{ inviteData?.invite_code || $t('account_pages.distribution.loading') }}</div>
        <div class="invite-link">
          <span class="link-label">{{ $t('account_pages.distribution.invite_link_label') }}</span>
          <code>{{ inviteUrl }}</code>
          <button class="btn btn-ghost btn-xs" @click="copyInviteLink">{{ $t('account_pages.distribution.copy_link') }}</button>
        </div>
      </div>

      <!-- 佣金概览 -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">{{ $t('account_pages.distribution.available_commission') }}</span>
          <span class="stat-value available">¥{{ balance?.available || 0 }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ $t('account_pages.distribution.withdrawn') }}</span>
          <span class="stat-value">¥{{ balance?.withdrawn || 0 }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ $t('account_pages.distribution.total_commission') }}</span>
          <span class="stat-value">¥{{ balance?.total || 0 }}</span>
        </div>
      </div>

      <!-- 提现 -->
      <div v-if="(balance?.available || 0) > 0" class="withdraw-section">
        <button class="btn btn-primary" :disabled="withdrawing" @click="doWithdraw">
          {{ withdrawing ? $t('account_pages.distribution.withdrawing') : $t('account_pages.distribution.withdraw_btn', { amount: balance?.available || 0 }) }}
        </button>
      </div>

      <!-- 推广团队 -->
      <div class="section">
        <h3>{{ $t('account_pages.distribution.team_section') }}</h3>
        <div class="team-stats">
          <div class="team-stat">
            <span class="team-stat-val">{{ teamStats?.level1_count || 0 }}</span>
            <span class="team-stat-label">{{ $t('account_pages.distribution.direct_member') }}</span>
          </div>
          <div class="team-stat">
            <span class="team-stat-val">{{ teamStats?.level2_count || 0 }}</span>
            <span class="team-stat-label">{{ $t('account_pages.distribution.indirect_member') }}</span>
          </div>
        </div>

        <div v-if="teamList.length > 0" class="team-list">
          <div v-for="member in teamList" :key="member.id" class="team-row">
            <span class="member-avatar">{{ member.nickname?.charAt(0) || '?' }}</span>
            <span class="member-name">{{ member.nickname || $t('common.user') + member.user_id }}</span>
            <span class="member-level" :class="member.level === 1 ? 'level1' : 'level2'">
              {{ member.level === 1 ? $t('account_pages.distribution.direct_tag') : $t('account_pages.distribution.indirect_tag') }}
            </span>
            <span class="member-date">{{ formatDateTime(member.bound_at) }}</span>
          </div>
        </div>
        <div v-else class="empty-state">{{ $t('account_pages.distribution.no_team') }}</div>
      </div>

      <!-- 佣金流水 -->
      <div class="section">
        <h3>{{ $t('account_pages.distribution.commission_history') }}</h3>
        <div v-if="commissionList.length === 0 && !loadingComm" class="empty-state">{{ $t('account_pages.distribution.no_commission') }}</div>
        <div v-else class="comm-list">
          <div v-for="c in commissionList" :key="c.id" class="comm-row">
            <div class="comm-info">
              <span class="comm-amount">¥{{ c.commission }}</span>
              <span class="comm-level" :class="c.level === 1 ? 'level1' : 'level2'">
                {{ c.level === 1 ? $t('account_pages.distribution.level1_rebate') : $t('account_pages.distribution.level2_rebate') }} ({{ c.commission_rate }}%)
              </span>
            </div>
            <div class="comm-meta">
              <span class="comm-order">订单 ¥{{ c.order_amount }} · {{ c.consumer_name || $t('common.user') + c.consumer_id }}</span>
              <span class="comm-status" :class="c.status">{{ statusLabel(c.status) }}</span>
              <span class="comm-time">{{ formatDateTime(c.created_at) }}</span>
            </div>
          </div>
        </div>
        <div v-if="commTotal > commPage * 20" class="load-more">
          <button class="btn btn-ghost btn-sm" @click="loadMoreComm">{{ $t('account_pages.distribution.load_more') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">

import { formatDateTime, copyToClipboard } from '@/utils/format'

const { t } = useI18n()
const toast = useToast()
const { configs } = useAppPage({ configs: ['page.distribution.header'] })
const headerCfg = computed(() => configs.value['page.distribution.header'] || {})

const apiBase = useRuntimeConfig().public.apiBase || '/api'
const requestURL = useRequestURL()

const inviteData = ref<any>(null)
const balance = ref<any>(null)
const teamStats = ref<any>(null)
const teamList = ref<any[]>([])
const commissionList = ref<any[]>([])
const commPage = ref(1)
const commTotal = ref(0)
const loadingComm = ref(false)
const withdrawing = ref(false)
const pageLoading = ref(true)

const inviteUrl = computed(() => {
  const code = inviteData.value?.invite_code
  return code ? `${requestURL.origin}/auth/register?invite=${code}` : ''
})

async function fetchInviteCode() {
  try {
    const res: any = await $fetch(`${apiBase}/distribution/invite-code`, { credentials: 'include' })
    if (res.code === 200) inviteData.value = res.data
  } catch { toast.error(t('account_pages.distribution.load_invite_error')) }
}

async function fetchBalance() {
  try {
    const res: any = await $fetch(`${apiBase}/distribution/balance`, { credentials: 'include' })
    if (res.code === 200) balance.value = res.data
  } catch { toast.error(t('account_pages.distribution.load_balance_error')) }
}

async function fetchTeam() {
  try {
    const res: any = await $fetch(`${apiBase}/distribution/team`, { credentials: 'include', params: { page: 1, pageSize: 20 } })
    if (res.code === 200) {
      teamList.value = res.data.list || []
      teamStats.value = res.data.stats || {}
    }
  } catch { toast.error(t('account_pages.distribution.load_team_error')) }
}

async function fetchCommissions() {
  loadingComm.value = true
  try {
    const res: any = await $fetch(`${apiBase}/distribution/history`, { credentials: 'include', params: { page: commPage.value, pageSize: 20 } })
    if (res.code === 200) {
      commissionList.value = res.data.list || []
      commTotal.value = res.data.total || 0
    }
  } catch { toast.error(t('account_pages.distribution.load_history_error')) }
  loadingComm.value = false
}

async function doWithdraw() {
  if (!balance.value?.available || balance.value.available <= 0) return
  withdrawing.value = true
  try {
    const res: any = await $fetch(`${apiBase}/distribution/withdraw`, {
      credentials: 'include',
      method: 'POST',
      body: { amount: balance.value.available },
    })
    if (res.code === 200) {
      toast.success(res.msg || t('account_pages.distribution.withdraw_success'))
      fetchBalance()
      fetchCommissions()
    } else {
      toast.error(res.msg || t('account_pages.distribution.withdraw_fail'))
    }
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string } };
    toast.error(err?.data?.msg || t('account_pages.distribution.withdraw_fail'))
  }
  withdrawing.value = false
}

async function copyInviteCode() {
  if (inviteData.value?.invite_code) {
    const ok = await copyToClipboard(inviteData.value.invite_code)
    if (ok) toast.success(t('account_pages.distribution.copy_code_success'))
  }
}

async function copyInviteLink() {
  if (inviteUrl.value) {
    const ok = await copyToClipboard(inviteUrl.value)
    if (ok) toast.success(t('account_pages.distribution.copy_link_success'))
  }
}

function loadMoreComm() {
  commPage.value++
  fetchCommissions()
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: t('account_pages.distribution.status_pending'),
    settled: t('account_pages.distribution.status_settled'),
    withdrawn: t('account_pages.distribution.status_withdrawn'),
    cancelled: t('account_pages.distribution.status_cancelled'),
  }
  return map[s] || s
}

onMounted(() => {
  Promise.all([fetchInviteCode(), fetchBalance(), fetchTeam(), fetchCommissions()]).finally(() => {
    pageLoading.value = false
  })
})
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.page-header { text-align: center; margin-bottom: 32px; }
.page-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.page-header p { color: var(--cfg-text-muted); margin: 0; }

.invite-card { background: linear-gradient(135deg, #F59E0B, #EF4444); border-radius: var(--cfg-radius-lg); padding: 24px; color: #fff; margin-bottom: 24px; }
.invite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.invite-label { font-size: var(--cfg-font-size-sm); opacity: 0.85; }
.invite-code { font-size: 36px; font-weight: var(--cfg-font-weight-bold); letter-spacing: 4px; text-align: center; margin: 12px 0; font-family: monospace; }
.invite-link { display: flex; align-items: center; gap: 8px; font-size: var(--cfg-font-size-xs); opacity: 0.85; flex-wrap: wrap; }
.invite-link code { background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: var(--cfg-radius-sm); word-break: break-all; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card { padding: 16px; text-align: center; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); }
.stat-label { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); display: block; margin-bottom: 4px; }
.stat-value { font-size: var(--cfg-font-size-xl); font-weight: var(--cfg-font-weight-bold); color: var(--cfg-text-primary); }
.stat-value.available { color: var(--cfg-primary); }

.withdraw-section { text-align: center; margin-bottom: 28px; }

.section { margin-bottom: 28px; }
.section h3 { font-size: var(--cfg-font-size-lg); margin: 0 0 16px; color: var(--cfg-text-primary); }

.team-stats { display: flex; gap: 24px; margin-bottom: 16px; }
.team-stat { text-align: center; }
.team-stat-val { font-size: var(--cfg-font-size-2xl); font-weight: var(--cfg-font-weight-bold); color: var(--cfg-primary); display: block; }
.team-stat-label { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }

.team-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.team-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); }
.team-row:last-child { border-bottom: none; }
.member-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--cfg-bg-tertiary); display: flex; align-items: center; justify-content: center; font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-text-secondary); flex-shrink: 0; }
.member-name { flex: 1; font-size: var(--cfg-font-size-base); color: var(--cfg-text-primary); }
.member-level { font-size: var(--cfg-font-size-xs); padding: 2px 8px; border-radius: var(--cfg-radius-full); }
.member-level.level1 { background: var(--info-bg); color: #2563EB; }
.member-level.level2 { background: var(--warning-border); color: #D97706; }
.member-date { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }

.empty-state { padding: 40px; text-align: center; color: var(--cfg-text-muted); font-size: var(--cfg-font-size-base); }

.comm-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.comm-row { padding: 12px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); }
.comm-row:last-child { border-bottom: none; }
.comm-info { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.comm-amount { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-primary); }
.comm-level { font-size: var(--cfg-font-size-xs); padding: 1px 6px; border-radius: var(--cfg-radius-sm); }
.comm-level.level1 { background: var(--info-bg); color: #2563EB; }
.comm-level.level2 { background: var(--warning-border); color: #D97706; }
.comm-meta { display: flex; justify-content: space-between; align-items: center; }
.comm-order { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.comm-status { font-size: var(--cfg-font-size-xs); padding: 2px 8px; border-radius: var(--cfg-radius-full); }
.comm-status.pending { background: var(--warning-border); color: #D97706; }
.comm-status.settled { background: var(--success-light); color: #059669; }
.comm-status.withdrawn { background: #e0e7ff; color: #4F46E5; }
.comm-status.cancelled { background: var(--danger-light); color: var(--danger); }
.comm-time { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }

.load-more { text-align: center; margin-top: 12px; }
</style>
