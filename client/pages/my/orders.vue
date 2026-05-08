<template>
  <div class="page">
    <h2>我的订单</h2>
    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab=t.key;page=1;fetchAll()">{{ t.label }}</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <div v-if="list.length > 0" class="order-list">
        <div v-for="item in list" :key="item.id" class="order-card">
          <div class="order-card__header">
            <span class="order-card__no">订单号：{{ item.order_no || item.id }}</span>
            <span class="order-card__status" :class="item.status">{{ statusLabel(item.status) }}</span>
          </div>
          <div class="order-card__body">
            <div class="order-card__plan">{{ item.plan_name || item.planType || '会员套餐' }}</div>
            <div class="order-card__amount">¥{{ item.amount || item.price }}</div>
          </div>
          <div class="order-card__footer">
            <span class="order-card__time">{{ formatTime(item.create_time) }}</span>
            <button v-if="item.status === 'paid'" class="btn-xs" @click="viewDetail(item)">查看详情</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">暂无订单记录</div>
      <Pagination v-if="total > pageSize" v-model:page="page" :total="total" :page-size="pageSize" />
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const loading = ref(true)
const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const pageSize = 10
const activeTab = ref('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'paid', label: '已支付' },
  { key: 'refunded', label: '已退款' },
]

const statusLabel = (s: string) => ({ paid: '已支付', pending: '待支付', refunded: '已退款', cancelled: '已取消' } as any)[s] || s

const fetchAll = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/payment/orders', { params: { page: page.value, pageSize, status: activeTab.value === 'all' ? undefined : activeTab.value }, credentials: 'include' })
    list.value = res?.list || res?.data || []
    total.value = res?.total || 0
  } catch { /* use mock */ }
  loading.value = false
}

const viewDetail = (item: any) => {
  (window as any).__toast?.info(`订单详情：${item.order_no || item.id}\n金额：¥${item.amount || item.price}\n状态：${statusLabel(item.status)}`)
}

const formatTime = (t: string) => t ? new Date(t).toLocaleString('zh-CN') : ''

onMounted(fetchAll)
</script>
