<template>
  <WorkLayout :steps="detailSteps" :current-step="step">
    <!-- Step 0: 上传产品图 -->
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📄</p>
        <p>{{ $t('work_pages.detail_h5.drag_hint') }}</p>
        <p class="hint">{{ $t('work_pages.detail_h5.support_hint') }}</p>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFiles" />
        <button class="btn-outline" @click="fileInput?.click()">{{ $t('work_pages.detail_h5.select_files') }}</button>
      </div>

      <div v-if="skuList.length" class="sku-preview-section">
        <h4>{{ $t('work_pages.detail_h5.sku_ready', { n: skuList.length }) }}</h4>
        <div class="sku-grid">
          <div v-for="(sku, i) in skuList" :key="i" class="sku-card">
            <img loading="lazy" :src="sku.previewUrl" :alt="$t('work_pages.detail_h5.sku_preview_alt')" class="sku-thumb" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div class="sku-info">
              <input v-model="sku.name" :placeholder="$t('work_pages.detail_h5.sku_name_placeholder')" class="sku-name-input" maxlength="100" />
              <input v-model="sku.color" type="color" class="sku-color" :title="$t('work_pages.detail_h5.sku_color_pick')" />
              <button class="sku-remove" @click="removeSku(i)" :title="$t('work_pages.detail_h5.sku_remove')" :aria-label="$t('work_pages.detail_h5.sku_remove')">✕</button>
            </div>
            <span v-if="sku.uploaded" class="sku-badge ok">✓</span>
            <span v-else class="sku-badge pending">{{ $t('work_pages.detail_h5.uploading_tag') }}</span>
          </div>
        </div>
      </div>

      <!-- empty state -->
      <div v-if="!skuList.length" class="empty-hint">
        <span class="empty-icon">📄</span>
        <p>{{ $t('work_pages.detail_h5.empty_hint') }}</p>
      </div>

      <button v-if="skuList.length && allUploaded" class="btn" @click="step = 1">{{ $t('work_pages.detail_h5.next_config') }}</button>
    </div>

    <!-- Step 1: 配置SKU -->
    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.detail_h5.sku_config_title') }}</h3>
      <p class="section-hint">{{ $t('work_pages.detail_h5.sku_config_hint') }}</p>

      <div class="sku-config-list">
        <div v-for="(sku, i) in skuList" :key="i" class="sku-config-row">
          <img loading="lazy" :src="sku.previewUrl" :alt="$t('work_pages.detail_h5.sku_preview_alt')" class="sku-thumb-sm" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <div class="sku-fields">
            <input v-model="sku.name" :placeholder="$t('work_pages.detail_h5.sku_name')" class="input-sm" maxlength="100" />
            <input v-model="sku.spec" :placeholder="$t('work_pages.detail_h5.spec_placeholder')" class="input-sm" maxlength="100" />
            <input v-model.number="sku.price" :placeholder="$t('work_pages.detail_h5.price_placeholder')" type="number" class="input-sm price-input" />
          </div>
          <div class="sku-color-pick">
            <input v-model="sku.color" type="color" :title="$t('work_pages.detail_h5.sku_color_pick')" />
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.detail_h5.back') }}</button>
        <button class="btn" @click="step = 2">{{ $t('work_pages.detail_h5.next_select') }}</button>
      </div>
    </div>

    <!-- Step 2: 选类目+模板 -->
    <div v-else-if="step === 2" class="select-section">
      <h3>{{ $t('work_pages.detail_h5.select_category') }}</h3>
      <div class="cat-grid">
        <button v-for="c in categories" :key="c.id" class="cat-card" :class="{ active: selectedCategory === c.id }" @click="selectedCategory = c.id">
          {{ c.icon }} {{ c.name }}
        </button>
      </div>

      <h3>{{ $t('work_pages.detail_h5.select_template') }}</h3>
      <div class="tmpl-grid">
        <button v-for="t in templates" :key="t.id" class="tmpl-card" :class="{ active: selectedTemplate === t.id }" @click="selectedTemplate = t.id">
          <div class="tmpl-preview">{{ t.style }}</div>
          <span>{{ t.name }}</span>
        </button>
      </div>

      <h3>{{ $t('work_pages.detail_h5.target_platform') }}</h3>
      <div class="platform-row">
        <select v-model="selectedPlatform" class="select">
          <option value="">{{ $t('work_pages.detail_h5.select_platform') }}</option>
          <option v-for="p in platforms" :key="p.code" :value="p.code">{{ p.name }}</option>
        </select>
      </div>

      <div class="summary-box">
        <div class="summary-row"><span>{{ $t('work_pages.detail_h5.sku_count') }}</span><strong>{{ skuList.length }} {{ $t('work_pages.detail_h5.sku_unit') }}</strong></div>
        <div class="summary-row"><span>{{ $t('work_pages.detail_h5.category') }}</span><strong>{{ categoryLabel }}</strong></div>
        <div class="summary-row"><span>{{ $t('work_pages.detail_h5.template') }}</span><strong>{{ templateLabel }}</strong></div>
        <div class="summary-row cost"><span>{{ $t('work_pages.detail_h5.estimated_cost') }}</span><strong>{{ estimatedCost }} {{ $t('work_pages.detail_h5.points_unit') }}</strong></div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 1">{{ $t('work_pages.detail_h5.back') }}</button>
        <button class="btn" @click="submitTask">{{ $t('work_pages.detail_h5.generate_btn') }} ({{ skuList.length }} SKU)</button>
      </div>
    </div>

    <!-- Step 3: 结果 -->
    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.detail_h5.complete_title') }} — {{ task.result.value?.total }} SKU</h3>
        <div v-if="task.result.value?.skus" class="sku-result-list">
          <div v-for="(s, i) in task.result.value.skus" :key="i" class="sku-result-card">
            <span class="sku-label">{{ s.name }}</span>
            <p class="copy-preview">{{ s.copy?.title }}</p>
            <ul v-if="s.copy?.bullets"><li v-for="b in s.copy.bullets" :key="b">{{ b }}</li></ul>
          </div>
        </div>
        <div class="actions">
          <button class="btn">📥 {{ $t('work_pages.detail_h5.download_all') }}</button>
          <button class="btn-outline" @click="handleRedo">{{ $t('work_pages.detail_h5.regenerate') }}</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box">
        <p>{{ task.errorMsg.value || $t('work_pages.detail_h5.generate_failed') }}</p>
        <button class="btn" @click="handleRedo()">{{ $t('work_pages.detail_h5.retry') }}</button>
      </div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()
