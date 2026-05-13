<template>
  <div class="ecommerce-workbench">
    <!-- 顶部标题栏 -->
    <header class="workbench-header">
      <h1>{{ $t('ecommerce.title') }}</h1>
      <p class="subtitle">{{ $t('ecommerce.subtitle') }}</p>
    </header>

    <div class="workbench-layout">
      <!-- 左侧：输入面板 -->
      <aside class="input-panel">
        <div class="panel-section">
          <h3>{{ $t('ecommerce.input.title') }}</h3>

          <!-- 需求输入 -->
          <div class="form-group">
            <label>{{ $t('ecommerce.input.requirement') }} <span class="required">*</span></label>
            <textarea
              v-model="form.userInput"
              :placeholder="$t('ecommerce.input.placeholder')"
              rows="4"
              maxlength="2000"
            ></textarea>
            <span class="char-count">{{ form.userInput.length }}/2000</span>
          </div>

          <!-- 商品名称 -->
          <div class="form-group">
            <label>{{ $t('ecommerce.input.productName') }}</label>
            <input v-model="form.productName" :placeholder="$t('ecommerce.input.productNameHint')" />
          </div>

          <!-- 上传参考 -->
          <div class="form-group">
            <label>{{ $t('ecommerce.input.reference') }}</label>
            <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
              <input ref="fileInput" type="file" accept="image/*,video/*" hidden @change="handleFileChange" />
              <div v-if="!uploadedFile" class="upload-placeholder">
                <span class="upload-icon">+</span>
                <span>{{ $t('ecommerce.input.uploadHint') }}</span>
              </div>
              <div v-else class="uploaded-preview">
                <img v-if="uploadedFile.type === 'image'" :src="uploadedFile.url" alt="preview" />
                <video v-else :src="uploadedFile.url" controls></video>
                <button class="remove-btn" @click.stop="clearUpload">x</button>
              </div>
            </div>
          </div>

          <!-- 配置选项 -->
          <div class="form-row">
            <div class="form-group half">
              <label>{{ $t('ecommerce.config.platform') }}</label>
              <select v-model="form.platform">
                <option v-for="p in config.platforms" :key="p.key" :value="p.key">{{ p.label }}</option>
              </select>
            </div>
            <div class="form-group half">
              <label>{{ $t('ecommerce.config.industry') }}</label>
              <select v-model="form.industry">
                <option value="">{{ $t('ecommerce.config.autoDetect') }}</option>
                <option v-for="ind in config.industries" :key="ind.key" :value="ind.key">{{ ind.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label>{{ $t('ecommerce.config.style') }}</label>
              <select v-model="form.style">
                <option v-for="s in config.styles" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </div>
            <div class="form-group half">
              <label>{{ $t('ecommerce.config.voice') }}</label>
              <select v-model="form.needsVoice">
                <option :value="false">{{ $t('ecommerce.config.voiceOff') }}</option>
                <option :value="true">{{ $t('ecommerce.config.voiceOn') }}</option>
              </select>
            </div>
          </div>

          <!-- 高级选项 -->
          <details class="advanced-options">
            <summary>{{ $t('ecommerce.config.advanced') }}</summary>
            <div class="form-group">
              <label>{{ $t('ecommerce.config.videoDuration') }}</label>
              <select v-model="form.videoDuration">
                <option v-for="d in config.videoDurations" :key="d" :value="d">{{ d }}{{ $t('common.seconds') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ $t('ecommerce.config.storyboardCount') }}</label>
              <select v-model="form.storyboardCount">
                <option v-for="c in config.storyboardCounts" :key="c" :value="c">{{ c }} {{ $t('ecommerce.config.scenes') }}</option>
              </select>
            </div>
          </details>
        </div>

        <!-- 生成按钮 -->
        <button
          class="generate-btn"
          :disabled="!form.userInput.trim() || generating"
          @click="startGeneration"
        >
          <span v-if="generating" class="spinner"></span>
          {{ generating ? $t('ecommerce.generating') : $t('ecommerce.generate') }}
        </button>

        <!-- 意图显示 -->
        <div v-if="detectedIntent" class="intent-badge">
          {{ $t('ecommerce.intent.detected') }}: {{ detectedIntent }}
        </div>
      </aside>

      <!-- 右侧：结果面板 -->
      <main class="result-panel">
        <!-- 空状态 -->
        <div v-if="!pipelineResult && !generating" class="empty-state">
          <div class="empty-icon">AI</div>
          <h3>{{ $t('ecommerce.empty.title') }}</h3>
          <p>{{ $t('ecommerce.empty.description') }}</p>
          <div class="pipeline-flow">
            <div class="flow-step">{{ $t('ecommerce.flow.intent') }}</div>
            <span class="flow-arrow">→</span>
            <div class="flow-step">{{ $t('ecommerce.flow.compliance') }}</div>
            <span class="flow-arrow">→</span>
            <div class="flow-step">{{ $t('ecommerce.flow.expand') }}</div>
            <span class="flow-arrow">→</span>
            <div class="flow-step">{{ $t('ecommerce.flow.detail') }}</div>
            <span class="flow-arrow">→</span>
            <div class="flow-step">{{ $t('ecommerce.flow.storyboard') }}</div>
            <span class="flow-arrow">→</span>
            <div class="flow-step">{{ $t('ecommerce.flow.dispatch') }}</div>
          </div>
        </div>

        <!-- 生成中 -->
        <div v-if="generating" class="generating-state">
          <div class="pipeline-animation">
            <div
              v-for="(step, idx) in pipelineSteps"
              :key="step.key"
              class="pipeline-step"
              :class="{ active: idx <= currentStep, done: idx < currentStep }"
            >
              <div class="step-icon">{{ step.icon }}</div>
              <span>{{ step.label }}</span>
              <div v-if="idx < currentStep" class="check-mark">OK</div>
              <div v-else-if="idx === currentStep" class="loading-dot"></div>
            </div>
          </div>
        </div>

        <!-- 结果展示 -->
        <div v-if="pipelineResult" class="result-content">
          <!-- 意图+合规状态 -->
          <div class="result-meta">
            <span class="tag intent-tag">{{ pipelineResult.intent?.label }}</span>
            <span class="tag compliance-tag ok">{{ $t('ecommerce.compliance.passed') }}</span>
            <span class="tag pipeline-tag">{{ pipelineResult.pipeline }}</span>
          </div>

          <!-- Tab切换 -->
          <div class="result-tabs">
            <button
              v-for="tab in resultTabs"
              :key="tab.key"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >{{ tab.label }}</button>
          </div>

          <!-- 素材图片 -->
          <div v-if="activeTab === 'materials'" class="tab-content">
            <div v-if="pipelineResult.materials?.allUrls?.length" class="image-grid">
              <div v-for="(img, idx) in pipelineResult.materials.allUrls" :key="idx" class="image-card">
                <img :src="img.url" :alt="img.label" loading="lazy" />
                <div class="image-label">{{ img.type }}: {{ img.label || '' }}</div>
                <div class="image-actions">
                  <button @click="retouchImage(img, idx)">{{ $t('ecommerce.actions.retouch') }}</button>
                  <button @click="regenerateImage(img)">{{ $t('ecommerce.actions.regenerate') }}</button>
                </div>
              </div>
            </div>
            <div v-else class="empty-tab">{{ $t('ecommerce.empty.noMaterials') }}</div>
          </div>

          <!-- 详情页 -->
          <div v-if="activeTab === 'detail'" class="tab-content">
            <div v-if="pipelineResult.detailPage?.modules?.length" class="image-grid">
              <div v-for="mod in pipelineResult.detailPage.modules" :key="mod.key" class="image-card">
                <img v-if="mod.url" :src="mod.url" :alt="mod.name" loading="lazy" />
                <div class="image-label">{{ mod.name }}</div>
              </div>
            </div>
            <div v-if="pipelineResult.detailPage?.sellingPoints?.length" class="selling-points">
              <h4>{{ $t('ecommerce.sellingPoints') }}</h4>
              <ul>
                <li v-for="(sp, idx) in pipelineResult.detailPage.sellingPoints" :key="idx">{{ sp }}</li>
              </ul>
            </div>
          </div>

          <!-- 脚本分镜 -->
          <div v-if="activeTab === 'storyboard'" class="tab-content">
            <div v-if="pipelineResult.scriptStoryboard?.summary" class="script-summary">
              <div class="viral-formula" v-if="pipelineResult.scriptStoryboard.viralFormula">
                <strong>{{ $t('ecommerce.viralFormula') }}:</strong> {{ pipelineResult.scriptStoryboard.viralFormula }}
              </div>
              <div class="script-title" v-if="pipelineResult.scriptStoryboard.script?.title">
                <strong>{{ $t('ecommerce.scriptTitle') }}:</strong> {{ pipelineResult.scriptStoryboard.script.title }}
              </div>
              <div class="hook-box" v-if="pipelineResult.scriptStoryboard.script?.hook">
                <strong>{{ $t('ecommerce.hook') }} (0-3s):</strong> {{ pipelineResult.scriptStoryboard.script.hook.script }}
              </div>
            </div>
            <div v-if="pipelineResult.scriptStoryboard?.storyboardFrames?.length" class="image-grid">
              <div v-for="frame in pipelineResult.scriptStoryboard.storyboardFrames" :key="frame.sceneNumber" class="image-card">
                <img v-if="frame.url" :src="frame.url" :alt="`Scene ${frame.sceneNumber}`" loading="lazy" />
                <div class="image-label">Scene {{ frame.sceneNumber }}: {{ frame.description }}</div>
              </div>
            </div>
            <div v-if="pipelineResult.scriptStoryboard?.script?.scenes?.length" class="scene-scripts">
              <h4>{{ $t('ecommerce.sceneScripts') }}</h4>
              <div v-for="scene in pipelineResult.scriptStoryboard.script.scenes" :key="scene.number" class="scene-item">
                <span class="scene-num">#{{ scene.number }} ({{ scene.seconds }})</span>
                <p>{{ scene.script }}</p>
                <span class="camera-hint">{{ scene.camera }}</span>
                <button class="edit-btn" @click="editSceneScript(scene)">{{ $t('ecommerce.actions.edit') }}</button>
              </div>
            </div>
          </div>

          <!-- 最终输出 -->
          <div v-if="activeTab === 'final'" class="tab-content">
            <div v-if="pipelineResult.final?.content" class="final-content">
              <h4>{{ $t('ecommerce.finalOutput') }}</h4>
              <div class="content-box" v-html="pipelineResult.final.content"></div>
            </div>
            <div v-if="pipelineResult.final?.voice?.audioUrl" class="voice-player">
              <h4>{{ $t('ecommerce.voiceOutput') }}</h4>
              <audio :src="pipelineResult.final.voice.audioUrl" controls></audio>
            </div>
            <div v-if="pipelineResult.final?.video?.taskId" class="video-status">
              <h4>{{ $t('ecommerce.videoStatus') }}</h4>
              <p>Task ID: {{ pipelineResult.final.video.taskId }}</p>
              <p>{{ $t('ecommerce.videoProcessing') }}</p>
            </div>
          </div>

          <!-- 操作栏 -->
          <div class="action-bar">
            <button @click="resetAll">{{ $t('ecommerce.actions.newProject') }}</button>
            <button @click="exportAll">{{ $t('ecommerce.actions.export') }}</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';

const { $api, $t } = useNuxtApp();

// 表单
const form = reactive({
  userInput: '',
  productName: '',
  platform: 'taobao',
  industry: '',
  style: 'professional',
  needsVoice: false,
  videoDuration: 30,
  storyboardCount: 6,
});

// 状态
const generating = ref(false);
const currentStep = ref(0);
const pipelineResult = ref(null);
const activeTab = ref('materials');
const uploadedFile = ref(null);
const detectedIntent = ref(null);
const fileInput = ref(null);

// 配置
const config = ref({
  platforms: [], industries: [], styles: [], videoDurations: [15, 30, 60],
  storyboardCounts: [5, 6, 7, 8], voiceOptions: [], modelOptions: [],
});

const pipelineSteps = [
  { key: 'intent', icon: '1', label: '意图' },
  { key: 'compliance', icon: '2', label: '合规' },
  { key: 'expand', icon: '3', label: '扩图' },
  { key: 'detail', icon: '4', label: '详情' },
  { key: 'storyboard', icon: '5', label: '分镜' },
  { key: 'dispatch', icon: '6', label: '生成' },
];

const resultTabs = [
  { key: 'materials', label: '素材' },
  { key: 'detail', label: '详情页' },
  { key: 'storyboard', label: '脚本分镜' },
  { key: 'final', label: '最终输出' },
];

onMounted(async () => {
  try {
    const res = await $fetch('/api/agent/config');
    if (res?.data) Object.assign(config.value, res.data);
  } catch {}
});

async function startGeneration() {
  if (!form.userInput.trim() || generating.value) return;

  generating.value = true;
  currentStep.value = 0;
  pipelineResult.value = null;

  const stepInterval = setInterval(() => {
    if (currentStep.value < pipelineSteps.length - 1) currentStep.value++;
  }, 800);

  try {
    const res = await $fetch('/api/agent/generate', {
      method: 'POST',
      body: {
        userInput: form.userInput,
        productName: form.productName,
        imageUrl: uploadedFile.value?.url || null,
        referenceVideoUrl: uploadedFile.value?.type === 'video' ? uploadedFile.value?.url : null,
        platform: form.platform,
        industry: form.industry || undefined,
        videoDuration: form.videoDuration,
        needsVoice: form.needsVoice,
        extra: { style: form.style, storyboardCount: form.storyboardCount },
      },
    });

    pipelineResult.value = res?.data || res;
    detectedIntent.value = pipelineResult.value?.intent?.label || null;
    currentStep.value = pipelineSteps.length - 1;
  } catch (err) {
    alert('生成失败: ' + (err.message || '未知错误'));
  } finally {
    clearInterval(stepInterval);
    generating.value = false;
  }
}

function triggerUpload() { fileInput.value?.click(); }

function handleFileChange(e) {
  const file = e.target.files?.[0];
  if (file) processFile(file);
}

function handleDrop(e) {
  const file = e.dataTransfer?.files?.[0];
  if (file) processFile(file);
}

async function processFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', file.type.startsWith('video/') ? 'video' : 'image');

  try {
    const res = await $fetch('/api/agent/upload-reference', { method: 'POST', body: formData });
    if (res?.data) {
      uploadedFile.value = { url: res.data.url, type: res.data.type, name: res.data.filename };
    }
  } catch { /* fallback: use local preview */ }
}

function clearUpload() { uploadedFile.value = null; }

function resetAll() {
  pipelineResult.value = null;
  detectedIntent.value = null;
  activeTab.value = 'materials';
  generating.value = false;
  currentStep.value = 0;
}

function retouchImage(img, idx) { /* TODO: open image editor */ }
function regenerateImage(img) { /* TODO: re-trigger single agent */ }
function editSceneScript(scene) { /* TODO: open script editor */ }
function exportAll() { /* TODO: download all assets as ZIP */ }
</script>

<style scoped>
.ecommerce-workbench { max-width: 1400px; margin: 0 auto; padding: 24px; }
.workbench-header h1 { font-size: 28px; font-weight: 700; margin: 0; }
.workbench-header .subtitle { color: #666; margin-top: 4px; }
.workbench-layout { display: grid; grid-template-columns: 380px 1fr; gap: 24px; margin-top: 24px; }

/* 输入面板 */
.input-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.panel-section h3 { font-size: 16px; margin: 0 0 16px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #333; }
.form-group .required { color: #e53e3e; }
.form-group textarea, .form-group input, .form-group select {
  width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;
  background: #fafafa; resize: vertical;
}
.char-count { font-size: 11px; color: #999; float: right; }
.form-row { display: flex; gap: 12px; }
.form-row .half { flex: 1; }

.upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; min-height: 80px; display: flex; align-items: center; justify-content: center; }
.upload-placeholder { color: #999; }
.upload-icon { font-size: 32px; display: block; }
.uploaded-preview { position: relative; }
.uploaded-preview img, .uploaded-preview video { max-width: 100%; max-height: 200px; border-radius: 4px; }
.remove-btn { position: absolute; top: -8px; right: -8px; background: #e53e3e; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }

.advanced-options { margin-top: 12px; }
.advanced-options summary { font-size: 13px; color: #666; cursor: pointer; }

.generate-btn {
  width: 100%; padding: 14px; background: #1a73e8; color: #fff; border: none; border-radius: 10px;
  font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.generate-btn:disabled { background: #ccc; cursor: not-allowed; }
.spinner { width: 18px; height: 18px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.intent-badge { margin-top: 12px; padding: 8px 12px; background: #e8f5e9; border-radius: 6px; font-size: 13px; color: #2e7d32; text-align: center; }

/* 结果面板 */
.result-panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.1); min-height: 500px; }
.empty-state { text-align: center; padding: 60px 20px; color: #999; }
.empty-icon { font-size: 48px; font-weight: 700; color: #ddd; margin-bottom: 12px; }
.pipeline-flow { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.flow-step { padding: 6px 12px; background: #f0f0f0; border-radius: 4px; font-size: 12px; }
.flow-arrow { color: #ccc; }

/* 生成动画 */
.pipeline-animation { display: flex; flex-direction: column; gap: 12px; padding: 20px; }
.pipeline-step { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; background: #f5f5f5; opacity: .4; }
.pipeline-step.active { opacity: 1; background: #e3f2fd; }
.pipeline-step.done { opacity: .8; background: #e8f5e9; }
.step-icon { width: 28px; height: 28px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
.pipeline-step.active .step-icon { background: #1a73e8; color: #fff; }
.pipeline-step.done .step-icon { background: #4caf50; color: #fff; }
.loading-dot { width: 8px; height: 8px; border-radius: 50%; background: #1a73e8; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

/* 结果内容 */
.result-meta { display: flex; gap: 8px; margin-bottom: 16px; }
.tag { padding: 4px 10px; border-radius: 4px; font-size: 12px; }
.intent-tag { background: #e3f2fd; color: #1565c0; }
.compliance-tag.ok { background: #e8f5e9; color: #2e7d32; }
.pipeline-tag { background: #f3e5f5; color: #7b1fa2; }

.result-tabs { display: flex; gap: 4px; border-bottom: 2px solid #eee; margin-bottom: 16px; }
.result-tabs button { padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #666; }
.result-tabs button.active { color: #1a73e8; border-bottom: 2px solid #1a73e8; margin-bottom: -2px; }

.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.image-card { border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.image-card img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.image-label { padding: 6px 8px; font-size: 11px; color: #666; }
.image-actions { display: flex; gap: 4px; padding: 6px 8px; }
.image-actions button { flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; background: #fff; font-size: 11px; cursor: pointer; }

.selling-points { margin-top: 16px; }
.selling-points ul { padding-left: 20px; }
.selling-points li { margin-bottom: 4px; }

.hook-box { background: #fff9c4; padding: 10px; border-radius: 6px; margin: 8px 0; }
.viral-formula { background: #fce4ec; padding: 10px; border-radius: 6px; margin: 8px 0; }

.scene-scripts { margin-top: 16px; }
.scene-item { background: #f9f9f9; padding: 10px; border-radius: 6px; margin-bottom: 8px; }
.scene-num { font-weight: 600; color: #1a73e8; }
.camera-hint { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.edit-btn { margin-top: 6px; padding: 4px 12px; border: 1px solid #1a73e8; background: #fff; color: #1a73e8; border-radius: 4px; cursor: pointer; font-size: 12px; }

.final-content { margin-top: 16px; }
.content-box { background: #fafafa; padding: 16px; border-radius: 8px; line-height: 1.6; }
.voice-player { margin-top: 16px; }
.voice-player audio { width: 100%; margin-top: 8px; }

.action-bar { display: flex; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
.action-bar button { padding: 10px 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; font-size: 14px; }
.action-bar button:hover { background: #f5f5f5; }

@media (max-width: 900px) { .workbench-layout { grid-template-columns: 1fr; } }
</style>
