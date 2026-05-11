<template>
  <AdminLayout>
    <div class="page">
      <div class="page-header">
        <h1>知识库管理</h1>
        <p>管理 Movio AI 项目知识库，支持语义搜索和 LLM RAG 检索</p>
      </div>

      <!-- KB 状态卡片 -->
      <div class="stats-grid" v-if="status">
        <div class="stat-card">
          <div class="stat-value">{{ status.vectorStore?.chunks || 0 }}</div>
          <div class="stat-label">知识块</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ status.vectorStore?.dimension || 0 }}</div>
          <div class="stat-label">向量维度</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ status.vectorStore?.model || 'none' }}</div>
          <div class="stat-label">模型</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ status.tokenIndex?.tokens || 0 }}</div>
          <div class="stat-label">索引令牌</div>
        </div>
      </div>

      <!-- 搜索测试 -->
      <div class="search-section">
        <h3>RAG 检索测试</h3>
        <div class="search-bar">
          <input v-model="query" class="input" placeholder="输入查询文本，如「编码规范」「用户认证流程」" @keyup.enter="search" />
          <button class="btn btn-primary" :disabled="searching" @click="search">{{ searching ? '搜索中...' : '搜索' }}</button>
        </div>

        <div v-if="searchError" class="error">{{ searchError }}</div>

        <div v-if="ragResult" class="search-results">
          <div class="result-meta">
            共 {{ ragResult.totalChunks }} 块中命中 {{ ragResult.hitCount }} 条 · 模型: {{ ragResult.model }}
          </div>
          <div v-if="ragResult.context" class="context-block">
            <pre>{{ ragResult.context }}</pre>
          </div>
          <div v-if="ragResult.sources?.length" class="sources">
            <strong>来源文件:</strong>
            <ul><li v-for="s in ragResult.sources" :key="s">{{ s }}</li></ul>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
const toast = useToast();
const query = ref('');
const searching = ref(false);
const searchError = ref('');
const status = ref<any>(null);
const ragResult = ref<any>(null);

async function fetchStatus() {
  try {
    const data: any = await $fetch('/api/sdk/memory/status', { credentials: 'include' });
    status.value = data.data || data;
  } catch { /* non-critical */ }
}

async function search() {
  if (!query.value.trim()) return;
  searching.value = true;
  searchError.value = '';
  ragResult.value = null;
  try {
    const data: any = await $fetch('/api/sdk/memory/rag', {
      method: 'POST', credentials: 'include',
      body: { query: query.value.trim(), topK: 5 },
    });
    ragResult.value = data.data || data;
  } catch (e: any) {
    searchError.value = e?.data?.msg || e.message || '搜索失败';
  } finally { searching.value = false; }
}

onMounted(fetchStatus);
</script>

<style scoped>
.page { max-width: 960px; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--text-secondary); margin: 0; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--brand); }
.stat-label { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.search-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; }
.search-section h3 { margin: 0 0 12px; font-size: 16px; }
.search-bar { display: flex; gap: 8px; }
.search-bar .input { flex: 1; }
.search-results { margin-top: 16px; }
.result-meta { font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px; }
.context-block { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; max-height: 400px; overflow: auto; }
.context-block pre { margin: 0; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: var(--text-primary); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.sources { margin-top: 12px; font-size: 12px; color: var(--text-secondary); }
.sources ul { margin: 4px 0 0; padding-left: 18px; }
.sources li { margin: 2px 0; }
.error { color: var(--danger); font-size: 13px; margin-top: 8px; }
.input { padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text-primary); font-size: 14px; box-sizing: border-box; }
.input:focus { border-color: var(--brand); outline: none; }
.btn { padding: 6px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.btn-primary:hover { background: var(--brand-dark); color: #fff; }
</style>
