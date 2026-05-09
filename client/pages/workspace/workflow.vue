<!-- Movio AI v6.0 — 工作流（预留） -->
<template>
  <div class="wp">
    <div class="wp-card">
      <div class="wp-icon">⚙</div>
      <h2>工作流</h2>
      <p>把零散功能串成标准化自动化流程 — 一键上新、批量做内容、自动管评价、每日数据复盘、大促活动营销、违规自查风控</p>
      <p class="wp-detail">我们正在为您打造电商全链路自动化能力，上线后将支持客服、运营、数据复盘等全岗位AI自动化</p>
      <span class="wp-badge">即将上线，敬请期待</span>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.wp { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 40px; }
.wp-card { text-align: center; max-width: 520px; }
.wp-icon { font-size: 52px; margin-bottom: 16px; }
.wp-card h2 { font-size: 20px; font-weight: 600; color: var(--tx, #171717); margin-bottom: 12px; }
.wp-card p { font-size: 14px; color: var(--tx2, #6b6b70); line-height: 1.7; margin-bottom: 10px; }
.wp-detail { font-size: 13px !important; color: var(--tx3, #9d9da3) !important; margin-bottom: 18px !important; }
.wp-badge { font-size: 12px; padding: 5px 16px; border-radius: 20px; background: var(--bg-tag, #f3f4f6); color: var(--tx3, #9d9da3); }
</style>
