<template>
  <div class="admin-workflow-config">
    <header class="page-header">
      <h1>工作流配置管理</h1>
      <p>7条固定工作流 — 步骤开关/模型绑定/参数调整/双模式切换</p>
    </header>

    <!-- 工作流列表 -->
    <div class="workflow-grid">
      <div v-for="wf in workflows" :key="wf.id" class="wf-card" :class="{ selected: selectedWf?.id === wf.id }" @click="selectWorkflow(wf.id)">
        <h3>{{ wf.name }}</h3>
        <p>{{ wf.description }}</p>
        <div class="wf-meta">
          <span>{{ wf.stepsCount }} 步骤</span>
          <span>{{ wf.requiredSteps }} 必填</span>
          <span class="cat-tag">{{ wf.category }}</span>
        </div>
      </div>
    </div>

    <!-- 步骤配置详情 -->
    <div v-if="selectedWf" class="wf-detail">
      <div class="detail-header">
        <h2>{{ selectedWf.name }} — 步骤配置</h2>
        <div class="mode-switch">
          <label>运行模式：</label>
          <select v-model="wfMode">
            <option value="auto">智能自动</option>
            <option value="custom">自定义</option>
          </select>
        </div>
      </div>

      <!-- 强制规则提示 -->
      <div v-if="selectedWf.forceVideoRule" class="rule-alert">
        视频铁则：必须先脚本→分镜→再合成视频，禁止跳过
      </div>

      <!-- 步骤列表 -->
      <div class="steps-list">
        <div v-for="step in selectedWf.steps" :key="step.key" class="step-row" :class="{ disabled: !step.enabled, required: step.required }">
          <div class="step-order">{{ step.order }}</div>
          <div class="step-info">
            <div class="step-label">
              {{ step.label }}
              <span v-if="step.required" class="required-badge">必填</span>
              <span v-if="!step.required" class="optional-badge">可选</span>
            </div>
            <div class="step-meta">{{ step.category }} / {{ step.taskType }}</div>
          </div>
          <div class="step-controls">
            <!-- 开关 -->
            <label class="toggle" v-if="!step.required">
              <input type="checkbox" v-model="step.enabled" @change="saveConfig" />
              <span class="toggle-slider"></span>
              {{ step.enabled ? '开启' : '关闭' }}
            </label>

            <!-- 模型绑定(仅自定义模式) -->
            <select
              v-if="step.allowModel && wfMode === 'custom'"
              v-model="modelBindings[step.key]"
              @change="saveConfig"
              class="model-select"
            >
              <option value="auto">自动选择</option>
              <optgroup :label="cat.label" v-for="cat in categories" :key="cat.key">
                <option v-for="m in getModelsByCategory(cat.key)" :key="m.model_key" :value="m.model_key">
                  {{ m.display_name }} ({{ m.vendor }})
                </option>
              </optgroup>
            </select>

            <!-- 自动模式显示 -->
            <span v-if="step.allowModel && wfMode === 'auto'" class="auto-model-hint">
              自动: {{ getAutoModelForStep(step) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 参数配置 -->
      <div class="params-section">
        <h3>默认参数</h3>
        <div class="params-grid">
          <div class="param">
            <label>行业</label>
            <select v-model="params.industry" @change="saveConfig">
              <option value="">自动检测</option>
              <option v-for="ind in industries" :key="ind.key" :value="ind.key">{{ ind.label }}</option>
            </select>
          </div>
          <div class="param">
            <label>风格</label>
            <select v-model="params.style" @change="saveConfig">
              <option v-for="s in styles" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
          <div v-if="isVideoWf" class="param">
            <label>视频时长(秒)</label>
            <select v-model="params.videoDuration" @change="saveConfig">
              <option :value="15">15s</option><option :value="30">30s</option><option :value="60">60s</option>
            </select>
          </div>
          <div v-if="isVideoWf" class="param">
            <label>分镜数量</label>
            <select v-model="params.storyboardCount" @change="saveConfig">
              <option :value="5">5</option><option :value="6">6</option><option :value="7">7</option><option :value="8">8</option>
            </select>
          </div>
          <div v-if="isVoiceWf" class="param">
            <label>配音音色</label>
            <select v-model="params.voice" @change="saveConfig">
              <option value="zh-CN-XiaoxiaoNeural">晓晓(女)</option>
              <option value="zh-CN-YunxiNeural">云希(男)</option>
            </select>
          </div>
        </div>
      </div>

      <button class="btn-save" @click="saveConfig">保存配置</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';

const workflows = ref([]);
const selectedWf = ref(null);
const wfMode = ref('auto');
const modelPool = ref([]);
const modelBindings = reactive({});
const params = reactive({ industry: '', style: 'professional', videoDuration: 30, storyboardCount: 6, voice: 'zh-CN-XiaoxiaoNeural' });

const categories = [
  { key: 'image', label: '文生图' }, { key: 'video', label: '文生视频' },
  { key: 'text', label: '大语言模型' }, { key: 'voice', label: '语音合成' }, { key: 'audio', label: '音频处理' },
];
const industries = [
  { key: 'clothing', label: '服装' }, { key: 'beauty', label: '美妆' },
  { key: '3c_digital', label: '3C数码' }, { key: 'food', label: '食品' }, { key: 'home', label: '家居' },
];
const styles = [
  { key: 'professional', label: '专业商务' }, { key: 'minimalist', label: '极简风' },
  { key: 'lifestyle', label: '生活方式' }, { key: 'trendy', label: '潮流时尚' },
];

const isVideoWf = computed(() => selectedWf.value?.category === 'video' || selectedWf.value?.id === 'white_bg_full');
const isVoiceWf = computed(() => selectedWf.value?.category === 'voice');

function getModelsByCategory(cat) { return modelPool.value.filter(m => m.category === cat && m.enabled === 1); }
function getAutoModelForStep(step) {
  const models = modelPool.value.filter(m => m.category === step.category && m.enabled === 1);
  const best = models.sort((a, b) => (b.pool_weight || 1) - (a.pool_weight || 1))[0];
  return best?.display_name || '无可用模型';
}

async function selectWorkflow(id) {
  try {
    const res = await $fetch(`/api/workflow/definition/${id}`);
    if (res?.data) {
      selectedWf.value = res.data;
      wfMode.value = res.data.mode || 'auto';
    }
    // 加载模型池
    const poolRes = await $fetch('/api/admin/model-pool');
    if (poolRes?.data) modelPool.value = poolRes.data;
  } catch (e) { /* ignore */ }
}

async function saveConfig() {
  if (!selectedWf.value) return;
  try {
    await $fetch(`/api/workflow/definition/${selectedWf.value.id}/config`, {
      method: 'PUT',
      body: {
        mode: wfMode.value,
        disabledSteps: selectedWf.value.steps.filter(s => !s.enabled).map(s => s.key),
        modelBindings: Object.fromEntries(Object.entries(modelBindings).filter(([, v]) => v !== 'auto')),
        params: { ...params },
      },
    });
    alert('配置已保存');
  } catch (e) {
    alert('保存失败: ' + (e.message || '未知错误'));
  }
}

onMounted(async () => {
  try {
    const res = await $fetch('/api/workflow/definitions');
    if (res?.data) workflows.value = res.data;
  } catch {}
});
</script>

<style scoped>
.admin-workflow-config { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header h1 { font-size: 24px; margin: 0; }
.page-header p { color: #666; margin-top: 4px; }

.workflow-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-top: 20px; }
.wf-card { background: #fff; border-radius: 8px; padding: 16px; cursor: pointer; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.wf-card:hover { border-color: #1a73e8; }
.wf-card.selected { border-color: #1a73e8; background: #f0f7ff; }
.wf-card h3 { margin: 0 0 8px; font-size: 16px; }
.wf-card p { font-size: 13px; color: #666; margin: 0 0 8px; }
.wf-meta { display: flex; gap: 12px; font-size: 12px; color: #999; }
.cat-tag { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; }

.wf-detail { margin-top: 24px; background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.detail-header h2 { margin: 0; font-size: 18px; }
.mode-switch select { padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; }

.rule-alert { background: #fff3cd; padding: 10px 16px; border-radius: 6px; font-size: 13px; color: #856404; margin-bottom: 16px; }

.steps-list { display: flex; flex-direction: column; gap: 8px; }
.step-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: #fafafa; border: 1px solid #eee; }
.step-row.required { border-left: 3px solid #e53e3e; }
.step-row.disabled { opacity: 0.4; }
.step-order { width: 28px; height: 28px; border-radius: 50%; background: #1a73e8; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.step-info { flex: 1; }
.step-label { font-size: 14px; font-weight: 500; }
.step-meta { font-size: 12px; color: #999; }
.required-badge { background: #fce4ec; color: #c62828; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 6px; }
.optional-badge { background: #e8f5e9; color: #2e7d32; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 6px; }
.step-controls { display: flex; align-items: center; gap: 12px; }

.toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
.toggle-slider { width: 32px; height: 16px; background: #ccc; border-radius: 8px; position: relative; }
.toggle input:checked + .toggle-slider { background: #4caf50; }

.model-select { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; width: 180px; }
.auto-model-hint { font-size: 11px; color: #1a73e8; }

.params-section { margin-top: 24px; }
.params-section h3 { font-size: 16px; margin-bottom: 12px; }
.params-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.param label { display: block; font-size: 13px; margin-bottom: 4px; }
.param select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; }

.btn-save { margin-top: 24px; padding: 10px 24px; background: #1a73e8; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
</style>
