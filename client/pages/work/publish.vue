<template>
  <div class="publish-page">
    <header class="page-header">
      <h1>{{ $t('work_pages.publish.title') }}</h1>
      <p>{{ $t('work_pages.publish.subtitle') }}</p>
    </header>

    <div class="publish-layout">
      <!-- 左侧: 分发配置 -->
      <div class="publish-form">
        <!-- 作品选择 -->
        <section class="form-section">
          <div class="section-header">
            <h3>{{ $t('work_pages.publish.select_work') }}</h3>
            <select v-model="filterType" @change="loadWorks">
              <option value="">{{ $t('work_pages.publish.all_types') }}</option>
              <option value="image">{{ $t('work_pages.publish.type_image') }}</option>
              <option value="video">{{ $t('work_pages.publish.type_video') }}</option>
            </select>
          </div>

          <div v-if="loadingWorks" class="loading-state">{{ $t('work_pages.publish.loading_works') }}</div>

          <div v-else-if="works.length === 0" class="empty-state">
            <p>{{ $t('work_pages.publish.no_works') }}</p>
            <router-link to="/workspace" class="btn-link">{{ $t('work_pages.publish.go_create') }}</router-link>
          </div>

          <div v-else class="works-grid">
            <div
              v-for="w in works"
              :key="w.id"
              :class="['work-card', { selected: selectedWorkId === w.id }]"
              @click="selectedWorkId = w.id"
            >
              <div class="work-check"><span v-if="selectedWorkId === w.id">&#10003;</span></div>
              <div class="work-thumb">
                <img loading="lazy" v-if="w.thumbnail" :src="w.thumbnail" :alt="w.title" @error="(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }" />
                <span v-else class="thumb-icon">{{ w.file_type?.startsWith('video') ? '🎬' : '🖼️' }}</span>
              </div>
              <div class="work-title">{{ w.title || $t('work_pages.publish.unnamed') }}</div>
            </div>
          </div>
        </section>

        <!-- 平台选择 -->
        <section class="form-section">
          <h3>{{ $t('work_pages.publish.target_platforms') }} <span class="selected-count">{{ $t('work_pages.publish.selected_count', { n: selectedPlatforms.length }) }}</span></h3>
          <div class="platforms-grid">
            <div
              v-for="p in platforms"
              :key="p.key"
              :class="['platform-card', { active: selectedPlatforms.includes(p.key) }]"
              @click="togglePlatform(p.key)"
            >
              <div class="platform-icon">{{ platformIcons[p.key] || '📦' }}</div>
              <div class="platform-name">{{ p.name }}</div>
              <div class="platform-specs">
                <span>{{ p.maxWidth }}px</span>
                <span>&le;{{ p.maxSizeMB }}MB</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 内容配置 -->
        <section class="form-section">
          <h3>{{ $t('work_pages.publish.content_config') }}</h3>
          <div class="form-group">
            <label>{{ $t('work_pages.publish.title_label') }}</label>
            <input v-model="form.title" type="text" maxlength="200" :placeholder="$t('work_pages.publish.title_placeholder')" />
          </div>
          <div class="form-group">
            <label>{{ $t('work_pages.publish.desc_label') }}</label>
            <textarea v-model="form.description" rows="3" maxlength="2000" :placeholder="$t('work_pages.publish.desc_placeholder')" />
          </div>
          <div class="form-group">
            <label>{{ $t('work_pages.publish.tags_label') }}</label>
            <input v-model="form.tagsStr" type="text" :placeholder="$t('work_pages.publish.tags_placeholder')" maxlength="500" />
          </div>
        </section>

        <!-- 提交 -->
        <button
          :class="['btn-submit', { loading: submitting }]"
          :disabled="!selectedWorkId || selectedPlatforms.length === 0 || submitting"
          @click="submitPublish"
        >
          {{ submitting ? $t('work_pages.publish.publishing') : $t('work_pages.publish.publish_to_n', { n: selectedPlatforms.length }) }}
        </button>
      </div>

      <!-- 右侧: 分发历史 -->
      <div class="publish-history">
        <h3>
          {{ $t('work_pages.publish.history_title') }}
          <button class="btn-refresh" @click="loadHistory" :disabled="loadingHistory">🔄</button>
        </h3>

        <!-- 统计条 -->
        <div v-if="stats" class="stats-bar">
          <div class="stat-item"><span class="stat-num">{{ stats.total }}</span>{{ $t('work_pages.publish.stats_total') }}</div>
          <div class="stat-item success"><span class="stat-num">{{ stats.success }}</span>{{ $t('work_pages.publish.stats_success') }}</div>
          <div class="stat-item failed"><span class="stat-num">{{ stats.failed }}</span>{{ $t('work_pages.publish.stats_failed') }}</div>
          <div class="stat-item pending"><span class="stat-num">{{ stats.inProgress }}</span>{{ $t('work_pages.publish.stats_in_progress') }}</div>
        </div>

        <!-- 筛选 -->
        <div class="filter-row">
          <select v-model="historyStatus" @change="loadHistory">
            <option value="">{{ $t('work_pages.publish.all_status') }}</option>
            <option value="pending">{{ $t('work_pages.publish.status_pending') }}</option>
            <option value="processing">{{ $t('work_pages.publish.status_processing') }}</option>
            <option value="success">{{ $t('work_pages.publish.status_success') }}</option>
            <option value="failed">{{ $t('work_pages.publish.status_failed') }}</option>
          </select>
        </div>

        <!-- 列表 -->
        <div v-if="loadingHistory" class="loading-state">{{ $t('work_pages.publish.loading_history') }}</div>

        <div v-else-if="historyList.length === 0" class="empty-state">
          <p>{{ $t('work_pages.publish.no_history') }}</p>
        </div>

        <div v-else class="history-list">
          <div
            v-for="batch in historyList"
            :key="batch.batchId || batch.id"
            class="history-card"
          >
            <div class="batch-header">
              <span class="batch-id">{{ (batch.batchId || '').slice(0, 20) }}</span>
              <span class="batch-time">{{ formatDateTime(batch.created_at) }}</span>
            </div>
            <div class="batch-platforms">
              <span
                v-for="r in (batch.records || [batch])"
                :key="r.id"
                :class="['platform-tag', statusClass(r.status)]"
              >
                {{ r.platformName || r.platform }}
                <span v-if="r.status === 'failed'" class="retry-link" @click.stop="retryPublish(r.id)">↺</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="historyTotal > historyPageSize" class="pagination">
          <button :disabled="historyPage <= 1" @click="historyPage--; loadHistory()">{{ $t('work_pages.publish.prev_page') }}</button>
          <span>{{ $t('work_pages.publish.page_of', { n: historyPage, m: Math.ceil(historyTotal / historyPageSize) }) }}</span>
          <button :disabled="historyPage * historyPageSize >= historyTotal" @click="historyPage++; loadHistory()">{{ $t('work_pages.publish.next_page') }}</button>
        </div>
      </div>
    </div>

    <!-- 成功提示 -->
    <div v-if="showToast" :class="['toast', toastType]">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">

