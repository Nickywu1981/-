<template>
  <AdminLayout>
    <div class="page-header">
      <h2 class="ptitle">{{ $t('admin_sms_templates.page_title') }}</h2>
      <button class="btn btn--primary" @click="openCreate"><span class="btn-icon">+</span> {{ $t('admin_sms_templates.new_template') }}</button>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="searchQuery" :placeholder="$t('admin_sms_templates.search_placeholder')" class="search-input" @input="onSearch" />
      </div>
      <select v-model="filterProvider" class="filter-select" @change="fetchTemplates">
        <option value="">{{ $t('admin_sms_templates.all_providers') }}</option>
        <option value="mock">{{ $t('admin_sms_templates.provider_mock') }}</option>
        <option value="aliyun">{{ $t('admin_sms_templates.provider_aliyun') }}</option>
        <option value="tencent">{{ $t('admin_sms_templates.provider_tencent') }}</option>
      </select>
    </div>

    <div v-if="isLoading" class="loading-state"><LoadingSkeleton :rows="3" /></div>
    <div v-else-if="!templates.length" class="empty-state">{{ $t('admin_sms_templates.empty') }}</div>
    <div v-else class="tpl-grid">
      <div v-for="tpl in templates" :key="tpl.id" class="tpl-card" :class="{ disabled: !tpl.status }">
        <div class="tpl-header">
          <span class="tpl-code">{{ tpl.template_code }}</span>
          <div class="tpl-actions">
            <button class="act-btn toggle-btn" :class="{ off: !tpl.status }" :aria-label="tpl.status ? $t('admin_sms_templates.toggle_enable_aria') : $t('admin_sms_templates.toggle_disable_aria')" @click="toggleStatus(tpl)" :title="tpl.status ? $t('admin_sms_templates.toggle_enable_title') : $t('admin_sms_templates.toggle_disable_title')">{{ tpl.status ? '🟢' : '🔴' }}</button>
            <button class="act-btn del-btn" :aria-label="$t('admin_sms_templates.delete_aria')" @click="confirmDelete(tpl)" :title="$t('admin_sms_templates.delete_title')">🗑</button>
          </div>
        </div>
        <div class="tpl-body">
          <div class="row"><span>{{ $t('admin_sms_templates.template_name') }}:</span> <input v-model="tpl.name" maxlength="100" /></div>
          <div class="row"><span>{{ $t('admin_sms_templates.template_content') }}:</span> <textarea v-model="tpl.content" maxlength="5000" rows="3"></textarea></div>
          <div class="row"><span>{{ $t('admin_sms_templates.provider_template_id') }}:</span> <input v-model="tpl.provider_template_id" maxlength="100" :placeholder="$t('admin_sms_templates.provider_id_placeholder')" /></div>
          <div class="row"><span>{{ $t('admin_sms_templates.provider') }}:</span>
            <select v-model="tpl.provider">
              <option value="mock">{{ $t('admin_sms_templates.provider_mock') }}</option>
              <option value="aliyun">{{ $t('admin_sms_templates.provider_aliyun') }}</option>
              <option value="tencent">{{ $t('admin_sms_templates.provider_tencent') }}</option>
            </select>
          </div>
          <div class="row"><span>{{ $t('admin_sms_templates.remark') }}:</span> <input v-model="tpl.remark" maxlength="500" /></div>
        </div>
        <div class="tpl-footer">
          <button class="btn-save" :disabled="saving === tpl.id" @click="saveTpl(tpl)">{{ saving === tpl.id ? $t('common.saving') : $t('common.save') }}</button>
        </div>
      </div>
    </div>

    <Pagination v-if="total > pageSize" v-model:page="currentPage" :total="total" :page-size="pageSize" @change="fetchTemplates" />

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false" @keydown.escape="showCreate = false">
      <div class="modal">
        <div class="modal-header"><h3>{{ $t('admin_sms_templates.new_template') }}</h3><button class="modal-close" :aria-label="$t('admin_sms_templates.close_aria')" @click="showCreate = false">✕</button></div>
        <div class="modal-body">
          <div class="row"><span>{{ $t('admin_sms_templates.template_code') }}:</span> <input v-model="newTpl.template_code" maxlength="50" :placeholder="$t('admin_sms_templates.template_code_placeholder')" /></div>
          <div class="row"><span>{{ $t('admin_sms_templates.template_name') }}:</span> <input v-model="newTpl.name" maxlength="100" :placeholder="$t('admin_sms_templates.template_name_placeholder')" /></div>
          <div class="row"><span>{{ $t('admin_sms_templates.template_content') }}:</span> <textarea v-model="newTpl.content" maxlength="5000" rows="3" :placeholder="$t('admin_sms_templates.template_content_placeholder')"></textarea></div>
          <div class="row"><span>{{ $t('admin_sms_templates.provider_template_id') }}:</span> <input v-model="newTpl.provider_template_id" maxlength="100" :placeholder="$t('admin_sms_templates.provider_id_placeholder')" /></div>
          <div class="row"><span>{{ $t('admin_sms_templates.provider') }}:</span>
            <select v-model="newTpl.provider">
              <option value="mock">{{ $t('admin_sms_templates.provider_mock') }}</option><option value="aliyun">{{ $t('admin_sms_templates.provider_aliyun') }}</option><option value="tencent">{{ $t('admin_sms_templates.provider_tencent') }}</option>
            </select>
          </div>
          <div class="row"><span>{{ $t('admin_sms_templates.remark') }}:</span> <input v-model="newTpl.remark" maxlength="500" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreate = false">{{ $t('common.cancel') }}</button>
          <button class="btn-confirm" :disabled="creating" @click="createTpl">{{ creating ? $t('admin_sms_templates.creating') : $t('admin_sms_templates.create_confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="showDelete" class="modal-overlay" @click.self="showDelete = false" @keydown.escape="showDelete = false">
      <div class="modal modal-sm">
        <div class="modal-header"><h3>{{ $t('admin_sms_templates.delete_confirm_title') }}</h3></div>
        <div class="modal-body"><p>{{ $t('admin_sms_templates.delete_confirm_desc', { name: deleteTarget?.name }) }}</p></div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showDelete = false">{{ $t('common.cancel') }}</button>
          <button class="btn-confirm btn-danger" :disabled="deleting" @click="doDelete">{{ deleting ? $t('admin_sms_templates.deleting') : $t('admin_sms_templates.delete_btn') }}</button>
        </div>
      </div>
    </div>

    <p v-if="msg" class="toast-msg">{{ msg }}</p>
  </AdminLayout>
</template>

<script setup lang="ts">

import AdminLayout from '~/components/AdminLayout.vue';

const { t } = useI18n();

const templates = ref<any[]>([]);
const saving = ref(0);
const { message: msg, show: showMsg } = useTimedMessage();
const isLoading = ref(false);
const searchQuery = ref('');
const filterProvider = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const showCreate = ref(false);
const showDelete = ref(false);
const creating = ref(false);
const deleting = ref(false);
const deleteTarget = ref<any>(null);
const toast = useToast();

const newTpl = ref({ template_code: '', name: '', content: '', provider_template_id: '', provider: 'mock', status: 1, remark: '' });

async function fetchTemplates() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (searchQuery.value) params.set('keyword', searchQuery.value);
    if (filterProvider.value) params.set('provider', filterProvider.value);
    params.set('page', String(currentPage.value));
    params.set('pageSize', String(pageSize.value));
    const res: any = await $fetch(`/api/sms/templates?${params}`);
    templates.value = res.data?.list || res.data || [];
    total.value = res.data?.total || templates.value.length;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('admin_sms_templates.load_failed')) }
  isLoading.value = false;
}

