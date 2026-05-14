<template>
  <WorkLayout :steps="batchSteps" :current-step="step">
    <!-- Step 0: 上传 -->
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📦</p>
        <p>{{ $t('work_pages.batch.drag_hint') }}</p>
        <p class="hint">{{ $t('work_pages.batch.support_hint') }}</p>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFiles" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.batch.select_files') }}</button>
      </div>
      <div v-if="previews.length" class="file-count">{{ $t('work_pages.batch.files_ready', { n: previews.length }) }}</div>

      <!-- 历史复刻 -->
      <div v-if="history.length" class="history-section">
        <h4>📋 {{ $t('work_pages.batch.history_title') }}</h4>
        <div class="history-list">
          <button v-for="h in history" :key="h.id" class="history-item" @click="redoFromHistory(h)">
            <span class="h-type">{{ h.type }}</span>
            <span class="h-title">{{ h.title }}</span>
            <span class="h-time">{{ h.create_time?.slice(0, 10) }}</span>
          </button>
        </div>
      </div>

      <button v-if="previews.length" class="btn" @click="step = 1">{{ $t('work_pages.batch.next_step') }}</button>
    </div>

    <!-- Step 1: 选操作 + 模式 -->
    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.batch.select_op') }}</h3>
      <div class="op-grid">
        <button v-for="o in operations" :key="o.id" class="op-card" :class="{ active: selectedOp === o.id }" @click="selectedOp = o.id">
          <span class="op-icon">{{ o.icon }}</span>
          <span class="op-name">{{ o.name }}</span>
          <span class="op-cost">{{ $t('work_pages.batch.points_per_image', { cost: o.cost }) }}</span>
        </button>
      </div>

      <h3>{{ $t('work_pages.batch.exec_mode') }}</h3>
      <div class="mode-row">
        <button class="mode-card" :class="{ active: !nightMode }" @click="nightMode = false">
          <span class="mode-icon">⚡</span>
          <span class="mode-name">{{ $t('work_pages.batch.immediate') }}</span>
          <span class="mode-desc">{{ $t('work_pages.batch.immediate_desc') }}</span>
        </button>
        <button class="mode-card night" :class="{ active: nightMode }" @click="nightMode = true">
          <span class="mode-icon">🌙</span>
          <span class="mode-name">{{ $t('work_pages.batch.night_mode') }}</span>
          <span class="mode-desc">{{ $t('work_pages.batch.night_desc') }}</span>
          <span class="mode-badge">{{ $t('work_pages.batch.night_discount') }}</span>
        </button>
      </div>

      <!-- 模板 -->
      <div v-if="templates.length" class="template-section">
        <h4>💾 {{ $t('work_pages.batch.my_templates') }}</h4>
        <div class="template-list">
          <button v-for="t in templates" :key="t.id" class="template-item" @click="applyTemplate(t)">
            <span>{{ t.name }}</span>
            <span class="t-tag">{{ t.operation }}</span>
            <span v-if="t.night_mode" class="t-night">{{ $t('work_pages.batch.night_tag') }}</span>
          </button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.batch.back') }}</button>
        <button class="btn" :disabled="!selectedOp" @click="step = 2">{{ $t('work_pages.batch.next') }}</button>
      </div>
    </div>

    <!-- Step 2: 确认 -->
    <div v-else-if="step === 2" class="select-section">
      <h3>{{ $t('work_pages.batch.confirm_config') }}</h3>
      <div class="summary-box">
        <div class="summary-row"><span>{{ $t('work_pages.batch.image_count') }}</span><strong>{{ previews.length }} {{ $t('work_pages.batch.images_unit') }}</strong></div>
        <div class="summary-row"><span>{{ $t('work_pages.batch.op_type') }}</span><strong>{{ operationLabel }}</strong></div>
        <div class="summary-row"><span>{{ $t('work_pages.batch.exec_mode_label') }}</span><strong>{{ nightMode ? '🌙 ' + $t('work_pages.batch.night_label') : '⚡ ' + $t('work_pages.batch.immediate_label') }}</strong></div>
        <div class="summary-row cost"><span>{{ $t('work_pages.batch.estimated_cost') }}</span><strong>{{ estimatedCost }} {{ $t('work_pages.batch.points_unit') }}</strong></div>
      </div>

      <div v-if="selectedOp === 'main_image' || selectedOp === 'scene'" class="quick-row">
        <select v-model="selectedPlatform" class="select">
          <option value="">{{ $t('work_pages.batch.select_platform') }}</option>
          <option v-for="p in platforms" :key="p.code" :value="p.code">{{ p.name }}</option>
        </select>
        <select v-model="selectedStyle" class="select">
          <option value="">{{ $t('work_pages.batch.select_style') }}</option>
          <option value="simple">{{ $t('work_pages.batch.style_simple') }}</option>
          <option value="luxury">{{ $t('work_pages.batch.style_luxury') }}</option>
          <option value="promo">{{ $t('work_pages.batch.style_promo') }}</option>
        </select>
      </div>

      <div class="save-template-row">
        <input v-model="templateName" :placeholder="$t('work_pages.batch.save_template_placeholder')" class="input-sm" maxlength="100" />
        <button class="btn-outline-sm" :disabled="!templateName" @click="saveTemplate">{{ $t('work_pages.batch.save_template') }}</button>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 1">{{ $t('work_pages.batch.back') }}</button>
        <button class="btn" :disabled="task.polling.value" @click="submitTask">{{ nightMode ? $t('work_pages.batch.submit_night') : $t('work_pages.batch.submit_batch') }}</button>
      </div>
    </div>

    <!-- Step 3: 处理/结果 -->
    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.batch.batch_complete') }} — {{ task.result.value?.total }} {{ $t('work_pages.batch.images_unit') }}</h3>
        <div class="result-actions">
          <button class="btn">📥 {{ $t('work_pages.batch.download_zip') }}</button>
          <p class="zip-hint">≈ {{ task.result.value?.estimatedZipSize || '?' }}</p>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">{{ $t('work_pages.batch.redo_batch') }}</button>
          <button class="btn-outline" @click="step = 0; handleRedo()">{{ $t('work_pages.batch.restart') }}</button>
        </div>
      </div>
      <div v-else-if="task.status.value === -1 && nightMode" class="night-confirmed">
        <span class="night-icon">🌙</span>
        <h3>{{ $t('work_pages.batch.night_confirmed_title') }}</h3>
        <p>{{ $t('work_pages.batch.night_confirmed_desc') }}</p>
        <p class="cost-saved">{{ $t('work_pages.batch.cost_saved', { n: Math.round(estimatedCost * 0.4) }) }}</p>
        <button class="btn" @click="handleRedo(); step = 0">{{ $t('work_pages.batch.submit_new') }}</button>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p>{{ task.errorMsg.value || $t('work_pages.batch.process_failed') }}</p>
        <button class="btn" @click="handleRedo()">{{ $t('work_pages.batch.retry') }}</button>
      </div>
    </div>
    <!-- empty state -->
    <div v-if="step === 0 && !previews.length && !history.length" class="empty-hint">
      <span class="empty-icon">📦</span>
      <p>{{ $t('work_pages.batch.empty_hint') }}</p>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()
