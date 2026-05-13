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
            <td>{{ formatDateLocale(u.create_time) }}</td>
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
    <div v-if="loading" class="loading-spinner">{{ $t('enterprise.common.loading') }}</div>

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
import { formatDateLocale } from '~/utils/format';
const { t } = useI18n();
const toast = useToast();
const { confirm } = useConfirm();
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
  if (!(await confirm({ message: $t('enterprise.removeUserConfirm', { name: u.nickname || u.phone }) }))) return;
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

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.ent-users {
  --ed-text-primary: #1a1a2e; --ed-brand: #667eea; --ed-text-on-brand: #fff; --ed-card-bg: #fff;
  --ed-card-shadow: 0 2px 8px rgba(0,0,0,0.06); --ed-border: #ddd; --ed-text-muted: #767676; --ed-bg-subtle: #fafafa;
  --ed-bg-muted: #f0f0f0; --ed-danger: #e74c3c; --ed-success-bg: #e8f5e9; --ed-success: #27ae60;
  --ed-danger-bg: #fbe9e7; --ed-overlay: rgba(0,0,0,0.4); --ed-text-secondary: #666; --ed-text-label: #555;
}
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 24px; margin: 0; color: var(--ed-text-primary); }
.btn-primary { padding: 10px 20px; background: var(--ed-brand); color: var(--ed-text-on-brand); border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: 0.6; }

.toolbar { display: flex; gap: 10px; margin-bottom: 20px; }
.search-input { flex: 1; max-width: 280px; padding: 8px 12px; border: 1px solid var(--ed-border); border-radius: 8px; font-size: 14px; }
.filter-select { padding: 8px 12px; border: 1px solid var(--ed-border); border-radius: 8px; font-size: 14px; background: var(--ed-card-bg); }
.btn-text { padding: 8px 16px; background: var(--ed-bg-muted); border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }

.table-wrap { background: var(--ed-card-bg); border-radius: 12px; box-shadow: var(--ed-card-shadow); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; font-size: 14px; border-bottom: 1px solid var(--ed-bg-muted); }
th { background: var(--ed-bg-subtle); color: var(--ed-text-secondary); font-weight: 500; }
.actions { display: flex; gap: 8px; }
.btn-sm { padding: 4px 12px; border: 1px solid var(--ed-border); background: var(--ed-card-bg); border-radius: 6px; cursor: pointer; font-size: 12px; }
.btn-sm.danger { color: var(--ed-danger); border-color: var(--ed-danger); }
.status-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.status-tag.on { background: var(--ed-success-bg); color: var(--ed-success); }
.status-tag.off { background: var(--ed-danger-bg); color: var(--ed-danger); }
.empty { padding: 40px; text-align: center; color: var(--ed-text-muted); }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; font-size: 14px; }
.pager button { padding: 6px 14px; border: 1px solid var(--ed-border); background: var(--ed-card-bg); border-radius: 6px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }

.modal-overlay { position: fixed; inset: 0; background: var(--ed-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 440px; background: var(--ed-card-bg); border-radius: 16px; padding: 28px; }
.modal h2 { margin: 0 0 20px; font-size: 18px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--ed-text-label); margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--ed-border); border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.required { color: var(--ed-danger); }
.error-msg { color: var(--ed-danger); font-size: 13px; margin-bottom: 8px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--ed-border); background: var(--ed-card-bg); border-radius: 8px; cursor: pointer; font-size: 14px; }

/* Dark mode */
:root[data-theme="dark"] .ent-users, :root.dark .ent-users {
  --ed-text-primary: #e5e5e5;
  --ed-card-bg: #1a1a1a;
  --ed-card-shadow: 0 2px 8px rgba(0,0,0,0.2);
  --ed-border: #2a2a2a;
  --ed-text-muted: #9d9da3;
  --ed-bg-subtle: #1a1a1a;
  --ed-bg-muted: #2a2a2a;
  --ed-success-bg: #1a3a2a;
  --ed-danger-bg: #3a1a1a;
  --ed-overlay: rgba(0,0,0,0.6);
  --ed-text-secondary: #9d9da3;
  --ed-text-label: #9d9da3;
}
</style>
