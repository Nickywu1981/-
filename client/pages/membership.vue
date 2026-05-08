<template>
  <div class="membership-page">
    <div class="page-header">
      <h1>会员中心</h1>
      <p>选择合适的套餐，解锁全部 AI 创作能力</p>
    </div>
    <div class="current-plan" v-if="currentPlan">
      <span class="badge">当前套餐</span>
      <strong>{{ currentPlan.name }}</strong>
      <span class="expire">到期: {{ currentPlan.expireDate }}</span>
    </div>
    <div class="plan-grid">
      <div v-for="plan in plans" :key="plan.id" class="plan-card" :class="{ active: currentPlan?.id === plan.id }">
        <div class="plan-name">{{ plan.name }}</div>
        <div class="plan-price"><span class="currency">¥</span>{{ plan.price }}<span class="period">/月</span></div>
        <ul class="plan-features">
          <li v-for="f in plan.features" :key="f">{{ f }}</li>
        </ul>
        <button :disabled="currentPlan?.id === plan.id" class="btn-upgrade" @click="upgrade(plan)">
          {{ currentPlan?.id === plan.id ? '当前套餐' : '升级套餐' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { api } from '@/composables/useApi'

definePageMeta({ middleware: 'auth' })

const toast = useToast()

const currentPlan = ref<any>(null)
const plans = ref<any[]>([])

onMounted(async () => {
  try {
    const [planData, userData]: any[] = await Promise.all([
      api.get('/payment/plans'),
      api.get('/user/profile')
    ])
    plans.value = planData?.list || planData || []
    currentPlan.value = userData?.plan || null
  } catch {
    plans.value = [
      { id: 1, name: '免费版', price: 0, features: ['每日 5 次生成', '基础模板', '720P 导出'] },
      { id: 2, name: '专业版', price: 99, features: ['每日 100 次', '全部模板', '4K 导出', '批量处理'] },
      { id: 3, name: '企业版', price: 299, features: ['无限次数', 'API 接入', '团队协作', '专属客服'] },
    ]
  }
})

async function upgrade(plan: any) {
  if (currentPlan.value?.id === plan.id) return

  try {
    const data: any = await api.post('/payment/create-order', {
      planType: plan.id,
      payChannel: 'wechat',
    })
    if (data?.payUrl) {
      window.location.href = data.payUrl
    }
  } catch (e: any) {
    toast.error(e.message || '创建订单失败，请稍后重试')
  }
}
</script>

<style scoped>
.membership-page { max-width: 1000px; margin: 0 auto; padding: var(--space-8) var(--space-4); }
.page-header { text-align: center; margin-bottom: var(--space-8); }
.page-header h1 { font-size: 2rem; color: var(--text-primary); }
.page-header p { color: var(--text-secondary); margin-top: var(--space-2); }
.current-plan { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); background: var(--bg-card); border-radius: var(--radius-lg); margin-bottom: var(--space-6); border: 1px solid var(--border-light); }
.badge { background: var(--brand); color: #fff; padding: 2px 10px; border-radius: 20px; font-size: .75rem; }
.plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-6); }
.plan-card { background: var(--bg-card); border-radius: var(--radius-lg); padding: var(--space-6); border: 2px solid var(--border-light); transition: all .25s; }
.plan-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.plan-card.active { border-color: var(--brand); }
.plan-name { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); }
.plan-price { font-size: 2.5rem; font-weight: 800; color: var(--brand); margin: var(--space-3) 0; }
.currency { font-size: 1.2rem; }
.period { font-size: 1rem; color: var(--text-secondary); font-weight: 400; }
.plan-features { list-style: none; padding: 0; margin: var(--space-4) 0; }
.plan-features li { padding: var(--space-2) 0; color: var(--text-secondary); }
.plan-features li::before { content: '✓ '; color: var(--success); font-weight: 700; }
.btn-upgrade { width: 100%; padding: var(--space-3); border: none; border-radius: var(--radius); background: var(--brand); color: #fff; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all .2s; }
.btn-upgrade:hover { background: var(--brand-hover); }
.btn-upgrade:disabled { background: var(--bg-tertiary); color: var(--text-muted); cursor: not-allowed; }
.expire { color: var(--text-muted); font-size: .85rem; margin-left: auto; }
</style>
