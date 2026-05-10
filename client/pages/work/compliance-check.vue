<template>
  <WorkLayout :steps="['选目标市场', '上传素材', '合规检查']" :current-step="step">
    <!-- Step 0: 选目标平台/区域 -->
    <div v-if="step === 0" class="select-section">
      <h3>选择目标市场</h3>
      <p class="section-hint">选择你要投放的平台和国家/地区，系统将检查对应的合规要求</p>

      <div class="check-grid">
        <div class="check-col">
          <h4>目标平台</h4>
          <div class="target-list">
            <button v-for="t in platformTargets" :key="t.code" class="target-card" :class="{ active: selectedPlatform === t.code }" @click="selectedPlatform = t.code">
              <span class="target-name">{{ t.name }}</span>
              <span class="target-count">{{ t.imageRuleCount + t.textRuleCount }} 条规则</span>
            </button>
          </div>
        </div>
        <div class="check-col">
          <h4>目标区域（可选）</h4>
          <div class="target-list">
            <button v-for="t in regionTargets" :key="t.code" class="target-card" :class="{ active: selectedRegion === t.code }" @click="selectedRegion = t.code">
              <span class="target-name">{{ t.name }}</span>
              <span class="target-count">{{ t.imageRuleCount + t.textRuleCount }} 条规则</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedPlatform" class="rules-preview">
        <h4>适用规则预览</h4>
        <div v-if="previewRules.length" class="rules-list">
          <div v-for="r in previewRules" :key="r.source" class="rule-group">
            <h5>{{ r.source }} ({{ r.type === 'platform' ? '平台规则' : '区域法规' }})</h5>
            <div v-for="ir in r.imageRules" :key="ir.id" class="rule-item" :class="ir.severity">
              <span class="severity-dot" :class="ir.severity" />
              <span class="rule-cat">图片</span>
              <span>{{ ir.desc }}</span>
            </div>
            <div v-for="tr in r.textRules" :key="tr.id" class="rule-item" :class="tr.severity">
              <span class="severity-dot" :class="tr.severity" />
              <span class="rule-cat">文案</span>
              <span>{{ tr.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" :disabled="!selectedPlatform" @click="step = 1">下一步：上传素材</button>
      </div>
    </div>

    <!-- Step 1: 上传素材 -->
    <div v-else-if="step === 1" class="upload-section">
      <h3>上传待检查素材</h3>
      <div class="dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <p class="dz-icon">📤</p>
        <p>拖拽图片到此处</p>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFiles" />
        <button class="btn-outline" @click="($refs.fileInput as HTMLInputElement)?.click()">选择图片</button>
      </div>

      <div v-if="previews.length" class="preview-grid">
        <div v-for="(p, i) in previews" :key="i" class="preview-item">
          <img loading="lazy" :src="p.url" class="preview-thumb" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
          <button class="remove-btn" @click="removeImage(i)">✕</button>
        </div>
      </div>

      <div class="text-check-section">
        <h4>文案检查（可选）</h4>
        <textarea v-model="textToCheck" placeholder="输入产品标题/描述文案进行检查..." rows="3" class="text-input" maxlength="5000" />
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" :disabled="!previews.length && !textToCheck" @click="runCheck">开始合规检查</button>
      </div>
    </div>

    <!-- Step 2: 检查结果 -->
    <div v-else class="result-section">
      <h3>合规检查结果</h3>
      <div v-if="checking" class="progress-box"><div class="spinner" /><p>正在检查合规性...</p></div>
      <template v-else>
      <div class="check-summary">
        <div class="summary-card" :class="checkResult?.isCompliant ? 'pass' : 'fail'">
          <span class="summary-icon">{{ checkResult?.isCompliant ? '✅' : '⚠️' }}</span>
          <span class="summary-title">{{ checkResult?.isCompliant ? '通过检查' : '发现问题' }}</span>
          <span class="summary-detail">共 {{ checkResult?.totalRules || 0 }} 条规则，{{ checkResult?.criticalCount || 0 }} 条严重</span>
        </div>
      </div>

      <div v-if="checkResult?.results" class="check-detail">
        <div v-for="r in checkResult.results" :key="r.source" class="check-group">
          <h4>{{ r.source }}</h4>
          <div v-for="ir in r.imageRules" :key="ir.id" class="check-item" :class="ir.severity">
            <span class="check-status">{{ ir.severity === 'critical' ? '❌' : ir.severity === 'warning' ? '⚠️' : 'ℹ️' }}</span>
            <span class="check-desc">{{ ir.desc }}</span>
            <span class="check-severity">{{ severityLabel(ir.severity) }}</span>
          </div>
          <div v-for="tr in r.textRules" :key="tr.id" class="check-item" :class="tr.severity">
            <span class="check-status">{{ tr.severity === 'critical' ? '❌' : tr.severity === 'warning' ? '⚠️' : 'ℹ️' }}</span>
            <span class="check-desc">{{ tr.desc }}</span>
            <span class="check-severity">{{ severityLabel(tr.severity) }}</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="handleRedo">重新检查</button>
      </div>
      </template>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
const { createBlobUrl, revoke } = useBlobUrl()
const toast = useToast()

interface PreviewItem { url: string; uploadedUrl: string }

const step = ref(0);
const selectedPlatform = ref('');
const selectedRegion = ref('');
const targets = ref<any[]>([]);
const platformTargets = computed(() => targets.value.filter((t: any) => ['amazon','temu','tiktok','shein'].includes(t.code)));
const regionTargets = computed(() => targets.value.filter((t: any) => ['eu','us','jp'].includes(t.code)));
const previews = ref<PreviewItem[]>([]);
const textToCheck = ref('');
const checkResult = ref<any>(null);
const checking = ref(false);
const previewRules = ref<any[]>([]);

function removeImage(i: number) { previews.value.splice(i, 1); }

async function loadTargets() {
  try {
    const res = await $fetch('/api/compliance/targets', { credentials: 'include' });
    targets.value = (res as any).data || [];
  } catch { toast.warn('加载合规目标失败') }
}

async function loadRulesPreview() {
  if (!selectedPlatform.value) { previewRules.value = []; return; }
  try {
    const params = new URLSearchParams({ platform: selectedPlatform.value });
    if (selectedRegion.value) params.set('region', selectedRegion.value);
    const res = await $fetch('/api/compliance/check', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ platform: selectedPlatform.value, region: selectedRegion.value || undefined }),
    });
    previewRules.value = (res as any).data?.results || [];
  } catch { previewRules.value = []; toast.warn('加载审核规则失败') }
}

