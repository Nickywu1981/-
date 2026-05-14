<!--
  Movio AI v4.1 — Poster & Social Cover Page
  G4 前端开发 | Phase 2
  统一入口：产品海报/节日海报/活动海报/私域海报/小红书封面/公众号封面
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg?.title || $t('work_pages.poster_index.title') }}</h1>
      <p>{{ headerCfg?.subtitle || $t('work_pages.poster_index.subtitle') }}</p>
    </header>

    <!-- 类型选择卡片 -->
    <div class="type-grid">
      <button
        v-for="t in types"
        :key="t.key"
        class="type-card"
        :class="{ active: activeType === t.key }"
        @click="activeType = t.key"
      >
        <span class="type-icon">{{ t.icon }}</span>
        <span class="type-label">{{ $t(t.nameKey) }}</span>
        <span class="type-size">{{ t.sizeText }}</span>
      </button>
    </div>

    <div class="work-panel">
      <!-- 提示词输入 -->
      <div class="prompt-area">
        <label class="area-label">{{ $t('work_pages.poster_index.prompt_label', { type: $t(activeTypeCfg?.nameKey || '') }) }}</label>
        <textarea
          v-model="prompt"
          class="input prompt-input"
          rows="4"
          :placeholder="$t('work_pages.poster_index.prompt_placeholder')"
          maxlength="4000"
        ></textarea>
        <div class="prompt-actions">
          <PromptEnhancer v-model="prompt" type="poster" @enhanced="onPromptEnhanced" />
          <button class="btn btn-ghost btn-sm" :disabled="enhancing" @click="doEnhance">
            {{ enhancing ? $t('work_pages.poster_index.enhancing') : $t('work_pages.poster_index.enhance_btn') }}
          </button>
          <span v-if="enhancedPrompt" class="enhanced-hint">{{ $t('work_pages.poster_index.enhanced') }}</span>
        </div>
        <div v-if="enhancedPrompt" class="enhanced-preview">
          <span class="preview-label">{{ $t('work_pages.poster_index.enhanced_label') }}</span>
          <p>{{ enhancedPrompt }}</p>
        </div>
      </div>

      <!-- 风格选择 -->
      <div class="options-row" v-if="activeStyleCfg">
        <div class="option">
          <label>{{ $t('work_pages.poster_index.style_label') }}</label>
          <select v-model="customStyle" class="input">
            <option value="">{{ activeStyleCfg }}</option>
            <option v-for="s in styleOptions" :key="s.item_key" :value="s.item_value">{{ s.item_value }}</option>
          </select>
        </div>
        <div class="option">
          <label>{{ $t('work_pages.poster_index.spec_label') }}</label>
          <input class="input" :value="activeTypeCfg?.sizeText" disabled />
        </div>
      </div>

      <button
        class="btn btn-primary btn-lg"
        :disabled="!prompt || submitting"
        @click="doGenerate"
      >
        {{ submitting ? $t('work_pages.poster_index.submitting') : $t('work_pages.poster_index.generate_btn', { type: $t(activeTypeCfg?.nameKey || '') }) }}
      </button>

      <AppTaskProgress
        v-if="jobId"
        :job-id="jobId"
        @completed="onCompleted"
        @failed="onFailed"
      />
      <div v-if="resultUrl" class="result-preview">
        <img loading="lazy" :src="resultUrl" :alt="activeTypeCfg?.label" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
        <div class="result-actions">
          <button class="btn btn-secondary" @click="downloadResult">{{ $t('work_pages.poster_index.download_btn') }}</button>
          <button class="btn btn-ghost" @click="reset">{{ $t('work_pages.poster_index.regen_btn') }}</button>
        </div>
      </div>
    </div>

    <!-- 作品列表 -->
    <section class="works-section">
      <h2>{{ $t('work_pages.poster_index.my_works') }}</h2>
      <div class="works-filter">
        <select v-model="filterType" class="input" @change="loadWorks">
          <option value="">{{ $t('work_pages.poster_index.all_types') }}</option>
          <option v-for="t in types" :key="t.key" :value="t.key">{{ $t(t.nameKey) }}</option>
        </select>
      </div>
      <div v-if="loadingWorks" class="loading">{{ $t('work_pages.poster_index.loading') }}</div>
      <div v-else-if="!works.length" class="empty">{{ $t('work_pages.poster_index.empty_works') }}</div>
      <div v-else class="works-grid">
        <div v-for="w in works" :key="w.id" class="work-card">
          <img :src="w.thumbnail_url || w.result_url" :alt="w.poster_type" loading="lazy" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <div class="work-meta">
            <span class="meta-type">{{ typeLabel(w.poster_type) }}</span>
            <span class="meta-status" :class="w.status">{{ w.status }}</span>
          </div>
          <div class="work-actions">
            <button class="btn btn-sm btn-secondary" @click="download(w.result_url)">{{ $t('work_pages.poster_index.download_btn') }}</button>
          </div>
        </div>
      </div>
      <div v-if="totalWorks > limit" class="pagination">
        <button :disabled="page <= 1" @click="page--; loadWorks()">{{ $t('work_pages.poster_index.prev_page') }}</button>
        <span>{{ page }} / {{ Math.ceil(totalWorks / limit) }}</span>
        <button :disabled="page >= Math.ceil(totalWorks / limit)" @click="page++; loadWorks()">{{ $t('work_pages.poster_index.next_page') }}</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">

