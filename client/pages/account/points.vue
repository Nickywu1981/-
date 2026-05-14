<!--
  Movio AI — Points Center (积分中心)
  G4 frontend | Account module
  Points balance / earn tasks / redeem / history
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ headerCfg.title || $t('my.account.points.page_title') }}</h1>
      <p>{{ headerCfg.subtitle || $t('my.account.points.subtitle') }}</p>
    </header>

    <!-- Points overview -->
    <div class="balance-card">
      <div class="balance-main">
        <span class="balance-label">{{ $t('my.account.points.current_points') }}</span>
        <span class="balance-value">{{ account?.balance || 0 }}</span>
      </div>
      <div class="balance-stats">
        <div class="stat">
          <span class="stat-value">{{ account?.total_earned || 0 }}</span>
          <span class="stat-label">{{ $t('my.account.points.total_earned') }}</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ account?.total_spent || 0 }}</span>
          <span class="stat-label">{{ $t('my.account.points.total_spent') }}</span>
        </div>
      </div>
    </div>

    <!-- Redeem points -->
    <div class="section">
      <h3>{{ $t('my.account.points.redeem_title') }}</h3>
      <div class="redeem-grid">
        <div v-for="(credits, pts) in redeemOptions" :key="pts" class="redeem-card">
          <div class="redeem-icon">&#x1F48E;</div>
          <div class="redeem-points">{{ pts }} {{ $t('my.account.points.points_unit') }}</div>
          <div class="redeem-arrow">&rarr;</div>
          <div class="redeem-credits">{{ credits }} {{ $t('my.account.points.credits_unit') }}</div>
          <button class="btn btn-primary btn-sm" :disabled="(account?.balance || 0) < Number(pts) || redeeming" @click="doRedeem(Number(pts))">
            {{ redeeming ? $t('my.account.points.redeeming') : $t('my.account.points.redeem') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Earn points -->
    <div class="section">
      <h3>{{ $t('my.account.points.earn_title') }}</h3>
      <div class="earn-grid">
        <div v-for="task in earnTasks" :key="task.key" class="earn-card">
          <span class="earn-icon">{{ task.icon }}</span>
          <div class="earn-info">
            <span class="earn-name">{{ task.name }}</span>
            <span class="earn-desc">{{ task.desc }}</span>
          </div>
          <span class="earn-pts">+{{ task.points }}</span>
        </div>
      </div>
    </div>

    <!-- Points history -->
    <div class="section">
      <h3>{{ $t('my.account.points.tx_title') }}</h3>
      <div v-if="transactions.length === 0 && !loadingTx" class="empty-state">{{ $t('my.account.points.empty_tx') }}</div>
      <div v-else class="tx-list">
        <div v-for="tx in transactions" :key="tx.id" class="tx-row">
          <div class="tx-info">
            <span class="tx-type" :class="tx.trans_type === 'earn' ? 'earn' : 'spend'">
              {{ tx.trans_type === 'earn' ? '+' : '-' }}{{ Math.abs(tx.amount) }}
            </span>
            <span class="tx-biz">{{ tx.remark || tx.business_type }}</span>
          </div>
          <div class="tx-meta">
            <span class="tx-balance">{{ $t('my.account.points.balance_after') }} {{ tx.balance_after }}</span>
            <span class="tx-time">{{ formatDateTime(tx.created_at) }}</span>
          </div>
        </div>
      </div>
      <div v-if="txTotal > txPage * 20" class="load-more">
        <button class="btn btn-ghost btn-sm" @click="loadMoreTx">{{ $t('my.account.points.load_more') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

import { formatDateTime } from '@/utils/format'

const toast = useToast()
const { t } = useI18n()

const { configs } = useAppPage({ configs: ['page.points.header'] })
const headerCfg = computed(() => configs.value['page.points.header'] || {})

const apiBase = useRuntimeConfig().public.apiBase || '/api'

const account = ref<any>(null)
const transactions = ref<any[]>([])
const txPage = ref(1)
const txTotal = ref(0)
const loadingTx = ref(false)
const redeeming = ref(false)

const redeemOptions = { 100: 10, 500: 60, 1000: 150 }

const earnTasks = [
  { key: 'daily_checkin', icon: '&#x1F4C5;', name: t('my.account.points.earn_checkin_name'), desc: t('my.account.points.earn_checkin_desc'), points: 10 },
  { key: 'image_gen', icon: '&#x1F5BC;', name: t('my.account.points.earn_image_name'), desc: t('my.account.points.earn_image_desc'), points: 2 },
  { key: 'video_gen', icon: '&#x1F3AC;', name: t('my.account.points.earn_video_name'), desc: t('my.account.points.earn_video_desc'), points: 5 },
  { key: 'action_migrate', icon: '&#x1F483;', name: t('my.account.points.earn_action_name'), desc: t('my.account.points.earn_action_desc'), points: 10 },
  { key: 'digital_human', icon: '&#x1F916;', name: t('my.account.points.earn_digital_name'), desc: t('my.account.points.earn_digital_desc'), points: 8 },
  { key: 'invite_register', icon: '&#x1F465;', name: t('my.account.points.earn_invite_name'), desc: t('my.account.points.earn_invite_desc'), points: 50 },
  { key: 'invite_purchase', icon: '&#x1F381;', name: t('my.account.points.earn_invite_purchase_name'), desc: t('my.account.points.earn_invite_purchase_desc'), points: 200 },
]

async function fetchAccount() {
  try {
    const res: any = await $fetch(`${apiBase}/points/account`)
    if (res.code === 200) account.value = res.data
  } catch { toast.error(t('my.account.points.load_failed')) }
}

async function fetchTransactions() {
  loadingTx.value = true
  try {
    const res: any = await $fetch(`${apiBase}/points/transactions`, { params: { page: txPage.value, pageSize: 20 } })
    if (res.code === 200) {
      transactions.value = res.data.list || []
      txTotal.value = res.data.total || 0
    }
  } catch { toast.error(t('my.account.points.load_tx_failed')) }
  loadingTx.value = false
}

async function doRedeem(points: number) {
  redeeming.value = true
  try {
    const res: any = await $fetch(`${apiBase}/points/redeem`, { method: 'POST', body: { points } })
    if (res.code === 200) {
      if (account.value) account.value.balance = res.data?.points_balance ?? account.value.balance
      toast.success(t('my.account.points.redeem_success', { credits: res.data?.redeemed_credits ?? points }))
    } else {
      toast.error(res.msg || t('my.account.points.redeem_failed'))
    }
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string } };
    toast.error(err?.data?.msg || t('my.account.points.redeem_failed'))
  }
  redeeming.value = false
}

function loadMoreTx() {
  txPage.value++
  fetchTransactions()
}

onMounted(() => {
  fetchAccount()
  fetchTransactions()
})
</script>
