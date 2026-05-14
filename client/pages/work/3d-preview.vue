<template>
  <WorkLayout :title="$t('work_pages.d3_preview.title')" :subtitle="$t('work_pages.d3_preview.subtitle')">
    <div class="d3-workspace">
      <!-- Upload Section -->
      <div class="upload-section" v-if="!currentModel">
        <div class="upload-card" @click="triggerUpload" @dragover.prevent @drop.prevent="onDrop">
          <div class="upload-icon">🧊</div>
          <p v-if="uploading">{{ $t('work_pages.d3_preview.uploading') }}</p>
          <template v-else>
          <p>{{ $t('work_pages.d3_preview.drag_hint') }}</p>
          <span>{{ $t('work_pages.d3_preview.file_formats') }}</span>
          <button class="btn-upload">{{ $t('work_pages.d3_preview.select_file') }}</button>
          </template>
        </div>
        <input ref="fileInput" type="file" accept=".glb,.gltf,.fbx,.obj,.stl" class="hidden-input" @change="onFileChange" />
        <p v-if="uploadError" class="error-msg">{{ uploadError }}</p>
      </div>

      <!-- Viewer Section -->
      <div v-else class="viewer-section">
        <div class="viewer-toolbar">
          <div class="toolbar-left">
            <span class="model-name">{{ currentModel.name }}</span>
            <span class="model-size">{{ formatSize(currentModel.size) }}</span>
          </div>
          <div class="toolbar-right">
            <label class="bg-label">{{ $t('work_pages.d3_preview.bg_label') }}</label>
            <button v-for="bg in bgColors" :key="bg.value" class="bg-swatch" :class="{ active: activeBg === bg.value }" :style="{ background: bg.value }" @click="activeBg = bg.value" />
            <button class="btn-export" @click="captureScreenshot">{{ $t('work_pages.d3_preview.screenshot_btn') }}</button>
            <button class="btn-upload-new" @click="resetUpload">{{ $t('work_pages.d3_preview.change_model') }}</button>
          </div>
        </div>

        <ThreeViewer ref="viewerRef" :modelUrl="currentModel.url" :bgColor="activeBg" :autoRotate="true" @loaded="onModelLoaded" @error="onViewerError" />

        <div class="lighting-presets">
          <span class="preset-label">{{ $t('work_pages.d3_preview.lighting_presets') }}</span>
          <button v-for="p in lightingPresets" :key="p.key" class="preset-btn" :class="{ active: activePreset === p.key }" @click="activePreset = p.key">{{ p.label }}</button>
        </div>
      </div>

      <!-- Demo Models -->
      <div class="demo-section" v-if="!currentModel">
        <h3>{{ $t('work_pages.d3_preview.demo_title') }}</h3>
        <div class="demo-grid">
          <div v-for="demo in demoModels" :key="demo.key" class="demo-card" @click="loadDemo(demo)">
            <div class="demo-icon">{{ demo.icon }}</div>
            <div class="demo-name">{{ demo.name }}</div>
            <div class="demo-desc">{{ demo.desc }}</div>
          </div>
        </div>
      </div>

      <!-- Screenshot Modal -->
      <div v-if="screenshotUrl" class="screenshot-modal" @click="screenshotUrl = ''">
        <div class="screenshot-content" @click.stop>
          <h3>{{ $t('work_pages.d3_preview.screenshot_title') }}</h3>
          <img loading="lazy" :src="screenshotUrl" :alt="$t('work_pages.d3_preview.screenshot_alt')" class="screenshot-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <div class="screenshot-actions">
            <a :href="screenshotUrl" download="3d-screenshot.png" class="btn-download">{{ $t('work_pages.d3_preview.download_btn') }}</a>
            <button class="btn-close" @click="screenshotUrl = ''">{{ $t('work_pages.d3_preview.close_btn') }}</button>
          </div>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">const { t } = useI18n()

const { createBlobUrl, revoke } = useBlobUrl()
import ThreeViewer from '~/components/ThreeViewer.vue';

const fileInput = ref<HTMLInputElement>();
const viewerRef = ref();
const currentModel = ref<{ url: string; name: string; size: number } | null>(null);
const uploadError = ref('');
const uploading = ref(false);
const activeBg = ref('#1a1a2e');
const activePreset = ref('studio');
const screenshotUrl = ref('');

const bgColors = [
  { value: '#1a1a2e' }, { value: '#2d2d2d' }, { value: '#f0f0f0' },
  { value: '#e8f4f8' }, { value: '#fff8e1' }, { value: '#000000' },
];

const lightingPresets = computed(() => [
  { key: 'studio', label: t('work_pages.d3_preview.preset_studio') },
  { key: 'soft', label: t('work_pages.d3_preview.preset_soft') },
  { key: 'dramatic', label: t('work_pages.d3_preview.preset_dramatic') },
  { key: 'rim', label: t('work_pages.d3_preview.preset_rim') },
]);

const demoModels = computed(() => [
  { key: 'shoe', icon: '👟', name: t('work_pages.d3_preview.demo_shoe'), desc: t('work_pages.d3_preview.demo_shoe_desc') },
  { key: 'watch', icon: '⌚', name: t('work_pages.d3_preview.demo_watch'), desc: t('work_pages.d3_preview.demo_watch_desc') },
  { key: 'bag', icon: '👜', name: t('work_pages.d3_preview.demo_bag'), desc: t('work_pages.d3_preview.demo_bag_desc') },
  { key: 'bottle', icon: '🧴', name: t('work_pages.d3_preview.demo_bottle'), desc: t('work_pages.d3_preview.demo_bottle_desc') },
]);