import PromptEnhancer from '~/components/PromptEnhancer.vue'
const { t } = useI18n()

;

const { config: headerCfg } = useSiteConfig('page.poster');
const toast = useToast()

const types = [
  { key: 'product', icon: '🛍️', nameKey: 'work_pages.poster_index.type_product', sizeText: '1200×1800 (2:3)' },
  { key: 'holiday', icon: '🎉', nameKey: 'work_pages.poster_index.type_holiday', sizeText: '1200×1800 (2:3)' },
  { key: 'event', icon: '📢', nameKey: 'work_pages.poster_index.type_event', sizeText: '1920×1080 (16:9)' },
  { key: 'private', icon: '💬', nameKey: 'work_pages.poster_index.type_private', sizeText: '1080×1920 (9:16)' },
  { key: 'xhs', icon: '📕', nameKey: 'work_pages.poster_index.type_xhs', sizeText: '1080×1440 (3:4)' },
  { key: 'wechat', icon: '💬', nameKey: 'work_pages.poster_index.type_wechat', sizeText: '900×383 (2.35:1)' },
];

const activeType = ref('product');
const prompt = ref('');
const enhancedPrompt = ref('');
const customStyle = ref('');
const enhancing = ref(false);
const submitting = ref(false);
const jobId = ref(null);
const resultUrl = ref(null);

const styleOptions = ref([]);
const works = ref([]);
const filterType = ref('');
const loadingWorks = ref(false);
const page = ref(1);
const limit = 20;
const totalWorks = ref(0);

const activeTypeCfg = computed(() => types.find(t => t.key === activeType.value));
const activeStyleCfg = computed(() => {
  const m: Record<string, string> = {
    product: t('work_pages.poster_index.style_product'),
    holiday: t('work_pages.poster_index.style_holiday'),
    event: t('work_pages.poster_index.style_event'),
    private: t('work_pages.poster_index.style_private'),
    xhs: t('work_pages.poster_index.style_xhs'),
    wechat: t('work_pages.poster_index.style_wechat'),
  };
  return m[activeType.value] || '';
});

function typeLabel(typeVal: string) {
  const found = types.find(t => t.key === typeVal);
  return found ? t(found.nameKey) : typeVal;
}

async function doEnhance() {
  if (!prompt.value) return;
  enhancing.value = true;
  try {
    const data = await $fetch('/api/posters/enhance-prompt', {
      method: 'POST',
      body: { prompt: prompt.value, posterType: activeType.value },
      credentials: 'include',
    });
    enhancedPrompt.value = data.data?.enhancedPrompt || data.data?.prompt;
  } catch (e) {
    useToast().error(e.data?.message || t('work_pages.poster_index.enhance_failed'));
  } finally {
    enhancing.value = false;
  }
}
function onPromptEnhanced({ enhanced: val }: { original: string; enhanced: string }) {
  enhancedPrompt.value = val
}

async function doGenerate() {
  submitting.value = true;
  try {
    const data = await $fetch('/api/posters/generate', {
      method: 'POST',
      body: {
        posterType: activeType.value,
        prompt: prompt.value,
        enhancedPrompt: enhancedPrompt.value || undefined,
        style: customStyle.value || undefined,
      },
      credentials: 'include',
    });
    jobId.value = data.data?.job_id;
    useToast().success(t('work_pages.poster_index.task_submitted'));
  } catch (e) {
    useToast().error(e.data?.message || t('common.failed_generate'));
  } finally { submitting.value = false; }
}

