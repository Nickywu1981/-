<template>
  <div class="membership-page">
    <h2>会员中心</h2>
    <p class="subtitle">升级会员，解锁更多AI创作能力</p>

    <!-- 当前会员 -->
    <div v-if="currentPlan" class="current-plan">
      <span class="badge" :class="currentPlan.plan_type > 0 ? 'paid' : 'free'">
        {{ currentPlan.plan_type > 0 ? '付费会员' : '免费用户' }}
      </span>
      <span v-if="currentPlan.plan_type > 0" class="expire">到期：{{ currentPlan.end_time?.slice(0, 10) || '-' }}</span>
      <span class="balance">余额：{{ currentPlan.credit_balance || 0 }} 点</span>
      <!-- 自动续费开关 -->
      <label v-if="currentPlan.plan_type > 0" class="auto-renew">
        <input type="checkbox" :checked="autoRenew" @change="toggleAutoRenew" />
        自动续费
      </label>
    </div>

    <!-- 套餐卡 -->
    <div class="plan-grid">
      <div v-for="plan in displayPlans" :key="plan.id" class="plan-card" :class="{ recommended: plan.type === 2 }">
        <div v-if="plan.type === 2" class="recommend-tag">推荐</div>
        <h3>{{ plan.name }}</h3>
        <div class="price">
          <span class="amount">¥{{ plan.price }}</span>
          <span class="period">/ {{ plan.duration }}</span>
        </div>
        <ul class="features">
          <li v-for="(f, i) in plan.features" :key="i">✓ {{ f }}</li>
        </ul>
        <button
          class="btn-buy"
          :class="{ current: plan.type === currentPlan?.plan_type }"
          :disabled="buying"
          @click="handleBuy(plan.type)"
        >
          {{ plan.type === currentPlan?.plan_type ? '当前套餐' : buying ? '处理中...' : '立即购买' }}
        </button>
      </div>
    </div>

    <!-- 支付弹窗 -->
    <Teleport to="body">
      <div v-if="showPayModal" class="pay-overlay" @click.self="closePayModal">
        <div class="pay-modal">
          <h3>确认支付</h3>
          <div class="pay-info">
            <div class="pay-row"><span>套餐</span><strong>{{ orderInfo?.planName }}</strong></div>
            <div class="pay-row"><span>金额</span><strong class="price-red">¥{{ orderInfo?.amount }}</strong></div>
            <div class="pay-row"><span>支付方式</span>
              <select v-model="payMethod" class="pay-select">
                <option value="wechat">微信支付</option>
                <option value="alipay">支付宝</option>
              </select>
            </div>
          </div>

          <!-- 沙箱二维码模拟 -->
          <div class="qr-box">
            <div class="qr-placeholder">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <rect width="120" height="120" fill="var(--bg-card)" />
                <rect x="10" y="10" width="30" height="30" rx="3" fill="var(--text-primary)" />
                <rect x="80" y="10" width="30" height="30" rx="3" fill="var(--text-primary)" />
                <rect x="10" y="80" width="30" height="30" rx="3" fill="#111" />
                <circle cx="60" cy="60" r="8" fill="var(--brand)" />
                <rect x="15" y="15" width="20" height="20" rx="2" fill="#fff" />
                <rect x="85" y="15" width="20" height="20" rx="2" fill="#fff" />
                <rect x="15" y="85" width="20" height="20" rx="2" fill="#fff" />
              </svg>
            </div>
            <p class="qr-hint">{{ payMethod === 'wechat' ? '请使用微信扫码支付' : '请使用支付宝扫码支付' }}</p>
            <p class="qr-hint sandbox-tag">[沙箱模式]</p>
          </div>

          <div class="pay-actions">
            <button class="btn-cancel" @click="closePayModal">取消</button>
            <button class="btn-pay" :disabled="paying" @click="doSandboxPay">
              {{ paying ? '支付中...' : payMethod === 'wechat' ? '模拟微信支付' : '模拟支付宝支付' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 支付成功 -->
    <div v-if="payResult" class="result-card">
      <div class="success-icon">✓</div>
      <p>支付成功！已开通 <strong>{{ payResult.planName }}</strong></p>
      <p class="credits-note">获得 {{ payResult.credits }} 点算力</p>
      <button class="btn-close" @click="payResult = null">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">


const currentPlan = ref<any>(null);
const autoRenew = ref(false);
const buying = ref(false);
const paying = ref(false);
const showPayModal = ref(false);
const payMethod = ref('wechat');
const orderInfo = ref<any>(null);
const payResult = ref<any>(null);

interface PlanItem { id: number; name: string; type: number; price: number; features: string[]; duration: string }

const displayPlans = ref<PlanItem[]>([
  { id: 2, name: '月卡', type: 1, price: 29, features: ['30天会员', '每日100点', '全部图片功能', '批量50张', '作品永久保存'], duration: '30天' },
  { id: 3, name: '季卡', type: 2, price: 69, features: ['90天会员', '每日200点', '全部图片+视频', '批量200张', '优先队列', '高级场景'], duration: '90天' },
  { id: 4, name: '年卡', type: 3, price: 199, features: ['365天会员', '每日500点', '全部功能无限制', '夜间托管6折', '动作迁移', '专属客服'], duration: '365天' },
]);

async function loadMembership() {
  try {
    const res: any = await $fetch('/api/user/profile', { credentials: 'include' });
    if (res?.code === 200) {
      currentPlan.value = res.data || {};
      autoRenew.value = res.data?.auto_renew === 1;
    }
  } catch { /* fallback */ }
}

async function toggleAutoRenew() {
  autoRenew.value = !autoRenew.value;
  try {
    await $fetch('/api/user/membership/auto-renew', {
      method: 'PUT',
      credentials: 'include',
      body: { autoRenew: autoRenew.value },
    });
  } catch {
    autoRenew.value = !autoRenew.value; // revert on error
  }
}

onMounted(() => { loadMembership(); });

async function handleBuy(planType: number) {
  showPayModal.value = true;
  orderInfo.value = displayPlans.value.find(p => p.type === planType);
}

function closePayModal() {
  showPayModal.value = false;
  orderInfo.value = null;
}

async function doSandboxPay() {
  if (!orderInfo.value) return;
  paying.value = true;
  try {
    // 步骤1：创建订单
    const res: any = await $fetch('/api/payment/create-order', {
      method: 'POST',
      credentials: 'include',
      body: { planType: orderInfo.value.type, payMethod: payMethod.value },
    });
    const order = res.data;
    if (!order?.orderId) { toast.error('创建订单失败'); return; }

    // 步骤2：沙箱支付
    const payRes: any = await $fetch(`/api/payment/sandbox-pay/${order.orderId}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (payRes?.code === 200) {
      payResult.value = payRes.data;
      showPayModal.value = false;
      loadMembership();
    } else {
      toast.error(payRes?.msg || '支付失败');
    }
  } catch (e: any) {
    toast.error('支付异常: ' + (e.message || ''));
  } finally { paying.value = false; }
}
</script>

<style scoped>
.membership-page { max-width: 960px; margin: 0 auto; padding: 40px 16px; }
h2 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.subtitle { color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; }

.current-plan { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-light); margin-bottom: 32px; }
.badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge.free { background: var(--bg-hover); color: var(--text-secondary); }
.badge.paid { background: var(--brand-light); color: var(--brand); }
.expire, .balance { font-size: 13px; color: var(--text-secondary); }
.auto-renew { font-size: 13px; color: var(--text-secondary); margin-left: auto; display: flex; align-items: center; gap: 6px; cursor: pointer; }
.auto-renew input { accent-color: var(--brand); }

.plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.plan-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 28px 24px; position: relative; }
.plan-card.recommended { border-color: var(--brand); box-shadow: 0 4px 16px rgba(255,68,0,.10); }
.recommend-tag { position: absolute; top: -1px; right: 20px; background: var(--brand); color: #fff; font-size: 11px; padding: 2px 12px 4px; border-radius: 0 0 6px 6px; }
.plan-card h3 { font-size: 18px; color: var(--text-primary); margin-bottom: 12px; }
.price { margin-bottom: 16px; }
.amount { font-size: 32px; font-weight: 800; color: var(--brand); }
.period { font-size: 13px; color: var(--text-muted); }
.features { list-style: none; padding: 0; margin: 0 0 20px; }
.features li { font-size: 13px; color: var(--text-secondary); padding: 4px 0; }
.btn-buy { width: 100%; padding: 12px; border: 1px solid var(--brand); background: var(--bg-card); color: var(--brand); border-radius: 8px; font-size: 14px; cursor: pointer; transition: .2s; }
.btn-buy:not(.current):not(:disabled):hover { background: var(--brand); color: #fff; }
.btn-buy.current { background: var(--bg-hover); color: var(--text-muted); border-color: var(--border-light); cursor: default; }
.btn-buy:disabled { opacity: .6; cursor: not-allowed; }

/* 支付弹窗 */
.pay-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.pay-modal { background: var(--bg-card); border-radius: 16px; padding: 32px; width: 380px; max-width: 90vw; }
.pay-modal h3 { font-size: 18px; color: var(--text-primary); text-align: center; margin-bottom: 24px; }
.pay-info { margin-bottom: 24px; }
.pay-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; color: var(--text-secondary); }
.pay-row strong { color: var(--text-primary); }
.price-red { color: var(--brand) !important; font-size: 18px; }
.pay-select { padding: 4px 8px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; background: var(--bg-input); color: var(--text-primary); }

.qr-box { text-align: center; margin-bottom: 24px; }
.qr-placeholder { display: inline-block; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 8px; }
.qr-hint { font-size: 12px; color: var(--text-secondary); margin-top: 8px; }
.sandbox-tag { color: var(--warning); font-weight: 600; }

.pay-actions { display: flex; gap: 12px; }
.btn-cancel { flex: 1; padding: 10px; border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-secondary); border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-pay { flex: 2; padding: 10px; border: none; background: var(--brand); color: #fff; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-pay:disabled { opacity: .6; }

.result-card { text-align: center; padding: 32px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--success); margin-top: 24px; }
.success-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--success); color: #fff; font-size: 24px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.result-card p { color: var(--text-primary); font-size: 16px; margin-bottom: 8px; }
.credits-note { color: var(--text-secondary); font-size: 13px !important; }
.btn-close { margin-top: 12px; padding: 8px 24px; border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-secondary); border-radius: 8px; cursor: pointer; }
</style>