import { formatDateTime } from '@/utils/format';
const api = useApi();
const toast = useToast()
const { t } = useI18n()

const platforms = ref([]);
const works = ref([]);
const selectedWorkId = ref(null);
const selectedPlatforms = ref([]);
const filterType = ref('');
const loadingWorks = ref(false);

const form = reactive({ title: '', description: '', tagsStr: '' });
const submitting = ref(false);

const historyList = ref([]);
const historyPage = ref(1);
const historyPageSize = ref(10);
const historyTotal = ref(0);
const historyStatus = ref('');
const loadingHistory = ref(false);
const stats = ref(null);

const showToast = ref(false);
const toastMsg = ref('');
const toastType = ref('success');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const platformIcons = {
  taobao: '🍑', tmall: '🐱', jd: '🐶', pdd: '📱',
  douyin: '🎵', kuaishou: '⚡', xiaohongshu: '📕', shipinhao: '📹',
  bilibili: '📺', shopee: '🛒', lazada: '🛍️', amazon: '📦', tiktokshop: '🎬',
};

function statusClass(s) {
  return { success: 'success', failed: 'failed', error: 'failed', pending: 'pending', processing: 'processing', scheduled: 'scheduled' }[s] || '';
}

function togglePlatform(key) {
  const idx = selectedPlatforms.value.indexOf(key);
  if (idx >= 0) selectedPlatforms.value.splice(idx, 1);
  else selectedPlatforms.value.push(key);
}

