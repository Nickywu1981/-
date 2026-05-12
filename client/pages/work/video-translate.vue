<!--
  Movio AI v4.1 — Video Translate Page
  G4 前端开发 | Phase 2
  统一入口：视频语音翻译 / 视频字幕翻译 / 视频面容翻译
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg?.title || '视频翻译' }}</h1>
      <p>{{ headerCfg?.subtitle || 'AI 语音翻译 · 字幕翻译 · 面容翻译 · 多语言支持' }}</p>
    </header>

    <div class="work-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        <span>{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div class="work-panel">
      <div class="form-row">
        <label class="form-label">视频链接</label>
        <input v-model="videoUrl" class="input" placeholder="输入视频URL 或 上传视频后粘贴链接" maxlength="500" />
        <AppMediaUpload v-model="videoUrl" accept="video/*" label="上传视频" class="mt-2" />
      </div>

      <div class="options-row">
        <div class="option">
          <label>源语言</label>
          <select v-model="sourceLang" class="input">
            <option v-for="l in langs" :key="l.code" :value="l.code">{{ l.name }}</option>
          </select>
        </div>
        <div class="option">
          <label>目标语言</label>
          <select v-model="targetLang" class="input">
            <option v-for="l in langs" :key="l.code" :value="l.code">{{ l.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="activeTab === 'voice'" class="options-row">
        <div class="option">
          <label>配音音色</label>
          <select v-model="voiceType" class="input">
            <option value="natural">自然音色</option>
            <option value="professional">专业播音</option>
            <option value="casual">休闲风格</option>
            <option value="formal">正式风格</option>
          </select>
        </div>
      </div>

      <div v-if="activeTab === 'subtitles'" class="options-row">
        <div class="option">
          <label>字幕样式</label>
          <select v-model="subtitleStyle" class="input">
            <option value="default">默认样式</option>
            <option value="minimal">极简白字</option>
            <option value="colorful">彩色字幕</option>
            <option value="stroke">描边字幕</option>
          </select>
        </div>
      </div>

      <div v-if="activeTab === 'face'" class="options-row">
        <div class="option">
          <label>数字人风格</label>
          <select v-model="avatarStyle" class="input">
            <option value="original">保留原貌</option>
            <option value="cartoon">卡通风格</option>
            <option value="realistic">写实风格</option>
            <option value="anime">动漫风格</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary btn-lg" :disabled="!videoUrl || submitting" @click="doSubmit">
        {{ submitting ? '提交中...' : tabCfg?.actionLabel || '开始翻译' }}
      </button>

      <AppTaskProgress v-if="jobId" :job-id="jobId" @completed="onCompleted" @failed="onFailed" />
      <div v-if="resultUrl" class="result-preview">
        <video v-if="activeTab === 'voice' || activeTab === 'face'" :src="resultUrl" controls style="max-width:100%"></video>
        <div v-else class="subtitle-preview">
          <p>字幕翻译完成</p>
          <a :href="resultUrl" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">下载字幕文件</a>
        </div>
        <div class="result-actions">
          <button class="btn btn-secondary" @click="downloadResult">下载</button>
          <button class="btn btn-ghost" @click="reset">重新翻译</button>
        </div>
      </div>
    </div>

    <section class="works-section">
      <h2>翻译历史</h2>
      <div class="works-filter">
        <select v-model="historyType" class="input" @change="loadHistory">
          <option value="">全部类型</option>
          <option v-for="t in tabs" :key="t.key" :value="`video_${t.key}_translate`">{{ t.label }}</option>
        </select>
      </div>
      <div v-if="loadingHistory" class="loading">加载中...</div>
      <div v-else-if="!history.length" class="empty">暂无翻译记录</div>
      <div v-else class="history-list">
        <div v-for="h in history" :key="h.id" class="history-item">
          <div class="history-info">
            <span class="history-type">{{ typeLabel(h.job_type) }}</span>
            <span class="history-langs">{{ h.source_lang }} → {{ h.target_lang }}</span>
          </div>
          <div class="history-meta">
            <span class="meta-status" :class="h.status">{{ h.status }}</span>
            <span class="meta-time">{{ formatDateTime(h.create_time) }}</span>
          </div>
          <button v-if="h.result_url" class="btn btn-sm btn-secondary" @click="download(h.result_url)">下载</button>
        </div>
      </div>
      <div v-if="totalHistory > hLimit" class="pagination">
        <button :disabled="hPage <= 1" @click="hPage--; loadHistory()">上一页</button>
        <span>{{ hPage }} / {{ Math.ceil(totalHistory / hLimit) }}</span>
        <button :disabled="hPage >= Math.ceil(totalHistory / hLimit)" @click="hPage++; loadHistory()">下一页</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">

import { formatDateTime } from '@/utils/format'
const { config: headerCfg } = useSiteConfig('page.video_translate');

const tabs = [
  { key: 'voice', icon: '🎙️', label: '语音翻译', actionLabel: '开始语音翻译' },
  { key: 'subtitles', icon: '📝', label: '字幕翻译', actionLabel: '开始字幕翻译' },
  { key: 'face', icon: '🧑', label: '面容翻译', actionLabel: '开始面容翻译' },
];

const activeTab = ref('voice');
const videoUrl = ref('');
const sourceLang = ref('zh');
const targetLang = ref('en');
const voiceType = ref('natural');
const subtitleStyle = ref('default');
const avatarStyle = ref('original');
const submitting = ref(false);
const jobId = ref(null);
const resultUrl = ref(null);

const langs = ref<Array<{ code: string; name: string }>>([]);
const history = ref([]);
const historyType = ref('');
const loadingHistory = ref(false);
const hPage = ref(1);
const hLimit = 10;
const totalHistory = ref(0);

const tabCfg = computed(() => tabs.find(t => t.key === activeTab.value));

function typeLabel(type) {
  const m = {
    video_voice_translate: '语音翻译', video_subtitle_translate: '字幕翻译', video_face_translate: '面容翻译',
  };
  return m[type] || type;
}

async function doSubmit() {
  submitting.value = true;
  const endpoints = { voice: '/api/video-translate/voice', subtitles: '/api/video-translate/subtitles', face: '/api/video-translate/face' };
  const body = { videoUrl: videoUrl.value, sourceLang: sourceLang.value, targetLang: targetLang.value };
  if (activeTab.value === 'voice') body.voiceType = voiceType.value;
  if (activeTab.value === 'subtitles') body.subtitleStyle = subtitleStyle.value;
  if (activeTab.value === 'face') body.avatarStyle = avatarStyle.value;
  try {
    const data = await $fetch(endpoints[activeTab.value], { method: 'POST', body, credentials: 'include' });
    jobId.value = data.data?.job_id;
    useToast().success('翻译任务已提交');
  } catch (e) {
    useToast().error(e.data?.message || '翻译提交失败');
  } finally {
    submitting.value = false;
  }
}

function onCompleted({ resultUrl: url }) { resultUrl.value = url; submitting.value = false; loadHistory(); }
function onFailed({ error: err }: { error: string }) { useToast().error(err || '翻译失败'); submitting.value = false; jobId.value = null; }
function downloadResult() { if (resultUrl.value) download(resultUrl.value); }
function reset() { jobId.value = null; resultUrl.value = null; }

async function loadHistory() {
  loadingHistory.value = true;
  try {
    const params = new URLSearchParams({ page: String(hPage.value), limit: String(hLimit) });
    if (historyType.value) params.set('type', historyType.value);
    const data = await $fetch<{ data?: { rows?: unknown[]; total?: number } }>(`/api/video-translate/works?${params}`, { credentials: 'include' });
    history.value = data.data?.rows || data.data || [];
    totalHistory.value = data.data?.total || 0;
  } catch (e: any) { useToast().error(e?.data?.msg || e?.message || '加载历史记录失败') } finally { loadingHistory.value = false; }
}

const { download } = useFileDownload()

onMounted(async () => {
  try {
    const data = await $fetch<{ data?: { langs?: { code: string; name: string }[] } }>('/api/video-translate/langs', { credentials: 'include' });
    langs.value = data.data?.langs || [{ code: 'zh', name: '中文' }, { code: 'en', name: 'English' }, { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }];
  } catch (_: any) {
    // 失败时降级为默认语言列表
    langs.value = [{ code: 'zh', name: '中文' }, { code: 'en', name: 'English' }, { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }];
  }
  loadHistory();
});
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.work-page { max-width: 900px; margin: 0 auto; padding: 24px; }
.work-header { margin-bottom: 24px; }
.work-header h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.work-header p { color: var(--text-secondary); margin-top: 4px; }

.work-tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid var(--border-color); }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 12px 24px; border: none; background: none; font-size: 14px; font-weight: 600; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color .2s, border-color .2s; }
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--brand); border-bottom-color: var(--brand); }

