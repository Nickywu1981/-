<template>
  <div class="progress-stepper" v-if="visible">
    <div class="steps">
      <div
        v-for="(step, i) in steps"
        :key="i"
        class="step"
        :class="{
          done: i < currentStep,
          active: i === currentStep,
          pending: i > currentStep,
          failed: i === currentStep && hasError,
        }"
      >
        <div class="step-indicator">
          <span v-if="i < currentStep" class="check">✓</span>
          <span v-else-if="i === currentStep && hasError" class="cross">✕</span>
          <span v-else-if="i === currentStep && !hasError" class="spinner" />
          <span v-else class="num">{{ i + 1 }}</span>
        </div>
        <div class="step-content">
          <span class="step-label">{{ step.label }}</span>
          <span class="step-hint" v-if="i === currentStep && step.hint">{{ step.hint }}</span>
          <span class="step-hint error" v-if="i === currentStep && hasError && errorMsg">{{ errorMsg }}</span>
        </div>
        <div class="step-line" v-if="i < steps.length - 1" :class="{ filled: i < currentStep }" />
      </div>
    </div>
    <div class="progress-bar-wrap" v-if="showPercent">
      <div class="progress-bar">
        <div class="bar-fill" :style="{ width: percent + '%' }" :class="{ error: hasError }" />
      </div>
      <span class="percent-text">{{ percent }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Step {
  label: string
  hint?: string
}

const props = withDefaults(defineProps<{
  steps: Step[]
  currentStep?: number
  hasError?: boolean
  errorMsg?: string
  visible?: boolean
  showPercent?: boolean
}>(), {
  currentStep: 0,
  hasError: false,
  errorMsg: '',
  visible: true,
  showPercent: true,
})

const percent = computed(() => {
  if (!props.steps.length) return 0
  return Math.round((props.currentStep / (props.steps.length - 1)) * 100)
})
</script>

<style scoped>
.progress-stepper { padding: 20px 0; }
.steps { display: flex; align-items: flex-start; gap: 0; }
.step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; text-align: center; min-width: 0; }
.step-indicator { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; transition: all 0.3s ease; flex-shrink: 0; }
.step.pending .step-indicator { background: var(--bg-secondary); color: var(--text-muted); border: 2px solid var(--border-light); }
.step.active .step-indicator { background: var(--brand); color: #fff; border: 2px solid var(--brand); box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15); }
.step.done .step-indicator { background: #22C55E; color: #fff; border: 2px solid #22C55E; }
.step.failed .step-indicator { background: #EF4444; color: #fff; border: 2px solid #EF4444; }
.check, .cross { font-size: 14px; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.num { font-size: 12px; }

.step-content { margin-top: 8px; }
.step-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); display: block; }
.step.active .step-label { color: var(--text-primary); font-weight: 600; }
.step.done .step-label { color: #22C55E; }
.step.failed .step-label { color: #EF4444; }
.step-hint { font-size: 11px; color: var(--text-muted); display: block; margin-top: 2px; }
.step-hint.error { color: #EF4444; }

.step-line { position: absolute; top: 16px; left: calc(50% + 20px); width: calc(100% - 40px); height: 2px; background: var(--border-light); z-index: 0; }
.step-line.filled { background: #22C55E; }

.progress-bar-wrap { display: flex; align-items: center; gap: 10px; margin-top: 20px; }
.progress-bar { flex: 1; height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--brand); border-radius: 3px; transition: width 0.4s ease; }
.bar-fill.error { background: #EF4444; }
.percent-text { font-size: 12px; font-weight: 600; color: var(--text-secondary); min-width: 36px; text-align: right; }

@media (max-width: 480px) {
  .step-label { font-size: 10px; }
  .step-indicator { width: 26px; height: 26px; font-size: 11px; }
  .step-line { top: 13px; left: calc(50% + 16px); width: calc(100% - 32px); }
}
</style>
