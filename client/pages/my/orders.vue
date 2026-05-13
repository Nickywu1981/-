<template>
  <div class="page">
    <h2>{{ $t('my.orders.page_title') }}</h2>
    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab=t.key;page=1;fetchAll()">{{ t.label }}</button>
    </div>

    <div v-if="loading" class="loading">{{ $t('my.orders.loading') }}</div>
    <template v-else>
      <div v-if="list.length > 0" class="order-list">
        <div v-for="item in list" :key="item.id" class="order-card">
          <div class="order-card__header">
            <span class="order-card__no">{{ $t('my.orders.order_no') }}{{ item.order_no || item.id }}</span>
            <span class="order-card__status" :class="item.status">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="order-card__body">
            <div class="order-card__plan">{{ item.plan_name || item.planType || $t('my.orders.default_plan') }}</div>
            <div class="order-card__amount">¥{{ item.amount || item.price }}</div>
          </div>
          <div class="order-card__footer">
            <span class="order-card__time">{{ formatTime(item.create_time) }}</span>
            <button v-if="item.status === 'paid'" class="btn-xs" @click="viewDetail(item)">{{ $t('my.orders.view_detail') }}</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">{{ $t('my.orders.empty') }}</div>
      <Pagination v-if="total > pageSize" v-model:page="page" :total="total" :page-size="pageSize" />
    </template>
  </div>
</template>

<script setup lang="ts">

const { t } = useI18n()

const loading = ref(true)
const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const pageSize = 10
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: t('my.orders.tab_all') },
  { key: 'paid', label: t('my.orders.tab_paid') },
  { key: 'refunded', label: t('my.orders.tab_refunded') },
]

const statusLabel = (s: string) => ({
  paid: t('my.orders.status_paid'),
  pending: t('my.orders.status_pending'),
  refunded: t('my.orders.status_refunded'),
  cancelled: t('my.orders.status_cancelled'),
} as any)[s] || s

const fetchAll = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/payment/orders', { params: { page: page.value, pageSize, status: activeTab.value === 'all' ? undefined : activeTab.value }, credentials: 'include' })
    list.value = res?.list || res?.data || []
    total.value = res?.total || 0
  } catch (e: unknown) {
    toast.error(t('my.orders.load_failed'))
  }
  loading.value = false
}

const toast = useToast()
const viewDetail = (item: any) => {
  toast.info(`${t('my.orders.detail_title')}${item.order_no || item.id}\n${t('my.orders.detail_amount')}¥${item.amount || item.price}\n${t('my.orders.detail_status')}${statusLabel(item.status)}`)
}

const formatTime = (t: string) => t ? new Date(t).toLocaleString('zh-CN') : ''

onMounted(fetchAll)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.page { max-width: 800px; margin: 0 auto; padding: 24px 16px; }
h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }

.tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.tabs button { padding: 6px 20px; border: 1px solid var(--border-light); border-radius: 20px; background: var(--bg-card); color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); }
.tabs button:hover { border-color: var(--brand); color: var(--brand); }
.tabs button.active { background: var(--brand-gradient); color: #fff; border-color: transparent; }

.loading { text-align: center; padding: 60px 0; color: var(--text-tertiary); font-size: 14px; }

.order-list { display: flex; flex-direction: column; gap: 12px; }
.order-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 16px; transition: border-color var(--transition-fast); }
.order-card:hover { border-color: var(--brand-soft); }

.order-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.order-card__no { font-size: 13px; color: var(--text-secondary); font-family: monospace; }
.order-card__status { font-size: 12px; padding: 2px 10px; border-radius: 12px; font-weight: 500; }
.order-card__status.paid { background: var(--success-light, #d1fae5); color: var(--success); }
.order-card__status.pending { background: var(--warning-light, #fef3c7); color: var(--warning, #d97706); }
.order-card__status.refunded { background: var(--text-muted-bg, #f3f4f6); color: var(--text-muted); }
.order-card__status.cancelled { background: var(--danger-light, #fee2e2); color: var(--danger); }

.order-card__body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.order-card__plan { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.order-card__amount { font-size: 18px; font-weight: 700; color: var(--brand); }

.order-card__footer { display: flex; justify-content: space-between; align-items: center; }
.order-card__time { font-size: 12px; color: var(--text-tertiary); }
.btn-xs { padding: 4px 12px; font-size: 12px; border: 1px solid var(--brand); border-radius: 6px; background: transparent; color: var(--brand); cursor: pointer; transition: background var(--transition-fast), color var(--transition-fast); }
.btn-xs:hover { background: var(--brand); color: #fff; }

.empty-state { text-align: center; padding: 60px 0; color: var(--text-tertiary); font-size: 15px; }

@media (max-width: 480px) {
  .page { padding: 16px 12px; }
  .order-card__body { flex-direction: column; align-items: flex-start; gap: 4px; }
}
</style>
