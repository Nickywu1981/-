<!-- 代理端 — 客户管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">客户管理</h1>
        <p class="page-header-subtitle">名下客户列表、详情、标签分组</p>
      </div>
      <input class="search-input w-220" v-model="search" placeholder="搜索客户..." />
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>客户</th><th>手机号</th><th>注册时间</th><th>累计消费</th><th>订单数</th><th>标签</th></tr></thead>
        <tbody>
          <tr v-for="c in filteredCustomers" :key="c.id">
            <td><strong>{{ c.name }}</strong></td>
            <td>{{ c.phone }}</td>
            <td>{{ c.createdAt }}</td>
            <td>¥{{ c.totalSpent }}</td>
            <td>{{ c.orderCount }}</td>
            <td><span v-for="t in c.tags" :key="t" class="badge badge-info mr-4">{{ t }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'agent', middleware: ['auth'] })

const search = ref('')

const customers = reactive([
  { id: 1, name: '张三', phone: '138****8888', createdAt: '2026-01-15', totalSpent: 299, orderCount: 3, tags: ['VIP'] },
  { id: 2, name: '李四', phone: '139****9999', createdAt: '2026-03-20', totalSpent: 69, orderCount: 2, tags: ['新用户'] },
])

const filteredCustomers = computed(() =>
  customers.filter(c => c.name.includes(search.value) || c.phone.includes(search.value))
)
</script>

<style scoped>
.w-220 { width: 220px; }
.mr-4 { margin-right: 4px; }
</style>