function notify(msg: string, type = 'success') {
  toastMsg.value = msg;
  toastType.value = type;
  showToast.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { showToast.value = false; }, 3000);
}

async function loadPlatforms() {
  try {
    const res = await api.get('/publish/platforms');
    platforms.value = res || [];
  } catch { toast.warn(t('work_pages.publish.load_platforms_failed')) }
}

async function loadWorks() {
  loadingWorks.value = true;
  try {
    const params = { pageSize: 50, status: 'completed' };
    if (filterType.value) params.type = filterType.value;
    const res = await api.get('/assets', params);
    works.value = res?.list || [];
  } catch { toast.warn(t('work_pages.publish.load_works_failed')) }
  finally { loadingWorks.value = false; }
}

async function loadHistory() {
  loadingHistory.value = true;
  try {
    const params = { page: historyPage.value, pageSize: historyPageSize.value };
    if (historyStatus.value) params.status = historyStatus.value;
    const [histRes, statsRes] = await Promise.all([
      api.get('/publish/history', params),
      api.get('/publish/stats'),
    ]);
    historyList.value = histRes?.list || [];
    historyTotal.value = histRes?.total || 0;
    stats.value = statsRes;
  } catch { toast.warn(t('work_pages.publish.load_history_failed')) }
  finally { loadingHistory.value = false; }
}

async function submitPublish() {
  if (!selectedWorkId.value || selectedPlatforms.value.length === 0) return;
  submitting.value = true;
  try {
    const tags = form.tagsStr ? form.tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    await api.post('/publish/submit', {
      workId: selectedWorkId.value,
      platforms: selectedPlatforms.value,
      title: form.title,
      description: form.description,
      tags,
    });
    notify(t('work_pages.publish.task_submitted'));
    selectedWorkId.value = null;
    selectedPlatforms.value = [];
    form.title = '';
    form.description = '';
    form.tagsStr = '';
    historyPage.value = 1;
    await loadHistory();
  } catch (err) {
    notify(err.message || t('work_pages.publish.submit_failed'), 'error');
  } finally {
    submitting.value = false;
  }
}

async function retryPublish(recordId) {
  try {
    await api.post(`/publish/retry/${recordId}`);
    notify(t('work_pages.publish.retry_success'));
    await loadHistory();
  } catch (err) {
    notify(err.message || t('work_pages.publish.retry_failed'), 'error');
  }
}

onMounted(() => {
  loadPlatforms();
  loadWorks();
  loadHistory();
});

onUnmounted(() => {
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
});
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] })
</script>

<style scoped>
.publish-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.page-header p { color: var(--text-secondary); margin-top: 4px; }

.publish-layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }
@media (max-width: 900px) { .publish-layout { grid-template-columns: 1fr; } }

.publish-form { display: flex; flex-direction: column; gap: 20px; }
.form-section { background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-card); }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.section-header h3, .form-section h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); }
.selected-count { font-weight: 400; font-size: 13px; color: var(--brand); }