const { t } = useI18n()

interface SkuItem {
  previewUrl: string;
  uploadedUrl: string;
  uploaded: boolean;
  name: string;
  spec: string;
  price: number | null;
  color: string;
}

const step = ref(0);
const uploading = ref(false);
const selectedCategory = ref('');
const selectedTemplate = ref('');
const selectedPlatform = ref('');
const task = useTask();
const fileInput = ref<HTMLInputElement | null>(null)
const skuList = ref<SkuItem[]>([]);

const detailSteps = computed(() => [
  t('work_pages.detail_h5.step_upload'),
  t('work_pages.detail_h5.step_config_sku'),
  t('work_pages.detail_h5.step_category'),
  t('work_pages.detail_h5.step_generate'),
])

const categories = computed(() => [
  { id: 'clothing', name: t('work_pages.detail_h5.cat_clothing'), icon: '👗' },
  { id: 'shoes', name: t('work_pages.detail_h5.cat_shoes'), icon: '👠' },
  { id: 'beauty', name: t('work_pages.detail_h5.cat_beauty'), icon: '💄' },
  { id: 'home', name: t('work_pages.detail_h5.cat_home'), icon: '🏠' },
  { id: 'digital', name: t('work_pages.detail_h5.cat_digital'), icon: '📱' },
  { id: 'food', name: t('work_pages.detail_h5.cat_food'), icon: '🍜' },
]);
const templatesList = computed(() => [
  { id: 'std', name: t('work_pages.detail_h5.template_std'), style: t('work_pages.detail_h5.template_std_style') },
  { id: 'brand', name: t('work_pages.detail_h5.template_brand'), style: t('work_pages.detail_h5.template_brand_style') },
  { id: 'spec', name: t('work_pages.detail_h5.template_spec'), style: t('work_pages.detail_h5.template_spec_style') },
  { id: 'promo', name: t('work_pages.detail_h5.template_promo'), style: t('work_pages.detail_h5.template_promo_style') },
]);
const platforms = computed(() => [
  { code: 'taobao', name: t('work_pages.main_image_platform_taobao') }, { code: 'pdd', name: t('work_pages.main_image_platform_pdd') }, { code: 'douyin', name: t('work_pages.main_image_platform_douyin') },
  { code: 'amazon', name: t('work_pages.main_image_platform_amazon') }, { code: 'tiktok', name: 'TikTok Shop' },
  { code: 'shopee', name: 'Shopee' }, { code: 'lazada', name: 'Lazada' },
]);

const allUploaded = computed(() => skuList.value.length > 0 && skuList.value.every(s => s.uploaded));
const categoryLabel = computed(() => categories.value.find(c => c.id === selectedCategory.value)?.name || t('work_pages.detail_h5.none_selected'));
const templateLabel = computed(() => templatesList.value.find(t => t.id === selectedTemplate.value)?.name || t('work_pages.detail_h5.none_selected'));
const estimatedCost = computed(() => skuList.value.length * 8);

function removeSku(i: number) { skuList.value.splice(i, 1); }

async function uploadSingle(file: File): Promise<string> {
  try {
    const formData = new FormData(); formData.append('file', file);
    const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData });
    return res?.data?.url || '';
  } catch { return ''; }
}

async function handleFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) return;
  await addFiles(Array.from(files));
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  await addFiles(Array.from(files));
}

