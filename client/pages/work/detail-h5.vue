<template>
  <WorkLayout :steps="['上传产品图', '配置SKU', '选类目+模板', '生成']" :current-step="step">
    <!-- Step 0: 上传产品图（支持多张，多SKU） -->
    <div v-if="step === 0" class="upload-section">
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📄</p>
        <p>拖拽产品图，支持多张（每张对应一个SKU）</p>
        <p class="hint">支持 JPG / PNG / WebP，一次最多 20 张</p>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFiles" />
        <button class="btn-outline" @click="($refs.fileInput as HTMLInputElement)?.click()">选择文件</button>
      </div>

      <div v-if="skuList.length" class="sku-preview-section">
        <h4>已添加 {{ skuList.length }} 个SKU</h4>
        <div class="sku-grid">
          <div v-for="(sku, i) in skuList" :key="i" class="sku-card">
            <img loading="lazy" :src="sku.previewUrl" class="sku-thumb" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
            <div class="sku-info">
              <input v-model="sku.name" placeholder="SKU名称（如：红色-M）" class="sku-name-input" />
              <input v-model="sku.color" type="color" class="sku-color" title="选颜色" />
              <button class="sku-remove" @click="removeSku(i)" title="移除">✕</button>
            </div>
            <span v-if="sku.uploaded" class="sku-badge ok">✓</span>
            <span v-else class="sku-badge pending">上传中</span>
          </div>
        </div>
      </div>

      <button v-if="skuList.length && allUploaded" class="btn" @click="step = 1">下一步：配置SKU</button>
    </div>

    <!-- Step 1: 配置SKU信息 -->
    <div v-else-if="step === 1" class="select-section">
      <h3>SKU信息配置</h3>
      <p class="section-hint">为每个SKU设置规格信息，用于生成差异化详情</p>

      <div class="sku-config-list">
        <div v-for="(sku, i) in skuList" :key="i" class="sku-config-row">
          <img loading="lazy" :src="sku.previewUrl" class="sku-thumb-sm" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <div class="sku-fields">
            <input v-model="sku.name" placeholder="SKU名称" class="input-sm" />
            <input v-model="sku.spec" placeholder="规格（如：500ml）" class="input-sm" />
            <input v-model.number="sku.price" placeholder="价格" type="number" class="input-sm price-input" />
          </div>
          <div class="sku-color-pick">
            <input v-model="sku.color" type="color" title="主色调" />
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="step = 2">下一步：选类目+模板</button>
      </div>
    </div>

    <!-- Step 2: 选类目 + 模板 -->
    <div v-else-if="step === 2" class="select-section">
      <h3>选择商品类目</h3>
      <div class="cat-grid">
        <button v-for="c in categories" :key="c.id" class="cat-card" :class="{ active: selectedCategory === c.id }" @click="selectedCategory = c.id">
          {{ c.icon }} {{ c.name }}
        </button>
      </div>

      <h3>选择详情页模板</h3>
      <div class="tmpl-grid">
        <button v-for="t in templates" :key="t.id" class="tmpl-card" :class="{ active: selectedTemplate === t.id }" @click="selectedTemplate = t.id">
          <div class="tmpl-preview">{{ t.style }}</div>
          <span>{{ t.name }}</span>
        </button>
      </div>

      <h3>目标平台</h3>
      <div class="platform-row">
        <select v-model="selectedPlatform" class="select">
          <option value="">-- 选平台 --</option>
          <option v-for="p in platforms" :key="p.code" :value="p.code">{{ p.name }}</option>
        </select>
      </div>

      <div class="summary-box">
        <div class="summary-row"><span>SKU数量</span><strong>{{ skuList.length }} 个</strong></div>
        <div class="summary-row"><span>类目</span><strong>{{ categoryLabel }}</strong></div>
        <div class="summary-row"><span>模板</span><strong>{{ templateLabel }}</strong></div>
        <div class="summary-row cost"><span>预估消耗</span><strong>{{ estimatedCost }} 点</strong></div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 1">返回</button>
        <button class="btn" @click="submitTask">开始生成 ({{ skuList.length }} SKU)</button>
      </div>
    </div>

    <!-- Step 3: 处理/结果 -->
    <div v-else class="result-section">
      <div v-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
        <div class="bar"><div class="bar-fill" :style="{ width: task.progress.value + '%' }" /></div>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>详情页生成完成 — {{ task.result.value?.total }} 个SKU</h3>
        <div v-if="task.result.value?.skus" class="sku-result-list">
          <div v-for="(s, i) in task.result.value.skus" :key="i" class="sku-result-card">
            <span class="sku-label">{{ s.name }}</span>
            <p class="copy-preview">{{ s.copy?.title }}</p>
            <ul v-if="s.copy?.bullets"><li v-for="b in s.copy.bullets" :key="b">{{ b }}</li></ul>
          </div>
        </div>
        <div class="actions">
          <button class="btn">📥 一键下载全部</button>
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


const toast = useToast()
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

const skuList = ref<SkuItem[]>([]);

const categories = [
  { id: 'clothing', name: '服装', icon: '👗' }, { id: 'shoes', name: '鞋包', icon: '👠' },
  { id: 'beauty', name: '美妆', icon: '💄' }, { id: 'home', name: '家居', icon: '🏠' },
  { id: 'digital', name: '数码', icon: '📱' }, { id: 'food', name: '食品', icon: '🍜' },
];
const templates = [
  { id: 'std', name: '标准模板', style: '图文混排' },
  { id: 'brand', name: '品牌风', style: '大图+文案' },
  { id: 'spec', name: '参数控', style: '表格+参数' },
  { id: 'promo', name: '促销风', style: '卖点+优惠' },
];
const platforms = [
  { code: 'taobao', name: '淘宝' }, { code: 'pdd', name: '拼多多' }, { code: 'douyin', name: '抖音' },
  { code: 'amazon', name: '亚马逊' }, { code: 'tiktok', name: 'TikTok Shop' },
  { code: 'shopee', name: 'Shopee' }, { code: 'lazada', name: 'Lazada' },
];

const allUploaded = computed(() => skuList.value.length > 0 && skuList.value.every(s => s.uploaded));
const categoryLabel = computed(() => categories.find(c => c.id === selectedCategory.value)?.name || '未选');
const templateLabel = computed(() => templates.find(t => t.id === selectedTemplate.value)?.name || '未选');
const estimatedCost = computed(() => skuList.value.length * 8);

function removeSku(i: number) { skuList.value.splice(i, 1); }

async function uploadSingle(file: File): Promise<string> {
  const formData = new FormData(); formData.append('file', file);
  const res: any = await $fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: formData });
  return res.data.url;
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
  if (skuList.value.length + files.length > 20) { toast.error('最多支持20个SKU'); return; }
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
      toast.error(`${f.name || '图片'} 上传失败`);
    }
  }
  uploading.value = false;
}

async function submitTask() {
  if (!skuList.value.every(s => s.uploaded)) { toast.error('请等待所有图片上传完成'); return; }
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
  } catch (e: any) { toast.error(e.data?.msg || '提交失败，请重试'); step.value = 2; }
}

function handleRedo() { task.reset(); step.value = 0; skuList.value.forEach(s => { if (s.previewUrl) revoke(s.previewUrl) }); skuList.value = []; }

onUnmounted(() => { skuList.value.forEach(s => { if (s.previewUrl) revoke(s.previewUrl) }) });
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
.sku-color { width: 28px; height: 28px; border: 1px solid var(--input-border); border-radius: 4px; cursor: pointer; padding: 2px; }
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
</style>