function onCompleted({ resultUrl: url }) {
  resultUrl.value = url;
  submitting.value = false;
  loadWorks();
}
function onFailed({ error: err }) {
  useToast().error(err || t('work_pages.poster_index.task_failed'));
  submitting.value = false;
  jobId.value = null;
}
function downloadResult() {
  if (resultUrl.value) download(resultUrl.value);
}
function reset() {
  jobId.value = null;
  resultUrl.value = null;
}

async function loadWorks() {
  loadingWorks.value = true;
  try {
    const params = new URLSearchParams({ page: page.value, limit });
    if (filterType.value) params.set('type', filterType.value);
    const data = await $fetch(`/api/posters/works?${params}`, { credentials: 'include' });
    works.value = data.data?.rows || data.data || [];
    totalWorks.value = data.data?.total || 0;
  } catch (e) {
    toast.error(t('common.failed_load_works_retry'))
  } finally {
    loadingWorks.value = false;
  }
}

const { download } = useFileDownload()

// load sizes/styles on mount
onMounted(async () => {
  try {
    const data = await $fetch('/api/posters/sizes', { credentials: 'include' });
    const styles = data.data?.styles || {};
    if (styles.custom_options) {
      styleOptions.value = styles.custom_options.map((s, i) => ({ item_key: `s${i}`, item_value: s }));
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; useToast().error(err?.data?.msg || e?.message || t('work_pages.poster_index.load_styles_failed')) }
  loadWorks();
});
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.work-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.work-header { margin-bottom: 24px; }
.work-header h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.work-header p { color: var(--text-secondary); margin-top: 4px; }

.type-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px; }
.type-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 16px 8px; border: 2px solid var(--border-color); border-radius: 12px;
  background: var(--bg-card); cursor: pointer; transition: border-color .2s, transform .2s, box-shadow .2s;
}
.type-card:hover { border-color: var(--brand); }
.type-card.active { border-color: var(--brand); background: var(--brand-light, #eef2ff); }
.type-icon { font-size: 28px; }
.type-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.type-size { font-size: 11px; color: var(--text-tertiary); }

.work-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; }
.prompt-area { margin-bottom: 16px; }
.area-label { display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); }
.prompt-input { width: 100%; resize: vertical; min-height: 100px; }
.prompt-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.enhanced-hint { font-size: 12px; color: var(--brand); }
.enhanced-preview { margin-top: 8px; padding: 10px; background: var(--bg-subtle); border-radius: 8px; }
.enhanced-preview .preview-label { font-size: 12px; color: var(--text-tertiary); }
.enhanced-preview p { margin: 4px 0 0; font-size: 14px; color: var(--brand); }

.options-row { display: flex; gap: 16px; margin-bottom: 16px; }
.option { flex: 1; }
.option label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--text-secondary); }
.option .input { width: 100%; }

.btn-lg { width: 100%; padding: 12px; font-size: 16px; margin-top: 8px; }

.result-preview { margin-top: 24px; text-align: center; }
.result-preview img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.result-actions { margin-top: 12px; display: flex; gap: 12px; justify-content: center; }

.works-section { margin-top: 32px; }
.works-section h2 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
.works-filter { margin-bottom: 12px; }
.works-filter select { width: 180px; }
.works-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.work-card { border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--bg-card); }
.work-card img { width: 100%; aspect-ratio: 2/3; object-fit: cover; }
.work-meta { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; }
.meta-type { font-size: 12px; font-weight: 600; }
.meta-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.meta-status.completed { background: #e6f7e6; color: var(--success); }
.meta-status.processing { background: #fff3e0; color: #e65100; }
.meta-status.failed { background: var(--danger-light); color: #c62828; }
.work-actions { padding: 0 12px 12px; }
.loading, .empty { text-align: center; color: var(--text-tertiary); padding: 40px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }

@media (max-width: 768px) {
  .type-grid { grid-template-columns: repeat(3, 1fr); }
  .works-grid { grid-template-columns: repeat(2, 1fr); }
  .options-row { flex-direction: column; }
}
</style>
