<template>
  <div class="ent-users">
    <div class="page-header">
      <h1 class="page-title">{{ $t('enterprise.users.title') }}</h1>
      <button class="btn-primary" @click="showAdd = true">+ {{ $t('enterprise.users.addUser') }}</button>
    </div>

    <!-- 搜索/筛选 -->
    <div class="toolbar">
      <input v-model="keyword" :placeholder="$t('enterprise.users.searchPlaceholder')" class="search-input" @keyup.enter="loadUsers" />
      <select v-model="statusFilter" @change="loadUsers" class="filter-select">
        <option value="">{{ $t('enterprise.users.allStatus') }}</option>
        <option value="1">{{ $t('enterprise.common.statusEnabled') }}</option>
        <option value="0">{{ $t('enterprise.common.statusDisabled') }}</option>
      </select>
      <button class="btn-text" @click="loadUsers">{{ $t('enterprise.common.search') }}</button>
    </div>

    <!-- 用户列表 -->
    <div class="table-wrap" v-if="!loading">
      <table v-if="users.length">
        <thead>
          <tr><th>{{ $t('enterprise.users.nickname') }}</th><th>{{ $t('enterprise.users.phone') }}</th><th>{{ $t('enterprise.users.email') }}</th><th>{{ $t('enterprise.users.role') }}</th><th>{{ $t('enterprise.users.status') }}</th><th>{{ $t('enterprise.users.createdAt') }}</th><th>{{ $t('enterprise.users.actions') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.nickname || '-' }}</td>
            <td>{{ u.phone || '-' }}</td>
            <td>{{ u.email || '-' }}</td>
            <td>{{ roleLabel(u.role) }}</td>
            <td><span :class="['status-tag', u.status === 1 ? 'on' : 'off']">{{ u.status === 1 ? $t('enterprise.common.statusEnabled') : $t('enterprise.common.statusDisabled') }}</span></td>
            <td>{{ formatDate(u.create_time) }}</td>
            <td class="actions">
              <button class="btn-sm" @click="editUser(u)">{{ $t('enterprise.users.edit') }}</button>
              <button class="btn-sm danger" @click="handleRemove(u)">{{ $t('enterprise.users.remove') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">{{ $t('enterprise.users.noUsers') }}</div>

      <div class="pager" v-if="total > pageSize">
        <button :disabled="page <= 1" @click="page--; loadUsers()">{{ $t('enterprise.common.prevPage') }}</button>
        <span>{{ $t('enterprise.common.pageOf', { page, total: Math.ceil(total / pageSize) }) }}</span>
        <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadUsers()">{{ $t('enterprise.common.nextPage') }}</button>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div class="modal-overlay" v-if="showAdd || showEdit" @click.self="closeModal">
      <div class="modal">
        <h2>{{ showEdit ? $t('enterprise.users.editUser') : $t('enterprise.users.addUser') }}</h2>
        <div class="form-group">
          <label>{{ $t('enterprise.users.phone') }} <span class="required">*</span></label>
          <input v-model="form.phone" :placeholder="$t('enterprise.users.phonePlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.users.email') }}</label>
          <input v-model="form.email" type="email" :placeholder="$t('enterprise.users.emailPlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.users.nickname') }}</label>
          <input v-model="form.nickname" :placeholder="$t('enterprise.users.nicknamePlaceholder')" />
        </div>
        <div class="form-group" v-if="!showEdit">
          <label>{{ $t('enterprise.users.password') }} <span class="required">*</span></label>
          <input v-model="form.password" type="password" :placeholder="$t('enterprise.users.passwordPlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.users.role') }}</label>
          <select v-model="form.role">
            <option value="enterprise_admin">{{ $t('enterprise.users.roleAdmin') }}</option>
            <option value="enterprise_operator">{{ $t('enterprise.users.roleOperator') }}</option>
            <option value="enterprise_viewer">{{ $t('enterprise.users.roleViewer') }}</option>
          </select>
        </div>
        <div v-if="showEdit" class="form-group">
          <label>{{ $t('enterprise.users.status') }}</label>
          <select v-model="form.status">
            <option :value="1">{{ $t('enterprise.common.statusEnabled') }}</option>
            <option :value="0">{{ $t('enterprise.common.statusDisabled') }}</option>
          </select>
        </div>
        <div v-if="modalError" class="error-msg">{{ modalError }}</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeModal">{{ $t('enterprise.common.cancel') }}</button>
          <button class="btn-primary" @click="handleSave" :disabled="saving">{{ saving ? $t('enterprise.common.saving') : $t('enterprise.common.save') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useToast } from '~/composables/useToast';
const { t } = useI18n();
const toast = useToast();
const users = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const statusFilter = ref('');
const loading = ref(true);

const showAdd = ref(false);
const showEdit = ref(false);
const editId = ref(null);
const form = ref({ phone: '', email: '', nickname: '', password: '', role: 'enterprise_operator', status: 1 });
const saving = ref(false);
const modalError = ref('');

onMounted(() => loadUsers());

async function loadUsers() {
  loading.value = true;
  try {
    const params = { page: page.value, pageSize, keyword: keyword.value };
    if (statusFilter.value !== '') params.status = statusFilter.value;
    const res = await $fetch('/api/enterprise/users', { credentials: 'include', params });
    users.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e) { toast.error(t('enterprise.users.loadFailed')); }
  finally { loading.value = false; }
}

function editUser(u) {
  editId.value = u.id;
  form.value = { phone: u.phone || '', email: u.email || '', nickname: u.nickname || '', password: '', role: u.role, status: u.status };
  showEdit.value = true;
}

async function handleRemove(u) {
  if (!window.confirm($t('enterprise.removeUserConfirm', { name: u.nickname || u.phone }))) return;
  try {
    await $fetch(`/api/enterprise/users/${u.id}`, { method: 'DELETE', credentials: 'include' });
    loadUsers();
  } catch (e) { toast.error(e?.data?.msg || t('enterprise.users.removeFailed')); }
}

async function handleSave() {
  modalError.value = '';
  if (!showEdit.value && !form.value.phone && !form.value.email) { modalError.value = t('enterprise.users.phoneOrEmailRequired'); return; }
  if (!showEdit.value && !form.value.password) { modalError.value = t('enterprise.users.passwordRequired'); return; }
  saving.value = true;
  try {
    if (showEdit.value) {
      await $fetch(`/api/enterprise/users/${editId.value}`, { method: 'PUT', body: { role: form.value.role, status: form.value.status }, credentials: 'include' });
    } else {
      await $fetch('/api/enterprise/users', { method: 'POST', body: form.value, credentials: 'include' });
    }
    closeModal();
    loadUsers();
  } catch (e) { modalError.value = e?.data?.msg || t('enterprise.users.operationFailed'); }
  finally { saving.value = false; }
}

function closeModal() { showAdd.value = false; showEdit.value = false; modalError.value = ''; form.value = { phone: '', email: '', nickname: '', password: '', role: 'enterprise_operator', status: 1 }; }

function roleLabel(r) { const m = { enterprise_admin: t('enterprise.users.roleAdmin'), enterprise_operator: t('enterprise.users.roleOperator'), enterprise_viewer: t('enterprise.users.roleViewer') }; return m[r] || r; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 24px; margin: 0; color: #1a1a2e; }
.btn-primary { padding: 10px 20px; background: #667eea; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: 0.6; }

.toolbar { display: flex; gap: 10px; margin-bottom: 20px; }
.search-input { flex: 1; max-width: 280px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
.filter-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: #fff; }
.btn-text { padding: 8px 16px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }

.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; color: #666; font-weight: 500; }
.actions { display: flex; gap: 8px; }
.btn-sm { padding: 4px 12px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; }
.btn-sm.danger { color: #e74c3c; border-color: #e74c3c; }
.status-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.status-tag.on { background: #e8f5e9; color: #27ae60; }
.status-tag.off { background: #fbe9e7; color: #e74c3c; }
.empty { padding: 40px; text-align: center; color: #999; }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; font-size: 14px; }
.pager button { padding: 6px 14px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 440px; background: #fff; border-radius: 16px; padding: 28px; }
.modal h2 { margin: 0 0 20px; font-size: 18px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.required { color: #e74c3c; }
.error-msg { color: #e74c3c; font-size: 13px; margin-bottom: 8px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; font-size: 14px; }
</style>
