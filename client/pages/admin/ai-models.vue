<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>AI 模型监控</h1>
        <button class="refresh-btn" :class="{ spinning: loading }" :disabled="loading" @click="fetchStatus">↻ 刷新</button>
      </div>

      <div v-if="loading" class="stats-grid">
        <div v-for="i in 4" :key="i" class="stat-card-skel pulse" />
      </div>

      <div v-else-if="error" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="retry-btn" @click="fetchStatus">重试</button>
      </div>

      <template v-else>
        <div class="stats-grid">
          <div v-for="(m, key) in models" :key="key" class="stat-card" :class="{ 'card-warn': m.state === 'open' }">
            <div class="card-top">
              <span class="model-name">{{ m.name }}</span>
              <span class="model-category">{{ categoryLabel(m.category) }}</span>
            </div>
            <div class="card-mid">
              <span :class="['breaker-badge', m.state]">{{ stateLabel(m.state) }}</span>
              <span v-if="m.failedCount > 0" class="fail-count">失败 {{ m.failedCount }} 次</span>
            </div>
            <div class="card-actions">
              <button
                class="btn-sm"
                :disabled="m.state === 'closed'"
                @click="resetBreaker(key)"
              >
                重置熔断器
              </button>
            </div>
          </div>
        </div>

        <div class="info-box">
          <h3>熔断器状态说明</h3>
          <div class="legend">
            <span><span class="dot closed" /> 正常 (closed) — 请求正常通过</span>
            <span><span class="dot open" /> 熔断 (open) — 60秒冷却，拒绝请求</span>
            <span><span class="dot half-open" /> 半开 (half-open) — 试探性恢复中</span>
            <span><span class="dot unknown" /> 未知 (unknown) — 未初始化</span>
          </div>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const toast = useToast()
const loading = ref(true)
const error = ref('')
const models = ref<Record<string, any>>({})

const categoryLabel = (c: string) =>
  ({ video: '视频', image: '图片', text: '文本', custom: '自定义' })[c] || c

const stateLabel = (s: string) =>
  ({ closed: '正常', open: '已熔断', 'half-open': '半开恢复', unknown: '未初始化' })[s] || s

async function fetchStatus() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch('/api/admin/models/status', { credentials: 'include' })
    const d = (data as any)
    if (d?.code === 200) {
      models.value = d.data || {}
    } else {
      error.value = d?.msg || '获取模型状态失败'
    }
  } catch (e: any) {
    error.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}

async function resetBreaker(modelId: string) {
  try {
    await $fetch('/api/admin/models/reset-breaker', {
      method: 'POST',
      body: { model_id: modelId },
    })
    await fetchStatus()
  } catch (e: any) {
    toast.error('重置失败: ' + (e.message || '网络错误'))
  }
}

onMounted(fetchStatus)
</script>

<style scoped>
.admin-page { max-width: 1100px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.page-header h1 { font-size: 20px; font-weight: 700; color: var(--cfg-text-primary, #1a1a2e); }
.refresh-btn {
  padding: 8px 16px; border: 1px solid var(--cfg-border, #e2e8f0); border-radius: 8px;
  background: var(--cfg-bg-secondary, #fff); color: var(--cfg-text-secondary, #64748b);
  cursor: pointer; font-size: 13px; transition: all 0.2s;
}
.refresh-btn:hover { border-color: var(--cfg-primary, #3B82F6); color: var(--cfg-primary, #3B82F6); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-btn.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }

.stat-card {
  background: var(--cfg-bg-secondary, #fff); border: 1px solid var(--cfg-border, #e2e8f0);
  border-radius: 12px; padding: 20px;
}
.stat-card.card-warn { border-color: #F59E0B; background: #FFFBEB; }

.stat-card-skel { height: 130px; background: var(--cfg-bg-secondary, #fff); border: 1px solid var(--cfg-border, #e2e8f0); border-radius: 12px; }

.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.model-name { font-size: 16px; font-weight: 600; color: var(--cfg-text-primary, #1a1a2e); }
.model-category {
  font-size: 11px; padding: 2px 8px; border-radius: 4px;
  background: var(--cfg-bg-tertiary, #f1f5f9); color: var(--cfg-text-secondary, #64748b);
}

.card-mid { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.breaker-badge {
  font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 20px;
}
.breaker-badge.closed { background: #DCFCE7; color: #16A34A; }
.breaker-badge.open { background: #FEE2E2; color: #DC2626; }
.breaker-badge.half-open { background: #FEF3C7; color: #D97706; }
.breaker-badge.unknown { background: #F1F5F9; color: #94A3B8; }
.fail-count { font-size: 12px; color: #DC2626; }

.card-actions { display: flex; gap: 8px; }
.btn-sm {
  padding: 6px 12px; font-size: 12px; border: 1px solid var(--cfg-border, #e2e8f0);
  border-radius: 6px; background: var(--cfg-bg-secondary, #fff); color: var(--cfg-primary, #3B82F6);
  cursor: pointer; transition: all 0.2s;
}
.btn-sm:hover:not(:disabled) { background: var(--cfg-primary, #3B82F6); color: #fff; border-color: var(--cfg-primary, #3B82F6); }
.btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

.info-box {
  background: var(--cfg-bg-secondary, #fff); border: 1px solid var(--cfg-border, #e2e8f0);
  border-radius: 12px; padding: 20px;
}
.info-box h3 { font-size: 14px; font-weight: 600; color: var(--cfg-text-primary, #1a1a2e); margin: 0 0 12px 0; }
.legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--cfg-text-secondary, #64748b); }
.legend span { display: flex; align-items: center; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.closed { background: #16A34A; }
.dot.open { background: #DC2626; }
.dot.half-open { background: #D97706; }
.dot.unknown { background: #94A3B8; }

.error-state { text-align: center; padding: 60px 20px; color: var(--cfg-text-secondary, #64748b); }
.error-icon { font-size: 32px; }
.error-state p { margin: 12px 0; }
.retry-btn {
  padding: 8px 20px; border: none; border-radius: 8px; background: var(--cfg-primary, #3B82F6);
  color: #fff; cursor: pointer; font-size: 14px;
}

.pulse { animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
