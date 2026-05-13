<template>
  <Teleport to="body">
    <Transition name="onboard-fade">
      <div v-if="guide.isVisible.value" class="onboard-overlay" role="dialog" aria-label="新手指引" @click.self="guide.skip()">
        <div class="onboard-card" @click.stop>
          <div class="onboard-step">{{ guide.currentStep.value + 1 }} / {{ guide.steps.length }}</div>
          <div class="onboard-icon">{{ guide.steps[guide.currentStep.value]?.icon || '✨' }}</div>
          <h2 class="onboard-title">{{ guide.steps[guide.currentStep.value]?.title || '' }}</h2>
          <p class="onboard-desc">{{ guide.steps[guide.currentStep.value]?.desc || '' }}</p>
          <div class="onboard-dots">
            <span v-for="(_s, i) in guide.steps" :key="i" class="dot" :class="{ active: i <= guide.currentStep.value }" />
          </div>
          <div class="onboard-actions">
            <button class="btn-skip" @click="guide.skip()">跳过</button>
            <button v-if="guide.currentStep.value > 0" class="btn-secondary" @click="guide.prev()">上一步</button>
            <button class="btn-primary" @click="guide.next()">
              {{ guide.currentStep.value < guide.steps.length - 1 ? '下一步' : '开始使用' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useOnboarding } from '~/composables/useOnboarding'

const guide = useOnboarding()

onMounted(() => { guide.checkAndShow() })
</script>

<style scoped>
.onboard-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.onboard-card {
  background: var(--bg-card, #fff); border-radius: 20px; padding: 40px 36px 32px;
  max-width: 420px; width: 90vw; text-align: center;
  box-shadow: 0 24px 80px rgba(0,0,0,.25);
}
.onboard-step { font-size: 12px; color: var(--brand); font-weight: 600; margin-bottom: 16px; }
.onboard-icon { font-size: 48px; margin-bottom: 12px; }
.onboard-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.onboard-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.6; min-height: 48px; }
.onboard-dots { display: flex; justify-content: center; gap: 6px; margin: 20px 0 24px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-light); transition: background .3s, width .3s, border-radius .3s; }
.dot.active { background: var(--brand); width: 20px; border-radius: 4px; }
.onboard-actions { display: flex; justify-content: center; gap: 10px; }
.btn-primary {
  padding: 10px 28px; background: var(--brand); color: #fff; border: none;
  border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-secondary {
  padding: 10px 20px; background: var(--bg-secondary); color: var(--text-primary);
  border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 14px; cursor: pointer;
}
.btn-skip { padding: 10px 16px; background: transparent; color: var(--text-muted); border: none; font-size: 13px; cursor: pointer; }
.onboard-fade-enter-active, .onboard-fade-leave-active { transition: opacity .3s; }
.onboard-fade-enter-from, .onboard-fade-leave-to { opacity: 0; }
</style>
