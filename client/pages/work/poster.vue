<template>
  <div class="poster-page">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p class="page-desc">AI 智能生成营销海报与社媒封面，支持多种风格与尺寸适配</p>
    </div>

    <!-- Type Tabs -->
    <div class="type-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="switchTab(tab.key)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left: Input Panel -->
      <div class="input-panel">
        <div class="panel-section">
          <label class="section-label">海报描述</label>
          <textarea
            v-model="prompt"
            class="prompt-input"
            :placeholder="currentTab.placeholder"
            rows="5"
            maxlength="4000"
            @input="onPromptChange"
          ></textarea>
          <div class="char-count">{{ prompt.length }}/4000</div>
        </div>

        <!-- Size Info -->
        <div class="panel-section">
          <label class="section-label">尺寸规格</label>
          <div class="size-info">
            <span class="size-badge">{{ currentSize.width }}×{{ currentSize.height }}</span>
            <span class="size-ratio">比例 {{ currentSize.ratio }}</span>
            <span class="size-label">{{ currentSize.label }}</span>
          </div>
        </div>

        <!-- Style Override -->
        <div class="panel-section">
          <label class="section-label">风格偏好 <span class="optional">(可选)</span></label>
          <input
            v-model="styleOverride"
            class="style-input"
            :placeholder="currentStyle"
            maxlength="2000"
          />
        </div>

        <!-- Templates -->
        <div class="panel-section">
          <label class="section-label">快速模板</label>
          <div class="template-chips">
            <button
              v-for="tpl in currentTemplates"
              :key="tpl.label"
              class="tpl-chip"
              @click="applyTemplate(tpl)"
            >
              {{ tpl.label }}
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-row">
          <button
            class="btn btn-outline"
            :disabled="!prompt.trim() || enhancing"
            @click="enhancePrompt"
          >
            <span v-if="enhancing" class="spinner"></span>
            {{ enhancing ? '润色中...' : '✨ AI 润色' }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="!prompt.trim() || submitting"
            @click="submitTask"
          >
            <span v-if="submitting" class="spinner"></span>
            {{ submitting ? '生成中...' : '🎨 生成海报' }}
          </button>
        </div>

        <!-- Enhanced Prompt Preview -->
        <div v-if="enhancedPrompt && enhancedPrompt !== prompt" class="enhanced-preview">
          <div class="enhanced-header">
            <span>✨ 润色结果</span>
            <button class="btn-text" @click="discardEnhance">还原</button>
          </div>
          <p class="enhanced-text">{{ enhancedPrompt }}</p>
        </div>
      </div>

      <!-- Right: Preview Panel -->
      <div class="preview-panel">
        <div v-if="!results.length && !generating" class="preview-placeholder">
          <div class="placeholder-icon">🖼️</div>
          <p>输入描述，点击"生成海报"开始创作</p>
        </div>

        <!-- Loading State -->
        <div v-if="generating" class="generating-state">
          <div class="generating-skeleton"></div>
          <p class="generating-text">{{ jobStatusText }}</p>
        </div>

        <!-- Results -->
        <div v-if="results.length" class="results-grid">
          <div
            v-for="(item, idx) in results"
            :key="idx"
            class="result-card"
            :style="{ aspectRatio: currentSize.ratio.replace(':', '/') }"
          >
            <img v-if="item.url" :src="item.url" :alt="`海报结果 ${idx + 1}`" class="result-img" />
            <div v-else class="result-placeholder">生成中...</div>
            <div class="result-actions">
              <button class="btn-icon" title="下载" @click="downloadImage(item.url)">⬇</button>
              <button class="btn-icon" title="复制" @click="copyImage(item.url)">📋</button>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-if="errorMsg" class="error-state">
          <p>{{ errorMsg }}</p>
          <button class="btn btn-outline" @click="retry">重试</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSiteConfig } from '~/composables/useSiteConfig';

definePageMeta({ middleware: 'auth' });

const { config } = useSiteConfig('page.poster');