async function saveTpl(tpl: any) {
  saving.value = tpl.id; msg.value = '';
  try {
    await $fetch(`/api/sms/templates/${tpl.id}`, {
      method: 'PUT',
      body: { name: tpl.name, content: tpl.content, provider_template_id: tpl.provider_template_id, provider: tpl.provider, status: tpl.status, remark: tpl.remark },
    });
    showMsg(t('admin_sms_templates.saved'));
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('admin_sms_templates.save_failed'); }
  saving.value = 0;
}

async function toggleStatus(tpl: any) { tpl.status = tpl.status ? 0 : 1; await saveTpl(tpl); }

function openCreate() { newTpl.value = { template_code: '', name: '', content: '', provider_template_id: '', provider: 'mock', status: 1, remark: '' }; showCreate.value = true; }

async function createTpl() {
  creating.value = true;
  try {
    await $fetch('/api/sms/templates', { method: 'POST', body: newTpl.value });
    showCreate.value = false; showMsg(t('admin_sms_templates.template_created'));
    fetchTemplates();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('admin_sms_templates.create_failed'); }
  creating.value = false;
}

function confirmDelete(tpl: any) { deleteTarget.value = tpl; showDelete.value = true; }

async function doDelete() {
  if (!deleteTarget.value) return; deleting.value = true;
  try {
    await $fetch(`/api/sms/templates/${deleteTarget.value.id}`, { method: 'DELETE' });
    showDelete.value = false; showMsg(t('admin_sms_templates.template_deleted'));
    fetchTemplates();
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; msg.value = err?.data?.msg || t('admin_sms_templates.delete_failed'); }
  deleting.value = false;
}

