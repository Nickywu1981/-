<template>
  <WorkLayout :steps="['上传爆款', '上传产品', '复刻生成']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <h3>上传爆款参考视频 + 自家产品图</h3>
      <div class="row">
        <div class="upload-col">
          <h4>爆款参考视频</h4>
          <div class="dropzone" @dragover.prevent @drop.prevent="(e) => handleDrop(e, 'ref')">
            <p v-if="!refVideoUrl" class="dz-icon">🎬</p>
            <video v-else :src="refVideoUrl" class="preview-media" controls />
            <p>{{ refVideoUrl ? '点击更换' : '上传爆款视频' }}</p>
            <input ref="refInput" type="file" accept="video/*" hidden @change="(e) => handleFile(e, 'ref')" />
            <button class="btn-outline" @click="refInput?.click()">选择视频</button>
          </div>
          <p v-if="uploadingRef" class="status">⏳ 上传中...</p>
          <p v-else-if="uploadedRefUrl" class="status ok">✓ 已上传</p>
        </div>
        <div class="upload-col">
          <h4>自家产品图</h4>
          <div class="dropzone" @dragover.prevent @drop.prevent="(e) => handleDrop(e, 'product')">
            <p v-if="!productImageUrl" class="dz-icon">📷</p>
            <img loading="lazy" v-else :src="productImageUrl" class="preview-media" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <p>{{ productImageUrl ? '点击更换' : '上传产品图' }}</p>
            <input ref="imgInput" type="file" accept="image/*" hidden @change="(e) => handleFile(e, 'product')" />
            <button class="btn-outline" @click="imgInput?.click()">选择图片</button>
          </div>
          <p v-if="uploadingProd" class="status">⏳ 上传中...</p>
          <p v-else-if="uploadedProductUrl" class="status ok">✓ 已上传</p>
        </div>
      </div>
      <button v-if="refVideoUrl && productImageUrl" class="btn" @click="step = 1">下一步：确认参数</button>
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>确认复刻参数</h3>
      <div class="summary-box">
        <div class="summary-row"><span>参考视频</span><strong>已上传 ✓</strong></div>
        <div class="summary-row"><span>产品图片</span><strong>已上传 ✓</strong></div>
        <div class="summary-row"><span>复刻强度</span><strong>{{ matchStrength * 100 }}%</strong></div>
      </div>
      <label class="slider-label">
        复刻强度: {{ matchStrength * 100 }}%
        <input v-model.number="matchStrength" type="range" min="0.3" max="1" step="0.1" class="slider" />
      </label>
      <p class="cost-hint">成本：20 点/次 · 预估60秒</p>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">开始复刻</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>爆款复刻完成</h3>
        <div class="video-placeholder">▶ 视频预览区域</div>
        <div v-if="task.result.value?.analysis" class="analysis-box">
          <h4>分析报告</h4>
          <p>匹配度：{{ task.result.value.matchScore }}</p>
          <p>节奏：{{ task.result.value.analysis.tempo }}</p>
          <p>色调：{{ task.result.value.analysis.dominantColor }}</p>
          <p>平均镜头：{{ task.result.value.analysis.avgShotLength }}</p>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">再做一次</button>
          <button class="btn">下载视频</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

const step = ref(0);
const refVideoUrl = ref('');
const productImageUrl = ref('');
const uploadedRefUrl = ref('');
const uploadedProductUrl = ref('');
const uploadingRef = ref(false);
const uploadingProd = ref(false);
const matchStrength = ref(0.8);
const refInput = ref<HTMLInputElement | null>(null)
const imgInput = ref<HTMLInputElement | null>(null)
const task = useTask();

async function uploadFile(file: File, type: string) {
  if (type === 'ref') uploadingRef.value = true;
  else uploadingProd.value = true;
  const formData = new FormData(); formData.append('file', file);
  try { const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData });
    if (type === 'ref') uploadedRefUrl.value = res.data.url;
    else uploadedProductUrl.value = res.data.url;
  } catch (e: any) { toast.error(e.data?.msg || '上传失败'); }
  if (type === 'ref') uploadingRef.value = false;
  else uploadingProd.value = false;
}

async function handleFile(e: Event, type: string) {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) return;
  const url = createBlobUrl(files[0]);
  if (type === 'ref') refVideoUrl.value = url;
  else productImageUrl.value = url;
  await uploadFile(files[0], type);
}
async function handleDrop(e: DragEvent, type: string) {
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  const url = createBlobUrl(files[0]);
  if (type === 'ref') refVideoUrl.value = url;
  else productImageUrl.value = url;
  await uploadFile(files[0], type);
}

async function submitTask() {
  if (!uploadedRefUrl.value || !uploadedProductUrl.value) { toast.warn('请先上传素材'); return; }
  step.value = 2;
  const res = await $fetch('/api/adv-video/viral-clone', {
    method: 'POST', credentials: 'include',
    body: { referenceVideoUrl: uploadedRefUrl.value, productImageUrl: uploadedProductUrl.value, matchStrength: matchStrength.value },
  });
  task.pollTask((res as any).data.taskId, '/api/adv-video/tasks/');
}
function handleRedo() { task.reset(); step.value = 0; refVideoUrl.value = ''; productImageUrl.value = ''; uploadedRefUrl.value = ''; uploadedProductUrl.value = ''; }
</script>

<style scoped>
.preview-media { width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; }
.slider-label { display: block; max-width: 420px; margin: 0 auto 16px; font-size: 13px; color: var(--text-secondary); text-align: center; }
.slider { display: block; width: 100%; margin-top: 8px; }
.analysis-box { max-width: 420px; margin: 16px auto; border: 1px solid var(--border-light); border-radius: 10px; padding: 16px; background: var(--bg-card); }
.analysis-box h4 { margin: 0 0 10px; font-size: 14px; }
.analysis-box p { font-size: 13px; color: var(--text-secondary); margin: 4px 0; }
</style>
