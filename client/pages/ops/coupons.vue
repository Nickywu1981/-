<!-- 运营端 — 优惠券管理 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">优惠券管理</h1>
        <p class="page-header-subtitle">创建/发放/核销优惠券，统计使用效果</p>
      </div>
      <button class="btn btn-gradient btn-sm">+ 创建优惠券</button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">15</div><div class="stat-card-label">券模板</div></div>
      <div class="stat-card"><div class="stat-card-value">4,820</div><div class="stat-card-label">发放数</div></div>
      <div class="stat-card"><div class="stat-card-value">1,256</div><div class="stat-card-label">已核销</div></div>
      <div class="stat-card"><div class="stat-card-value">26.1%</div><div class="stat-card-label">核销率</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>券名称</th><th>类型</th><th>面额</th><th>发放量</th><th>核销量</th><th>核销率</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="c in coupons" :key="c.id">
            <td><strong>{{ c.name }}</strong></td><td>{{ c.type }}</td><td>¥{{ c.value }}</td>
            <td>{{ c.issued }}</td><td>{{ c.redeemed }}</td>
            <td>{{ c.rate }}%</td>
            <td><span class="badge badge-success">{{ c.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'ops', middleware: ['auth'] })

const coupons = reactive([
  { id: 1, name: '新用户专享券', type: '满减', value: 10, issued: 2400, redeemed: 720, rate: 30, status: '生效中' },
  { id: 2, name: '会员月卡折扣', type: '折扣', value: 20, issued: 1200, redeemed: 380, rate: 31.7, status: '生效中' },
  { id: 3, name: '限时免费体验', type: '免费', value: 29, issued: 500, redeemed: 156, rate: 31.2, status: '已下架' },
])
</script>
