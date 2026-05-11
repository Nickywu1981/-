<template>
  <div class="ent-users">
    <div class="page-header">
      <h1 class="page-title">子账号管理</h1>
      <button class="btn-primary" @click="showAdd = true">+ 添加子账号</button>
    </div>

    <!-- 搜索/筛选 -->
    <div class="toolbar">
      <input v-model="keyword" placeholder="搜索昵称/手机号/邮箱" class="search-input" @keyup.enter="loadUsers" />
      <select v-model="statusFilter" @change="loadUsers" class="filter-select">
        <option value="">全部状态</option>
        <option value="1">启用</option>
        <option value="0">禁用</option>
      </select>
      <button class="btn-text" @click="loadUsers">搜索</button>
    </div>

    <!-- 用户列表 -->
    <div class="table-wrap" v-if="!loading">
      <table v-if="users.length">
        <thead>
          <tr><th>昵称</th><th>手机号</th><th>邮箱</th><th>角色</th><th>状态</th><th>创建时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.nickname || '-' }}</td>
            <td>{{ u.phone || '-' }}</td>
            <td>{{ u.email || '-' }}</td>
            <td>{{ roleLabel(u.role) }}</td>
            <td><span :class="['status-tag', u.status === 1 ? 'on' : 'off']">{{ u.status === 1 ? '启用' : '禁用' }}</span></td>
            <td>{{ formatDate(u.create_time) }}</td>
            <td class="actions">
              <button class="btn-sm" @click="editUser(u)">编辑</button>
              <button class="btn-sm danger" @click="handleRemove(u)">移除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无子账号</div>

      <div class="pager" v-if="total > pageSize">
        <button :disabled="page <= 1" @click="page--; loadUsers()">上一页</button>
        <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span>
        <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadUsers()">下一页</button>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div class="modal-overlay" v-if="showAdd || showEdit" @click.self="closeModal">
      <div class="modal">
        <h2>{{ showEdit ? '编辑子账号' : '添加子账号' }}</h2>
        <div class="form-group">
          <label>手机号 <span class="required">*</span></label>
          <input v-model="form.phone" placeholder="请输入手机号" />
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="form.email" type="email" placeholder="请输入邮箱" />
        </div>
        <div class="form-group">
          <label>昵称</label>
          <input v-model="form.nickname" placeholder="请输入昵称" />
        </div>
        <div class="form-group" v-if="!showEdit">
          <label>密码 <span class="required">*</span></label>
          <input v-model="form.password" type="password" placeholder="至少6位" />
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="form.role">
            <option value="enterprise_admin">企业管理员</option>
            <option value="enterprise_operator">操作员</option>
            <option value="enterprise_viewer">查看者</option>
          </select>
        </div>
        <div v-if="showEdit" class="form-group">
          <label>状态</label>
          <select v-model="form.status">
            <option :value="1">启用</option>
            <option :value="0">禁用</option>
          </select>
        </div>
        <div v-if="modalError" class="error-msg">{{ modalError }}</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-primary" @click="handleSave" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useToast } from '~/composables/useToast';
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
  } catch (e) { console.error(e); toast.error('成员列表加载失败'); }
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
  } catch (e) { toast.error(e?.data?.msg || '移除失败'); }
}

async function handleSave() {
  modalError.value = '';
  if (!showEdit.value && !form.value.phone && !form.value.email) { modalError.value = '手机号或邮箱为必填项'; return; }
  if (!showEdit.value && !form.value.password) { modalError.value = '密码为必填项'; return; }
  saving.value = true;
  try {
    if (showEdit.value) {
      await $fetch(`/api/enterprise/users/${editId.value}`, { method: 'PUT', body: { role: form.value.role, status: form.value.status }, credentials: 'include' });
    } else {
      await $fetch('/api/enterprise/users', { method: 'POST', body: form.value, credentials: 'include' });
    }
    closeModal();
    loadUsers();
  } catch (e) { modalError.value = e?.data?.msg || '操作失败'; }
  finally { saving.value = false; }
}

function closeModal() { showAdd.value = false; showEdit.value = false; modalError.value = ''; form.value = { phone: '', email: '', nickname: '', password: '', role: 'enterprise_operator', status: 1 }; }

function roleLabel(r) { const m = { enterprise_admin: '企业管理员', enterprise_operator: '操作员', enterprise_viewer: '查看者' }; return m[r] || r; }
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

.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
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
