<template>
  <div class="payment-result-page">
    <!-- Mock 模式：模拟支付面板 -->
    <div class="result-card mock-panel" v-if="isMock">
      <h2>🧪 沙箱模拟支付</h2>
      <div class="mock-info">
        <div class="mock-row"><label>订单号</label><code>{{ reqsn }}</code></div>
        <div class="mock-row"><label>金额</label><strong>&yen;{{ amountYuan }}</strong></div>
      </div>
      <p class="mock-hint">点击下方按钮模拟通联支付回调</p>
      <div class="actions mock-actions">
        <button class="btn-success" @click="mockPay('success')" :disabled="mockSent">模拟支付成功</button>
        <button class="btn-fail" @click="mockPay('fail')" :disabled="mockSent">模拟支付失败</button>
      </div>
      <p class="mock-result" v-if="mockMsg">{{ mockMsg }}</p>
    </div>

    <!-- 真实模式：轮询 -->
    <div class="result-card" v-if="!isMock && status === 'loading'">
      <div class="spinner"></div>
      <h2>正在查询支付结果...</h2>
      <p>请稍候，正在确认您的支付状态</p>
    </div>

    <div class="result-card success" v-if="status === 'success'">
      <div class="icon">&#10003;</div>
      <h2>支付成功</h2>
      <p>{{ orderTypeText }}</p>
      <div class="actions">
        <button class="btn-primary" @click="goHome">返回会员中心</button>
      </div>
    </div>

    <div class="result-card fail" v-if="status === 'fail'">
      <div class="icon">&#10007;</div>
      <h2>支付未完成</h2>
      <p>{{ failMsg }}</p>
      <div class="actions">
        <button class="btn-primary" @click="goHome">返回会员中心</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const route = useRoute()
const router = useRouter()
const reqsn = (route.query.reqsn as string) || ''
const isMock = route.query.mock === '1'
const amountYuan = computed(() => (Number(route.query.amount) / 100).toFixed(2))

const status = ref<'loading' | 'success' | 'fail'>(isMock ? 'loading' : 'loading')
const failMsg = ref('')
const orderTypeText = ref('会员已开通')
const mockSent = ref(false)
const mockMsg = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null
let pollCount = 0
const MAX_POLL = 15

onMounted(() => {
  if (!reqsn) {
    status.value = 'fail'
    failMsg.value = '缺少订单号参数'
    return
  }
  if (!isMock) startPoll()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

async function mockPay(result: 'success' | 'fail') {
  mockSent.value = true
  mockMsg.value = '正在发送模拟回调...'

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
  } catch { /* 回调接口始终返回 success */ }

  mockMsg.value = result === 'success' ? '回调已发送，正在查询结果...' : '失败回调已发送'

  // 开始轮询确认
  setTimeout(() => startPoll(), 500)
}

function startPoll() {
  pollTimer = setInterval(async () => {
    pollCount++
    try {
      const res: any = await $fetch(`/api/payment/result/${reqsn}`)
      const data = res.data
      if (data && data.status === 1) {
        status.value = 'success'
        orderTypeText.value = '会员已开通'
        if (pollTimer) clearInterval(pollTimer)
      } else if (data && (data.status === 2 || data.status === 3)) {
        status.value = 'fail'
        failMsg.value = '支付失败或已超时，请重新下单'
        if (pollTimer) clearInterval(pollTimer)
      } else if (pollCount >= MAX_POLL) {
        status.value = 'fail'
        failMsg.value = '支付确认超时，如已支付请稍后查看订单状态'
        if (pollTimer) clearInterval(pollTimer)
      }
    } catch {
      if (pollCount >= MAX_POLL) {
        status.value = 'fail'
        failMsg.value = '网络异常，请稍后查看订单状态'
        if (pollTimer) clearInterval(pollTimer)
      }
    }
  }, 2000)
}

function goHome() {
  router.push('/member')
}
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
