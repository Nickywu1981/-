<template>
  <WorkLayout :steps="['选平台', '选模板', '上传产品图', '生成']" :current-step="step">
    <!-- Step 0: 选平台 -->
    <div v-if="step === 0" class="select-section">
      <h3>选择目标平台</h3>
      <div class="region-tabs">
        <button v-for="r in regions" :key="r.code" class="region-tab" :class="{ active: activeRegion === r.code }" @click="activeRegion = r.code">{{ r.label }}</button>
      </div>
      <div class="platform-grid">
        <button v-for="p in filteredPlatforms" :key="p.code" class="platform-card" :class="{ active: selectedPlatform === p.code }" @click="selectedPlatform = p.code">
          <span class="pf-name">{{ p.name }}</span>
          <span class="pf-count">{{ p.templateCount }} 套模板</span>
          <span class="pf-region">{{ p.region }}</span>
        </button>
      </div>
      <div class="actions">
        <button class="btn" :disabled="!selectedPlatform" @click="step = 1">下一步：选模板</button>
      </div>
    </div>

    <!-- Step 1: 选模板 -->
    <div v-else-if="step === 1" class="select-section">
      <h3>{{ platformName }} — 选择详情页模板</h3>
      <div v-if="platformConfig" class="platform-specs">
        <span class="spec-item">📐 {{ platformConfig.specs.maxWidth }}x{{ platformConfig.specs.maxHeight || '不限高' }}px</span>
        <span class="spec-item">📦 最大 {{ (platformConfig.specs.maxSizeKB / 1024).toFixed(1) }}MB</span>
        <span class="spec-item">🌐 {{ platformConfig.defaultLang }}</span>
      </div>

      <div class="tmpl-grid-lg">
        <button v-for="t in platformConfig?.templates" :key="t.id" class="tmpl-card-lg" :class="{ active: selectedTemplate === t.id }" @click="selectedTemplate = t.id">
          <div class="tmpl-header">
            <span class="tmpl-name">{{ t.name }}</span>
            <span class="tmpl-style">{{ t.style }}</span>
          </div>
          <div class="tmpl-modules">
            <span v-for="m in t.modules" :key="m" class="module-tag">{{ m }}</span>
          </div>
        </button>
      </div>

      <h4 v-if="platformConfig" class="section-subtitle">详情页将包含以下板块</h4>
      <div v-if="platformConfig" class="section-pills">
        <span v-for="s in platformConfig.sections" :key="s" class="section-pill">{{ s }}</span>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" :disabled="!selectedTemplate" @click="step = 2">下一步：上传产品图</button>
      </div>
    </div>

    <!-- Step 2: 上传产品图 -->
    <div v-else-if="step === 2" class="upload-section">
      <h3>上传产品图片</h3>
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📷</p>
        <p>拖拽产品图片到此处</p>
        <p class="hint">建议上传多角度图片（白底图、场景图、细节图）</p>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFiles" />
        <button class="btn-outline" @click="fileInput?.click()">选择图片</button>
      </div>

      <div v-if="previews.length" class="preview-grid">
        <div v-for="(p, i) in previews" :key="i" class="preview-item">
          <img loading="lazy" :src="p.url" class="preview-thumb" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <select v-model="p.role" class="role-select">
            <option value="main">主图</option><option value="detail">细节图</option>
            <option value="scene">场景图</option><option value="size">尺寸图</option>
          </select>
          <button class="remove-btn" @click="removeImage(i)" aria-label="移除图片">✕</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 1">返回</button>
        <button class="btn" :disabled="!previews.length || !allUploaded" @click="submitTask">开始生成详情页</button>
      </div>
    </div>

    <!-- Step 3: 生成结果 -->
    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ platformName }} 详情页生成完成</h3>
        <p class="result-hint">已按照 {{ platformName }} 规范生成详情页，包含 {{ platformConfig?.sections.length || 0 }} 个板块</p>
        <div class="actions">
          <button class="btn">📥 下载详情页</button>
          <button class="btn-outline" @click="handleRedo">重新生成</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p>{{ task.errorMsg.value || '生成失败' }}</p>
        <button class="btn" @click="handleRedo()">重试</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

interface PreviewItem { url: string; uploadedUrl: string; role: string; uploaded: boolean }

const step = ref(0);
const selectedPlatform = ref('');
const selectedTemplate = ref('');
const activeRegion = ref('all');
const platforms = ref<any[]>([]);
const previews = ref<PreviewItem[]>([]);
const fileInput = ref<HTMLInputElement | null>(null)
const task = useTask();
const toast = useToast();

const regions = [
  { code: 'all', label: '全部' }, { code: 'cn', label: '🇨🇳 国内' },
  { code: 'global', label: '🌍 全球' }, { code: 'sea', label: '🌏 东南亚' },
  { code: 'latam', label: '🌎 拉美' }, { code: 'cis', label: '🇷🇺 独联体' },
];

