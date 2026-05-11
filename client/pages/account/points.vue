<!--
  Movio AI v4.1 — Points Center (积分中心)
  G4 前端开发 | W4
  积分余额 / 赚取记录 / 兑换点数 / 积分流水
-->
<template>
  <div class="page-container">
    <header class="page-header">
      <h1>{{ headerCfg.title || '积分中心' }}</h1>
      <p>{{ headerCfg.subtitle || '完成任务赚积分 · 兑换点数 · 解锁更多功能' }}</p>
    </header>

    <!-- 积分概览 -->
    <div class="balance-card">
      <div class="balance-main">
        <span class="balance-label">当前积分</span>
        <span class="balance-value">{{ account?.balance || 0 }}</span>
      </div>
      <div class="balance-stats">
        <div class="stat">
          <span class="stat-value">{{ account?.total_earned || 0 }}</span>
          <span class="stat-label">累计获得</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ account?.total_spent || 0 }}</span>
          <span class="stat-label">累计消费</span>
        </div>
      </div>
    </div>

    <!-- 积分兑换 -->
    <div class="section">
      <h3>积分兑换点数</h3>
      <div class="redeem-grid">
        <div v-for="(credits, pts) in redeemOptions" :key="pts" class="redeem-card">
          <div class="redeem-icon">💎</div>
          <div class="redeem-points">{{ pts }} 积分</div>
          <div class="redeem-arrow">→</div>
          <div class="redeem-credits">{{ credits }} 点数</div>
          <button class="btn btn-primary btn-sm" :disabled="(account?.balance || 0) < Number(pts) || redeeming" @click="doRedeem(Number(pts))">
            {{ redeeming ? '兑换中...' : '兑换' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 赚积分 -->
    <div class="section">
      <h3>如何赚取积分</h3>
      <div class="earn-grid">
        <div v-for="task in earnTasks" :key="task.key" class="earn-card">
          <span class="earn-icon">{{ task.icon }}</span>
          <div class="earn-info">
            <span class="earn-name">{{ task.name }}</span>
            <span class="earn-desc">{{ task.desc }}</span>
          </div>
          <span class="earn-pts">+{{ task.points }} 积分</span>
        </div>
      </div>
    </div>

    <!-- 积分流水 -->
    <div class="section">
      <h3>积分流水</h3>
      <div v-if="transactions.length === 0 && !loadingTx" class="empty-state">暂无积分记录</div>
      <div v-else class="tx-list">
        <div v-for="tx in transactions" :key="tx.id" class="tx-row">
          <div class="tx-info">
            <span class="tx-type" :class="tx.trans_type === 'earn' ? 'earn' : 'spend'">
              {{ tx.trans_type === 'earn' ? '+' : '-' }}{{ Math.abs(tx.amount) }}
            </span>
            <span class="tx-biz">{{ tx.remark || tx.business_type }}</span>
          </div>
          <div class="tx-meta">
            <span class="tx-balance">余额 {{ tx.balance_after }}</span>
            <span class="tx-time">{{ formatDateTime(tx.created_at) }}</span>
          </div>
        </div>
      </div>
      <div v-if="txTotal > txPage * 20" class="load-more">
        <button class="btn btn-ghost btn-sm" @click="loadMoreTx">加载更多</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppPage } from '~/composables/useAppPage'
import { formatDateTime } from '@/utils/format'

const toast = useToast()

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
  { key: 'daily_checkin', icon: '📅', name: '每日签到', desc: '每天签到领积分', points: 10 },
  { key: 'image_gen', icon: '🖼', name: 'AI生图', desc: '每次AI生图', points: 2 },
  { key: 'video_gen', icon: '🎬', name: 'AI视频', desc: '每次生成视频', points: 5 },
  { key: 'action_migrate', icon: '💃', name: '动作迁移', desc: '每次动作迁移', points: 10 },
  { key: 'digital_human', icon: '🤖', name: '数字人', desc: '每次数字人制作', points: 8 },
  { key: 'invite_register', icon: '👥', name: '邀请注册', desc: '邀请好友注册', points: 50 },
  { key: 'invite_purchase', icon: '🎁', name: '邀请首购', desc: '好友首次购买会员', points: 200 },
]

