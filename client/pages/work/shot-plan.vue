<template>
  <WorkLayout :steps="['输入产品', '选风格', '生成分镜']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <h3>输入产品信息</h3>
      <textarea v-model="productInfo" class="input-area" placeholder="描述你的产品和拍摄需求...&#10;&#10;如：女士长袖衬衫，经典翻领设计，纯棉面料舒适透气，适合通勤穿搭" rows="5" />
      <div class="quick-inputs">
        <button v-for="q in quickInputs" :key="q.label" class="quick-btn" @click="productInfo = q.text">{{ q.label }}</button>
      </div>
      <button v-if="productInfo.trim()" class="btn" @click="step = 1">下一步：选风格</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择视频风格</h3>
      <div class="style-grid">
        <button v-for="s in styles" :key="s.id" class="style-card" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
          <span class="style-icon">{{ s.icon }}</span>
          <span>{{ s.name }}</span>
        </button>
      </div>
      <h4>视频时长</h4>
      <div class="dur-row">
        <button v-for="d in durations" :key="d" class="dur-btn" :class="{ active: selectedDuration === d }" @click="selectedDuration = d">{{ d }}s</button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">生成分镜</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>分镜脚本</h3>
        <div class="shot-output">
          <h4>{{ task.result.value?.title }}</h4>
          <p class="duration-total">总时长：{{ task.result.value?.totalDuration }}</p>
          <div class="shot-list">
            <div v-for="s in (task.result.value?.shots || [])" :key="s.id" class="shot-item">
              <div class="shot-header">
                <span class="shot-num">镜{{ s.id }}</span>
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
            <h5>拍摄建议</h5>
            <ul><li v-for="t in task.result.value.tips" :key="t">{{ t }}</li></ul>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">再生成</button>
          <button class="btn">复制分镜</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const step = ref(0);
const productInfo = ref('');
const selectedStyle = ref('带货');
const selectedDuration = ref(30);
const task = useTask();

const styles = [
  { id: '带货', name: '带货转化', icon: '💰' },
  { id: '种草', name: '种草测评', icon: '🌱' },
  { id: '开箱', name: '开箱体验', icon: '📦' },
  { id: '科普', name: '科普干货', icon: '📚' },
];
const durations = [15, 30, 60];

const quickInputs = [
  { label: '服装', text: '女士长袖衬衫，经典翻领设计，纯棉面料舒适透气，适合通勤穿搭' },
  { label: '美妆', text: '哑光唇釉，雾面质感不拔干，持久12小时不沾杯，6色可选' },
  { label: '电子', text: '无线降噪耳机，40dB深度降噪，30h续航，快速充电10分钟用3小时' },
];

async function submitTask() {
  step.value = 2;
  try {
    const res = await $fetch('/api/adv-video/shot-plan', {
      method: 'POST', credentials: 'include',
      body: { productInfo: productInfo.value, videoStyle: selectedStyle.value, totalDuration: selectedDuration.value },
    });
    task.pollTask((res as any).data.taskId, '/api/adv-video/tasks/');
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; productInfo.value = ''; }
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
