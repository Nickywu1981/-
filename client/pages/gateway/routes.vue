<!-- 网关端 — 路由配置 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('gateway.routes_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('gateway.routes_subtitle') }}</p>
      </div>
      <button class="btn btn-gradient btn-sm">{{ $t('gateway.routes_btn_add') }}</button>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-card-value">572</div><div class="stat-card-label">{{ $t('gateway.routes_stat_active') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">83</div><div class="stat-card-label">{{ $t('gateway.routes_stat_upstream') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">99.8%</div><div class="stat-card-label">{{ $t('gateway.routes_stat_avail') }}</div></div>
      <div class="stat-card"><div class="stat-card-value">142ms</div><div class="stat-card-label">{{ $t('gateway.routes_stat_latency') }}</div></div>
    </div>

    <div class="card" style="margin-top: var(--space-6)">
      <table class="data-table">
        <thead><tr><th>{{ $t('gateway.routes_col_path') }}</th><th>{{ $t('gateway.routes_col_method') }}</th><th>{{ $t('gateway.routes_col_upstream') }}</th><th>{{ $t('gateway.routes_col_weight') }}</th><th>{{ $t('gateway.routes_col_limiter') }}</th><th>{{ $t('gateway.routes_col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="r in routes" :key="r.path + r.method">
            <td><code>{{ r.path }}</code></td><td><span class="badge badge-info">{{ r.method }}</span></td>
            <td>{{ r.upstream }}</td><td>{{ r.weight }}%</td>
            <td>{{ r.limiter }}</td>
            <td><span class="badge badge-success">{{ $t('gateway.routes_status_online') }}</span></td>
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