const filteredPlatforms = computed(() =>
  activeRegion.value === 'all' ? platforms.value : platforms.value.filter((p: any) => p.region === activeRegion.value),
);
const platformName = computed(() => platforms.value.find((p: any) => p.code === selectedPlatform.value)?.name || '');
const platformConfig = computed(() => {
  const p = platforms.value.find((p: any) => p.code === selectedPlatform.value);
  return p?._config || null;
});
const allUploaded = computed(() => previews.value.length > 0 && previews.value.every(p => p.uploaded));

function removeImage(i: number) { previews.value.splice(i, 1); }

async function loadPlatforms() {
  try {
    const res = await $fetch('/api/platforms', { credentials: 'include' });
    const list = (res as any).data || [];
    for (const p of list) {
      const detail = await $fetch(`/api/platforms/${p.code}`, { credentials: 'include' });
      p._config = (detail as any).data;
    }
    platforms.value = list;
  } catch (e: any) { toast.error(e?.data?.msg || '加载平台失败') }
}

async function uploadSingle(file: File): Promise<string> {
  const formData = new FormData(); formData.append('file', file);
  const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData });
  return res?.data?.url || '';
}

async function handleFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) return;
  for (const f of files) {
    const url = createBlobUrl(f);
    const idx = previews.value.length;
    previews.value.push({ url, uploadedUrl: '', role: idx === 0 ? 'main' : 'detail', uploaded: false });
    const i = idx;
    try { previews.value[i].uploadedUrl = await uploadSingle(f); previews.value[i].uploaded = true; } catch { previews.value[i].uploaded = false; }
  }
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (files) {
    for (const f of files) {
      const url = createBlobUrl(f);
      previews.value.push({ url, uploadedUrl: '', role: 'detail', uploaded: false });
    }
  }
}

async function submitTask() {
  step.value = 3;
  try {
    const res = await $fetch('/api/images/detail-h5', {
      method: 'POST',
      credentials: 'include',
      body: {
        images: previews.value.map(p => ({ url: p.uploadedUrl, role: p.role })),
        platform: selectedPlatform.value,
        templateId: selectedTemplate.value,
      },
    });
    task.pollTask((res as any).data.taskId);
  } catch (e: any) { toast.error(e?.data?.msg || '提交失败，请重试'); step.value = 2; }
}

function handleRedo() { task.reset(); step.value = 0; previews.value = []; selectedPlatform.value = ''; selectedTemplate.value = ''; }

onMounted(() => { loadPlatforms(); });
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.region-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.region-tab { padding: 6px 14px; border: 1px solid var(--input-border); border-radius: var(--badge-radius); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast); }
.region-tab.active { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }
.region-tab:hover:not(.active) { border-color: var(--brand); }
.platform-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 20px; }
.platform-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 12px; border: 2px solid var(--input-border); border-radius: var(--radius-lg); background: var(--bg-card); cursor: pointer; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.platform-card:hover { border-color: var(--brand); box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 12%, transparent); }
.platform-card.active { border-color: var(--brand); background: var(--status-processing-bg); }
.pf-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.pf-count { font-size: 12px; color: var(--text-muted); }
.pf-region { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-xs); background: var(--bg-hover); color: var(--text-muted); text-transform: uppercase; }

.platform-specs { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.spec-item { font-size: 12px; padding: 4px 10px; background: var(--bg-hover); border-radius: var(--radius-sm); color: var(--text-secondary); }

.tmpl-grid-lg { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.tmpl-card-lg { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border: 2px solid var(--input-border); border-radius: var(--radius-lg); background: var(--bg-card); cursor: pointer; text-align: left; transition: border-color var(--transition-fast); }
.tmpl-card-lg:hover { border-color: var(--brand); }
.tmpl-card-lg.active { border-color: var(--brand); background: var(--status-processing-bg); }
.tmpl-header { display: flex; align-items: center; gap: 10px; }
.tmpl-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.tmpl-style { font-size: 12px; color: var(--brand); background: color-mix(in srgb, var(--brand) 10%, transparent); padding: 2px 8px; border-radius: var(--radius-xs); }
.tmpl-modules { display: flex; flex-wrap: wrap; gap: 4px; }
.module-tag { font-size: 11px; padding: 2px 8px; background: var(--bg-hover); color: var(--text-muted); border-radius: var(--radius-xs); }

.section-subtitle { font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; }
.section-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
.section-pill { font-size: 12px; padding: 4px 12px; background: var(--status-done-bg); color: var(--status-done-text); border-radius: var(--badge-radius); }

.preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
.preview-item { position: relative; background: var(--bg-card); border: 1px solid var(--input-border); border-radius: var(--radius-md); overflow: hidden; }
.preview-thumb { width: 100%; height: 100px; object-fit: cover; display: block; }
.role-select { width: 100%; padding: 4px 8px; border: none; border-top: 1px solid var(--input-border); font-size: 12px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.remove-btn { position: absolute; top: 4px; right: 4px; min-width: 28px; min-height: 28px; border: none; border-radius: 50%; background: var(--danger); color: var(--text-on-brand); cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.result-hint { color: var(--text-muted); margin-bottom: 16px; }
</style>
