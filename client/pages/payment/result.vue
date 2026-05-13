<template>
  <div class="payment-result-page">
    <div class="result-card mock-panel" v-if="isMock">
      <h2>{{ $t('payment.mock_title') }}</h2>
      <div class="mock-info">
        <div class="mock-row"><label>{{ $t('payment.order_no') }}</label><code>{{ reqsn }}</code></div>
        <div class="mock-row"><label>{{ $t('payment.amount') }}</label><strong>&yen;{{ amountYuan }}</strong></div>
      </div>
      <p class="mock-hint">{{ $t('payment.mock_hint') }}</p>
      <div class="actions mock-actions">
        <button class="btn-success" @click="mockPay('success')" :disabled="mockSent">{{ $t('payment.mock_success_btn') }}</button>
        <button class="btn-fail" @click="mockPay('fail')" :disabled="mockSent">{{ $t('payment.mock_fail_btn') }}</button>
      </div>
      <p class="mock-result" v-if="mockMsg">{{ mockMsg }}</p>
    </div>

    <div class="result-card" v-if="!isMock && status === 'loading'">
      <div class="spinner"></div>
      <h2>{{ $t('payment.polling_title') }}</h2>
      <p>{{ $t('payment.polling_hint') }}</p>
    </div>

    <div class="result-card success" v-if="status === 'success'">
      <div class="icon">&#10003;</div>
      <h2>{{ $t('payment.success_title') }}</h2>
      <p>{{ orderTypeText }}</p>
      <div class="actions">
        <button class="btn-primary" @click="goHome">{{ $t('payment.back_member') }}</button>
      </div>
    </div>

    <div class="result-card fail" v-if="status === 'fail'">
      <div class="icon">&#10007;</div>
      <h2>{{ $t('payment.fail_title') }}</h2>
      <p>{{ failMsg }}</p>
      <div class="actions">
        <button class="btn-primary" @click="goHome">{{ $t('payment.back_member') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const reqsn = (route.query.reqsn as string) || ''
const isMock = route.query.mock === '1'
const amountYuan = computed(() => {
  const num = Number(route.query.amount)
  return (isNaN(num) ? 0 : num / 100).toFixed(2)
})

const status = ref<'loading' | 'success' | 'fail'>(isMock ? 'loading' : 'loading')
const failMsg = ref('')
const orderTypeText = ref(t('payment.success_order_type'))
const mockSent = ref(false)
const mockMsg = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null
let _mockPollDefer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0
const MAX_POLL = 15

onMounted(() => {
  if (!reqsn) {
    status.value = 'fail'
    failMsg.value = t('payment.missing_order')
    return
  }
  if (!isMock) startPoll()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (_mockPollDefer) clearTimeout(_mockPollDefer)
})

async function mockPay(result: 'success' | 'fail') {
  mockSent.value = true
  mockMsg.value = t('payment.mock_sending')

  try {
    await $fetch('/api/allinpay/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        reqsn,
        trxid: `MOCK_${Date.now()}`,
        trxstatus: result === 'success' ? '0000' : '0999',
        status: result === 'success' ? '1' : '0',
      }).toString(),
    })
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string }; toast.error(t('payment.callback_failed')); if (import.meta.dev) console.warn('[payment-result] callback failed', e?.message || err) }

  mockMsg.value = result === 'success' ? t('payment.mock_sent_success') : t('payment.mock_sent_fail')

  // 开始轮询确认
  _mockPollDefer = setTimeout(() => startPoll(), 500)
}

function startPoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    pollCount++
    try {
      const res: any = await $fetch(`/api/payment/result/${reqsn}`)
      const data = res.data
      if (data && data.status === 1) {
        status.value = 'success'
        orderTypeText.value = t('payment.success_order_type')
        if (pollTimer) clearInterval(pollTimer)
      } else if (data && (data.status === 2 || data.status === 3)) {
        status.value = 'fail'
        failMsg.value = t('payment.fail_default')
        if (pollTimer) clearInterval(pollTimer)
      } else if (pollCount >= MAX_POLL) {
        status.value = 'fail'
        failMsg.value = t('payment.fail_timeout')
        if (pollTimer) clearInterval(pollTimer)
      }
    } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
      toast.error(t('payment.network_error'))
      if (import.meta.dev) console.warn('[payment-result] poll failed', e?.message || err)
      if (pollCount >= MAX_POLL) {
        status.value = 'fail'
        failMsg.value = t('payment.network_fail')
        if (pollTimer) clearInterval(pollTimer)
      }
    }
  }, 2000)
}

function goHome() {
  router.push('/member')
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.payment-result-page {
  max-width: 480px;
  margin: 80px auto;
  padding: var(--space-4);
}
.result-card {
  text-align: center;
  padding: var(--space-8) var(--space-6);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
}
.mock-panel {
  border-color: var(--brand);
  border-width: 2px;
}
.mock-info {
  text-align: left;
  background: var(--bg-tertiary);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin: var(--space-4) 0;
}
.mock-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
  font-size: .9rem;
}
.mock-row label { color: var(--text-secondary); }
.mock-row code { font-family: monospace; font-size: .8rem; background: var(--bg-card); padding: 2px 6px; border-radius: 4px; }
.mock-hint { color: var(--text-muted); font-size: .85rem; margin-top: var(--space-4); }
.mock-actions { display: flex; gap: var(--space-3); justify-content: center; }
.mock-result { color: var(--brand); font-size: .85rem; margin-top: var(--space-3); }
.result-card .icon {
  font-size: 3rem;
  width: 80px;
  height: 80px;
  line-height: 80px;
  margin: 0 auto var(--space-4);
  border-radius: 50%;
}
.success .icon { color: #fff; background: var(--success); }
.fail .icon { color: #fff; background: var(--danger, #e74c3c); }
.result-card h2 { font-size: 1.5rem; color: var(--text-primary); margin-bottom: var(--space-2); }
.result-card p { color: var(--text-secondary); margin-bottom: var(--space-6); }
.spinner {
  width: 48px; height: 48px;
  border: 4px solid var(--border-light);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin .8s linear infinite;
  margin: 0 auto var(--space-4);
}
@keyframes spin { to { transform: rotate(360deg); } }
.actions { margin-top: var(--space-4); }
.btn-primary {
  padding: var(--space-3) var(--space-8);
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover { background: var(--brand-hover); }
.btn-success, .btn-fail {
  padding: var(--space-3) var(--space-6);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: .95rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-success { background: var(--success, #27ae60); }
.btn-success:hover { background: #219a52; }
.btn-success:disabled, .btn-fail:disabled { opacity: .5; cursor: not-allowed; }
.btn-fail { background: var(--danger, #e74c3c); }
.btn-fail:hover { background: #c0392b; }
</style>
