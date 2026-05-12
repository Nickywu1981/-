<!-- 网关端 — 路由配置 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">路由配置</h1>
        <p class="page-header-subtitle">API 路由注册表、上游映射、权重分配</p>
      </div>
      <button class="btn btn-gradient btn-sm">+ 新增路由</button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">572</div><div class="stat-card-label">活跃路由</div></div>
      <div class="stat-card"><div class="stat-card-value">83</div><div class="stat-card-label">上游服务</div></div>
      <div class="stat-card"><div class="stat-card-value">99.8%</div><div class="stat-card-label">可用率 (24h)</div></div>
      <div class="stat-card"><div class="stat-card-value">142ms</div><div class="stat-card-label">平均延迟</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>路径</th><th>方法</th><th>上游</th><th>权重</th><th>限流</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="r in routes" :key="r.path + r.method">
            <td><code>{{ r.path }}</code></td><td><span class="badge badge-info">{{ r.method }}</span></td>
            <td>{{ r.upstream }}</td><td>{{ r.weight }}%</td>
            <td>{{ r.limiter }}</td>
            <td><span class="badge badge-success">● 在线</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'gateway', middleware: ['auth'] })

const routes = reactive([
  { path: '/api/v4/image/generate', method: 'POST', upstream: 'ai-engine-1', weight: 60, limiter: 'heavyLimiter' },
  { path: '/api/v4/image/generate', method: 'POST', upstream: 'ai-engine-2', weight: 40, limiter: 'heavyLimiter' },
  { path: '/api/auth/login', method: 'POST', upstream: 'auth-service', weight: 100, limiter: 'authLimiter' },
  { path: '/api/v4/job/:id', method: 'GET', upstream: 'job-service', weight: 100, limiter: 'rateLimiter' },
])
</script>
