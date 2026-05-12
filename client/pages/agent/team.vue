<!-- 代理端 — 团队管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">团队管理</h1>
        <p class="page-header-subtitle">成员 {{ members.length }} 人</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-gradient btn-sm" @click="showInvite = true">+ 邀请成员</button>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">团队成员</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>成员</th><th>角色</th><th>客户数</th><th>贡献佣金</th><th>加入时间</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="m in members" :key="m.name">
                <td><strong>{{ m.name }}</strong><br><small style="color:var(--text-tertiary)">{{ m.email }}</small></td>
                <td>{{ m.role }}</td><td>{{ m.customers }}</td><td>¥{{ m.commission }}</td><td>{{ m.joined }}</td>
                <td><span class="badge" :class="'badge-' + m.statusType">{{ m.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const showInvite = ref(false)
const members = [
  { name: '李明', email: 'liming@example.com', role: '渠道经理', customers: 128, commission: '48,200', joined: '2024-09-01', status: '活跃', statusType: 'success' },
  { name: '王芳', email: 'wangfang@example.com', role: '销售代表', customers: 56, commission: '18,900', joined: '2025-02-15', status: '活跃', statusType: 'success' },
  { name: '赵强', email: 'zhaoqiang@example.com', role: '销售代表', customers: 32, commission: '9,100', joined: '2025-11-01', status: '暂停', statusType: 'warning' },
]
definePageMeta({ layout: 'agent', middleware: ['auth'] })
</script>
