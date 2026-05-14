<!-- 网关端 — 限流策略 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('gateway.rate_limit_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('gateway.rate_limit_subtitle') }}</p>
      </div>
      <button class="btn btn-secondary btn-sm">{{ $t('gateway.rate_limit_btn_apply') }}</button>
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>{{ $t('gateway.rate_limit_col_name') }}</th><th>{{ $t('gateway.rate_limit_col_type') }}</th><th>{{ $t('gateway.rate_limit_col_qps') }}</th><th>{{ $t('gateway.rate_limit_col_burst') }}</th><th>{{ $t('gateway.rate_limit_col_route_count') }}</th><th>{{ $t('gateway.rate_limit_col_status') }}</th></tr></thead>
        <tbody>
          <tr v-for="l in limits" :key="l.name">
            <td><strong>{{ l.name }}</strong></td><td>{{ l.type }}</td><td>{{ l.qps }}</td><td>{{ l.burst }}</td>
            <td>{{ l.routeCount }}</td>
            <td><span class="badge badge-success">{{ l.enabled ? $t('gateway.rate_limit_status_enabled') : $t('gateway.rate_limit_status_disabled') }}</span></td>
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
