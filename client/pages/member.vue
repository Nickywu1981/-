<template>
  <div class="member-page">
    <div class="member-hero">
      <h1>会员中心</h1>
      <p v-if="profile">当前套餐：<strong>{{ planLabel }}</strong> · 积分余额：<strong>{{ profile.credit_balance || 0 }}</strong></p>
    </div>

    <!-- 套餐对比 -->
    <section class="plans-section">
      <h2>选择适合你的套餐</h2>
      <div class="plans-grid">
        <div v-for="p in plans" :key="p.planType" class="plan-card" :class="{ current: curPlan === p.planType }">
          <div class="plan-badge" v-if="curPlan === p.planType">当前</div>
          <h3 class="plan-name">{{ p.name }}</h3>
          <div class="plan-price"><span class="price-num">{{ p.price }}</span> 元</div>
          <div class="plan-period">{{ p.days }} 天</div>
          <ul class="plan-features">
            <li>{{ p.credits }} 积分赠送</li>
            <li>全功能访问</li>
            <li>优先队列</li>
            <li v-if="p.planType >= 2">批量处理</li>
            <li v-if="p.planType >= 3">API 接入</li>
          </ul>
          <button class="btn" :class="curPlan === p.planType ? 'btn-outline' : 'btn-primary'" :disabled="curPlan === p.planType || subscribing" @click="subscribe(p.planType)">
            {{ curPlan === p.planType ? '已订阅' : subscribing && subPlan === p.planType ? '跳转支付...' : '立即订阅' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 消费账单 -->
    <section class="billing-section">
      <h2>消费账单</h2>
      <table class="billing-table" v-if="bills.length">
        <thead>
          <tr><th>时间</th><th>类型</th><th>金额</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr v-for="b in bills" :key="b.id">
            <td>{{ formatDate(b.created_at) }}</td>
            <td>{{ b.plan_name || '套餐' }}</td>
            <td>¥{{ b.amount }}</td>
            <td><span class="status-tag" :class="b.status">{{ b.status === 'paid' ? '已支付' : b.status === 'pending' ? '待支付' : b.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无消费记录</div>
    </section>
  </div>
</template>

<script setup lang="ts">
const profile = ref<any>(null)
const plans = ref<any[]>([])
const bills = ref<any[]>([])
const subscribing = ref(false)
const subPlan = ref(0)
const curPlan = computed(() => profile.value?.plan_type || 0)
const planLabel = computed(() => plans.value.find((p: any) => p.planType === curPlan.value)?.name || '免费版')

onMounted(async () => {
  const [p, pl, b] = await Promise.all([
    $fetch('/api/user/profile', { credentials: 'include' }).catch(() => null),
    $fetch('/api/payment/plans').catch(() => []),
    $fetch('/api/payment/billing?page=1&pageSize=20', { credentials: 'include' }).catch(() => ({ list: [] })),
  ])
  profile.value = p?.data
  plans.value = Array.isArray(pl?.data) ? pl.data : (Array.isArray(pl) ? pl : [])
  bills.value = b?.data?.list || b?.list || []
})

async function subscribe(planType: number) {
  subscribing.value = true
  subPlan.value = planType
  try {
    const res: any = await $fetch('/api/payment/orders', { method: 'POST', body: { planType, payChannel: 'wechat' }, credentials: 'include' })
    if (res.data?.payUrl) window.open(res.data.payUrl, '_blank')
  } catch (e: any) { alert(e?.message || '创建订单失败') }
  finally { subscribing.value = false }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-' }
</script>

<style scoped>
.member-page { max-width: 1100px; margin: 0 auto; padding: 24px clamp(12px, 3vw, 32px); }
.member-hero { text-align: center; padding: 32px 0; }
.member-hero h1 { font-size: 28px; margin: 0 0 8px; }
.member-hero p { color: var(--text-muted, #666); }

.plans-section h2, .billing-section h2 { margin: 32px 0 16px; }
.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
.plan-card {
  position: relative; background: var(--bg-card, #fff); border: 1px solid var(--border-light, #e5e5e5);
  border-radius: 16px; padding: 28px 20px; text-align: center;
  transition: all 0.2s;
}
.plan-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.plan-card.current { border-color: var(--brand, #7c3aed); box-shadow: 0 0 0 1px var(--brand, #7c3aed); }
.plan-badge { position: absolute; top: 12px; right: 12px; background: var(--brand, #7c3aed); color: #fff; font-size: 11px; padding: 2px 10px; border-radius: 10px; }
.plan-name { font-size: 18px; margin: 8px 0; }
.plan-price { font-size: 14px; color: var(--text-secondary, #666); }
.price-num { font-size: 36px; font-weight: 700; color: var(--text-primary, #111); }
.plan-period { font-size: 13px; color: var(--text-muted, #999); margin: 4px 0 12px; }
.plan-features { list-style: none; padding: 0; text-align: left; margin: 16px 0; }
.plan-features li { padding: 4px 0; font-size: 13px; color: var(--text-secondary, #666); }
.plan-features li::before { content: '✓ '; color: var(--brand, #7c3aed); font-weight: 600; }
.btn { padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; width: 100%; margin-top: 12px; transition: all 0.2s; }
.btn-primary { background: var(--brand-gradient, linear-gradient(135deg,#7c3aed,#a855f7)); color: #fff; }
.btn-primary:hover { transform: translateY(-1px); }
.btn-outline { background: transparent; border: 1px solid var(--brand, #7c3aed); color: var(--brand, #7c3aed); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.billing-table { width: 100%; border-collapse: collapse; }
.billing-table th, .billing-table td { padding: 10px 16px; text-align: left; border-bottom: 1px solid var(--border-light, #eee); font-size: 13px; }
.billing-table th { color: var(--text-muted, #999); font-weight: 500; }
.status-tag { font-size: 11px; padding: 2px 8px; border-radius: 6px; }
.status-tag.paid { background: #d4edda; color: #155724; }
.status-tag.pending { background: #fff3cd; color: #856404; }
.empty { text-align: center; padding: 40px; color: var(--text-muted, #999); font-size: 14px; }
</style>
