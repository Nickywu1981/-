<!-- Movio AI v6.0 — 工作流（预留） -->
<template>
  <div class="wf">
    <div class="wf-card">
      <div class="wf-icon">⚙</div>
      <h2>工作流</h2>
      <p>把零散功能串成标准化自动化流程 — 一键上新、批量做内容、自动管评价、每日数据复盘、大促活动营销、违规自查风控</p>
      <span class="wf-badge">即将上线，敬请期待</span>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.wf { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 40px; }
.wf-card { text-align: center; max-width: 480px; }
.wf-icon { font-size: 48px; margin-bottom: 16px; }
.wf-card h2 { font-size: 20px; font-weight: 600; color: var(--tx, #171717); margin-bottom: 10px; }
.wf-card p { font-size: 14px; color: var(--tx2, #6b6b70); line-height: 1.6; margin-bottom: 16px; }
.wf-badge { font-size: 12px; padding: 4px 14px; border-radius: 20px; background: var(--bg-tag, #f3f4f6); color: var(--tx3, #9d9da3); }
</style>
