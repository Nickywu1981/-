<!-- 运营端 — 用户管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">用户管理</h1>
        <p class="page-header-subtitle">总用户 {{ totalUsers }}</p>
      </div>
      <div class="page-header-actions">
        <input class="input" placeholder="搜索用户..." style="width:200px" />
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-6)">
      <div class="stat-card"><div class="stat-card-value">5,280</div><div class="stat-card-label">总用户</div><div class="stat-card-trend up">↑ 8.5%</div></div>
      <div class="stat-card"><div class="stat-card-value">1,245</div><div class="stat-card-label">本周新增</div></div>
      <div class="stat-card"><div class="stat-card-value">73.2%</div><div class="stat-card-label">活跃率</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">用户列表</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>用户</th><th>套餐</th><th>消费</th><th>注册时间</th><th>最后活跃</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.name">
                <td><strong>{{ u.name }}</strong><br><small style="color:var(--text-tertiary)">{{ u.email }}</small></td>
                <td>{{ u.plan }}</td><td>¥{{ u.spent }}</td><td>{{ u.registered }}</td><td>{{ u.lastActive }}</td>
                <td><span class="badge" :class="'badge-' + u.statusType">{{ u.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const totalUsers = ref('5,280')
const users = [
  { name: '陈大文', email: 'chendawen@qq.com', plan: '企业版', spent: '29,980', registered: '2026-01-15', lastActive: '2026-05-12', status: '活跃', statusType: 'success' },
  { name: '林小美', email: 'linxm@163.com', plan: '专业版年卡', spent: '8,999', registered: '2026-03-20', lastActive: '2026-05-11', status: '活跃', statusType: 'success' },
  { name: '黄志强', email: 'hzq@example.com', plan: '基础版', spent: '1,499', registered: '2026-04-01', lastActive: '2026-05-01', status: '流失风险', statusType: 'warning' },
]
definePageMeta({ layout: 'ops', middleware: ['auth'] })
</script>
