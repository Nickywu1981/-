<template>
  <WorkLayout title="3D 商品预览" subtitle="上传模型文件，360°交互预览">
    <div class="d3-workspace">
      <!-- Upload Section -->
      <div class="upload-section" v-if="!currentModel">
        <div class="upload-card" @click="triggerUpload" @dragover.prevent @drop.prevent="onDrop">
          <div class="upload-icon">🧊</div>
          <p>拖拽 3D 模型到此处</p>
          <span>支持 GLB / GLTF / FBX / OBJ，最大 50MB</span>
          <button class="btn-upload">选择文件</button>
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
            <label class="bg-label">背景:</label>
            <button v-for="bg in bgColors" :key="bg.value" class="bg-swatch" :class="{ active: activeBg === bg.value }" :style="{ background: bg.value }" @click="activeBg = bg.value" />
            <button class="btn-export" @click="captureScreenshot">📸 截图</button>
            <button class="btn-upload-new" @click="resetUpload">更换模型</button>
          </div>
        </div>

        <ThreeViewer ref="viewerRef" :modelUrl="currentModel.url" :bgColor="activeBg" :autoRotate="true" @loaded="onModelLoaded" @error="onViewerError" />

        <div class="lighting-presets">
          <span class="preset-label">光照预设:</span>
          <button v-for="p in lightingPresets" :key="p.key" class="preset-btn" :class="{ active: activePreset === p.key }" @click="activePreset = p.key">{{ p.label }}</button>
        </div>
      </div>

      <!-- Demo Models -->
      <div class="demo-section" v-if="!currentModel">
        <h3>或使用示例模型体验</h3>
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
          <h3>截图预览</h3>
          <img loading="lazy" :src="screenshotUrl" class="screenshot-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <div class="screenshot-actions">
            <a :href="screenshotUrl" download="3d-screenshot.png" class="btn-download">下载图片</a>
            <button class="btn-close" @click="screenshotUrl = ''">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ThreeViewer from '~/components/ThreeViewer.vue';

const fileInput = ref<HTMLInputElement>();
const viewerRef = ref();
const currentModel = ref<{ url: string; name: string; size: number } | null>(null);
const uploadError = ref('');
const activeBg = ref('#1a1a2e');
const activePreset = ref('studio');
const screenshotUrl = ref('');

const bgColors = [
  { value: '#1a1a2e' }, { value: '#2d2d2d' }, { value: '#f0f0f0' },
  { value: '#e8f4f8' }, { value: '#fff8e1' }, { value: '#000000' },
];

const lightingPresets = [
  { key: 'studio', label: '影棚光' },
  { key: 'soft', label: '柔光' },
  { key: 'dramatic', label: '戏剧光' },
  { key: 'rim', label: '轮廓光' },
];

const demoModels = [
  { key: 'shoe', icon: '👟', name: '运动鞋', desc: '经典运动鞋 3D 模型' },
  { key: 'watch', icon: '⌚', name: '手表', desc: '金属表盘展示' },
  { key: 'bag', icon: '👜', name: '手提包', desc: '皮质手提包展示' },
  { key: 'bottle', icon: '🧴', name: '香水瓶', desc: '玻璃材质渲染' },
];

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
  if (!allowed.includes(ext)) { uploadError.value = '不支持的格式，请上传 GLB/GLTF/FBX/OBJ/STL 文件'; return; }
  if (file.size > 50 * 1024 * 1024) { uploadError.value = '文件超过 50MB 限制'; return; }

  const formData = new FormData();
  formData.append('model', file);

  try {
    const res = await $fetch('/api/3d/upload', { method: 'POST', body: formData });
    currentModel.value = { url: res.url || URL.createObjectURL(file), name: file.name, size: file.size };
  } catch {
    // Fallback: use local object URL for preview
    currentModel.value = { url: URL.createObjectURL(file), name: file.name, size: file.size };
  }
}

function loadDemo(demo: typeof demoModels[number]) {
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
  const canvas = document.querySelector('.viewer-canvas') as HTMLCanvasElement;
  if (canvas) {
    screenshotUrl.value = canvas.toDataURL('image/png');
  }
}

function formatSize(bytes: number) {
  if (bytes === 0) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}
</script>

<style scoped>
.d3-workspace { max-width: 960px; margin: 0 auto; padding: 24px; }
.upload-section { margin-bottom: 24px; }
.upload-card {
  border: 2px dashed #444; border-radius: 12px; padding: 48px 24px; text-align: center;
  cursor: pointer; transition: border-color 0.2s; background: #1e1e2e;
}
.upload-card:hover { border-color: #6c5ce7; }
.upload-icon { font-size: 48px; margin-bottom: 12px; }
.upload-card p { font-size: 16px; color: #ccc; margin-bottom: 8px; }
.upload-card span { font-size: 13px; color: #888; display: block; margin-bottom: 16px; }
.btn-upload { background: #6c5ce7; color: #fff; border: none; padding: 10px 28px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.hidden-input { display: none; }
.error-msg { color: #ff6b6b; text-align: center; margin-top: 12px; font-size: 14px; }

.viewer-section { background: #1a1a2e; border-radius: 12px; overflow: hidden; }
.viewer-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: #151525; border-bottom: 1px solid #2a2a3a;
  flex-wrap: wrap; gap: 8px;
}
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.model-name { font-weight: 600; color: #e0e0e0; }
.model-size { font-size: 12px; color: #888; }
.toolbar-right { display: flex; align-items: center; gap: 8px; }
.bg-label { font-size: 12px; color: #888; margin-right: 4px; }
.bg-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: border 0.15s; }
.bg-swatch.active { border-color: #6c5ce7; }
.btn-export, .btn-upload-new {
  background: #2a2a3a; color: #ccc; border: 1px solid #444; padding: 6px 14px; border-radius: 6px;
  cursor: pointer; font-size: 13px; transition: all 0.15s;
}
.btn-export:hover, .btn-upload-new:hover { background: #333; color: #fff; }

.lighting-presets { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #151525; border-top: 1px solid #2a2a3a; }
.preset-label { font-size: 12px; color: #888; }
.preset-btn { background: #2a2a3a; color: #aaa; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.15s; }
.preset-btn:hover { background: #3a3a4a; }
.preset-btn.active { background: #6c5ce7; color: #fff; }

.demo-section { margin-top: 32px; }
.demo-section h3 { font-size: 15px; color: #aaa; margin-bottom: 12px; }
.demo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 640px) { .demo-grid { grid-template-columns: repeat(2, 1fr); } }
.demo-card {
  background: #1e1e2e; border: 1px solid #2a2a3a; border-radius: 10px; padding: 20px 16px;
  text-align: center; cursor: pointer; transition: all 0.2s;
}
.demo-card:hover { border-color: #6c5ce7; background: #252540; }
.demo-icon { font-size: 36px; margin-bottom: 8px; }
.demo-name { font-size: 14px; color: #ddd; font-weight: 500; }
.demo-desc { font-size: 12px; color: #777; margin-top: 4px; }

.screenshot-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.screenshot-content { background: #1e1e2e; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; }
.screenshot-content h3 { color: #ddd; margin-bottom: 12px; }
.screenshot-img { width: 100%; border-radius: 8px; }
.screenshot-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }
.btn-download { background: #6c5ce7; color: #fff; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; }
.btn-close { background: #333; color: #ccc; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
</style>
