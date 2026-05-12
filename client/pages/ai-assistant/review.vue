<!-- AI 助手 — 内容审核 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">AI 内容审核</h1>
        <p class="page-header-subtitle">输入文本，自动检测违规内容、联系方式、代码注入等风险</p>
      </div>
    </div>

    <div class="card" style="max-width:700px">
      <textarea v-model="text" class="review-textarea" placeholder="请输入待审核的文本内容..." rows="6"></textarea>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn btn-gradient btn-sm" @click="review" :disabled="loading">开始审核</button>
        <button class="btn btn-secondary btn-sm" @click="text=''">清空</button>
      </div>
    </div>

    <div v-if="result" class="card" style="max-width:700px;margin-top:var(--space-4)">
      <div class="flex-between" style="margin-bottom:12px">
        <strong>审核结果</strong>
        <span class="badge" :class="result.pass ? 'badge-success' : 'badge-danger'">{{ result.pass ? '✓ 通过' : '✕ 不通过' }}</span>
      </div>
      <div class="stat-card" style="margin-bottom:12px">
        <div class="stat-card-value">{{ result.score }}</div>
        <div class="stat-card-label">安全评分 / 100</div>
      </div>
      <div v-if="result.issues.length">
        <div v-for="(issue, i) in result.issues" :key="i" class="issue-row" :class="'issue-' + issue.level">
          <span class="issue-badge">{{ issue.level === 'block' ? '🚫' : '⚠️' }}</span>
          <span>{{ issue.reason }}</span>
        </div>
      </div>
      <div v-else style="color:#909399">未检测到风险内容。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const text = ref('')
const loading = ref(false)
const result = ref<any>(null)

async function review() {
  if (!text.value.trim()) return
  loading.value = true
  try {
    const res = await $fetch('/api/ai-assistant/review', { method: 'POST', body: { text: text.value } })
    result.value = (res as any).data
  } catch { result.value = { pass: false, score: 0, issues: [{ level: 'block', reason: '服务异常' }] }
  } finally { loading.value = false }
}
</script>

<style scoped>
.review-textarea { width: 100%; padding: 12px; border: 1px solid #dcdfe6; border-radius: 8px; font-size: 14px; resize: vertical; outline: none; }
.review-textarea:focus { border-color: #409eff; }
.issue-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 4px; border-radius: 6px; font-size: 14px; }
.issue-block { background: #fef0f0; color: #f56c6c; }
.issue-warn { background: #fdf6ec; color: #e6a23c; }
.issue-badge { font-size: 16px; }
</style>
