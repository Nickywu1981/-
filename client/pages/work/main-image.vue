<template>
  <WorkLayout :steps="stepLabels" :current-step="step">
    <!-- Step 1: 上传 -->
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📷</p>
        <p>{{ $t('work_pages.main_image_drop_hint') }}</p>
        <p class="dz-hint">{{ $t('work_pages.main_image_drop_format') }}</p>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.main_image_select_file') }}</button>
      </div>
      <div v-if="previewUrl" class="preview">
        <img loading="lazy" :src="previewUrl" :alt="$t('work_pages.main_image_preview')" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <p v-if="uploading" class="uploading-hint">{{ $t('work_pages.main_image_uploading') }}</p>
        <p v-else-if="uploadedUrl" class="uploaded-hint">{{ $t('work_pages.main_image_uploaded') }} ✓</p>
      </div>
      <SmartRecognitionPanel
        v-if="uploadedUrl"
        :hint="$t('work_pages.main_image_smart_hint')"
        :confirm-label="$t('work_pages.main_image_confirm_continue')"
        @confirm="onSmartApply"
      />
      <button v-if="uploadedUrl" class="btn" @click="step = 1">{{ $t('work_pages.main_image_next_platform') }}</button>
    </div>

    <!-- Step 2: 选平台 -->
    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.main_image_select_platform') }}</h3>
      <div class="platform-grid">
        <button v-for="p in platforms" :key="p.code" class="plat-card" :class="{ active: selectedPlatform === p.code }" @click="selectedPlatform = p.code">
          {{ p.name }}
        </button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.main_image_goback') }}</button>
        <button class="btn" :disabled="!selectedPlatform" @click="step = 2">{{ $t('work_pages.main_image_next_style') }}</button>
      </div>
    </div>

    <!-- Step 3: 选风格 -->
    <div v-else-if="step === 2" class="select-section">
      <h3>{{ $t('work_pages.main_image_select_style') }}</h3>
      <div class="style-grid">
        <button v-for="s in styles" :key="s.id" class="style-card" :class="{ active: selectedStyle === s.id }" @click="selectedStyle = s.id">
          <div class="style-preview">{{ s.preview }}</div>
          <span>{{ $t(s.nameKey) }}</span>
        </button>
      </div>
      <div class="actions">
        <button class="btn-outline" @click="step = 1">{{ $t('work_pages.main_image_goback') }}</button>
        <button class="btn" :disabled="!selectedStyle" @click="submitTask">{{ $t('work_pages.main_image_start_generate') }}</button>
      </div>

      <!-- 提示词润色 -->
      <div class="enhance-section">
        <p class="enhance-label">{{ $t('work_pages.main_image_prompt_help') }}</p>
        <PromptEnhancer mode="image" :initial-prompt="stylePrompt" @applied="(v) => stylePrompt = v" />
      </div>
    </div>

    <!-- Step 4: 生成中 / 结果 -->
    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" />
        <p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2" class="result-images">
        <h3>{{ $t('work_pages.main_image_done_title') }}</h3>
        <div class="image-grid">
          <div v-for="img in task.result.value?.images" :key="img.id" class="result-card">
            <img loading="lazy" :src="img.url" :alt="img.style" class="result-img" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <span class="img-label">{{ img.style }}</span>
            <button class="btn-sm">{{ $t('work_pages.main_image_download') }}</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">{{ $t('work_pages.main_image_redo') }}</button>
          <NuxtLink to="/my/works" class="btn">{{ $t('work_pages.main_image_goto_lib') }}</NuxtLink>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p class="error-msg">{{ task.errorMsg.value || $t('common.failed_generate_retry') }}</p>
        <button class="btn" @click="handleRedo">{{ $t('work_pages.main_image_redo') }}</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()

import PromptEnhancer from '~/components/PromptEnhancer.vue'
import SmartRecognitionPanel from '~/components/shared/SmartRecognitionPanel.vue'
const { t } = useI18n()

