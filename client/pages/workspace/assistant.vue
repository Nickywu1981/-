<!-- Movio AI v6.0 — AI 助手（预留） -->
<template>
  <div class="wa">
    <div class="wa-card">
      <div class="wa-icon">🤖</div>
      <h2>AI 助手</h2>
      <p>电商各类角色智能体 — 店铺客服、运营巡检、商品优化、选品分析、竞品监控、评价管理、违规风控、数据分析、直播值守</p>
      <span class="wa-badge">即将上线，敬请期待</span>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.wa { display: flex; align-items: center; justify-content: center; min-height: 60vh; padding: 40px; }
.wa-card { text-align: center; max-width: 480px; }
.wa-icon { font-size: 48px; margin-bottom: 16px; }
.wa-card h2 { font-size: 20px; font-weight: 600; color: var(--tx, #171717); margin-bottom: 10px; }
.wa-card p { font-size: 14px; color: var(--tx2, #6b6b70); line-height: 1.6; margin-bottom: 16px; }
.wa-badge { font-size: 12px; padding: 4px 14px; border-radius: 20px; background: var(--bg-tag, #f3f4f6); color: var(--tx3, #9d9da3); }
</style>
