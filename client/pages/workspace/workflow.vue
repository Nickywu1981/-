<!-- Movio AI v6.0 — 工作流（预留） -->
<template>
  <div class="wp">
    <div class="wp-card">
      <div class="wp-icon">⚙</div>
      <h2>功能即将上线，敬请期待</h2>
      <p>把零散功能串成标准化自动化流程 — 一键上新、批量做内容、自动管评价、每日数据复盘、大促活动营销、违规自查风控</p>
      <p class="wp-detail">我们正在为您打造电商全链路自动化能力，上线后将支持客服、运营、数据复盘等全岗位AI自动化</p>
      <div class="wp-progress">
        <div class="wp-progress-bar">
          <div class="wp-progress-fill" style="width:20%"></div>
        </div>
        <span class="wp-progress-label">开发进度 20%</span>
      </div>
      <button class="wp-btn">预约体验</button>
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
.wp-detail { font-size: 13px !important; color: var(--tx3, #9d9da3) !important; margin-bottom: 20px !important; }
.wp-progress { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 22px; }
.wp-progress-bar { width: 200px; height: 6px; border-radius: 3px; background: var(--bg-tag, #f3f4f6); overflow: hidden; }
.wp-progress-fill { height: 100%; border-radius: 3px; background: var(--brand, #5b5fe3); transition: width 0.6s; }
.wp-progress-label { font-size: 12px; color: var(--tx3, #9d9da3); }
.wp-btn {
  padding: 9px 28px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid var(--tx, #171717);
  background: var(--tx, #171717); color: #fff; cursor: pointer; transition: all 0.15s;
}
.wp-btn:hover { opacity: 0.85; }
</style>
