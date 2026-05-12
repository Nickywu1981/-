<!-- 网关端 — 限流策略 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">限流策略</h1>
        <p class="page-header-subtitle">rateLimiter / heavyLimiter / authLimiter / adminLimiter 策略配置</p>
      </div>
      <button class="btn btn-secondary btn-sm">应用变更</button>
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>策略名称</th><th>类型</th><th>QPS 限制</th><th>突发容量</th><th>适用路由数</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="l in limits" :key="l.name">
            <td><strong>{{ l.name }}</strong></td><td>{{ l.type }}</td><td>{{ l.qps }}</td><td>{{ l.burst }}</td>
            <td>{{ l.routeCount }}</td>
            <td><span class="badge badge-success">{{ l.enabled ? '启用' : '禁用' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'gateway', middleware: ['auth'] })

const limits = reactive([
  { name: 'rateLimiter', type: '令牌桶', qps: '100', burst: '200', routeCount: 35, enabled: true },
  { name: 'heavyLimiter', type: '令牌桶', qps: '20', burst: '40', routeCount: 12, enabled: true },
  { name: 'authLimiter', type: '固定窗口', qps: '10', burst: '15', routeCount: 3, enabled: true },
  { name: 'adminLimiter', type: '令牌桶', qps: '30', burst: '60', routeCount: 10, enabled: true },
])
</script>