async function addFiles(files: File[]) {
  if (skuList.value.length + files.length > 20) { toast.error(t('work_pages.detail_h5.max_sku_error')); return; }
  uploading.value = true;

  for (const f of files) {
    const previewUrl = createBlobUrl(f);
    const idx = skuList.value.length;
    skuList.value.push({
      previewUrl, uploadedUrl: '', uploaded: false,
      name: `SKU-${idx + 1}`, spec: '', price: null, color: '#CCCCCC',
    });
    const skuIndex = skuList.value.length - 1;

    try {
      const url = await uploadSingle(f);
      skuList.value[skuIndex].uploadedUrl = url;
      skuList.value[skuIndex].uploaded = true;
    } catch {
      skuList.value[skuIndex].uploaded = false;
      toast.error(t('work_pages.detail_h5.upload_failed', { name: f.name || t('work_pages.detail_h5.image_label') }));
    }
  }
  uploading.value = false;
}

async function submitTask() {
  if (!skuList.value.every(s => s.uploaded)) { toast.error(t('work_pages.detail_h5.wait_upload')); return; }
  step.value = 3;
  try {
    const res = await $fetch('/api/images/detail-h5', {
      method: 'POST',
      credentials: 'include',
      body: {
        skus: skuList.value.map(s => ({
          imageUrl: s.uploadedUrl, name: s.name, spec: s.spec,
          price: s.price, color: s.color,
        })),
        category: selectedCategory.value,
        templateId: selectedTemplate.value,
        platform: selectedPlatform.value,
      },
    });
    task.pollTask((res as any).data.taskId);
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('work_pages.detail_h5.submit_failed')); step.value = 2; }
}

function handleRedo() { task.reset(); step.value = 0; skuList.value.forEach(s => { if (s.previewUrl) revoke(s.previewUrl) }); skuList.value = []; }

onUnmounted(() => { skuList.value.forEach(s => { if (s.previewUrl) revoke(s.previewUrl) }) });
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.section-hint { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.sku-preview-section { margin-top: 20px; }
.sku-preview-section h4 { font-size: 15px; color: var(--text-primary); margin-bottom: 12px; }
.sku-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.sku-card { position: relative; background: var(--bg-card); border: 1px solid var(--input-border); border-radius: var(--radius-md); overflow: hidden; transition: border-color var(--transition-fast); }
.sku-card:hover { border-color: var(--brand); }
.sku-thumb { width: 100%; height: 120px; object-fit: cover; display: block; }
.sku-info { display: flex; align-items: center; gap: 6px; padding: 8px; }
.sku-name-input { flex: 1; padding: 4px 8px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); font-size: 12px; background: var(--bg-input); color: var(--text-primary); outline: none; min-width: 0; }
.sku-name-input:focus { border-color: var(--input-focus-border); }
.sku-color { width: 32px; height: 32px; border: 1px solid var(--input-border); border-radius: 4px; cursor: pointer; padding: 2px; }
.sku-remove { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; padding: 2px 4px; }
.sku-remove:hover { color: var(--danger); }
.sku-badge { position: absolute; top: 6px; right: 6px; font-size: 10px; padding: 2px 6px; border-radius: var(--radius-xs); font-weight: 600; }
.sku-badge.ok { background: var(--success); color: var(--text-on-brand); }
.sku-badge.pending { background: var(--warning); color: var(--text-on-brand); }

.sku-config-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.sku-config-row { display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-card); border: 1px solid var(--input-border); border-radius: var(--radius-md); }
.sku-thumb-sm { width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-xs); flex-shrink: 0; }
.sku-fields { display: flex; gap: 8px; flex: 1; min-width: 0; }
.input-sm { padding: 5px 10px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; flex: 1; min-width: 0; }
.input-sm:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.price-input { max-width: 100px; }
.sku-color-pick input { width: 32px; height: 32px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); cursor: pointer; padding: 2px; }

.summary-box { background: var(--bg-card); border: 1px solid var(--input-border); border-radius: var(--radius-md); padding: 14px 18px; margin: 16px 0; }
.summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: var(--text-primary); }
.summary-row.cost { color: var(--brand); font-size: 15px; border-top: 1px solid var(--border-light); margin-top: 4px; padding-top: 8px; }

.platform-row { margin: 12px 0 0; }
.select { width: 100%; max-width: 300px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-input); color: var(--text-primary); font-size: 14px; outline: none; }
.select:focus { border-color: var(--input-focus-border); }

.sku-result-list { display: flex; flex-direction: column; gap: 16px; margin: 16px 0; }
.sku-result-card { background: var(--bg-card); border: 1px solid var(--input-border); border-radius: var(--radius-md); padding: 14px; }
.sku-label { font-size: 12px; font-weight: 600; color: var(--brand); background: var(--status-processing-bg); padding: 2px 8px; border-radius: var(--radius-xs); }
.copy-preview { font-weight: 600; margin-top: 8px; color: var(--text-primary); }
.empty-hint { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.empty-hint p { font-size: 15px; color: var(--text-secondary); }
</style>
