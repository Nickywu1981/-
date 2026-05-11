<template>
  <WorkLayout :steps="['拖文件夹', '选操作+模式', '确认执行', '下载结果']" :current-step="step">
    <!-- Step 0: 上传 -->
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📦</p>
        <p>拖拽图片文件夹到此处</p>
        <p class="hint">支持 JPG / PNG / WebP，一次最多 100 张</p>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFiles" />
        <button class="btn-outline" @click="fileInput?.click()">选择图片</button>
      </div>
      <div v-if="previews.length" class="file-count">{{ previews.length }} 张图片已就绪</div>

      <!-- 历史复刻 -->
      <div v-if="history.length" class="history-section">
        <h4>📋 历史批量任务 — 点击复刻</h4>
        <div class="history-list">
          <button v-for="h in history" :key="h.id" class="history-item" @click="redoFromHistory(h)">
            <span class="h-type">{{ h.type }}</span>
            <span class="h-title">{{ h.title }}</span>
            <span class="h-time">{{ h.create_time?.slice(0, 10) }}</span>
          </button>
        </div>
      </div>

      <button v-if="previews.length" class="btn" @click="step = 1">下一步：选操作</button>
    </div>

    <!-- Step 1: 选操作 + 模式 -->
    <div v-else-if="step === 1" class="select-section">
      <h3>选择批量操作</h3>
      <div class="op-grid">
        <button v-for="o in operations" :key="o.id" class="op-card" :class="{ active: selectedOp === o.id }" @click="selectedOp = o.id">
          <span class="op-icon">{{ o.icon }}</span>
          <span class="op-name">{{ o.name }}</span>
          <span class="op-cost">{{ o.cost }} 点/张</span>
        </button>
      </div>

      <h3>执行模式</h3>
      <div class="mode-row">
        <button class="mode-card" :class="{ active: !nightMode }" @click="nightMode = false">
          <span class="mode-icon">⚡</span>
          <span class="mode-name">立即执行</span>
          <span class="mode-desc">马上排队处理</span>
        </button>
        <button class="mode-card night" :class="{ active: nightMode }" @click="nightMode = true">
          <span class="mode-icon">🌙</span>
          <span class="mode-name">夜间托管</span>
          <span class="mode-desc">凌晨2点自动执行 · 6折优惠</span>
          <span class="mode-badge">六折</span>
        </button>
      </div>

      <!-- 模板 -->
      <div v-if="templates.length" class="template-section">
        <h4>💾 我的模板</h4>
        <div class="template-list">
          <button v-for="t in templates" :key="t.id" class="template-item" @click="applyTemplate(t)">
            <span>{{ t.name }}</span>
            <span class="t-tag">{{ t.operation }}</span>
            <span v-if="t.night_mode" class="t-night">夜间</span>
          </button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" :disabled="!selectedOp" @click="step = 2">下一步</button>
      </div>
    </div>

    <!-- Step 2: 确认 -->
    <div v-else-if="step === 2" class="select-section">
      <h3>确认批量配置</h3>
      <div class="summary-box">
        <div class="summary-row"><span>图片数量</span><strong>{{ previews.length }} 张</strong></div>
        <div class="summary-row"><span>操作类型</span><strong>{{ operationLabel }}</strong></div>
        <div class="summary-row"><span>执行模式</span><strong>{{ nightMode ? '🌙 夜间托管 (6折)' : '⚡ 立即执行' }}</strong></div>
        <div class="summary-row cost"><span>预估消耗</span><strong>{{ estimatedCost }} 点</strong></div>
      </div>

      <!-- 目标平台+风格 (仅主图/场景操作显示) -->
      <div v-if="selectedOp === 'main_image' || selectedOp === 'scene'" class="quick-row">
        <select v-model="selectedPlatform" class="select">
          <option value="">-- 选平台 --</option>
          <option v-for="p in platforms" :key="p.code" :value="p.code">{{ p.name }}</option>
        </select>
        <select v-model="selectedStyle" class="select">
          <option value="">-- 选风格 --</option>
          <option value="simple">简约白底</option>
          <option value="luxury">高级轻奢</option>
          <option value="promo">活动促销</option>
        </select>
      </div>

      <!-- 保存为模板 -->
      <div class="save-template-row">
        <input v-model="templateName" placeholder="保存为批量模板..." class="input-sm" maxlength="100" />
        <button class="btn-outline-sm" :disabled="!templateName" @click="saveTemplate">保存模板</button>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 1">返回</button>
        <button class="btn" :disabled="task.polling.value" @click="submitTask">{{ nightMode ? '提交夜间托管' : '开始批量处理' }}</button>
      </div>
    </div>

    <!-- Step 3: 处理/结果 -->
    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>批量完成 — {{ task.result.value?.total }} 张</h3>
        <div class="result-actions">
          <button class="btn">📥 一键下载 ZIP</button>
          <p class="zip-hint">约 {{ task.result.value?.estimatedZipSize || '?' }}</p>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">再处理一批</button>
          <button class="btn-outline" @click="step = 0; handleRedo()">重新开始</button>
        </div>
      </div>
      <div v-else-if="task.status.value === -1 && nightMode" class="night-confirmed">
        <span class="night-icon">🌙</span>
        <h3>夜间托管已确认</h3>
        <p>任务将在凌晨2点自动执行，6折优惠。完成后可在素材库查看结果。</p>
        <p class="cost-saved">预估节省 {{ Math.round(estimatedCost * 0.4) }} 点</p>
        <button class="btn" @click="handleRedo(); step = 0">提交新任务</button>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p>{{ task.errorMsg.value || '处理失败' }}</p>
        <button class="btn" @click="handleRedo()">重试</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const step = ref(0);
