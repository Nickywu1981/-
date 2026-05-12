<!-- AI 助手 — 数据问答 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">AI 数据分析助手</h1>
        <p class="page-header-subtitle">用自然语言查询运营数据，AI 自动分析回答</p>
      </div>
    </div>

    <div class="card" style="max-width:700px">
      <div class="hint-row">
        <span v-for="h in hints" :key="h" class="hint-chip" @click="question = h">{{ h }}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <input v-model="question" class="chat-input" style="flex:1" placeholder="输入问题，例如：本周注册用户有多少" @keyup.enter="ask" />
        <button class="btn btn-gradient btn-sm" @click="ask" :disabled="loading">分析</button>
      </div>
    </div>

    <div v-if="answer" class="card" style="max-width:700px;margin-top:var(--space-4)">
      <div class="answer-box">{{ answer.answer }}</div>
      <div v-if="answer.data" class="data-grid">
        <div v-for="(v, k) in answer.data" :key="k" class="data-chip">
          <span class="data-chip-label">{{ k }}</span>
          <span class="data-chip-value">{{ typeof v === 'number' ? v.toLocaleString() : v }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const question = ref('')
const loading = ref(false)
const answer = ref<any>(null)
const hints = ['本周注册用户有多少', '本月收入情况', '图片生成统计']

async function ask() {
  const q = question.value.trim()
  if (!q || loading.value) return
  loading.value = true
  try {
    const res = await $fetch('/api/ai-assistant/data', { method: 'POST', body: { question: q } })
    answer.value = (res as any).data
  } catch { answer.value = { answer: '分析服务暂不可用，请稍后再试。' }
  } finally { loading.value = false }
}
</script>

<style scoped>
.hint-row { display: flex; gap: 8px; flex-wrap: wrap; }
.hint-chip { padding: 4px 12px; background: #ecf5ff; color: #409eff; border-radius: 20px; font-size: 13px; cursor: pointer; transition: background .2s; }
.hint-chip:hover { background: #d9ecff; }
.answer-box { font-size: 15px; line-height: 1.8; padding: 12px; background: #f0f9ff; border-radius: 8px; border-left: 3px solid #409eff; margin-bottom: 12px; }
.data-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.data-chip { padding: 8px 14px; background: #f5f7fa; border-radius: 8px; text-align: center; min-width: 100px; }
.data-chip-label { display: block; font-size: 12px; color: #909399; margin-bottom: 2px; }
.data-chip-value { font-size: 18px; font-weight: 700; color: #303133; }
</style>