const { t } = useI18n()

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

const batchSteps = computed(() => [
  t('work_pages.batch.step_drop'),
  t('work_pages.batch.step_select'),
  t('work_pages.batch.step_confirm'),
  t('work_pages.batch.step_download'),
])

const operations = computed(() => [
  { id: 'cutout', name: t('work_pages.batch.op_cutout'), icon: '✂', cost: '1' },
  { id: 'main_image', name: t('work_pages.batch.op_main_image'), icon: '📷', cost: '3' },
  { id: 'scene', name: t('work_pages.batch.op_scene'), icon: '🖼', cost: '2' },
  { id: 'img2video', name: t('work_pages.batch.op_video'), icon: '🎬', cost: '10' },
]);
const platforms = computed(() => [
  { code: 'taobao', name: t('work_pages.main_image_platform_taobao') }, { code: 'pdd', name: t('work_pages.main_image_platform_pdd') }, { code: 'douyin', name: t('work_pages.main_image_platform_douyin') },
  { code: 'amazon', name: t('work_pages.main_image_platform_amazon') }, { code: 'tiktok', name: 'TikTok Shop' },
]);

const operationLabel = computed(() => operations.value.find((o) => o.id === selectedOp.value)?.name || selectedOp.value);
const baseCost = computed(() => {
  const op = operations.value.find((o) => o.id === selectedOp.value);
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
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('work_pages.batch.upload_error')); }
  finally { uploading.value = false; }
}

async function loadTemplates() {
  try {
    const res = await $fetch('/api/batch/templates', { credentials: 'include' });
    templates.value = (res as any).data?.list || [];
  } catch { toast.error(t('work_pages.batch.load_template_failed')) }
}

async function loadHistory() {
  try {
    const res = await $fetch('/api/batch/history?pageSize=3', { credentials: 'include' });
    history.value = (res as any).data?.list || [];
  } catch { toast.error(t('work_pages.batch.load_history_failed')) }
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
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('work_pages.batch.redo_failed'));
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
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('work_pages.batch.save_template_failed'));
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
    if (nightMode.value) return;
    task.pollTask((res as any).data.taskId);
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('work_pages.batch.submit_failed'));
    step.value = 2;
  }
}
function handleRedo() { task.reset(); previews.value.forEach(u => revoke(u)); previews.value = []; uploadedUrls.value = []; }

onMounted(() => { loadTemplates(); loadHistory(); });
onUnmounted(() => { previews.value.forEach(u => revoke(u)) });
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
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
.empty-hint { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.empty-hint p { font-size: 15px; color: var(--text-secondary); }
</style>