const toast = useToast()
const step = ref(0);
const previewUrl = ref('');
const uploadedUrl = ref('');
const uploading = ref(false);
const selectedPlatform = ref('');
const selectedStyle = ref('');
const stylePrompt = ref('');
const task = useTask();
const stepLabels = computed(() => [t('work_pages.main_image_step_upload'), t('work_pages.main_image_step_platform'), t('work_pages.main_image_step_style'), t('work_pages.main_image_step_generate')]);

const platforms = computed(() => [
  { code: 'taobao', name: t('work_pages.main_image_platform_taobao') }, { code: 'pdd', name: t('work_pages.main_image_platform_pdd') }, { code: 'douyin', name: t('work_pages.main_image_platform_douyin') },
  { code: 'xiaohongshu', name: t('work_pages.main_image_platform_xiaohongshu') }, { code: 'sph', name: t('work_pages.main_image_platform_sph') }, { code: 'amazon', name: t('work_pages.main_image_platform_amazon') },
  { code: 'temu', name: 'Temu' }, { code: 'shein', name: 'Shein' }, { code: 'tiktok', name: 'TikTok Shop' },
  { code: 'mercado', name: t('work_pages.main_image_platform_mercado') }, { code: 'ozon', name: 'Ozon' }, { code: 'shopee', name: 'Shopee' }, { code: 'lazada', name: 'Lazada' },
]);

const styles = [
  { id: 'simple', nameKey: 'work_pages.main_image_style_simple', preview: '⬜' },
  { id: 'luxury', nameKey: 'work_pages.main_image_style_luxury', preview: '✨' },
  { id: 'promo', nameKey: 'work_pages.main_image_style_promo', preview: '🏷' },
];

async function uploadFile(file: File) {
  uploading.value = true;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res: any = await $fetch('/api/upload/image', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    uploadedUrl.value = res.data?.url;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || t('common.failed_upload_retry'));
  }
  uploading.value = false;
}

async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    if (previewUrl.value) revoke(previewUrl.value);
    previewUrl.value = createBlobUrl(file);
    await uploadFile(file);
  }
}

async function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    if (previewUrl.value) revoke(previewUrl.value);
    previewUrl.value = createBlobUrl(file);
    await uploadFile(file);
  }
}

async function submitTask() {
  if (!uploadedUrl.value) { toast.warn(t('common.upload_image_first')); return; }
  try {
    const res = await $fetch('/api/images/main-image', {
      method: 'POST',
      credentials: 'include',
      body: { imageUrl: uploadedUrl.value, platform: selectedPlatform.value, style: selectedStyle.value },
    });
    step.value = 3;
    task.pollTask((res as any).data.taskId);
  } catch (err: unknown) { const e = err as { data?: { msg?: string }; message?: string };
    toast.error(e?.data?.msg || e?.message || t('common.failed_submit_retry'));
  }
}

function handleRedo() {
  task.reset();
  step.value = 0;
  previewUrl.value = '';
  uploadedUrl.value = '';
}

onUnmounted(() => { if (previewUrl.value) revoke(previewUrl.value) })

function onSmartApply(info: { productName: string; category: string; features: string[]; refUrl: string }) {
  stylePrompt.value = `产品: ${info.productName}\n品类: ${info.category}\n特征: ${info.features.join(', ')}`
  step.value = 2 // 跳到风格选择
}

definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.plat-card { padding: 10px 18px; border: 1px solid var(--border-light); border-radius: var(--radius-full); background: var(--bg-card); font-size: 14px; cursor: pointer; color: var(--text-secondary); transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); }
.plat-card:hover { border-color: var(--brand); color: var(--brand); }
.plat-card.active { background: var(--brand-gradient); color: #fff; border-color: transparent; }
.style-preview { font-size: 32px; margin-bottom: 8px; }
</style>
