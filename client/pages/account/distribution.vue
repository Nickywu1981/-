<!--
  Movio AI v4.1 — Distribution Center (分销中心)
  G4 前端开发 | W4
  邀请码 / 推广团队 / 佣金余额 / 提现 / 佣金流水
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ headerCfg.title || '分销中心' }}</h1>
      <p>{{ headerCfg.subtitle || '邀请好友使用Movio AI — 赚取推广佣金' }}</p>
    </header>

    <!-- 邀请码卡片 -->
    <div class="invite-card">
      <div class="invite-header">
        <span class="invite-label">我的邀请码</span>
        <button class="btn btn-ghost btn-xs" @click="copyInviteCode">📋 复制</button>
      </div>
      <div class="invite-code">{{ inviteData?.invite_code || '加载中...' }}</div>
      <div class="invite-link">
        <span class="link-label">邀请链接：</span>
        <code>{{ inviteUrl }}</code>
        <button class="btn btn-ghost btn-xs" @click="copyInviteLink">复制链接</button>
      </div>
    </div>

    <!-- 佣金概览 -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">可提现佣金</span>
        <span class="stat-value available">¥{{ balance?.available || 0 }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">已提现</span>
        <span class="stat-value">¥{{ balance?.withdrawn || 0 }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">累计佣金</span>
        <span class="stat-value">¥{{ balance?.total || 0 }}</span>
      </div>
    </div>

    <!-- 提现 -->
    <div v-if="(balance?.available || 0) > 0" class="withdraw-section">
      <button class="btn btn-primary" :disabled="withdrawing" @click="doWithdraw">
        {{ withdrawing ? '提现中...' : `提现 ¥${balance?.available || 0}` }}
      </button>
    </div>

    <!-- 推广团队 -->
    <div class="section">
      <h3>推广团队</h3>
      <div class="team-stats">
        <div class="team-stat">
          <span class="team-stat-val">{{ teamStats?.level1_count || 0 }}</span>
          <span class="team-stat-label">直推成员</span>
        </div>
        <div class="team-stat">
          <span class="team-stat-val">{{ teamStats?.level2_count || 0 }}</span>
          <span class="team-stat-label">间推成员</span>
        </div>
      </div>

      <div v-if="teamList.length > 0" class="team-list">
        <div v-for="member in teamList" :key="member.id" class="team-row">
          <span class="member-avatar">{{ member.nickname?.charAt(0) || '?' }}</span>
          <span class="member-name">{{ member.nickname || '用户' + member.user_id }}</span>
          <span class="member-level" :class="member.level === 1 ? 'level1' : 'level2'">
            {{ member.level === 1 ? '直推' : '间推' }}
          </span>
          <span class="member-date">{{ formatDate(member.bound_at) }}</span>
        </div>
      </div>
      <div v-else class="empty-state">还没有推广成员，快去邀请好友吧</div>
    </div>

    <!-- 佣金流水 -->
    <div class="section">
      <h3>佣金流水</h3>
      <div v-if="commissionList.length === 0 && !loadingComm" class="empty-state">暂无佣金记录</div>
      <div v-else class="comm-list">
        <div v-for="c in commissionList" :key="c.id" class="comm-row">
          <div class="comm-info">
            <span class="comm-amount">¥{{ c.commission }}</span>
            <span class="comm-level" :class="c.level === 1 ? 'level1' : 'level2'">
              {{ c.level === 1 ? '一级' : '二级' }}返利 ({{ c.commission_rate }}%)
            </span>
          </div>
          <div class="comm-meta">
            <span class="comm-order">订单 ¥{{ c.order_amount }} · {{ c.consumer_name || '用户' + c.consumer_id }}</span>
            <span class="comm-status" :class="c.status">{{ statusLabel(c.status) }}</span>
            <span class="comm-time">{{ formatDate(c.created_at) }}</span>
          </div>
        </div>
      </div>
      <div v-if="commTotal > commPage * 20" class="load-more">
        <button class="btn btn-ghost btn-sm" @click="loadMoreComm">加载更多</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAppPage } from '~/composables/useAppPage'
import { formatDate as _fmt, copyToClipboard } from '@/utils/format'
const formatDate = (d: string) => d ? _fmt(d, 'MM-DD HH:mm') : ''



const toast = useToast()

const { configs } = useAppPage({ configs: ['page.distribution.header'] })
const headerCfg = computed(() => configs.value['page.distribution.header'] || {})

const apiBase = useRuntimeConfig().public.apiBase || '/api'

const inviteData = ref<any>(null)
const balance = ref<any>(null)
const teamStats = ref<any>(null)
const teamList = ref<any[]>([])
const commissionList = ref<any[]>([])
const commPage = ref(1)
const commTotal = ref(0)
const loadingComm = ref(false)
const withdrawing = ref(false)

const inviteUrl = computed(() => {
  const code = inviteData.value?.invite_code
  return code ? `${window.location.origin}/auth/register?invite=${code}` : ''
})

async function fetchInviteCode() {
  try {
    const res: any = await $fetch(`${apiBase}/distribution/invite-code`)
    if (res.code === 200) inviteData.value = res.data
  } catch { /* ignore */ }
}

async function fetchBalance() {
  try {
    const res: any = await $fetch(`${apiBase}/distribution/balance`)
    if (res.code === 200) balance.value = res.data
  } catch { /* ignore */ }
}

async function fetchTeam() {
  try {
    const res: any = await $fetch(`${apiBase}/distribution/team`, { params: { page: 1, pageSize: 20 } })
    if (res.code === 200) {
      teamList.value = res.data.list || []
      teamStats.value = res.data.stats || {}
    }
  } catch { /* ignore */ }
}

async function fetchCommissions() {
  loadingComm.value = true
  try {
    const res: any = await $fetch(`${apiBase}/distribution/history`, { params: { page: commPage.value, pageSize: 20 } })
    if (res.code === 200) {
      commissionList.value = res.data.list || []
      commTotal.value = res.data.total || 0
    }
  } catch { /* ignore */ }
  loadingComm.value = false
}

async function doWithdraw() {
  if (!balance.value?.available || balance.value.available <= 0) return
  withdrawing.value = true
  try {
    const res: any = await $fetch(`${apiBase}/distribution/withdraw`, {
      method: 'POST',
      body: { amount: balance.value.available },
    })
    if (res.code === 200) {
      toast.success(res.msg || '提现成功')
      fetchBalance()
      fetchCommissions()
    } else {
      toast.error(res.msg || '提现失败')
    }
  } catch (e: any) {
    toast.error(e.data?.msg || '提现失败')
  }
  withdrawing.value = false
}

async function copyInviteCode() {
  if (inviteData.value?.invite_code) {
    const ok = await copyToClipboard(inviteData.value.invite_code)
    if (ok) toast.success('邀请码已复制')
  }
}

async function copyInviteLink() {
  if (inviteUrl.value) {
    const ok = await copyToClipboard(inviteUrl.value)
    if (ok) toast.success('邀请链接已复制')
  }
}

function loadMoreComm() {
  commPage.value++
  fetchCommissions()
}

function statusLabel(s: string) {
  const map: Record<string, string> = { pending: '待结算', settled: '已结算', withdrawn: '已提现', cancelled: '已取消' }
  return map[s] || s
}

onMounted(() => {
  fetchInviteCode()
  fetchBalance()
  fetchTeam()
  fetchCommissions()
})
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
.member-level.level1 { background: #dbeafe; color: #2563EB; }
.member-level.level2 { background: #fef3c7; color: #D97706; }
.member-date { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }

.empty-state { padding: 40px; text-align: center; color: var(--cfg-text-muted); font-size: var(--cfg-font-size-base); }

.comm-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.comm-row { padding: 12px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); }
.comm-row:last-child { border-bottom: none; }
.comm-info { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.comm-amount { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-primary); }
.comm-level { font-size: var(--cfg-font-size-xs); padding: 1px 6px; border-radius: var(--cfg-radius-sm); }
.comm-level.level1 { background: #dbeafe; color: #2563EB; }
.comm-level.level2 { background: #fef3c7; color: #D97706; }
.comm-meta { display: flex; justify-content: space-between; align-items: center; }
.comm-order { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.comm-status { font-size: var(--cfg-font-size-xs); padding: 2px 8px; border-radius: var(--cfg-radius-full); }
.comm-status.pending { background: #fef3c7; color: #D97706; }
.comm-status.settled { background: #d1fae5; color: #059669; }
.comm-status.withdrawn { background: #e0e7ff; color: #4F46E5; }
.comm-status.cancelled { background: #fee2e2; color: #DC2626; }
.comm-time { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }

.load-more { text-align: center; margin-top: 12px; }
</style>
