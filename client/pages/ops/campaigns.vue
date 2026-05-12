<!-- 运营端 — 营销活动 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">营销活动</h1>
        <p class="page-header-subtitle">创建和管理促销、拉新、裂变活动</p>
      </div>
      <button class="btn btn-gradient btn-sm">+ 新建活动</button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">8</div><div class="stat-card-label">进行中</div></div>
      <div class="stat-card"><div class="stat-card-value">3,240</div><div class="stat-card-label">参与人次</div></div>
      <div class="stat-card"><div class="stat-card-value">¥12,580</div><div class="stat-card-label">活动转化</div></div>
      <div class="stat-card"><div class="stat-card-value">16.8%</div><div class="stat-card-label">平均转化率</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>活动名称</th><th>类型</th><th>开始时间</th><th>结束时间</th><th>参与人数</th><th>转化金额</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="c in campaigns" :key="c.id">
            <td><strong>{{ c.name }}</strong></td><td>{{ c.type }}</td><td>{{ c.start }}</td><td>{{ c.end }}</td>
            <td>{{ c.participants }}</td><td>¥{{ c.revenue.toLocaleString() }}</td>
            <td><span class="badge" :class="c.active ? 'badge-success' : 'badge-secondary'">{{ c.active ? '进行中' : '已结束' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'ops', middleware: ['auth'] })

const campaigns = reactive([
  { id: 1, name: '五一会员特惠', type: '促销', start: '2026-05-01', end: '2026-05-15', participants: 1240, revenue: 5800, active: true },
  { id: 2, name: '推荐有礼', type: '裂变拉新', start: '2026-04-15', end: '2026-06-15', participants: 820, revenue: 3420, active: true },
  { id: 3, name: '新春优惠券', type: '优惠券', start: '2026-01-20', end: '2026-02-28', participants: 1180, revenue: 3360, active: false },
])
</script>