const tabs = [
  { key: 'product', icon: '🛍️', label: '产品营销', placeholder: '描述产品特性、促销信息、目标人群...' },
  { key: 'holiday', icon: '🎉',   label: '节日海报', placeholder: '描述节日主题、祝福语、氛围风格...' },
  { key: 'event',   icon: '📢',   label: '活动宣传', placeholder: '描述活动内容、优惠力度、时间地点...' },
  { key: 'private', icon: '💬',   label: '私域运营', placeholder: '描述社群活动、专属福利、品牌调性...' },
  { key: 'xhs',     icon: '📕',   label: '小红书封面', placeholder: '描述笔记主题、风格调性、文字内容...' },
  { key: 'wechat',  icon: '💚',   label: '公众号封面', placeholder: '描述文章主题、标题文案、视觉风格...' },
];

const TEMPLATES = {
  product: [
    { label: '新品首发', prompt: '3C数码新品发布会海报，科技感蓝色调，产品居中展示，光影效果，大字标题"重磅首发"' },
    { label: '限时秒杀', prompt: '电商限时秒杀海报，红色促销风格，倒计时元素，价格醒目，紧迫感设计' },
    { label: '爆款返场', prompt: '热销爆款返场海报，金色质感，网红种草风格，产品使用场景展示' },
  ],
  holiday: [
    { label: '春节营销', prompt: '春节年货促销海报，中国红主色调，传统纹样，福字元素，温馨团圆氛围' },
    { label: '双十一', prompt: '双十一狂欢节海报，炫酷霓虹灯光效，促销数字醒目，潮流年轻化设计' },
    { label: '中秋团圆', prompt: '中秋节海报，月圆桂花元素，暖金色调，团圆祝福文案，典雅中国风' },
  ],
  event: [
    { label: '品牌周年庆', prompt: '品牌周年庆典海报，金色质感设计，时间线展示品牌历程，感恩回馈主题' },
    { label: '直播预告', prompt: '直播带货预告海报，产品主图居中，主播形象，时间/福利信息清晰分层' },
    { label: '新品发布会', prompt: '新品发布会倒计时海报，极简科技风格，产品剪影悬念设计，日期醒目' },
  ],
  private: [
    { label: '社群福利', prompt: '私域社群专属福利海报，温暖亲切色调，会员专属标识，扫码入群引导' },
    { label: '会员日', prompt: '会员日专享海报，VIP尊贵感设计，专属优惠信息，品牌调性统一' },
    { label: '朋友圈推广', prompt: '朋友圈分享海报，生活方式美学，产品场景化展示，信任背书文案' },
  ],
  xhs: [
    { label: '好物分享', prompt: '小红书好物分享封面，清新自然光拍摄风，产品平铺展示，种草文案标题' },
    { label: '穿搭LOOK', prompt: '小红书穿搭封面，时尚街拍风格，OOTD标题，高级感色调，身材友好' },
    { label: 'VLOG封面', prompt: '小红书VLOG封面，生活方式美学，人像+文字排版，温暖治愈色调' },
  ],
  wechat: [
    { label: '干货文章', prompt: '公众号干货文章封面，简洁信息图风格，标题关键词突出，专业信任感' },
    { label: '品牌故事', prompt: '公众号品牌故事封面，高级质感摄影风，品牌色调用色，情感共鸣设计' },
    { label: '活动推文', prompt: '公众号活动推文封面，信息层级清晰，活动主题突出，行动号召引导' },
  ],
};

const activeTab = ref('product');
const prompt = ref('');
const styleOverride = ref('');
const enhancedPrompt = ref('');
const enhancing = ref(false);
const submitting = ref(false);
const generating = ref(false);
const errorMsg = ref('');
const results = ref([]);

let pollTimer = null;

