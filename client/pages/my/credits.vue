<template>
  <div class="page">
    <h2>积分明细</h2>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-card__label">剩余积分</div>
        <div class="stat-card__value">{{ creditBalance }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">累计获得</div>
        <div class="stat-card__value green">{{ totalEarned }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">累计消费</div>
        <div class="stat-card__value spent">{{ totalSpent }}</div>
      </div>
    </div>

    <div class="filter-bar">
      <select v-model="filterType" class="filter-select" @change="page=1;fetchAll()">
        <option value="">全部类型</option>
        <option value="earn">获得</option>
        <option value="spend">消费</option>
        <option value="refund">退款</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <template v-else>
      <div v-if="list.length > 0" class="list">
        <div v-for="item in list" :key="item.id" class="list-item">
          <div class="list-item__icon">{{ item.type === 'earn' ? '💰' : item.type === 'refund' ? '↩' : '💸' }}</div>
          <div class="list-item__info">
            <div class="list-item__title">{{ item.description }}</div>
            <div class="list-item__time">{{ formatTime(item.create_time) }}</div>
          </div>
          <div class="list-item__amount" :class="item.type === 'spend' ? 'negative' : 'positive'">
            {{ item.type === 'spend' ? '-' : '+' }}{{ item.amount }}
          </div>
        </div>
      </div>
      <div v-else class="empty-state">暂无积分记录</div>
      <Pagination v-if="total > pageSize" v-model:page="page" :total="total" :page-size="pageSize" />
    </template>
  </div>
</template>

<script setup lang="ts">


const loading = ref(true)
const list = ref<any[]>([])
const page = ref(1)
const total = ref(0)
const pageSize = 10
const filterType = ref('')
const creditBalance = ref(0)
const totalEarned = ref(0)
const totalSpent = ref(0)

const toast = useToast()

const fetchAll = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/credits/records', { params: { page: page.value, pageSize, type: filterType.value || undefined }, credentials: 'include' })
    list.value = res?.list || res?.data || []
    total.value = res?.total || 0
    creditBalance.value = res?.balance || 0
    totalEarned.value = res?.totalEarned || 0
    totalSpent.value = res?.totalSpent || 0
  } catch (e: any) {
    console.error('[积分明细] 加载失败', e.message)
    toast.error('加载失败，请刷新重试')
  }
  loading.value = false
}

const formatTime = (t: string) => t ? new Date(t).toLocaleString('zh-CN') : ''

onMounted(fetchAll)
</script>

<style scoped>
.page { max-width: 960px; margin: 0 auto; padding: 24px; }
h2 { font-size: var(--text-xl, 22px); font-weight: 600; margin-bottom: 20px; color: var(--text-primary, #1a1a2e); }
.stats-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 160px; padding: 16px; background: var(--card-bg, #fff); border-radius: var(--radius-md, 10px); box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,.06)); }
.stat-card__label { font-size: var(--text-sm, 13px); color: var(--text-secondary, #666); margin-bottom: 6px; }
.stat-card__value { font-size: var(--text-xl, 22px); font-weight: 700; color: var(--brand, #7C3AED); }
.stat-card__value.green { color: var(--success, #10B981); }
.stat-card__value.spent { color: var(--danger, #EF4444); }
.filter-bar { margin-bottom: 16px; }
.filter-select { padding: 8px 12px; border: 1px solid var(--border, #e5e7eb); border-radius: var(--radius-sm, 6px); font-size: var(--text-sm, 13px); background: var(--card-bg, #fff); color: var(--text-primary, #1a1a2e); }
.loading { text-align: center; padding: 40px; color: var(--text-secondary, #999); }
.list { display: flex; flex-direction: column; gap: 8px; }
.list-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--card-bg, #fff); border-radius: var(--radius-sm, 8px); box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.04)); }
.list-item__icon { font-size: 20px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg, #f8f7ff); border-radius: 50%; }
.list-item__info { flex: 1; }
.list-item__title { font-size: var(--text-md, 14px); color: var(--text-primary, #1a1a2e); }
.list-item__time { font-size: var(--text-xs, 12px); color: var(--text-secondary, #999); margin-top: 2px; }
.list-item__amount { font-weight: 600; font-size: var(--text-md, 14px); }
.list-item__amount.positive { color: var(--success, #10B981); }
.list-item__amount.negative { color: var(--danger, #EF4444); }
.empty-state { text-align: center; padding: 40px; color: var(--text-secondary, #999); }
</style>
