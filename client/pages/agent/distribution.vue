<!-- 代理端 — 分销管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">下级代理管理</h1>
        <p class="page-header-subtitle">招募审核、等级设置、分润比例配置</p>
      </div>
      <button class="btn btn-gradient btn-sm" @click="showInvite = true">+ 邀请代理</button>
    </div>

    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div class="stat-card-value">{{ s.value }}</div>
        <div class="stat-card-label">{{ s.label }}</div>
      </div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>代理名称</th><th>等级</th><th>分润比例</th><th>下级客户</th><th>累计佣金</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="a in agents" :key="a.id">
            <td><strong>{{ a.name }}</strong></td>
            <td><span class="badge" :class="'tier-' + a.level">{{ a.levelName }}</span></td>
            <td>{{ a.rate }}%</td>
            <td>{{ a.customerCount }}</td>
            <td>¥{{ a.totalCommission.toLocaleString() }}</td>
            <td><span class="badge" :class="a.active ? 'badge-success' : 'badge-warning'">{{ a.active ? '启用' : '暂停' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'agent', middleware: ['auth'] })

const stats = reactive([
  { label: '活跃代理', value: 12 },
  { label: '待审核', value: 3 },
  { label: '本月新增', value: 5 },
  { label: '总分润支出', value: '¥45,820' },
])

const agents = reactive([
  { id: 1, name: '华东代理中心', level: 1, levelName: '金牌代理', rate: 30, customerCount: 256, totalCommission: 28900, active: true },
  { id: 2, name: '华南分销站', level: 2, levelName: '银牌代理', rate: 20, customerCount: 134, totalCommission: 12400, active: true },
  { id: 3, name: '西南推广点', level: 3, levelName: '铜牌代理', rate: 10, customerCount: 67, totalCommission: 4520, active: false },
])

const showInvite = ref(false)
</script>