const currentTab = computed(() => tabs.find(t => t.key === activeTab.value));
const currentTemplates = computed(() => TEMPLATES[activeTab.value] || []);
const currentStyle = computed(() => {
  const m = {
    product: '电商营销风格，突出产品卖点与优惠信息，设计感强',
    holiday: '节日氛围浓厚，色彩鲜明，传统文化与现代设计融合',
    event: '大型活动促销风格，信息层级清晰，视觉冲击力强',
    private: '私域社交风格，亲切温馨，突出信任感与专属福利',
    xhs: '小红书生活方式美学风格，清新自然，种草感强',
    wechat: '公众号头图风格，简洁有力，适合信息流浏览',
  };
  return m[activeTab.value] || '';
});

const pageTitle = computed(() => config.value?.page_title || '海报与封面生成');

// Size info fetched from API or fallback
const sizeMap = {
  product: { width: 1200, height: 1800, ratio: '2:3', label: '产品营销海报' },
  holiday: { width: 1200, height: 1800, ratio: '2:3', label: '节日海报' },
  event: { width: 1920, height: 1080, ratio: '16:9', label: '活动宣传海报' },
  private: { width: 1080, height: 1920, ratio: '9:16', label: '私域运营海报' },
  xhs: { width: 1080, height: 1440, ratio: '3:4', label: '小红书封面' },
  wechat: { width: 900, height: 383, ratio: '2.35:1', label: '公众号封面' },
};

const currentSize = computed(() => sizeMap[activeTab.value]);

const jobStatusText = computed(() => {
  if (!generating.value) return '';
  return 'AI 正在为您创作海报，请稍候...';
});

function switchTab(key) {
  activeTab.value = key;
  resetState();
}

function applyTemplate(tpl) {
  prompt.value = tpl.prompt;
  enhancedPrompt.value = '';
}

function onPromptChange() {
  if (enhancedPrompt.value) {
    enhancedPrompt.value = '';
  }
}

async function enhancePrompt() {
  if (!prompt.value.trim()) return;
  enhancing.value = true;
  try {
    const resp = await $fetch('/api/posters/enhance-prompt', {
      method: 'POST',
      body: { prompt: prompt.value.trim(), posterType: activeTab.value },
      credentials: 'include',
    });
    enhancedPrompt.value = resp.data?.enhanced_prompt || resp.enhanced_prompt || prompt.value;
    if (enhancedPrompt.value === prompt.value) {
      toast.warning('润色服务暂不可用，将使用原始描述');
    }
  } catch (e) {
    toast.error('提示词润色失败，将使用原始描述');
    enhancedPrompt.value = prompt.value;
  } finally {
    enhancing.value = false;
  }
}

function discardEnhance() {
  enhancedPrompt.value = '';
}

async function submitTask() {
  if (!prompt.value.trim()) return;
  submitting.value = true;
  generating.value = true;
  errorMsg.value = '';
  results.value = [];

  try {
    const body = {
      posterType: activeTab.value,
      prompt: prompt.value.trim(),
      enhancedPrompt: enhancedPrompt.value || undefined,
      style: styleOverride.value.trim() || undefined,
    };
    const resp = await $fetch('/api/posters/generate', {
      method: 'POST',
      body,
      credentials: 'include',
    });
    startPolling(resp.job_id);
  } catch (e) {
    errorMsg.value = e.data?.message || '海报生成失败，请重试';
    generating.value = false;
  } finally {
    submitting.value = false;
  }
}

function startPolling(jobId) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const resp = await $fetch(`/api/job/${jobId}`, { credentials: 'include' });
      const job = resp.data || resp;
      if (job.status === 'completed') {
        clearInterval(pollTimer);
        generating.value = false;
        results.value = (job.result?.images || job.result?.urls || []).map(u => ({ url: u }));
        if (!results.value.length && job.result?.url) {
          results.value = [{ url: job.result.url }];
        }
      } else if (job.status === 'failed') {
        clearInterval(pollTimer);
        generating.value = false;
        errorMsg.value = job.error || '生成失败';
      }
    } catch {
      // polling silently fails
    }
  }, 3000);
}

function retry() {
  errorMsg.value = '';
  submitTask();
}

