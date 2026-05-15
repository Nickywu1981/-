<template>
  <AdminLayout>
    <h2 class="ptitle">{{ $t('admin_prompts.page_title') }}</h2>

    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'all' }]" @click="switchTab('all')">{{ $t('common.all') }}{{ $t('admin_prompts.tab_templates') }}</button>
      <button :class="['tab', { active: activeTab === 'review' }]" @click="switchTab('review')">{{ $t('admin_prompts.review_queue') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" type="text" :placeholder="$t('admin_prompts.search_placeholder')" @keyup.enter="fetchData" />
      <select v-model="filterCategory" class="sel" @change="fetchData">
        <option value="">{{ $t('admin_prompts.all_categories') }}</option>
        <option value="main_image">{{ $t('admin_prompts.category_main_image') }}</option>
        <option value="scene">{{ $t('admin_prompts.category_scene') }}</option>
        <option value="video">{{ $t('admin_prompts.category_video') }}</option>
        <option value="script">{{ $t('admin_prompts.category_script') }}</option>
        <option value="copy">{{ $t('admin_prompts.category_copy') }}</option>
        <option value="viral-clone">{{ $t('admin_prompts.category_viral_clone') }}</option>
      </select>
      <select v-model="filterIndustry" class="sel" @change="fetchData">
        <option value="">{{ $t('admin_prompts.all_industry') }}</option>
        <option v-for="ind in industryOptions" :key="ind.key" :value="ind.key">{{ ind.label }}</option>
      </select>
      <select v-model="filterStatus" class="sel" @change="fetchData">
        <option value="">{{ $t('admin_prompts.all_statuses') }}</option>
        <option value="0">{{ $t('admin_prompts.status_draft') }}</option>
        <option value="1">{{ $t('admin_prompts.status_pending') }}</option>
        <option value="2">{{ $t('admin_prompts.status_active') }}</option>
        <option value="3">{{ $t('admin_prompts.status_offline') }}</option>
      </select>
      <button v-if="activeTab === 'all'" class="btn btn-primary" @click="openCreate">{{ $t('admin_prompts.new_template') }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="8" />

    <div class="table-wrap" v-else-if="list.length">
    <table class="table">
      <thead>
        <tr>
          <th>{{ $t('common.id') }}</th>
          <th>{{ $t('admin_prompts.col_code') }}</th>
          <th>{{ $t('admin_prompts.col_title') }}</th>
          <th>{{ $t('admin_prompts.col_category') }}</th>
          <th>{{ $t('admin_prompts.col_industry_tags') }}</th>
          <th>{{ $t('admin_prompts.col_source') }}</th>
          <th>{{ $t('common.status') }}</th>
          <th>{{ $t('admin_prompts.col_usage') }}</th>
          <th>{{ $t('admin_prompts.col_create_time') }}</th>
          <th>{{ $t('common.action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in list" :key="t.id">
          <td>{{ t.id }}</td>
          <td class="mono">{{ t.template_code }}</td>
          <td>{{ t.title }}</td>
          <td><span class="category-tag">{{ categoryLabel(t.category) }}</span></td>
          <td><span class="tags-cell">{{ (t.tags || '').split(',').filter(Boolean).slice(0,3).join(', ') || '-' }}</span></td>
          <td><span class="source-tag" :class="t.is_public ? 'official' : 'user'">{{ t.is_public ? $t('admin_prompts.source_official') : (t.creator_name || $t('admin_prompts.source_user')) }}</span></td>
          <td><span class="status-tag" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span></td>
          <td>{{ t.usage_count }}</td>
          <td>{{ t.create_time?.slice(0, 10) }}</td>
          <td class="actions">
            <button class="btn-sm" @click="openEdit(t)">{{ $t('common.edit') }}</button>
            <button v-if="t.status === 1" class="btn-sm success" @click="review(t.id, 2)">{{ $t('admin_prompts.approve') }}</button>
            <button v-if="t.status === 1" class="btn-sm danger" @click="review(t.id, 3)">{{ $t('admin_prompts.reject') }}</button>
            <button v-if="t.status === 2" class="btn-sm warn" @click="review(t.id, 3)">{{ $t('admin_prompts.unpublish') }}</button>
            <button v-if="t.status === 3" class="btn-sm" @click="review(t.id, 2)">{{ $t('admin_prompts.publish') }}</button>
            <button v-if="!hasMark(t, 'hot')" class="btn-sm" @click="batchMark([t.id], 'hot', 'add')">{{ $t('admin_prompts.mark_hot') }}</button>
            <button v-if="hasMark(t, 'hot')" class="btn-sm warn" @click="batchMark([t.id], 'hot', 'remove')">{{ $t('admin_prompts.unmark_hot') }}</button>
            <button v-if="!hasMark(t, 'default')" class="btn-sm" @click="batchMark([t.id], 'default', 'add')">{{ $t('admin_prompts.mark_default') }}</button>
            <button class="btn-sm danger" @click="confirmDelete(t)">{{ $t('common.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    <div v-if="!list.length && !loading" class="empty">{{ $t('admin_prompts.empty') }}</div>

    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false" @keydown.escape="showModal = false">
        <div class="modal">
          <h3>{{ editing.id ? $t('admin_prompts.edit_modal') : $t('admin_prompts.create_modal') }}</h3>
          <div class="form-group">
            <label>{{ $t('admin_prompts.label_title') }}</label>
            <input v-model="form.title" maxlength="100" type="text" :placeholder="$t('admin_prompts.title_placeholder')" />
          </div>
          <div class="form-group">
            <label>{{ $t('admin_prompts.label_desc') }}</label>
            <input v-model="form.description" maxlength="500" type="text" :placeholder="$t('admin_prompts.desc_placeholder')" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('admin_prompts.label_category') }}</label>
              <select v-model="form.category" class="sel">
                <option value="main_image">{{ $t('admin_prompts.category_main_image') }}</option>
                <option value="scene">{{ $t('admin_prompts.category_scene') }}</option>
                <option value="video">{{ $t('admin_prompts.category_video') }}</option>
                <option value="script">{{ $t('admin_prompts.category_script') }}</option>
                <option value="copy">{{ $t('admin_prompts.category_copy') }}</option>
                <option value="viral-clone">{{ $t('admin_prompts.category_viral_clone') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ $t('admin_prompts.label_icon') }}</label>
              <input v-model="form.icon" maxlength="50" type="text" :placeholder="$t('admin_prompts.icon_placeholder')" />
            </div>
          </div>
          <div class="form-group">
            <label>{{ $t('admin_prompts.col_code') }}</label>
            <input v-model="form.templateCode" maxlength="100" type="text"
              :placeholder="editing.id ? '' : $t('admin_prompts.code_placeholder')"
              :disabled="!!editing.id"
              :list="'intent-list'" />
            <datalist id="intent-list">
              <option v-for="i in intentIdList" :key="i" :value="i" />
            </datalist>
            <small style="color:#888; font-size:11px;">{{ $t('admin_prompts.template_code_hint') }}</small>
          </div>
          <div class="form-group">
            <label>{{ $t('admin_prompts.label_tags') }}</label>
            <input v-model="form.tags" maxlength="256" type="text" :placeholder="$t('admin_prompts.tags_placeholder')" />
          </div>
          <div class="form-group">
            <label>{{ $t('admin_prompts.label_content') }}</label>
            <textarea v-model="form.content" maxlength="5000" rows="8" :placeholder="$t('admin_prompts.content_placeholder')"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>{{ $t('admin_prompts.label_model_type') }}</label>
              <select v-model="form.modelType" class="sel">
                <option value="text">{{ $t('admin_prompts.model_text') }}</option>
                <option value="image">{{ $t('admin_prompts.model_image') }}</option>
                <option value="video">{{ $t('admin_prompts.model_video') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ $t('admin_prompts.label_sort') }}</label>
              <input v-model.number="form.sortOrder" type="number" min="0" max="9999" :placeholder="$t('admin_prompts.sort_placeholder')" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label><input v-model="form.isPublic" type="checkbox" /> {{ $t('admin_prompts.label_public') }}</label>
            </div>
            <div class="form-group">
              <label>{{ $t('admin_prompts.label_status') }}</label>
              <select v-model="form.status" class="sel">
                <option :value="0">{{ $t('admin_prompts.status_draft') }}</option>
                <option :value="1">{{ $t('admin_prompts.status_pending') }}</option>
                <option :value="2">{{ $t('admin_prompts.status_active') }}</option>
                <option :value="3">{{ $t('admin_prompts.status_offline') }}</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn" @click="showModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? $t('common.saving') : $t('common.save') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">

const { t } = useI18n()
const { confirm } = useConfirm()
const toast = useToast()

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const filterStatus = ref('');
const filterCategory = ref('');
const filterIndustry = ref('');
const activeTab = ref('all');
const loading = ref(false);
const saving = ref(false);
const showModal = ref(false);

const intentIdList = ['white_bg', 'main_image', 'scene_image', 'poster', 'detail_image', 'storyboard', 'product_detail', 'infographic', 'main_video', 'ad_video', 'action_migrate', 'video_clone', 'copywriting', 'description', 'script', 'selling_points', 'translate', 'voice'];

const industryOptions = [
  { key: 'clothing', label: '服装' }, { key: 'beauty', label: '美妆' }, { key: '3c_digital', label: '3C数码' },
  { key: 'electronics', label: '电子产品' }, { key: 'food', label: '食品' }, { key: 'home', label: '家居' },
  { key: 'outdoor', label: '户外' }, { key: 'mother_baby', label: '母婴' }, { key: 'medical', label: '医疗' },
  { key: 'auto', label: '汽车' }, { key: 'pet', label: '宠物' }, { key: 'education', label: '教育' },
  { key: 'jewelry', label: '珠宝' }, { key: 'sports', label: '运动' }, { key: 'toy', label: '玩具' },
  { key: 'book', label: '图书' }, { key: 'office', label: '办公' }, { key: 'travel', label: '旅游' },
  { key: 'wedding', label: '婚庆' }, { key: 'cross_border', label: '跨境电商' },
];

const editing = ref<any>({});
const form = reactive({
  title: '', description: '', category: 'main_image', content: '', icon: 'star',
  modelType: 'text', sortOrder: 0, isPublic: true, status: 2,
  templateCode: '', tags: '',
});

onMounted(() => { fetchData(); });

function switchTab(tab: string) {
  activeTab.value = tab;
  page.value = 1;
  fetchData();
}

async function fetchData() {
  loading.value = true;
  try {
    const baseUrl = activeTab.value === 'review' ? '/api/admin/prompts/review-queue' : '/api/admin/prompts';
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) });
    if (keyword.value) params.set('keyword', keyword.value);
    if (activeTab.value !== 'review' && filterStatus.value) params.set('status', filterStatus.value);
    if (activeTab.value !== 'review' && filterCategory.value) params.set('category', filterCategory.value);
    const res = await $fetch(`${baseUrl}?${params}`, { credentials: 'include' });
    const data = (res as any).data || res as any;
    let items = data.list || [];
    total.value = data.total || 0;
    // 客户端按行业过滤（tags 包含 filterIndustry）
    if (filterIndustry.value) {
      items = items.filter((t: any) => (t.tags || '').includes(filterIndustry.value));
    }
    list.value = items;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('admin_prompts.load_failed') + ': ' + (err?.data?.msg || err.message || t('admin_prompts.network_error'))); } finally { loading.value = false; }
}

function onPageChange(p: number) { page.value = p; fetchData(); }

function openCreate() {
  editing.value = {};
  Object.assign(form, { title: '', description: '', category: 'main_image', content: '', icon: 'star', modelType: 'text', sortOrder: 0, isPublic: true, status: 2, templateCode: '', tags: '' });
  showModal.value = true;
}

function openEdit(t: any) {
  editing.value = t;
  Object.assign(form, {
    title: t.title, description: t.description || '', category: t.category,
    content: t.content, icon: t.icon, modelType: t.model_type, sortOrder: t.sort_order,
    isPublic: !!t.is_public, status: t.status,
    templateCode: t.template_code || '', tags: t.tags || '',
  });
  showModal.value = true;
}

async function save() {
  saving.value = true;
  try {
    const body: any = { ...form };
    if (editing.value.id) body.id = editing.value.id;
    body.templateCode = form.templateCode || editing.value.template_code;
    await $fetch('/api/admin/prompts', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(body),
    });
    showModal.value = false;
    fetchData();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('admin_prompts.save_failed') + ': ' + (err?.data?.msg || err.message || t('admin_prompts.network_error'))); }
  finally { saving.value = false; }
}

function hasMark(t: any, mark: string) {
  return (t.tags || '').split(',').map((s: string) => s.trim()).includes(mark);
}

async function batchMark(ids: number[], marking: string, action: string) {
  try {
    await $fetch('/api/admin/prompts/batch-mark', {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ ids, marking, action }),
    });
    fetchData();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('common.failed') + ' : ' + (err?.data?.msg || err.message)); }
}