const previews = ref<string[]>([]);
const uploadedUrls = ref<string[]>([]);
const uploading = ref(false);
const selectedOp = ref('');
const selectedPlatform = ref('');
const selectedStyle = ref('');
const nightMode = ref(false);
const templateName = ref('');
const templates = ref<any[]>([]);
const history = ref<any[]>([]);
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();

const operations = [
  { id: 'cutout', name: '批量抠图', icon: '✂', cost: '1' },
  { id: 'main_image', name: '批量主图', icon: '📷', cost: '3' },
  { id: 'scene', name: '批量场景', icon: '🖼', cost: '2' },
  { id: 'img2video', name: '批量视频', icon: '🎬', cost: '10' },
];
const platforms = [
  { code: 'taobao', name: '淘宝' }, { code: 'pdd', name: '拼多多' }, { code: 'douyin', name: '抖音' },
  { code: 'amazon', name: '亚马逊' }, { code: 'tiktok', name: 'TikTok Shop' },
];

const operationLabel = computed(() => operations.find((o) => o.id === selectedOp.value)?.name || selectedOp.value);
const baseCost = computed(() => {
  const op = operations.find((o) => o.id === selectedOp.value);
  return op ? parseInt(op.cost) : 1;
});
const estimatedCost = computed(() => {
  let cost = baseCost.value * previews.value.length * 0.8;
  if (nightMode.value) cost = Math.round(cost * 0.6);
  return Math.ceil(cost);
});

async function handleFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files) {
    for (const f of files) previews.value.push(createBlobUrl(f));
    await uploadMultiple(Array.from(files));
  }
}

async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files) {
    for (const f of files) previews.value.push(createBlobUrl(f));
    await uploadMultiple(Array.from(files));
  }
}

async function uploadMultiple(files: File[]) {
  uploading.value = true;
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  try {
    const res: any = await $fetch('/api/upload/images', {
      method: 'POST', credentials: 'include', body: formData,
    });
    uploadedUrls.value.push(...(res.data?.files || []).map((f: any) => f.url));
  } catch (e: any) { toast.error(e?.data?.msg || '上传失败'); }
  finally { uploading.value = false; }
}

async function loadTemplates() {
  try {
    const res = await $fetch('/api/batch/templates', { credentials: 'include' });
    templates.value = (res as any).data?.list || [];
  } catch (e: any) { toast.error('模板加载失败，请刷新页面重试'); console.error('[批量处理] 模板加载失败', e.message) }
}

async function loadHistory() {
  try {
    const res = await $fetch('/api/batch/history?pageSize=3', { credentials: 'include' });
    history.value = (res as any).data?.list || [];
  } catch (e: any) { toast.error('历史记录加载失败，请刷新页面重试'); console.error('[批量处理] 历史加载失败', e.message) }
}

function applyTemplate(t: any) {
  selectedOp.value = t.operation;
  selectedPlatform.value = t.platform || '';
  selectedStyle.value = t.style || '';
  nightMode.value = !!t.night_mode;
}

async function redoFromHistory(h: any) {
  try {
    const res = await $fetch('/api/batch/redo', {
      method: 'POST',
      credentials: 'include',
      body: { taskId: h.id },
    });
    task.pollTask((res as any).data.taskId);
    step.value = 3;
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '重做失败，请重试');
  }
}

async function saveTemplate() {
  try {
    await $fetch('/api/batch/templates', {
      method: 'POST',
      credentials: 'include',
      body: { name: templateName.value, operation: selectedOp.value, platform: selectedPlatform.value, style: selectedStyle.value, nightMode: nightMode.value, imageCount: previews.value.length },
    });
    templateName.value = '';
    loadTemplates();
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '保存模板失败');
  }
}

async function submitTask() {
  step.value = 3;
  try {
    const res = await $fetch('/api/batch/submit', {
      method: 'POST',
      credentials: 'include',
      body: { imageUrls: uploadedUrls.value.slice(0, 100), operation: selectedOp.value, platform: selectedPlatform.value, style: selectedStyle.value, nightMode: nightMode.value },
    });
    if (nightMode.value) return; // 夜间模式不轮询
    task.pollTask((res as any).data.taskId);
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '批量任务提交失败，请重试');
    step.value = 2;
  }
}
function handleRedo() { task.reset(); previews.value.forEach(u => revoke(u)); previews.value = []; uploadedUrls.value = []; }

onMounted(() => { loadTemplates(); loadHistory(); });
onUnmounted(() => { previews.value.forEach(u => revoke(u)) });
</script>

<style scoped>
.btn-outline-sm { padding: 6px 14px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; font-size: 12px; }
.btn-outline-sm:disabled { opacity: 0.5; }
.h-type { background: var(--bg-hover); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.h-title { flex: 1; color: var(--text-primary); }
.h-time { color: var(--text-muted); font-size: 11px; }
.quick-row { display: flex; gap: 12px; justify-content: center; margin-bottom: 24px; }
.result-actions { text-align: center; margin: 20px 0; }
.zip-hint { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.night-icon { font-size: 48px; display: block; margin-bottom: 12px; }
.cost-saved { color: var(--success) !important; font-weight: 600; }
</style>
