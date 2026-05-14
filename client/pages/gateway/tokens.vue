<!-- 网关端 — Token 消耗统计 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('gateway.tokens_title') }}</h1>
        <p class="page-header-subtitle">{{ $t('gateway.tokens_subtitle', { n: todayTokens }) }}</p>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-6)">
      <div class="stat-card"><div class="stat-card-value">1,250,800</div><div class="stat-card-label">{{ $t('gateway.tokens_stat_month_tokens') }}</div><div class="stat-card-trend up">↑ 18%</div></div>
      <div class="stat-card"><div class="stat-card-value">¥8,230</div><div class="stat-card-label">{{ $t('gateway.tokens_stat_month_cost') }}</div><div class="stat-card-trend up">↑ 12%</div></div>
      <div class="stat-card"><div class="stat-card-value">0.0065</div><div class="stat-card-label">{{ $t('gateway.tokens_stat_avg_price') }}</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">{{ $t('gateway.tokens_detail_title') }}</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>{{ $t('gateway.tokens_col_model') }}</th><th>{{ $t('gateway.tokens_col_calls') }}</th><th>{{ $t('gateway.tokens_col_tokens') }}</th><th>{{ $t('gateway.tokens_col_cost') }}</th><th>{{ $t('gateway.tokens_col_pct') }}</th></tr></thead>
            <tbody>
              <tr v-for="m in models" :key="m.name">
                <td>{{ m.name }}</td><td>{{ m.calls }}</td><td>{{ m.tokens }}</td><td>¥{{ m.cost }}</td>
                <td><div style="display:flex;align-items:center;gap:8px"><div class="progress-bar" style="flex:1"><div class="progress-fill" :style="{width:m.pct}"></div></div>{{ m.pct }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const todayTokens = ref('42,800')
const models = [
  { name: 'GPT-4o', calls: '8,200', tokens: '620,000', cost: '4,960', pct: '49.6%' },
  { name: 'Claude 3.5', calls: '5,400', tokens: '380,000', cost: '2,280', pct: '30.4%' },
  { name: 'Gemini Pro', calls: '2,100', tokens: '250,800', cost: '990', pct: '20.0%' },
]
definePageMeta({ layout: 'gateway', middleware: ['auth'] })
</script>
