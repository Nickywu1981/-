<!-- 网关端 — Token 消耗统计 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">Token 消耗统计</h1>
        <p class="page-header-subtitle">今日消耗 {{ todayTokens }}</p>
      </div>
    </div>

    <div class="stat-grid" style="margin-bottom:var(--space-6)">
      <div class="stat-card"><div class="stat-card-value">1,250,800</div><div class="stat-card-label">本月 Token</div><div class="stat-card-trend up">↑ 18%</div></div>
      <div class="stat-card"><div class="stat-card-value">¥8,230</div><div class="stat-card-label">本月费用</div><div class="stat-card-trend up">↑ 12%</div></div>
      <div class="stat-card"><div class="stat-card-value">0.0065</div><div class="stat-card-label">均价/Token</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><span class="chart-card-title">消耗明细</span></div>
      <div class="chart-card-body" style="padding:0">
        <div class="table-container" style="border:none;border-radius:0">
          <table class="data-table">
            <thead><tr><th>模型</th><th>调用次数</th><th>Token 消耗</th><th>费用</th><th>占比</th></tr></thead>
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
