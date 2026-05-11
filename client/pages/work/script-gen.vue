<template>
  <WorkLayout :steps="['输入卖点', '选类型+语言', '生成脚本']" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <h3>输入产品卖点信息</h3>
      <textarea v-model="productInfo" class="input-area" placeholder="描述你的产品卖点信息...&#10;&#10;如：秋季新款长袖连衣裙，高支棉面料亲肤透气，收腰A字版型遮肉显高，适合日常通勤约会，限时特惠99元" rows="6" maxlength="2000" />
      <div class="quick-inputs">
        <button v-for="q in quickInputs" :key="q.label" class="quick-btn" @click="productInfo = q.text">{{ q.label }}</button>
      </div>
      <button v-if="productInfo.trim()" class="btn" @click="step = 1">下一步：选脚本类型</button>

      <!-- 提示词润色 -->
      <PromptEnhancer v-if="productInfo.trim()" mode="script" :initial-prompt="productInfo" @applied="(v) => productInfo = v" />
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>选择脚本类型</h3>
      <div class="type-grid">
        <button v-for="t in scriptTypes" :key="t.id" class="type-card" :class="{ active: selectedType === t.id }" @click="selectedType = t.id">
          <span class="type-icon">{{ t.icon }}</span>
          <span class="type-name">{{ t.name }}</span>
          <span class="type-desc">{{ t.desc }}</span>
        </button>
      </div>

      <h3>选择目标语言</h3>
      <div class="lang-grid">
        <button v-for="l in languages" :key="l.code" class="lang-card" :class="{ active: selectedLang === l.code }" @click="selectedLang = l.code">
          <span class="lang-flag">{{ l.flag }}</span>
          <span class="lang-name">{{ l.name }}</span>
        </button>
      </div>

      <h3>目标平台（可选）</h3>
      <div class="platform-row">
        <select v-model="selectedPlatform" class="select">
          <option value="">通用</option>
          <option value="taobao">淘宝</option><option value="douyin">抖音</option>
          <option value="amazon">亚马逊</option><option value="tiktok">TikTok Shop</option>
          <option value="shopee">Shopee</option><option value="lazada">Lazada</option>
        </select>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">返回</button>
        <button class="btn" @click="submitTask">生成脚本</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="submitting" class="progress-box">
        <div class="spinner" /><p>正在提交任务...</p>
      </div>
      <div v-else-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>脚本生成完成 <span class="lang-badge">{{ selectedLangLabel }}</span></h3>
        <div class="script-output" v-if="task.result.value">
          <div v-if="task.result.value.title" class="script-card">
            <h4>{{ task.result.value.title }}</h4>
            <template v-if="task.result.value.hooks">
              <h5>📌 开头钩子（3选1）</h5>
              <p v-for="(h, i) in task.result.value.hooks" :key="i" class="hook-line">{{ h }}</p>
            </template>
            <template v-if="task.result.value.body">
              <h5>📝 正文</h5>
              <p class="body-text">{{ task.result.value.body }}</p>
            </template>
            <template v-if="task.result.value.cta">
              <h5>💰 转化引导</h5>
              <p class="cta-text">{{ task.result.value.cta }}</p>
            </template>
            <template v-if="task.result.value.sections">
              <h5>📋 直播分段脚本</h5>
              <div v-for="s in task.result.value.sections" :key="s.time" class="section-item">
                <strong>{{ s.time }}</strong> — {{ s.content }} <em>({{ s.tip }})</em>
              </div>
            </template>
            <template v-if="task.result.value.captions">
              <h5>📱 种草文案</h5>
              <p v-for="c in task.result.value.captions" :key="c" class="caption-line">{{ c }}</p>
              <p class="hashtags">{{ task.result.value.hashtags }}</p>
            </template>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">再生成一个</button>
          <button class="btn">复制脚本</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">重试</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">

import PromptEnhancer from '~/components/PromptEnhancer.vue'
const toast = useToast()