async function review(id: number, status: number) {
  if (!await confirm({ message: status === 2 ? t('admin_prompts.approve_confirm') : t('admin_prompts.reject_confirm')} )) return;
  try {
    await $fetch(`/api/admin/prompts/${id}/review`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ status, reviewRemark: status === 3 ? t('admin_prompts.admin_operation') : '' }),
    });
    fetchData();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('admin_prompts.review_failed') + ': ' + (err?.data?.msg || err.message || t('admin_prompts.network_error'))); }
}

async function confirmDelete(t: any) {
  if (!await confirm({ message: t('admin_prompts.delete_confirm', { title: t.title })} )) return;
  try {
    await $fetch(`/api/admin/prompts/${t.id}`, { method: 'DELETE', credentials: 'include' });
    fetchData();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(t('admin_prompts.delete_failed') + ': ' + (err?.data?.msg || err.message || t('admin_prompts.network_error'))); }
}

function categoryLabel(c: string) {
  const map: Record<string, string> = {
    main_image: t('admin_prompts.category_main_image'),
    scene: t('admin_prompts.category_scene'),
    video: t('admin_prompts.category_video'),
    script: t('admin_prompts.category_script'),
    copy: t('admin_prompts.category_copy'),
    'viral-clone': t('admin_prompts.category_viral_clone'),
  };
  return map[c] || c;
}
function statusLabel(s: number) {
  const map: Record<number, string> = {
    0: t('admin_prompts.status_draft'),
    1: t('admin_prompts.status_pending'),
    2: t('admin_prompts.status_active'),
    3: t('admin_prompts.status_offline'),
  };
  return map[s] || String(s);
}
function statusClass(s: number) {
  const map: Record<number, string> = { 0: 'draft', 1: 'pending', 2: 'active', 3: 'banned' };
  return map[s] || '';
}
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid var(--table-border); }
.tab { padding: 8px 20px; border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color var(--transition-fast), border-color var(--transition-fast); }
.tab:hover { color: var(--text-primary); }
.tab.active { color: var(--brand); border-bottom-color: var(--brand); font-weight: 600; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.toolbar input { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); width: 200px; font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); font-size: 13px; outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 6px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-primary { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }
.btn-primary:hover { opacity: 0.9; color: var(--text-on-brand); }
.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); cursor: pointer; margin-right: 4px; background: var(--bg-card); color: var(--text-primary); transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.success { background: var(--success); color: var(--text-on-brand); border-color: var(--success); }
.btn-sm.success:hover { opacity: 0.85; }
.btn-sm.danger { background: var(--danger); color: var(--text-on-brand); border-color: var(--danger); }
.btn-sm.danger:hover { opacity: 0.85; }
.btn-sm.warn { background: var(--warning); color: var(--text-on-brand); border-color: var(--warning); }
.btn-sm.warn:hover { opacity: 0.85; }
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); text-align: left; font-size: 14px; }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.mono { font-family: monospace; font-size: 12px; }
.category-tag { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); background: var(--status-processing-bg); color: var(--status-processing-text); }
.tags-cell { font-size: 12px; color: var(--text-secondary); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-tag { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); }
.source-tag.official { background: var(--status-done-bg); color: var(--status-done-text); }
.source-tag.user { background: var(--status-pending-bg); color: var(--status-pending-text); }
.status-tag { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); }
.status-tag.draft { background: var(--bg-hover); color: var(--text-muted); }
.status-tag.pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.status-tag.active { background: var(--status-done-bg); color: var(--status-done-text); }
.status-tag.banned { background: var(--status-fail-bg); color: var(--status-fail-text); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 999; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { margin-bottom: 16px; color: var(--text-primary); font-size: 17px; font-weight: 600; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.form-group textarea { resize: vertical; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.actions { white-space: nowrap; }
</style>
