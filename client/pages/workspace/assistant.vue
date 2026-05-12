<!-- AI 助手 — 功能入口页 -->
<template>
  <div class="pg">
    <div class="page-header">
      <h1 class="page-header-title">🤖 AI 助手</h1>
      <p class="page-header-subtitle">智能客服、内容审核、数据分析，三大 AI 助手助你高效运营</p>
    </div>

    <div class="feature-grid">
      <div class="feature-card" @click="navigateTo('/ai-assistant/faq')">
        <div class="feature-icon">💬</div>
        <h3>AI 智能客服</h3>
        <p>常见问题秒回，输入关键词即可获取答案。如何充值、支持什么格式、API 怎么对接。</p>
        <span class="feature-link">开始使用 →</span>
      </div>
      <div class="feature-card" @click="navigateTo('/ai-assistant/review')">
        <div class="feature-icon">🛡</div>
        <h3>AI 内容审核</h3>
        <p>自动检测违禁词、联系方式、代码注入等风险内容，输出安全评分 + 详细建议。</p>
        <span class="feature-link">开始审核 →</span>
      </div>
      <div class="feature-card" @click="navigateTo('/ai-assistant/data')">
        <div class="feature-icon">📊</div>
        <h3>AI 数据分析</h3>
        <p>自然语言查询运营数据，用户增长、收入趋势、生成统计，一问即答。</p>
        <span class="feature-link">开始分析 →</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
const router = useRouter()
function navigateTo(path: string) { router.push(path) }
</script>

<style scoped>
.feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: var(--space-6); }
.feature-card { padding: 24px; border: 1px solid #e4e7ed; border-radius: 12px; cursor: pointer; transition: all .2s; text-align: center; }
.feature-card:hover { border-color: #409eff; box-shadow: 0 4px 16px rgba(64,158,255,.12); transform: translateY(-2px); }
.feature-icon { font-size: 40px; margin-bottom: 12px; }
.feature-card h3 { margin: 0 0 8px; font-size: 18px; }
.feature-card p { margin: 0 0 12px; color: #909399; font-size: 14px; line-height: 1.6; }
.feature-link { color: #409eff; font-size: 14px; font-weight: 600; }
</style>
