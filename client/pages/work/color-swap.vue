<template>
  <WorkLayout :steps="['上传产品', '选颜色', '生成']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">👗</p>
        <p>上传服装/鞋包/配饰产品图</p>
        <p class="hint">AI自动识别可换色区域，保留褶皱纹理细节</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="($refs.fileInput as HTMLInputElement)?.click()">选择图片</button>
      </div>
      <div v-if="previewUrl" class="preview-box"><img :src="previewUrl" /></div>
      <p v-if="uploading" class="hint uploading">⏳ 上传中...</p>
      <p v-else-if="uploadedUrl" class="hint uploaded">✓ 已上传</p>
      <button v-if="previewUrl" class="btn" @click="step = 1">下一步：选颜色</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择目标颜色</h3>
      <div class="palette-grid">
        <button v-for="c in presetColors" :key="c.value" class="color-btn" :class="{ active: selectedColors.includes(c.value) }" @click="toggleColor(c.value)">
          <span class="color-swatch" :style="{ background: c.value }" />
          <span class="color-label">{{ c.label }}</span>
        </button>
      </div>
      <div class="custom-color">
        <input v-model="customColor" type="color" />
        <input v-model="customColorHex" placeholder="#FF0000" class="color-hex" />
        <button class="btn-outline-sm" @click="addCustomColor">添加</button>
      </div>
      <div v-if="selectedColors.length" class="selected-colors">
        <span v-for="c in selectedColors" :key="c" class="tag" :style="{ background: c }">{{ c }}</span>
      </div>
      <p class="cost-hint">成本：3 点/次 · {{ selectedColors.length || 3 }} 色</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">开始换色</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>换色完成</h3>
        <div class="image-grid">
          <div v-for="img in (task.result.value?.images || [])" :key="img.color" class="result-card">
            <div class="result-img" />
            <span class="result-label" :style="{ background: img.color }">{{ img.color }}</span>
          </div>
        </div>
        <div class="actions"><button class="btn-outline" @click="handleRedo">再做一次</button></div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">

const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedColors = ref<string[]>([]);
const customColor = ref('#FF0000');
const customColorHex = ref('');
const task = useTask();

const presetColors = [
  { value: '#FF0000', label: '红色' }, { value: '#FF6600', label: '橙色' }, { value: '#FFD700', label: '金色' },
  { value: '#00FF00', label: '绿色' }, { value: '#0080FF', label: '蓝色' }, { value: '#8000FF', label: '紫色' },
  { value: '#FF69B4', label: '粉色' }, { value: '#000000', label: '黑色' }, { value: '#FFFFFF', label: '白色' },
  { value: '#808080', label: '灰色' }, { value: '#8B4513', label: '棕色' }, { value: '#F5F5DC', label: '米色' },
];

function toggleColor(c: string) {
  const i = selectedColors.value.indexOf(c);
  if (i >= 0) selectedColors.value.splice(i, 1);
  else selectedColors.value.push(c);
}
function addCustomColor() {
  const c = customColorHex.value || customColor.value;
  if (c && !selectedColors.value.includes(c)) selectedColors.value.push(c);
  customColorHex.value = '';
}

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData }); uploadedUrl.value = res.data.url; } catch (e: any) { toast.error(e.data?.msg || '上传失败'); }
  uploading.value = false;
}

async function handleFile(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) { previewUrl.value = URL.createObjectURL(files[0]); await uploadFile(files[0]); }
}
async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files?.length) { previewUrl.value = URL.createObjectURL(files[0]); await uploadFile(files[0]); }
}

async function submitTask() {
  if (!uploadedUrl.value) { toast.warn('请先上传图片'); return; }
  step.value = 2;
  try {
    const colors = selectedColors.value.length ? selectedColors.value : ['#FF0000', '#0000FF', '#00FF00'];
    const res = await $fetch('/api/advanced/color-swap', {
      method: 'POST', credentials: 'include',
      body: { productImageUrl: uploadedUrl.value, targetColors: colors },
    });
    task.pollTask((res as any).data.taskId, '/api/advanced/tasks/');
  } catch (err: any) {
    toast.error(err?.data?.msg || err?.message || '任务提交失败，请重试');
    step.value = 1;
  }
}
function handleRedo() { task.reset(); step.value = 0; previewUrl.value = ''; uploadedUrl.value = ''; selectedColors.value = []; }
</script>

<style scoped>
.btn-outline-sm { padding: 6px 14px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; font-size: 12px; }
.palette-grid { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; max-width: 500px; margin: 0 auto; }
.color-btn { padding: 10px; border: 2px solid var(--border-light); border-radius: 10px; background: var(--bg-card); cursor: pointer; text-align: center; width: 70px; }
.color-btn.active { border-color: var(--brand); }
.color-swatch { width: 36px; height: 36px; border-radius: 50%; display: block; margin: 0 auto 4px; border: 1px solid var(--border-light); }
.color-label { font-size: 11px; color: var(--text-secondary); }
.custom-color { display: flex; gap: 8px; align-items: center; justify-content: center; margin-top: 16px; }
.custom-color input[type="color"] { width: 36px; height: 36px; border: 1px solid var(--border-light); border-radius: 6px; cursor: pointer; }
.color-hex { width: 100px; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 6px; font-size: 13px; }
.selected-colors { display: flex; gap: 6px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.tag { padding: 3px 10px; border-radius: 12px; color: #fff; font-size: 11px; text-shadow: 0 0 2px rgba(0,0,0,0.5); }
.image-grid { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.result-card { text-align: center; }
.result-img { width: 160px; aspect-ratio: 1; background: var(--bg-hover); border-radius: 8px; }
.result-label { font-size: 11px; color: #fff; padding: 2px 8px; border-radius: 10px; margin-top: 4px; display: inline-block; text-shadow: 0 0 2px rgba(0,0,0,0.3); }
</style>
