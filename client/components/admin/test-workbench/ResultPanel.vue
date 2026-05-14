<template>
  <div v-if="lastResult && !running" class="tw-result" :class="{ error: lastResult.error }">
    <div class="result-header">
      <h3>
        <span v-if="lastResult.error">{{ $t('test_workbench.test_failed') }}</span>
        <span v-else>{{ $t('test_workbench.test_success') }}</span>
        <span class="result-meta">
          {{ lastResult.type }} · {{ formatDuration(lastResult.duration_ms) }}
          · {{ formatTime(lastResult.created_at) }}
        </span>
      </h3>
      <div class="result-actions">
        <button class="btn-mini" @click="$emit('copyResult')">{{ $t('test_workbench.copy_result') }}</button>
        <button class="btn-mini" @click="$emit('rerunLast')">{{ $t('test_workbench.rerun') }}</button>
      </div>
    </div>

    <!-- Compare mode -->
    <template v-if="lastResult.type === 'compare' && lastResult.comparisons">
      <div class="compare-grid">
        <div v-for="c in lastResult.comparisons" :key="c.model_key" class="compare-card">
          <div class="compare-label">{{ modelMap[c.model_key]?.name || c.model_key }}</div>
          <div class="compare-dur">{{ formatDuration(c.duration_ms) }}</div>
          <div v-if="c.success" class="compare-body">
            <pre class="result-json">{{ formatResult(c.result) }}</pre>
          </div>
          <div v-else class="compare-error">{{ c.error }}</div>
        </div>
      </div>
    </template>

    <!-- Custom pipeline -->
    <template v-else-if="lastResult.type === 'custom' && lastResult.steps">
      <div class="pipeline-steps">
        <div
          v-for="(step, i) in lastResult.steps"
          :key="i"
          :class="['pipeline-step', step.success ? 'step-ok' : 'step-fail']"
        >
          <div class="step-header">
            <span class="step-order">{{ $t('test_workbench.step_prefix') }}{{ step.order ?? Number(i) + 1 }}</span>
            <span class="step-model">{{ modelMap[step.model_key]?.name || step.model_key }}</span>
            <span class="step-dur">{{ formatDuration(step.duration_ms) }}</span>
            <span class="step-status">{{ step.success ? '✅' : '❌' }}</span>
          </div>
          <div v-if="step.success" class="step-body">
            <pre class="result-json">{{ formatResult(step.result) }}</pre>
          </div>
          <div v-else class="step-error">{{ step.error }}</div>
        </div>
      </div>
      <div v-if="lastResult.result" class="final-result">
        <h4>{{ $t('test_workbench.final_output') }}</h4>
        <pre class="result-json">{{ formatResult(lastResult.result) }}</pre>
      </div>
    </template>

    <!-- Single / Mixed -->
    <template v-else>
      <div class="result-meta-row">
        <span v-if="lastResult.model_key">{{ $t('test_workbench.model_label') }}{{ modelMap[lastResult.model_key]?.name || lastResult.model_key }}</span>
        <span v-if="lastResult.task_type">{{ $t('test_workbench.task_label') }}{{ lastResult.task_type }}</span>
      </div>
      <div v-if="lastResult.result" class="result-body">
        <pre class="result-json">{{ formatResult(lastResult.result) }}</pre>
      </div>
      <div v-if="lastResult.error" class="result-error-block">{{ lastResult.error }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  lastResult: any
  running: boolean
  modelMap: Record<string, any>
}>()

defineEmits<{
  'copyResult': []
  'rerunLast': []
}>()

const formatTime = (iso: string) => iso ? formatDateTime(iso, 'HH:mm:ss') : ''

function formatDuration(ms: number) {
  if (!ms) return '0ms'
  if (ms < 1000) return ms + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

function formatResult(r: any) {
  if (typeof r === 'string') return r
  return JSON.stringify(r, null, 2)
}
</script>

<style scoped>
.tw-result {
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px;
}
.tw-result.error { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.03); }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.result-header h3 { font-size: 16px; margin: 0; display: flex; align-items: center; gap: 10px; }
.result-meta { font-size: 12px; color: var(--text-muted); font-weight: 400; }
.result-actions { display: flex; gap: 6px; }
.result-meta-row { display: flex; gap: 20px; font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
.result-json {
  background: var(--bg-page); padding: 14px; border-radius: var(--radius-md);
  font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px;
  line-height: 1.6; overflow-x: auto; max-height: 500px; overflow-y: auto;
  white-space: pre-wrap; word-break: break-all; color: var(--text-primary);
}
.result-error-block {
  padding: 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--radius-md); color: var(--danger); font-size: 13px;
}
.compare-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
.compare-card { border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; }
.compare-label { padding: 8px 12px; background: var(--bg-page); font-weight: 600; font-size: 13px; }
.compare-dur { font-size: 11px; color: var(--text-muted); padding: 0 12px; }
.compare-body { padding: 0 12px 12px; }
.compare-body pre { max-height: 300px; margin: 0; }
.compare-error { padding: 16px; color: var(--danger); font-size: 13px; }
.pipeline-steps { display: flex; flex-direction: column; gap: 10px; }
.pipeline-step { border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; }
.pipeline-step.step-ok { border-left: 3px solid #22c55e; }
.pipeline-step.step-fail { border-left: 3px solid #ef4444; }
.step-header { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--bg-page); font-size: 12px; }
.step-order { font-weight: 700; color: var(--brand); }
.step-model { font-weight: 600; }
.step-dur { color: var(--text-muted); margin-left: auto; }
.step-body, .step-error { padding: 10px 12px; }
.step-body pre { max-height: 250px; margin: 0; }
.step-error { color: var(--danger); font-size: 12px; }
.final-result { margin-top: 14px; padding: 14px; background: rgba(124,58,237,0.05); border: 1px solid rgba(124,58,237,0.2); border-radius: var(--radius-md); }
.final-result h4 { margin: 0 0 8px; font-size: 14px; }
</style>