.work-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; }
.form-row { margin-bottom: 16px; }
.form-label { display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); }
.form-row .input { width: 100%; }
.mt-2 { margin-top: 8px; }
.options-row { display: flex; gap: 16px; margin-bottom: 16px; }
.option { flex: 1; }
.option label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--text-secondary); }
.option .input { width: 100%; }
.btn-lg { width: 100%; padding: 12px; font-size: 16px; }

.result-preview { margin-top: 24px; text-align: center; }
.subtitle-preview { padding: 40px; background: var(--bg-subtle); border-radius: 8px; }
.subtitle-preview p { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.result-actions { margin-top: 12px; display: flex; gap: 12px; justify-content: center; }

.works-section { margin-top: 32px; }
.works-section h2 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
.works-filter { margin-bottom: 12px; }
.works-filter select { width: 180px; }
.history-list { display: flex; flex-direction: column; gap: 8px; }
.history-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; }
.history-info { display: flex; gap: 12px; align-items: center; }
.history-type { font-weight: 600; font-size: 13px; }
.history-langs { font-size: 12px; color: var(--text-tertiary); }
.history-meta { display: flex; gap: 12px; align-items: center; }
.meta-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.meta-status.completed { background: #e6f7e6; color: #2e7d32; }
.meta-status.processing { background: #fff3e0; color: #e65100; }
.meta-status.failed { background: #fce4ec; color: #c62828; }
.meta-time { font-size: 12px; color: var(--text-tertiary); }
.loading, .empty { text-align: center; color: var(--text-tertiary); padding: 40px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }

@media (max-width: 768px) {
  .work-tabs { overflow-x: auto; }
  .options-row { flex-direction: column; }
  .history-item { flex-direction: column; align-items: flex-start; }
}
</style>