watch([selectedPlatform, selectedRegion], () => { loadRulesPreview(); });

function handleFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files) {
    for (const f of files) previews.value.push({ url: createBlobUrl(f), uploadedUrl: '' });
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (files) {
    for (const f of files) previews.value.push({ url: createBlobUrl(f), uploadedUrl: '' });
  }
}

async function runCheck() {
  step.value = 2;
  checking.value = true;
  try {
    const res = await $fetch('/api/compliance/check', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ platform: selectedPlatform.value, region: selectedRegion.value || undefined }),
    });
    checkResult.value = (res as any).data;
  } catch { checkResult.value = { isCompliant: false, results: [], totalRules: 0, criticalCount: 0 }; }
  finally { checking.value = false; }
}

function severityLabel(s: string) {
  const map: Record<string, string> = { critical: '严重', warning: '警告', info: '提示' };
  return map[s] || s;
}

function handleRedo() { step.value = 0; checkResult.value = null; previews.value = []; textToCheck.value = ''; }

onMounted(() => { loadTargets(); });
</script>

<style scoped>
.section-hint { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
@media (max-width: 640px) { .check-grid { grid-template-columns: 1fr; } }
.check-col h4 { font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; }
.target-list { display: flex; flex-direction: column; gap: 6px; }
.target-card { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 2px solid var(--input-border); border-radius: var(--radius-md); background: var(--bg-card); cursor: pointer; transition: all var(--transition-fast); text-align: left; }
.target-card:hover { border-color: var(--brand); }
.target-card.active { border-color: var(--brand); background: var(--status-processing-bg); }
.target-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.target-count { font-size: 11px; color: var(--text-muted); }

.rules-preview { margin-bottom: 20px; }
.rules-preview h4 { font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; }
.rules-list { display: flex; flex-direction: column; gap: 12px; }
.rule-group { background: var(--bg-card); border: 1px solid var(--input-border); border-radius: var(--radius-md); padding: 12px; }
.rule-group h5 { font-size: 13px; color: var(--text-primary); margin-bottom: 8px; }
.rule-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: var(--text-primary); }
.severity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.severity-dot.critical { background: var(--danger); }
.severity-dot.warning { background: var(--warning); }
.severity-dot.info { background: var(--brand); }
.rule-cat { font-size: 10px; padding: 1px 6px; border-radius: var(--radius-xs); background: var(--bg-hover); color: var(--text-muted); flex-shrink: 0; }

.preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin: 16px 0; }
.preview-item { position: relative; }
.preview-thumb { width: 100%; height: 90px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--input-border); }
.remove-btn { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border: none; border-radius: 50%; background: var(--danger); color: var(--text-on-brand); cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; }

.text-check-section { margin: 20px 0; }
.text-check-section h4 { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; }
.text-input { width: 100%; padding: 10px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; resize: vertical; }
.text-input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }

.check-summary { margin-bottom: 20px; }
.summary-card { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: var(--radius-lg); border: 2px solid var(--input-border); }
.summary-card.pass { border-color: var(--success); background: var(--status-done-bg); }
.summary-card.fail { border-color: var(--danger); background: var(--status-fail-bg); }
.summary-icon { font-size: 24px; }
.summary-title { font-size: 17px; font-weight: 600; color: var(--text-primary); }
.summary-detail { font-size: 13px; color: var(--text-muted); margin-left: auto; }

.check-detail { display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; }
.check-group { background: var(--bg-card); border: 1px solid var(--input-border); border-radius: var(--radius-md); padding: 14px; }
.check-group h4 { font-size: 14px; color: var(--text-primary); margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); }
.check-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; color: var(--text-primary); }
.check-item.critical { color: var(--danger); }
.check-item.warning { color: var(--warning); }
.check-status { font-size: 16px; flex-shrink: 0; }
.check-desc { flex: 1; }
.check-severity { font-size: 11px; padding: 2px 8px; border-radius: var(--radius-xs); background: var(--bg-hover); color: var(--text-muted); flex-shrink: 0; }
</style>
