<template>
  <WorkLayout :title="$t('work_pages.shot_plan_title')" :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <h3>{{ $t('work_pages.shot_plan_input_title') }}</h3>
      <textarea v-model="productInfo" class="input-area" :placeholder="$t('work_pages.shot_plan_input_placeholder')" rows="5" maxlength="2000" />
      <div v-if="productInfo.trim()" class="quick-inputs">
        <button v-for="q in quickInputs" :key="q.label" class="quick-btn" @click="productInfo = q.text">{{ q.label }}</button>
      </div>
      <PromptEnhancer v-if="productInfo.trim()" mode="script" :initial-prompt="productInfo" @applied="(v) => productInfo = v" />
      <button v-if="productInfo.trim()" class="btn" @click="step = 1">{{ $t('work_pages.shot_plan_btn_next') }}</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.shot_plan_style_title') }}</h3>
      <div class="style-grid">
        <button v-for="s in styles" :key="s.id" class="style-card" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
          <span class="style-icon">{{ s.icon }}</span>
          <span>{{ s.name }}</span>
        </button>
      </div>
      <h4>{{ $t('work_pages.shot_plan_duration_title') }}</h4>
      <div class="dur-row">
        <button v-for="d in durations" :key="d" class="dur-btn" :class="{ active: selectedDuration === d }" @click="selectedDuration = d">{{ d }}s</button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.shot_plan_btn_back') }}</button>
        <button class="btn" @click="submitTask">{{ $t('work_pages.shot_plan_step_gen') }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.shot_plan_done_title') }}</h3>
        <div class="shot-output">
          <h4>{{ task.result.value?.title }}</h4>
          <p class="duration-total">{{ $t('work_pages.shot_plan_total_duration_prefix') }}{{ task.result.value?.totalDuration }}</p>
          <div class="shot-list">
            <div v-for="s in (task.result.value?.shots || [])" :key="s.id" class="shot-item">
              <div class="shot-header">
                <span class="shot-num">{{ $t('work_pages.shot_plan_shot_prefix') }}{{ s.id }}</span>
                <span class="shot-scene">{{ s.scene }}</span>
                <span class="shot-dur">{{ s.duration }}</span>
              </div>
              <p class="shot-text">{{ s.text }}</p>
              <div class="shot-tips">
                <span>🎥 {{ s.camera }}</span>
                <span>💡 {{ s.tip }}</span>
              </div>
            </div>
          </div>
          <div v-if="task.result.value?.tips" class="tips-box">
            <h5>{{ $t('work_pages.shot_plan_tips_title') }}</h5>
            <ul><li v-for="t in task.result.value.tips" :key="t">{{ t }}</li></ul>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">{{ $t('work_pages.shot_plan_btn_redo') }}</button>
          <button class="btn">{{ $t('work_pages.shot_plan_btn_copy') }}</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">{{ $t('work_pages.shot_plan_btn_retry') }}</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
import PromptEnhancer from '~/components/PromptEnhancer.vue'
const { t } = useI18n()


const steps = computed(() => [t('work_pages.shot_plan_step_product'), t('work_pages.shot_plan_step_style'), t('work_pages.shot_plan_step_gen')])
const step = ref(0);
const toast = useToast()
const productInfo = ref('');
const selectedStyle = ref('带货');
const selectedDuration = ref(30);
const task = useTask();

const styles = computed(() => [
  { id: '带货', name: t('work_pages.shot_plan_style_sales'), icon: '💰' },
  { id: '种草', name: t('work_pages.shot_plan_style_review'), icon: '🌱' },
  { id: '开箱', name: t('work_pages.shot_plan_style_unbox'), icon: '📦' },
  { id: '科普', name: t('work_pages.shot_plan_style_edu'), icon: '📚' },
]);
const durations = [15, 30, 60];

const quickInputs = computed(() => [
  { label: t('work_pages.shot_plan_quick_clothing'), text: '女士长袖衬衫，经典翻领设计，纯棉面料舒适透气，适合通勤穿搭' },
  { label: t('work_pages.shot_plan_quick_beauty'), text: '哑光唇釉，雾面质感不拔干，持久12小时不沾杯，6色可选' },
  { label: t('work_pages.shot_plan_quick_electronics'), text: '无线降噪耳机，40dB深度降噪，30h续航，快速充电10分钟用3小时' },
]);

async function submitTask() {
  step.value = 2;
  try {
    const res = await $fetch('/api/adv-video/shot-plan', {
      method: 'POST', credentials: 'include',
      body: { productInfo: productInfo.value, videoStyle: selectedStyle.value, totalDuration: selectedDuration.value },
    });
    task.pollTask((res as any).data.taskId, '/api/adv-video/tasks/');
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; productInfo.value = ''; }
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.shot-output h4 { font-size: 16px; margin-bottom: 4px; }
.duration-total { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.shot-item { border: 1px solid var(--border-light); border-radius: 8px; padding: 14px; margin-bottom: 10px; background: var(--bg-card); }
.shot-header { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.shot-num { background: var(--brand-gradient); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.shot-scene { font-weight: 600; font-size: 14px; }
.shot-dur { margin-left: auto; color: var(--text-muted); font-size: 12px; }
.shot-text { font-size: 13px; color: var(--text-primary); margin-bottom: 6px; }
.shot-tips { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); }
.tips-box { margin-top: 16px; background: var(--warning-light, #fffbe6); border: 1px solid var(--warning-border, #fef3c7); border-radius: 8px; padding: 12px; }
.tips-box h5 { font-size: 13px; margin-bottom: 6px; }
.tips-box ul { margin: 0; padding-left: 18px; font-size: 12px; color: var(--text-secondary); }
</style>
