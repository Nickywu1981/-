<!-- Movio AI v8.0 — 智能体中心 -->
<template>
  <div class="ag">
    <header class="ag-header">
      <h1 class="ag-title">🤖 {{ $t('workspace.nav_agent') }}</h1>
      <p class="ag-subtitle">{{ $t('workspace.assistant_desc') }}</p>
    </header>

    <div class="ag-grid">
      <div
        v-for="agent in agents"
        :key="agent.id"
        class="ag-card"
        @click="openAgent(agent)"
        @keydown.enter="openAgent(agent)"
        @keydown.space.prevent="openAgent(agent)"
        tabindex="0"
        role="button"
        :aria-label="agent.title"
      >
        <div class="ag-card-icon">{{ agent.icon }}</div>
        <h3 class="ag-card-title">{{ agent.title }}</h3>
        <p class="ag-card-desc">{{ agent.desc }}</p>
        <span class="ag-card-badge">{{ agent.tag }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace' })
const { t } = useI18n()
const toast = useToast()

type Agent = { id: string; icon: string; title: string; desc: string; tag: string }
const agents: Agent[] = [
  { id: 'service',    icon: '💬', title: '店铺客服',   desc: '7×24小时智能应答，售前咨询+售后处理',      tag: '自动接待' },
  { id: 'ops',        icon: '🔍', title: '运营巡检',   desc: '全店商品自动巡检，标题/图片/价格异常检测',  tag: '每日巡检' },
  { id: 'product',    icon: '✨', title: '商品优化',   desc: '标题SEO优化+主图评分+描述增强建议',          tag: '转化提升' },
  { id: 'selection',  icon: '🎯', title: '选品分析',   desc: '大盘趋势+竞品挖掘+蓝海类目推荐',            tag: '数据驱动' },
  { id: 'compete',    icon: '📊', title: '竞品监控',   desc: '跟踪竞品上新/价格/活动/评价动态',            tag: '实时追踪' },
  { id: 'review',     icon: '⭐', title: '评价管理',   desc: '好评置顶+差评预警+自动回复模板',            tag: '评分维护' },
  { id: 'compliance', icon: '🛡️', title: '违规风控',   desc: '违禁词扫描+图片合规+知识产权预警',           tag: '零违规' },
  { id: 'data',       icon: '📈', title: '数据分析',   desc: '销售/流量/转化/客单多维看板+异常告警',      tag: '智能洞察' },
  { id: 'live',       icon: '📡', title: '直播值守',   desc: '直播间自动弹幕回复+商品讲解+氛围引导',      tag: '24h在线' },
]

function openAgent(agent: Agent) {
  toast.info(`${agent.title} — ${t('workspace.coming_soon_title')}`)
}
</script>

<style scoped>
.ag {
  max-width: 1120px; margin: 0 auto; padding: 24px 28px;
}
.ag-header { margin-bottom: 28px; }
.ag-title {
  font-size: 22px; font-weight: 600; color: var(--tx, #171717);
  margin: 0 0 8px; letter-spacing: -0.03em;
}
.ag-subtitle {
  font-size: 14px; color: var(--tx2, #6b6b70); margin: 0; line-height: 1.6;
  max-width: 580px;
}

.ag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.ag-card {
  background: #fff;
  border: 1.5px solid #ebebea;
  border-radius: 12px;
  padding: 22px 20px;
  cursor: pointer;
  transition: all .2s;
}
.ag-card:hover {
  border-color: #5b5fe3;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(91,95,227,.1);
}
.ag-card:focus-visible {
  outline: 2px solid #5b5fe3;
  outline-offset: 2px;
}

.ag-card-icon {
  font-size: 36px; margin-bottom: 10px; width: 48px; height: 48px;
  border-radius: 10px; background: #f5f3ff;
  display: flex; align-items: center; justify-content: center;
}
.ag-card-title {
  font-size: 15px; font-weight: 500; color: #171717;
  margin: 0 0 6px;
}
.ag-card-desc {
  font-size: 13px; color: #6b6b70; line-height: 1.55; margin: 0 0 12px;
}
.ag-card-badge {
  display: inline-block; font-size: 11px; padding: 3px 10px;
  border-radius: 6px; background: #f5f3ff; color: #5b5fe3; font-weight: 500;
}

/* Dark mode */
:root[data-theme="dark"] .ag-card, :root.dark .ag-card { background: #1a1a1a; border-color: #2a2a2a; }
:root[data-theme="dark"] .ag-card-title, :root.dark .ag-card-title { color: #eee; }
:root[data-theme="dark"] .ag-card-desc, :root.dark .ag-card-desc { color: #999; }
:root[data-theme="dark"] .ag-card-icon, :root.dark .ag-card-icon { background: #222; }
:root[data-theme="dark"] .ag-card-badge, :root.dark .ag-card-badge { background: #1e1e2e; }

@media (max-width: 900px) {
  .ag { padding: 16px; }
  .ag-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
}
@media (max-width: 600px) {
  .ag-grid { grid-template-columns: 1fr; }
}
</style>
