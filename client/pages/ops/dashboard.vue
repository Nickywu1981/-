<!-- 运营后台仪表盘 -->
<template>
  <div class="pg">
    <PageHeader :title="$t('ops.dashboard_title')" :subtitle="$t('ops.dashboard_subtitle')" />

    <div class="stat-grid">
      <StatsCard v-for="kpi in kpis" :key="kpi.key" :value="kpi.value" :label="kpi.label" :trend="kpi.change" :trend-up="kpi.up" />
    </div>

    <div class="dashboard-grid" style="margin-top: var(--space-6)">
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('ops.dashboard_chart_dau') }}</span></div>
        <div class="chart-card-body" style="min-height:220px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">{{ $t('ops.dashboard_placeholder_active_users') }}</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('ops.dashboard_chart_funnel') }}</span></div>
        <div class="chart-card-body" style="min-height:220px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">{{ $t('ops.dashboard_placeholder_funnel') }}</div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('ops.dashboard_chart_campaigns') }}</span></div>
        <div class="chart-card-body">
          <div v-for="c in campaigns" :key="c.name" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-light);">
            <div><div style="font-size:14px;font-weight:500;">{{ c.name }}</div><div style="font-size:12px;color:var(--text-tertiary);">{{ c.date }}</div></div>
            <span class="badge" :class="'badge-' + c.type">{{ c.status }}</span>
          </div>
        </div>
      </div>
      <div class="chart-card col-6">
        <div class="chart-card-header"><span class="chart-card-title">{{ $t('ops.dashboard_chart_content') }}</span></div>
        <div class="chart-card-body" style="min-height:220px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">{{ $t('ops.dashboard_placeholder_content') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '~/components/shared/PageHeader.vue'
import StatsCard from '~/components/shared/StatsCard.vue'

const { t } = useI18n()
const kpis = [
  { key: 'dau', value: '8,429', label: t('ops.dashboard_kpi_dau'), change: '+12.5%', up: true },
  { key: 'mau', value: '45,280', label: t('ops.dashboard_kpi_mau'), change: '+18.2%', up: true },
  { key: 'conversion', value: '4.8%', label: t('ops.dashboard_kpi_conversion'), change: '+0.3%', up: true },
  { key: 'revenue', value: '¥284,960', label: t('ops.dashboard_kpi_revenue'), change: '+8.1%', up: true },
]

const campaigns = [
  { name: '618 年中大促', date: '2026-06-01 ~ 06-18', status: '进行中', type: 'info' },
  { name: '新用户首充礼', date: '2026-05-01 ~ 长期', status: '进行中', type: 'success' },
  { name: '代理招募计划', date: '2026-05-15 ~ 06-15', status: '筹备中', type: 'warning' },
]

definePageMeta({ layout: 'business-ops', middleware: ['auth'] })
</script>
