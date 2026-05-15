<!-- AI 助手 — 内容审核 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">{{ $t('ai_assistant.review.title') }}</h1>
        <p class="page-header-subtitle">{{ $t('ai_assistant.review.subtitle') }}</p>
      </div>
    </div>

    <div class="card review-card">
      <textarea v-model="text" class="review-textarea" :placeholder="$t('ai_assistant.review.placeholder')" rows="6"></textarea>
      <div class="review-actions">
        <button class="btn btn-gradient btn-sm" @click="review" :disabled="loading">{{ $t('ai_assistant.review.start_review') }}</button>
        <button class="btn btn-secondary btn-sm" @click="text=''">{{ $t('ai_assistant.review.clear') }}</button>
      </div>
    </div>

    <div v-if="result" class="card review-card review-result">
      <div class="flex-between review-result-header">
        <strong>{{ $t('ai_assistant.review.result_title') }}</strong>
        <span class="badge" :class="result.pass ? 'badge-success' : 'badge-danger'">{{ result.pass ? $t('ai_assistant.review.pass') : $t('ai_assistant.review.fail') }}</span>
      </div>
      <div class="stat-card review-score">
        <div class="stat-card-value">{{ result.score }}</div>
        <div class="stat-card-label">{{ $t('ai_assistant.review.score_label') }}</div>
      </div>
      <div v-if="result.issues.length">
        <div v-for="(issue, i) in result.issues" :key="i" class="issue-row" :class="'issue-' + issue.level">
          <span class="issue-badge">{{ issue.level === 'block' ? '🚫' : '⚠️' }}</span>
          <span>{{ issue.reason }}</span>
        </div>
      </div>
      <div v-else class="review-no-issues">{{ $t('ai_assistant.review.no_issues') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })

const text = ref('')
const loading = ref(false)
const result = ref<any>(null)

async function review() {
  if (!text.value.trim()) return
  loading.value = true
  try {
    const res = await $fetch('/api/ai-assistant/review', { method: 'POST', credentials: 'include', body: { text: text.value } })
    result.value = (res as any).data
  } catch { result.value = { pass: false, score: 0, issues: [{ level: 'block', reason: $t('ai_assistant.review.service_error') }] }
  } finally { loading.value = false }
}
</script>

<style scoped>
.review-card { max-width: 700px; }
.review-result { margin-top: var(--space-4); }

.review-actions { margin-top: 12px; display: flex; gap: 8px; }

.review-textarea {
  width: 100%; padding: 12px; border-radius: 8px; font-size: 14px; resize: vertical; outline: none;
  border: 1px solid var(--border-color, #dcdfe6);
  background: var(--bg-input, #fff);
  color: var(--text-primary, #303133);
}
.review-textarea:focus { border-color: var(--brand, #5b5fe3); }

.review-result-header { margin-bottom: 12px; }

.review-score { margin-bottom: 12px; }

.issue-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 4px; border-radius: 6px; font-size: 14px; }
.issue-block { background: var(--bg-error-light, #fef0f0); color: var(--color-error, #f56c6c); }
.issue-warn { background: var(--bg-warn-light, #fdf6ec); color: var(--color-warn, #e6a23c); }
.issue-badge { font-size: 16px; }

.review-no-issues { color: var(--text-muted, #909399); }

/* Dark */
:root[data-theme="dark"] .review-textarea, :root.dark .review-textarea { background: var(--bg-card, #1a1a1a); border-color: var(--border-light, #2a2a2a); color: var(--text-primary, #eee); }
:root[data-theme="dark"] .issue-block, :root.dark .issue-block { background: rgba(245, 108, 108, .1); }
:root[data-theme="dark"] .issue-warn, :root.dark .issue-warn { background: rgba(230, 162, 60, .1); }
</style>