const step = ref(0);
const productInfo = ref('');
const selectedType = ref('short_video');
const selectedLang = ref('zh');
const selectedPlatform = ref('');
const task = useTask();
const submitting = ref(false);

const languages = ref([
  { code: 'zh', name: '中文', flag: '🇨🇳' }, { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }, { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }, { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' }, { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
]);

const selectedLangLabel = computed(() => languages.value.find(l => l.code === selectedLang.value)?.name || '');

const scriptTypes = [
  { id: 'short_video', name: '短视频口播', desc: '15-30s带货口播', icon: '📱' },
  { id: 'live_stream', name: '直播脚本', desc: '分段直播话术', icon: '📺' },
  { id: 'social_post', name: '种草文案', desc: '小红书/抖音图文', icon: '📝' },
];

const quickInputs = [
  { label: '服装类', text: '秋季新款长袖连衣裙，高支棉面料亲肤透气，收腰A字版型遮肉显高，限时特惠99元' },
  { label: '电子类', text: '真无线降噪耳机，40dB深度降噪，续航30h超长待机，IPX5防水运动可用，券后只要299' },
  { label: '家居类', text: '便携迷你筋膜枪，4档力度调节，静音马达低噪音，办公室居家随时放松，第二件半价' },
];

async function loadLanguages() {
  try {
    const res = await $fetch('/api/multilingual/languages', { credentials: 'include' });
    const data = (res as any).data;
    if (data?.length) languages.value = data;
  } catch { toast.warn('加载语言列表失败') }
}

async function submitTask() {
  step.value = 2;
  submitting.value = true;
  try {
    const res = await $fetch('/api/adv-video/script-gen', {
      method: 'POST', credentials: 'include',
      body: {
        productInfo: productInfo.value,
        scriptType: selectedType.value,
        language: selectedLang.value,
        platform: selectedPlatform.value || undefined,
      },
    });
    task.pollTask((res as any).data.taskId, '/api/adv-video/tasks/');
  } catch (e: any) {
    toast.error(e?.data?.msg || '提交失败，请重试');
    step.value = 0;
  } finally { submitting.value = false; }
}
function handleRedo() { task.reset(); step.value = 0; productInfo.value = ''; selectedType.value = 'short_video'; selectedLang.value = 'zh'; }

onMounted(() => { loadLanguages(); });
</script>

<style scoped>
.lang-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px; }
.lang-card { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 2px solid var(--input-border); border-radius: var(--radius-md); background: var(--bg-card); cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
.lang-card:hover { border-color: var(--brand); }
.lang-card.active { border-color: var(--brand); background: var(--status-processing-bg); }
.lang-flag { font-size: 20px; }
.lang-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.lang-badge { font-size: 13px; font-weight: 400; color: var(--brand); }
.platform-row { margin-bottom: 20px; }
.select { width: 100%; max-width: 300px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-input); color: var(--text-primary); font-size: 14px; outline: none; }
.select:focus { border-color: var(--input-focus-border); }
.script-card h4 { font-size: 16px; margin-bottom: 12px; }
.script-card h5 { font-size: 13px; color: var(--brand); margin: 16px 0 8px; }
.hook-line { padding: 8px 12px; background: var(--warning-light, #fff3e0); border-radius: 6px; margin-bottom: 6px; font-size: 13px; }
.body-text { padding: 8px 12px; background: var(--bg-card); border-radius: 6px; font-size: 13px; line-height: 1.6; }
.cta-text { padding: 8px 12px; background: var(--danger-light, #ffebee); border-radius: 6px; font-size: 14px; font-weight: 600; color: var(--danger); }
.section-item { padding: 6px 0; border-bottom: 1px solid var(--border-light); font-size: 13px; }
.section-item em { color: var(--text-muted); font-size: 12px; }
.caption-line { padding: 4px 0; font-size: 13px; }
.hashtags { color: var(--brand); font-size: 12px; margin-top: 8px; }
</style>