function triggerUpload() { fileInput.value?.click(); }

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) processFile(file);
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file) processFile(file);
}

async function processFile(file: File) {
  uploadError.value = '';
  const allowed = ['.glb', '.gltf', '.fbx', '.obj', '.stl'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowed.includes(ext)) { uploadError.value = t('work_pages.d3_preview.format_error'); return; }
  if (file.size > 50 * 1024 * 1024) { uploadError.value = t('work_pages.d3_preview.size_error'); return; }

  const formData = new FormData();
  formData.append('model', file);

  uploading.value = true;
  try {
    const res = await $fetch('/api/3d/upload', { method: 'POST', body: formData });
    currentModel.value = { url: res.url || createBlobUrl(file), name: file.name, size: file.size };
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    if (import.meta.dev) console.warn('[3d-preview] ' + t('work_pages.d3_preview.upload_error_log'), e?.message || err)
    currentModel.value = { url: createBlobUrl(file), name: file.name, size: file.size };
  } finally { uploading.value = false }
}

function loadDemo(demo: typeof demoModels.value[number]) {
  currentModel.value = {
    url: `/api/3d/demo/${demo.key}`,
    name: demo.name,
    size: 0,
  };
}

function resetUpload() {
  currentModel.value = null;
  uploadError.value = '';
}

function onModelLoaded(info: { vertices: number; faces: number; materials: number }) {
  // Model loaded successfully
}

function onViewerError(msg: string) {
  uploadError.value = msg;
}

function captureScreenshot() {
  if (!process.client) return
  const canvas = document.querySelector('.viewer-canvas') as HTMLCanvasElement;
  if (canvas) {
    screenshotUrl.value = canvas.toDataURL('image/png');
  }
}

function formatSize(bytes: number) {
  if (bytes === 0) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.d3-workspace { max-width: 960px; margin: 0 auto; padding: 24px; }
.upload-section { margin-bottom: 24px; }
.upload-card {
  border: 2px dashed var(--border); border-radius: var(--radius-lg); padding: 48px 24px; text-align: center;
  cursor: pointer; transition: border-color 0.2s; background: var(--bg-card);
}
.upload-card:hover { border-color: var(--brand); }
.upload-icon { font-size: 48px; margin-bottom: 12px; }
.upload-card p { font-size: 16px; color: var(--text-secondary); margin-bottom: 8px; }
.upload-card span { font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 16px; }
.btn-upload { background: var(--brand); color: var(--text-on-brand); border: none; padding: 10px 28px; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; }
.hidden-input { display: none; }
.error-msg { color: var(--danger); text-align: center; margin-top: 12px; font-size: 14px; }

.viewer-section { background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.viewer-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border);
  flex-wrap: wrap; gap: 8px;
}
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.model-name { font-weight: 600; color: var(--text-primary); }
.model-size { font-size: 12px; color: var(--text-muted); }
.toolbar-right { display: flex; align-items: center; gap: 8px; }
.bg-label { font-size: 12px; color: var(--text-muted); margin-right: 4px; }
.bg-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: border 0.15s; }
.bg-swatch.active { border-color: var(--brand); }
.btn-export, .btn-upload-new {
  background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border); padding: 6px 14px; border-radius: var(--radius-sm);
  cursor: pointer; font-size: 13px; transition: background 0.15s, color 0.15s;
}
.btn-export:hover, .btn-upload-new:hover { background: var(--border); color: var(--text-primary); }

.lighting-presets { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--bg-secondary); border-top: 1px solid var(--border); }
.preset-label { font-size: 12px; color: var(--text-muted); }
.preset-btn { background: var(--bg-hover); color: var(--text-muted); border: none; padding: 5px 12px; border-radius: var(--radius-xs); cursor: pointer; font-size: 12px; transition: background 0.15s, color 0.15s; }
.preset-btn:hover { background: var(--border); }
.preset-btn.active { background: var(--brand); color: var(--text-on-brand); }

.demo-section { margin-top: 32px; }
.demo-section h3 { font-size: 15px; color: var(--text-muted); margin-bottom: 12px; }
.demo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 640px) { .demo-grid { grid-template-columns: repeat(2, 1fr); } }
.demo-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px 16px;
  text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s;
}
.demo-card:hover { border-color: var(--brand); background: var(--brand-light); }
.demo-icon { font-size: 36px; margin-bottom: 8px; }
.demo-name { font-size: 14px; color: var(--text-primary); font-weight: 500; }
.demo-desc { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.screenshot-modal { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.screenshot-content { background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; max-width: 600px; width: 90%; }
.screenshot-content h3 { color: var(--text-primary); margin-bottom: 12px; }
.screenshot-img { width: 100%; border-radius: var(--radius-md); }
.screenshot-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
.btn-download { background: var(--brand); color: var(--text-on-brand); padding: 8px 20px; border-radius: var(--radius-sm); text-decoration: none; font-size: 14px; }
.btn-close { background: var(--bg-hover); color: var(--text-secondary); border: none; padding: 8px 20px; border-radius: var(--radius-sm); cursor: pointer; font-size: 14px; }
</style>