async function fetchAccount() {
  try {
    const res: any = await $fetch(`${apiBase}/points/account`)
    if (res.code === 200) account.value = res.data
  } catch { toast.error('加载积分账户失败') }
}

async function fetchTransactions() {
  loadingTx.value = true
  try {
    const res: any = await $fetch(`${apiBase}/points/transactions`, { params: { page: txPage.value, pageSize: 20 } })
    if (res.code === 200) {
      transactions.value = res.data.list || []
      txTotal.value = res.data.total || 0
    }
  } catch { toast.error('加载积分记录失败') }
  loadingTx.value = false
}

async function doRedeem(points: number) {
  redeeming.value = true
  try {
    const res: any = await $fetch(`${apiBase}/points/redeem`, { method: 'POST', body: { points } })
    if (res.code === 200) {
      account.value.balance = res.data?.points_balance ?? account.value.balance
      toast.success(`成功兑换 ${res.data?.redeemed_credits ?? points} 点数！`)
    } else {
      toast.error(res.msg || '兑换失败')
    }
  } catch (e: any) {
    toast.error(e?.data?.msg || '兑换失败')
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

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.page-header { text-align: center; margin-bottom: 32px; }
.page-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.page-header p { color: var(--cfg-text-muted); margin: 0; }

.balance-card { background: linear-gradient(135deg, var(--cfg-primary), #7C3AED); border-radius: var(--cfg-radius-lg); padding: 28px; color: #fff; margin-bottom: 28px; }
.balance-main { text-align: center; margin-bottom: 20px; }
.balance-label { font-size: var(--cfg-font-size-sm); opacity: 0.8; display: block; margin-bottom: 4px; }
.balance-value { font-size: 48px; font-weight: var(--cfg-font-weight-bold); }
.balance-stats { display: flex; justify-content: center; gap: 40px; }
.stat { text-align: center; }
.stat-value { font-size: var(--cfg-font-size-lg); font-weight: var(--cfg-font-weight-semibold); display: block; }
.stat-label { font-size: var(--cfg-font-size-xs); opacity: 0.75; }

.section { margin-bottom: 28px; }
.section h3 { font-size: var(--cfg-font-size-lg); margin: 0 0 16px; color: var(--cfg-text-primary); }

.redeem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.redeem-card { padding: 16px; text-align: center; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); }
.redeem-icon { font-size: 24px; margin-bottom: 4px; }
.redeem-points { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-text-primary); }
.redeem-arrow { color: var(--cfg-text-muted); margin: 4px 0; }
.redeem-credits { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-primary); margin-bottom: 12px; }

.earn-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.earn-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); background: var(--cfg-bg-primary); }
.earn-icon { font-size: 20px; flex-shrink: 0; }
.earn-info { flex: 1; }
.earn-name { font-size: var(--cfg-font-size-base); font-weight: var(--cfg-font-weight-medium); color: var(--cfg-text-primary); display: block; }
.earn-desc { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.earn-pts { font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-success); white-space: nowrap; }

.empty-state { padding: 40px; text-align: center; color: var(--cfg-text-muted); font-size: var(--cfg-font-size-base); }

.tx-list { border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); overflow: hidden; }
.tx-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); }
.tx-row:last-child { border-bottom: none; }
.tx-info { display: flex; gap: 12px; align-items: center; }
.tx-type { font-weight: var(--cfg-font-weight-semibold); font-size: var(--cfg-font-size-base); min-width: 50px; }
.tx-type.earn { color: var(--cfg-success); }
.tx-type.spend { color: var(--cfg-error); }
.tx-biz { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); }
.tx-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.tx-balance { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.tx-time { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }

.load-more { text-align: center; margin-top: 12px; }
</style>