.platforms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
.platform-card { text-align: center; padding: 12px 8px; border: 2px solid var(--border-light); border-radius: 10px; cursor: pointer; transition: .15s; }
.platform-card:hover { border-color: var(--brand-soft); }
.platform-card.active { border-color: var(--brand); background: var(--brand-light); }
.platform-icon { font-size: 28px; margin-bottom: 4px; }
.platform-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.platform-specs { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.platform-specs span { margin: 0 2px; }

.works-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.work-card { border: 2px solid var(--border-light); border-radius: 10px; padding: 8px; cursor: pointer; transition: .15s; position: relative; }
.work-card:hover { border-color: var(--brand-soft); }
.work-card.selected { border-color: var(--brand); background: var(--brand-light); }
.work-check { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; background: var(--border-light); display: flex; align-items: center; justify-content: center; font-size: 12px; z-index: 1; }
.work-card.selected .work-check { background: var(--brand); color: var(--text-on-brand); }
.work-thumb { width: 100%; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: var(--bg-page); display: flex; align-items: center; justify-content: center; }
.work-thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb-icon { font-size: 32px; }
.work-title { font-size: 12px; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }

.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; color: var(--text-primary); }
.form-group input, .form-group textarea, .form-group select {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; box-sizing: border-box;
  background: var(--bg-card); color: var(--text-primary);
}
.form-group textarea { resize: vertical; }

.btn-submit {
  padding: 14px; background: var(--brand-gradient); color: var(--text-on-brand); border: none; border-radius: var(--radius-lg);
  font-size: 16px; font-weight: 600; cursor: pointer; transition: .15s;
}
.btn-submit:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }
.btn-submit.loading { pointer-events: none; }

.publish-history { background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-card); height: fit-content; }
.publish-history h3 { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); }
.btn-refresh { background: none; border: 1px solid var(--border-light); border-radius: 6px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary); }

.stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.stat-item { text-align: center; font-size: 11px; color: var(--text-secondary); padding: 8px 4px; background: var(--bg-page); border-radius: 8px; }
.stat-num { display: block; font-size: 18px; font-weight: 700; color: var(--text-primary); }
.stat-item.success .stat-num { color: var(--success); }
.stat-item.failed .stat-num { color: var(--danger); }
.stat-item.pending .stat-num { color: var(--warning); }

.filter-row { margin-bottom: 12px; }
.filter-row select { width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: var(--bg-card); color: var(--text-primary); }

.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-card { border: 1px solid var(--border-light); border-radius: 8px; padding: 12px; }
.batch-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.batch-id { font-size: 12px; font-family: monospace; color: var(--brand); }
.batch-time { font-size: 11px; color: var(--text-muted); }
.batch-platforms { display: flex; flex-wrap: wrap; gap: 6px; }
.platform-tag {
  font-size: 11px; padding: 3px 8px; border-radius: 20px; background: var(--tag-bg); color: var(--text-primary);
  display: flex; align-items: center; gap: 4px;
}
.platform-tag.success { background: var(--success-light); color: var(--success); }
.platform-tag.failed { background: var(--danger-light); color: var(--danger); }
.platform-tag.pending, .platform-tag.processing { background: var(--warning-light); color: var(--warning); }
.platform-tag.scheduled { background: var(--brand-light); color: var(--brand); }
.retry-link { cursor: pointer; font-weight: 700; margin-left: 2px; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 12px; font-size: 13px; }
.pagination button { padding: 4px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-card); cursor: pointer; color: var(--text-primary); }
.pagination button:disabled { opacity: .4; cursor: not-allowed; }

.loading-state, .empty-state { text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 14px; }
.btn-link { color: var(--brand); text-decoration: underline; }

.toast { position: fixed; top: 24px; right: 24px; padding: 12px 24px; border-radius: 10px; color: var(--text-on-brand); font-size: 14px; z-index: 9999; transition: .3s; }
.toast.success { background: var(--success); }
.toast.error { background: var(--danger); }
</style>