function downloadImage(url) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = `poster_${activeTab.value}_${Date.now()}.png`;
  a.click();
}

async function copyImage(url) {
  if (!url) return;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    toast.success('已复制到剪贴板');
  } catch {
    window.open(url, '_blank');
  }
}

function resetState() {
  prompt.value = '';
  styleOverride.value = '';
  enhancedPrompt.value = '';
  results.value = [];
  errorMsg.value = '';
  generating.value = false;
  clearInterval(pollTimer);
}

const toast = useToast();

onBeforeUnmount(() => {
  clearInterval(pollTimer);
});
</script>

<style scoped>
.poster-page { max-width: 1400px; margin: 0 auto; padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
.page-desc { color: var(--text-secondary); font-size: 14px; margin: 0; }

.type-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 13px; transition: all 0.2s; }
.tab-btn:hover { border-color: var(--brand); color: var(--brand); }
.tab-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }
.tab-icon { font-size: 16px; }

.main-content { display: grid; grid-template-columns: 420px 1fr; gap: 24px; align-items: start; }
@media (max-width: 900px) { .main-content { grid-template-columns: 1fr; } }

.input-panel { display: flex; flex-direction: column; gap: 20px; }
.panel-section { display: flex; flex-direction: column; gap: 8px; }
.section-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.optional { font-weight: 400; color: var(--text-tertiary); font-size: 12px; }

.prompt-input { width: 100%; padding: 12px; border: 1px solid var(--input-border); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); font-size: 14px; resize: vertical; min-height: 100px; }
.prompt-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px rgba(var(--brand-rgb), 0.1); }
.char-count { text-align: right; font-size: 11px; color: var(--text-tertiary); }

.size-info { display: flex; gap: 12px; align-items: center; }
.size-badge { background: var(--brand-light); color: var(--brand); padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600; }
.size-ratio, .size-label { color: var(--text-secondary); font-size: 13px; }

.style-input { width: 100%; padding: 10px 12px; border: 1px solid var(--input-border); border-radius: 8px; background: var(--bg-card); color: var(--text-primary); font-size: 13px; }
.style-input:focus { outline: none; border-color: var(--brand); }

.template-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.tpl-chip { padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 20px; background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 12px; transition: all 0.2s; }
.tpl-chip:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }

.action-row { display: flex; gap: 10px; }
.btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--brand); color: #fff; flex: 1; }
.btn-outline { background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
.btn-text { background: none; border: none; color: var(--brand); cursor: pointer; font-size: 12px; padding: 0; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

.enhanced-preview { background: var(--brand-light); border: 1px solid var(--brand); border-radius: 8px; padding: 12px; }
.enhanced-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--brand); }
.enhanced-text { margin: 0; font-size: 13px; color: var(--text-primary); line-height: 1.6; }

.preview-panel { min-height: 400px; }
.preview-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; color: var(--text-tertiary); border: 2px dashed var(--border-color); border-radius: 12px; }
.placeholder-icon { font-size: 48px; margin-bottom: 12px; }

.generating-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 0; }
.generating-skeleton { width: 100%; height: 300px; background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-hover) 50%, var(--bg-card) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
.generating-text { color: var(--text-secondary); font-size: 14px; }

.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.result-card { position: relative; border-radius: 12px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border-color); }
.result-img { width: 100%; height: 100%; object-fit: cover; }
.result-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-tertiary); }
.result-actions { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
.result-card:hover .result-actions { opacity: 1; }
.btn-icon { width: 32px; height: 32px; border-radius: 6px; border: none; background: rgba(0,0,0,0.6); color: #fff; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }

.error-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--text-secondary); }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { to { background-position: -200% 0; } }

/* Dark mode */
:root[data-theme="dark"] .tab-btn { background: var(--bg-card); }
:root[data-theme="dark"] .prompt-input, :root[data-theme="dark"] .style-input { background: var(--bg-input, #1a1a2e); }
</style>
