<!--
  Movio AI — Membership Center (会员中心)
  G4 frontend | Account module
  Plan cards / payment modal / sandbox pay
-->
<template>
  <div class="membership-page">
    <h2>{{ $t('my.account.membership.page_title') }}</h2>
    <p class="subtitle">{{ $t('my.account.membership.subtitle') }}</p>

    <!-- Current membership -->
    <div v-if="currentPlan" class="current-plan">
      <span class="badge" :class="currentPlan.plan_type > 0 ? 'paid' : 'free'">
        {{ currentPlan.plan_type > 0 ? $t('my.account.membership.paid_member') : $t('my.account.membership.free_user') }}
      </span>
      <span v-if="currentPlan.plan_type > 0" class="expire">{{ $t('my.account.membership.expires') }}：{{ currentPlan.end_time?.slice(0, 10) || '-' }}</span>
      <span class="balance">{{ $t('my.account.membership.balance') }}：{{ currentPlan.credit_balance || 0 }} {{ $t('my.account.membership.credits_unit') }}</span>
      <label v-if="currentPlan.plan_type > 0" class="auto-renew">
        <input type="checkbox" :checked="autoRenew" @change="toggleAutoRenew" />
        {{ $t('my.account.membership.auto_renew') }}
      </label>
    </div>

    <!-- Plan cards -->
    <div class="plan-grid">
      <div v-for="plan in displayPlans" :key="plan.id" class="plan-card" :class="{ recommended: plan.type === 2 }">
        <div v-if="plan.type === 2" class="recommend-tag">{{ $t('my.account.membership.recommended') }}</div>
        <h3>{{ plan.name }}</h3>
        <div class="price">
          <span class="amount">&yen;{{ plan.price }}</span>
          <span class="period">/ {{ plan.duration }}</span>
        </div>
        <ul class="features">
          <li v-for="(f, i) in plan.features" :key="i">&check; {{ f }}</li>
        </ul>
        <button
          class="btn-buy"
          :class="{ current: plan.type === currentPlan?.plan_type }"
          :disabled="buying"
          @click="handleBuy(plan.type)"
        >
          {{ plan.type === currentPlan?.plan_type ? $t('my.account.membership.current_plan') : buying ? $t('my.account.membership.processing') : $t('my.account.membership.buy_now') }}
        </button>
      </div>
    </div>

    <!-- Payment modal -->
    <Teleport to="body">
      <div v-if="showPayModal" class="pay-overlay" @click.self="closePayModal" @keydown.escape="closePayModal">
        <div class="pay-modal">
          <h3>{{ $t('my.account.membership.confirm_payment') }}</h3>
          <div class="pay-info">
            <div class="pay-row"><span>{{ $t('my.account.membership.plan_label') }}</span><strong>{{ orderInfo?.planName }}</strong></div>
            <div class="pay-row"><span>{{ $t('my.account.membership.amount_label') }}</span><strong class="price-red">&yen;{{ orderInfo?.amount }}</strong></div>
            <div class="pay-row"><span>{{ $t('my.account.membership.pay_method') }}</span>
              <select v-model="payMethod" class="pay-select">
                <option value="wechat">{{ $t('my.account.membership.wechat_pay') }}</option>
                <option value="alipay">{{ $t('my.account.membership.alipay') }}</option>
              </select>
            </div>
          </div>

          <!-- Sandbox QR code mock -->
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
            <p class="qr-hint">{{ payMethod === 'wechat' ? $t('my.account.membership.scan_wechat') : $t('my.account.membership.scan_alipay') }}</p>
            <p class="qr-hint sandbox-tag">{{ $t('my.account.membership.sandbox_mode') }}</p>
          </div>

          <div class="pay-actions">
            <button class="btn-cancel" @click="closePayModal">{{ $t('my.account.membership.cancel') }}</button>
            <button class="btn-pay" :disabled="paying" @click="doSandboxPay">
              {{ paying ? $t('my.account.membership.paying') : payMethod === 'wechat' ? $t('my.account.membership.simulate_wechat') : $t('my.account.membership.simulate_alipay') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Payment success -->
    <div v-if="payResult" class="result-card">
      <div class="success-icon">&check;</div>
      <p>{{ $t('my.account.membership.pay_success') }} <strong>{{ payResult.planName }}</strong></p>
      <p class="credits-note">{{ $t('my.account.membership.credits_received') }} {{ payResult.credits }}</p>
      <button class="btn-close" @click="payResult = null">{{ $t('my.account.membership.close') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const currentPlan = ref<any>(null);
const autoRenew = ref(false);
const toast = useToast()
const buying = ref(false);
const paying = ref(false);
const showPayModal = ref(false);
const payMethod = ref('wechat');
const orderInfo = ref<any>(null);
const payResult = ref<any>(null);

interface PlanItem { id: number; name: string; type: number; price: number; features: string[]; duration: string }

const { t } = useI18n()

const displayPlans = ref<PlanItem[]>([
  { id: 2, name: t('my.account.membership.monthly_card'), type: 1, price: 29, features: [
    t('my.account.membership.feat_monthly_1'), t('my.account.membership.feat_monthly_2'), t('my.account.membership.feat_monthly_3'), t('my.account.membership.feat_monthly_4'), t('my.account.membership.feat_monthly_5')
  ], duration: `30${t('my.account.membership.duration_days')}` },
  { id: 3, name: t('my.account.membership.quarterly_card'), type: 2, price: 69, features: [
    t('my.account.membership.feat_quarterly_1'), t('my.account.membership.feat_quarterly_2'), t('my.account.membership.feat_quarterly_3'), t('my.account.membership.feat_quarterly_4'), t('my.account.membership.feat_quarterly_5'), t('my.account.membership.feat_quarterly_6')
  ], duration: `90${t('my.account.membership.duration_days')}` },
  { id: 4, name: t('my.account.membership.yearly_card'), type: 3, price: 199, features: [
    t('my.account.membership.feat_yearly_1'), t('my.account.membership.feat_yearly_2'), t('my.account.membership.feat_yearly_3'), t('my.account.membership.feat_yearly_4'), t('my.account.membership.feat_yearly_5'), t('my.account.membership.feat_yearly_6')
  ], duration: `365${t('my.account.membership.duration_days')}` },
]);

async function loadMembership() {
  try {
    const res: any = await $fetch('/api/user/profile', { credentials: 'include' });
    if (res?.code === 200) {
      currentPlan.value = res.data || {};
      autoRenew.value = res.data?.auto_renew === 1;
    }
  } catch { toast.error(t('my.account.membership.load_failed')) }
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
    autoRenew.value = !autoRenew.value;
    toast.error(t('my.account.membership.auto_renew_failed'));
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
    const res: any = await $fetch('/api/payment/create-order', {
      method: 'POST',
      credentials: 'include',
      body: { planId: orderInfo.value.id, payMethod: payMethod.value },
    });
    if (res?.code === 200) {
      payResult.value = { planName: orderInfo.value.name, credits: res.data?.credits || 0 };
      showPayModal.value = false;
      loadMembership();
    } else {
      toast.error(res.msg || t('my.account.membership.order_create_failed'));
    }
  } catch { toast.error(t('my.account.membership.pay_failed')); }
  paying.value = false;
}
</script>
