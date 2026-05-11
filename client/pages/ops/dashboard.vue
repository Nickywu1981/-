<!-- 运营后台仪表盘 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">运营看板</h1>
        <p class="page-header-subtitle">核心运营数据一览</p>
      </div>
    </div>

    <div class="stat-grid">
      <div v-for="kpi in kpis" :key="kpi.key" class="stat-card">
        <div class="stat-card-value">{{ kpi.value }}</div>
        <div class="stat-card-label">{{ kpi.label }}</div>
        <div class="stat-card-trend" :class="kpi.up ? 'up' : 'down'">{{ kpi.up ? '↑' : '↓' }} {{ kpi.change }}</div>
      </div>
    </div>

    <div class="dashboard-grid" style="margin-top: var(--space-6)">
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">DAU / MAU</span></div>
        <div class="chart-card-body" style="min-height:220px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">📈 活跃用户趋势 — 待接入</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">转化漏斗</span></div>
        <div class="chart-card-body" style="min-height:220px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">📊 漏斗图 — 待接入</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">进行中活动</span></div>
        <div class="chart-card-body">
          <div v-for="c in campaigns" :key="c.name" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-light);">
            <div><div style="font-size:14px;font-weight:500;">{{ c.name }}</div><div style="font-size:12px;color:var(--text-tertiary);">{{ c.date }}</div></div>
            <span class="badge" :class="'badge-' + c.type">{{ c.status }}</span>
          </div>
        </div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">内容发布统计</span></div>
        <div class="chart-card-body" style="min-height:220px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">📊 内容统计 — 待接入</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const kpis = [
  { key: 'dau', value: '8,429', label: '日活跃用户', change: '+12.5%', up: true },
  { key: 'mau', value: '45,280', label: '月活跃用户', change: '+18.2%', up: true },
  { key: 'conversion', value: '4.8%', label: '付费转化率', change: '+0.3%', up: true },
  { key: 'revenue', value: '¥284,960', label: '本月营收', change: '+8.1%', up: true },
]

const campaigns = [
  { name: '618 年中大促', date: '2026-06-01 ~ 06-18', status: '进行中', type: 'info' },
  { name: '新用户首充礼', date: '2026-05-01 ~ 长期', status: '进行中', type: 'success' },
  { name: '代理招募计划', date: '2026-05-15 ~ 06-15', status: '筹备中', type: 'warning' },
]

definePageMeta({ layout: 'ops', middleware: ['auth'] })
</script>