function onSearch() { currentPage.value = 1; fetchTemplates(); }

onMounted(fetchTemplates);
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ptitle { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.btn { padding: 8px 16px; border: none; border-radius: var(--btn-radius); cursor: pointer; font-size: 13px; font-weight: 500; transition: opacity var(--transition-fast), transform var(--transition-fast); }
.btn--primary { background: var(--brand); color: #fff; }
.btn--primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-icon { margin-right: 4px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.search-box { position: relative; flex: 1; max-width: 300px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; }
.search-input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.search-input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.filter-select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.loading-state, .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }
.tpl-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 900px) { .tpl-grid { grid-template-columns: 1fr; } }
.tpl-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-xl); padding: var(--card-padding); transition: box-shadow var(--transition-fast); }
.tpl-card:hover { box-shadow: var(--shadow-md); }
.tpl-card.disabled { opacity: 0.6; }
.tpl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tpl-code { font-family: monospace; font-size: 13px; font-weight: 600; color: var(--brand); }
.tpl-actions { display: flex; gap: 8px; }
.act-btn { min-width: 36px; min-height: 36px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); background: var(--bg-card); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: transform var(--transition-fast); }
.act-btn:hover { transform: scale(1.1); }
.act-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.toggle-btn.off { opacity: 0.4; }
.del-btn:hover { border-color: var(--danger); background: var(--danger-light, #FEE2E2); }
.tpl-body .row { margin-bottom: 8px; font-size: 13px; }
.tpl-body .row span { display: block; color: var(--text-secondary); margin-bottom: 4px; }
.tpl-body .row input, .tpl-body .row select, .tpl-body .row textarea { width: 100%; padding: 6px 8px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; box-sizing: border-box; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.tpl-body .row input:focus, .tpl-body .row select:focus, .tpl-body .row textarea:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.tpl-body .row textarea { resize: vertical; font-family: inherit; }
.tpl-footer { margin-top: 12px; }
.btn-save { width: 100%; padding: var(--btn-padding); background: var(--brand); color: #fff; border: none; border-radius: var(--btn-radius); cursor: pointer; font-size: var(--btn-font-size); transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: var(--fade-in); }
.modal { background: var(--bg-card); border-radius: var(--radius-xl); width: 540px; max-width: 90vw; max-height: 80vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-sm { width: 400px; max-width: 90vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
.modal-header h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary); }
.modal-body { padding: 20px; }
.modal-body .row { margin-bottom: 10px; font-size: 13px; }
.modal-body .row span { display: block; color: var(--text-secondary); margin-bottom: 4px; }
.modal-body .row input, .modal-body .row select, .modal-body .row textarea { width: 100%; padding: 8px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; box-sizing: border-box; }
.modal-body .row textarea { resize: vertical; font-family: inherit; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border-light); }
.btn-cancel { padding: 8px 16px; border: 1px solid var(--border-light); border-radius: var(--btn-radius); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-confirm { padding: 8px 16px; border: none; border-radius: var(--btn-radius); background: var(--brand); color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; transition: opacity var(--transition-fast); }
.btn-confirm:hover { opacity: 0.9; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { background: var(--danger); }
</style>