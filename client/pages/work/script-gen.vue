<template>
  <WorkLayout :steps="steps" :current-step="step">
    <div v-if="step === 0" class="upload-section">
      <h3>{{ $t('work_pages.script_gen_input_title') }}</h3>
      <textarea v-model="productInfo" class="input-area" :placeholder="$t('work_pages.script_gen_input_placeholder')" rows="6" maxlength="2000" />
      <div class="quick-inputs">
        <button v-for="q in quickInputs" :key="q.label" class="quick-btn" @click="productInfo = q.text">{{ q.label }}</button>
      </div>
      <button v-if="productInfo.trim()" class="btn" @click="step = 1">{{ $t('work_pages.script_gen_btn_next') }}</button>

      <!-- 提示词润色 -->
      <PromptEnhancer v-if="productInfo.trim()" mode="script" :initial-prompt="productInfo" @applied="(v) => productInfo = v" />
    </div>

    <div v-else-if="step === 1" class="select-section">
      <h3>{{ $t('work_pages.script_gen_type_title') }}</h3>
      <div class="type-grid">
        <button v-for="t in scriptTypes" :key="t.id" class="type-card" :class="{ active: selectedType === t.id }" @click="selectedType = t.id">
          <span class="type-icon">{{ t.icon }}</span>
          <span class="type-name">{{ t.name }}</span>
          <span class="type-desc">{{ t.desc }}</span>
        </button>
      </div>

      <h3>{{ $t('work_pages.script_gen_lang_title') }}</h3>
      <div class="lang-grid">
        <button v-for="l in languages" :key="l.code" class="lang-card" :class="{ active: selectedLang === l.code }" @click="selectedLang = l.code">
          <span class="lang-flag">{{ l.flag }}</span>
          <span class="lang-name">{{ l.name }}</span>
        </button>
      </div>

      <h3>{{ $t('work_pages.script_gen_platform_title') }}</h3>
      <div class="platform-row">
        <select v-model="selectedPlatform" class="select">
          <option value="">{{ $t('work_pages.script_gen_platform_any') }}</option>
          <option v-for="p in platforms" :key="p.value" :value="p.value">{{ $t(p.labelKey) }}</option>
        </select>
      </div>

      <div class="actions">
        <button class="btn-outline" @click="step = 0">{{ $t('work_pages.script_gen_btn_back') }}</button>
        <button class="btn" @click="submitTask" :disabled="submitting">{{ $t('work_pages.script_gen_step_gen') }}</button>
      </div>
    </div>

    <div v-else class="result-section">
      <div v-if="submitting" class="progress-box">
        <div class="spinner" /><p>{{ $t('work_pages.script_gen_processing') }}</p>
      </div>
      <div v-else-if="task.polling.value" class="progress-box">
        <div class="spinner" /><p>{{ task.progressMsg.value }}</p>
      </div>
      <div v-else-if="task.status.value === 2">
        <h3>{{ $t('work_pages.script_gen_done_title') }} <span class="lang-badge">{{ selectedLangLabel }}</span></h3>
        <div class="script-output" v-if="task.result.value">
          <div v-if="task.result.value.title" class="script-card">
            <h4>{{ task.result.value.title }}</h4>
            <template v-if="task.result.value.hooks">
              <h5>📌 {{ $t('work_pages.script_gen_hook_title') }}</h5>
              <p v-for="(h, i) in task.result.value.hooks" :key="i" class="hook-line">{{ h }}</p>
            </template>
            <template v-if="task.result.value.body">
              <h5>📝 {{ $t('work_pages.script_gen_body_title') }}</h5>
              <p class="body-text">{{ task.result.value.body }}</p>
            </template>
            <template v-if="task.result.value.cta">
              <h5>💰 {{ $t('work_pages.script_gen_cta_title') }}</h5>
              <p class="cta-text">{{ task.result.value.cta }}</p>
            </template>
            <template v-if="task.result.value.sections">
              <h5>📋 {{ $t('work_pages.script_gen_sections_title') }}</h5>
              <div v-for="s in task.result.value.sections" :key="s.time" class="section-item">
                <strong>{{ s.time }}</strong> — {{ s.content }} <em>({{ s.tip }})</em>
              </div>
            </template>
            <template v-if="task.result.value.captions">
              <h5>📱 {{ $t('work_pages.script_gen_captions_title') }}</h5>
              <p v-for="c in task.result.value.captions" :key="c" class="caption-line">{{ c }}</p>
              <p class="hashtags">{{ task.result.value.hashtags }}</p>
            </template>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" @click="handleRedo">{{ $t('work_pages.script_gen_btn_redo') }}</button>
          <button class="btn">{{ $t('work_pages.script_gen_btn_copy') }}</button>
        </div>
      </div>
      <div v-else-if="task.status.value === 3" class="error-box"><p>{{ task.errorMsg.value }}</p><button class="btn" @click="handleRedo">{{ $t('work_pages.script_gen_btn_retry') }}</button></div>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">

import PromptEnhancer from '~/components/PromptEnhancer.vue'
const { t } = useI18n()
const toast = useToast()

const steps = computed(() => [t('work_pages.script_gen_step_input'), t('work_pages.script_gen_step_type'), t('work_pages.script_gen_step_gen')])
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

const platforms = [
  { value: 'taobao', labelKey: 'work_pages.script_gen_platform_taobao' },
  { value: 'douyin', labelKey: 'work_pages.script_gen_platform_douyin' },
  { value: 'amazon', labelKey: 'work_pages.script_gen_platform_amazon' },
  { value: 'tiktok', labelKey: 'work_pages.script_gen_platform_tiktok' },
  { value: 'shopee', labelKey: 'work_pages.script_gen_platform_shopee' },
  { value: 'lazada', labelKey: 'work_pages.script_gen_platform_lazada' },
];

const selectedLangLabel = computed(() => languages.value.find(l => l.code === selectedLang.value)?.name || '');

const scriptTypes = computed(() => [
  { id: 'short_video', name: t('work_pages.script_gen_type_short_video'), desc: t('work_pages.script_gen_type_short_video_desc'), icon: '📱' },
  { id: 'live_stream', name: t('work_pages.script_gen_type_live'), desc: t('work_pages.script_gen_type_live_desc'), icon: '📺' },
  { id: 'social_post', name: t('work_pages.script_gen_type_social'), desc: t('work_pages.script_gen_type_social_desc'), icon: '📝' },
]);

const quickInputs = computed(() => [
  { label: t('work_pages.script_gen_quick_clothing'), text: t('work_pages.script_gen_quick_clothing_text') },
  { label: t('work_pages.script_gen_quick_electronics'), text: t('work_pages.script_gen_quick_electronics_text') },
  { label: t('work_pages.script_gen_quick_home'), text: t('work_pages.script_gen_quick_home_text') },
]);

async function loadLanguages() {
  try {
    const res = await $fetch('/api/multilingual/languages', { credentials: 'include' });
    const data = (res as any).data;
    if (data?.length) languages.value = data;
  } catch { toast.warn(t('common.failed_load_languages')) }
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
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    toast.error(err?.data?.msg || t('common.failed_submit_retry'));
    step.value = 0;
  } finally { submitting.value = false; }
}
function handleRedo() { task.reset(); step.value = 0; productInfo.value = ''; selectedType.value = 'short_video'; selectedLang.value = 'zh'; }

onMounted(() => { loadLanguages(); });
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
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
