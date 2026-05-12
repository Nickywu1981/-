<template>
  <div class="pg enterprise-approval">
    <header class="pg-header">
      <h2>{{ $t('admin.enterprises.approval', '企业入驻审批') }}</h2>
      <p class="pg-desc">{{ $t('admin.enterprises.desc', '审核企业/代理商入驻申请') }}</p>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-row" v-if="!loading.stats">
      <div class="stat-card pending">
        <span class="stat-val">{{ stats.pending || 0 }}</span>
        <span class="stat-label">{{ $t('admin.enterprises.pending', '待审核') }}</span>
      </div>
      <div class="stat-card reviewing">
        <span class="stat-val">{{ stats.under_review || 0 }}</span>
        <span class="stat-label">{{ $t('admin.enterprises.under_review', '审核中') }}</span>
      </div>
      <div class="stat-card approved">
        <span class="stat-val">{{ stats.approved || 0 }}</span>
        <span class="stat-label">{{ $t('admin.enterprises.approved', '已通过') }}</span>
      </div>
      <div class="stat-card rejected">
        <span class="stat-val">{{ stats.rejected || 0 }}</span>
        <span class="stat-label">{{ $t('admin.enterprises.rejected', '已驳回') }}</span>
      </div>
    </section>

    <!-- 表格 -->
    <section class="table-wrap">
      <div v-if="loading.list" class="loading-state">{{ $t('common.loading', '加载中...') }}</div>
      <div v-else-if="error.list" class="error-state">{{ error.list }}</div>
      <template v-else>
        <table v-if="tenants.length" class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ $t('admin.enterprises.name', '企业名称') }}</th>
              <th>{{ $t('admin.enterprises.type', '类型') }}</th>
              <th>{{ $t('admin.enterprises.contact', '联系人') }}</th>
              <th>{{ $t('admin.enterprises.phone', '电话') }}</th>
              <th>{{ $t('admin.enterprises.status', '状态') }}</th>
              <th>{{ $t('admin.enterprises.time', '申请时间') }}</th>
              <th>{{ $t('admin.enterprises.actions', '操作') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tenants" :key="t.id">
              <td class="mono">{{ t.id }}</td>
              <td>
                <strong>{{ t.name }}</strong>
                <div class="ent-code">{{ t.code }}</div>
              </td>
              <td><span class="badge" :class="typeClass(t.type)">{{ typeLabel(t.type) }}</span></td>
              <td>{{ t.contact_name || '-' }}</td>
              <td>{{ t.contact_phone || '-' }}</td>
              <td><span class="badge" :class="statusClass(t.review_status)">{{ statusLabel(t.review_status) }}</span></td>
              <td class="time">{{ formatTime(t.create_time) }}</td>
              <td class="actions">
                <button v-if="t.review_status === 'pending' || t.review_status === 'under_review'"
                  class="btn btn-sm btn-success" @click="doApprove(t)">✓ 通过</button>
                <button v-if="t.review_status === 'pending' || t.review_status === 'under_review'"
                  class="btn btn-sm btn-danger" @click="showReject(t)">✗ 驳回</button>
                <button v-if="t.review_status === 'approved'"
                  class="btn btn-sm btn-warning" @click="showSuspend(t)">⏸ 停用</button>
                <button v-if="t.review_status === 'suspended'"
                  class="btn btn-sm btn-success" @click="doReinstate(t)">↻ 恢复</button>
                <button v-if="t.review_status === 'rejected'"
                  class="btn btn-sm btn-outline" @click="doResubmit(t)">↺ 重审</button>
                <button class="btn btn-sm btn-ghost" @click="showLogs(t)">📋 日志</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">{{ $t('admin.enterprises.no_data', '暂无待审核企业') }}</div>
      </template>
    </section>

    <!-- 审批日志弹窗 -->
    <div v-if="showLogModal" class="modal-overlay" @click.self="showLogModal = false">
      <div class="modal-content">
        <h3>{{ $t('admin.enterprises.approval_logs', '审批日志') }} — {{ activeTenant?.name }}</h3>
        <div v-if="logs.length" class="log-list">
          <div v-for="l in logs" :key="l.id" class="log-item">
            <div class="log-header">
              <span class="badge" :class="actionClass(l.action)">{{ actionLabel(l.action) }}</span>
              <span class="log-op">{{ l.operator_name || `ID:${l.operator_id}` }}</span>
              <span class="log-time">{{ formatTime(l.create_time) }}</span>
            </div>
            <div class="log-detail">
              {{ l.old_status }} → {{ l.new_status }}
              <span v-if="l.reason" class="log-reason">原因: {{ l.reason }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">{{ $t('admin.enterprises.no_logs', '暂无操作日志') }}</div>
        <button class="btn btn-ghost mt" @click="showLogModal = false">{{ $t('common.close', '关闭') }}</button>
      </div>
    </div>

    <!-- 驳回原因弹窗 -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
      <div class="modal-content">
        <h3>{{ $t('admin.enterprises.reject_title', '驳回企业入驻') }}</h3>
        <p>{{ $t('admin.enterprises.reject_hint', '请填写驳回原因（至少4个字符）') }}</p>
        <textarea v-model="rejectReason" class="input" rows="4" :placeholder="$t('admin.enterprises.reject_placeholder', '例如: 资质不足、营业执照过期、信息不完整')" />
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showRejectModal = false">{{ $t('common.cancel', '取消') }}</button>
          <button class="btn btn-danger" :disabled="rejectReason.length < 4" @click="doReject">确认驳回</button>
        </div>
      </div>
    </div>

    <!-- 停用原因弹窗 -->
    <div v-if="showSuspendModal" class="modal-overlay" @click.self="showSuspendModal = false">
      <div class="modal-content">
        <h3>{{ $t('admin.enterprises.suspend_title', '停用企业') }}</h3>
        <textarea v-model="suspendReason" class="input" rows="3" :placeholder="$t('admin.enterprises.suspend_placeholder', '停用原因（可选）')" />
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showSuspendModal = false">{{ $t('common.cancel', '取消') }}</button>
          <button class="btn btn-warning" @click="doSuspend">确认停用</button>
        </div>
      </div>
    </div>

    <!-- 操作反馈 -->
    <div v-if="toast.msg" class="toast" :class="toast.type">{{ toast.msg }}</div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin' });

const { $api } = useNuxtApp();
const { t } = useI18n();

const tenants = ref([]);
const stats = ref({ pending: 0, under_review: 0, approved: 0, rejected: 0 });
const logs = ref([]);
const loading = reactive({ list: false, stats: false });
const error = reactive({ list: '', stats: '' });
const toast = reactive({ msg: '', type: 'success' });
const showLogModal = ref(false);
const showRejectModal = ref(false);
const showSuspendModal = ref(false);
const activeTenant = ref(null);
const rejectReason = ref('');
const suspendReason = ref('');

const STATUS_MAP = {
  pending: t('admin.enterprises.status_pending', '待审核'),
  under_review: t('admin.enterprises.status_under_review', '审核中'),
  approved: t('admin.enterprises.status_approved', '已通过'),
  rejected: t('admin.enterprises.status_rejected', '已驳回'),
  suspended: t('admin.enterprises.status_suspended', '已停用'),
};

const TYPE_MAP = {
  enterprise: t('admin.enterprises.type_enterprise', '企业'),
  agent: t('admin.enterprises.type_agent', '代理商'),
  partner: t('admin.enterprises.type_partner', '合作伙伴'),
};

const ACTION_MAP = {
  submit: t('admin.enterprises.action_submit', '提交'),
  approve: t('admin.enterprises.action_approve', '通过'),
  reject: t('admin.enterprises.action_reject', '驳回'),
  suspend: t('admin.enterprises.action_suspend', '停用'),
  reinstate: t('admin.enterprises.action_reinstate', '恢复'),
  update_docs: t('admin.enterprises.action_update_docs', '更新资料'),
};

function statusClass(s) {
  if (s === 'approved' || s === 'reinstate') return 'badge-success';
  if (s === 'rejected') return 'badge-danger';
  if (s === 'suspended') return 'badge-warning';
  if (s === 'under_review') return 'badge-info';
  return 'badge-default';
}

function statusLabel(s) { return STATUS_MAP[s] || s; }
function typeClass(t) { return t === 'agent' ? 'badge-accent' : t === 'partner' ? 'badge-info' : 'badge-default'; }
function typeLabel(t) { return TYPE_MAP[t] || t; }
function actionClass(a) { if (a === 'approve' || a === 'reinstate') return 'badge-success'; if (a === 'reject') return 'badge-danger'; if (a === 'suspend') return 'badge-warning'; return 'badge-default'; }
function actionLabel(a) { return ACTION_MAP[a] || a; }
function formatTime(t) { return t ? new Date(t).toLocaleString('zh-CN') : '-'; }
function showToast(msg, type = 'success') { toast.msg = msg; toast.type = type; setTimeout(() => { toast.msg = ''; }, 3000); }

async function fetchStats() {
  loading.stats = true;
  try {
    stats.value = await $api('/admin/enterprises/approval-stats');
  } catch (err) {
    error.stats = err.message;
  } finally {
    loading.stats = false;
  }
}

async function fetchList() {
  loading.list = true;
  try {
    const res = await $api('/admin/enterprises/pending');
    tenants.value = res.list || res.data?.list || [];
  } catch (err) {
    error.list = err.message;
  } finally {
    loading.list = false;
  }
}

async function doApprove(tenant) {
  try {
    await $api(`/admin/enterprises/${tenant.id}/approve`, { method: 'POST' });
    showToast(`「${tenant.name}」${t('admin.enterprises.approved', '已通过')}`);
    fetchList(); fetchStats();
  } catch (err) { showToast(err.message, 'error'); }
}

function showReject(tenant) { activeTenant.value = tenant; rejectReason.value = ''; showRejectModal.value = true; }

async function doReject() {
  if (!activeTenant.value || rejectReason.value.length < 4) return;
  try {
    await $api(`/admin/enterprises/${activeTenant.value.id}/reject`, { method: 'POST', body: { reason: rejectReason.value } });
    showToast(`「${activeTenant.value.name}」${t('admin.enterprises.rejected_msg', '已驳回')}`);
    showRejectModal.value = false;
    fetchList(); fetchStats();
  } catch (err) { showToast(err.message, 'error'); }
}

function showSuspend(tenant) { activeTenant.value = tenant; suspendReason.value = ''; showSuspendModal.value = true; }

async function doSuspend() {
  if (!activeTenant.value) return;
  try {
    await $api(`/admin/enterprises/${activeTenant.value.id}/suspend`, { method: 'POST', body: { reason: suspendReason.value || undefined } });
    showToast(`「${activeTenant.value.name}」${t('admin.enterprises.suspended_msg', '已停用')}`);
    showSuspendModal.value = false;
    fetchList(); fetchStats();
  } catch (err) { showToast(err.message, 'error'); }
}

async function doReinstate(tenant) {
  try {
    await $api(`/admin/enterprises/${tenant.id}/reinstate`, { method: 'POST' });
    showToast(`「${tenant.name}」${t('admin.enterprises.reinstated_msg', '已恢复')}`);
    fetchList(); fetchStats();
  } catch (err) { showToast(err.message, 'error'); }
}

async function doResubmit(tenant) { doApprove(tenant); }

async function showLogs(tenant) {
  activeTenant.value = tenant;
  try {
    const res = await $api(`/admin/enterprises/${tenant.id}/approval-logs`);
    logs.value = res.list || res.data?.list || [];
  } catch { logs.value = []; }
  showLogModal.value = true;
}

onMounted(() => { fetchStats(); fetchList(); });
</script>

<style scoped>
.enterprise-approval { max-width: 1400px; margin: 0 auto; padding: 24px; }
.pg-header { margin-bottom: 20px; }
.pg-header h2 { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.pg-desc { color: var(--text-secondary); font-size: 0.875rem; margin: 4px 0 0; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; text-align: center; }
.stat-card.pending { border-left: 4px solid #f59e0b; }
.stat-card.reviewing { border-left: 4px solid #3b82f6; }
.stat-card.approved { border-left: 4px solid #10b981; }
.stat-card.rejected { border-left: 4px solid #ef4444; }
.stat-val { display: block; font-size: 2rem; font-weight: 700; color: var(--text-primary); }
.stat-label { display: block; font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
.data-table th { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; }
.data-table td { font-size: 0.875rem; color: var(--text-primary); }
.ent-code { font-size: 0.75rem; color: var(--text-tertiary); }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.time { font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap; }

.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-accent { background: #f3e8ff; color: #6b21a8; }
.badge-default { background: var(--bg-secondary); color: var(--text-secondary); }

.btn-sm { padding: 4px 10px; font-size: 0.75rem; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.btn-success { background: #10b981; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-warning { background: #f59e0b; color: #fff; }
.btn-outline { border-color: var(--border-color); background: transparent; color: var(--text-primary); }
.btn-ghost { background: transparent; color: var(--text-secondary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--bg-card); border-radius: 12px; padding: 24px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; }
.modal-content h3 { margin: 0 0 12px; }
.modal-content .input { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 8px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.mt { margin-top: 16px; }

.log-list { max-height: 300px; overflow-y: auto; }
.log-item { padding: 8px 0; border-bottom: 1px solid var(--border-color); }
.log-header { display: flex; gap: 8px; align-items: center; font-size: 0.8rem; }
.log-detail { font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; }
.log-reason { color: var(--text-tertiary); margin-left: 8px; }
.log-time { margin-left: auto; color: var(--text-tertiary); }

.loading-state, .error-state, .empty-state { text-align: center; padding: 48px 0; color: var(--text-secondary); }
.error-state { color: var(--error-color); }
.toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 8px; font-size: 0.875rem; z-index: 2000; }
.toast.success { background: #d1fae5; color: #065f46; }
.toast.error { background: #fee2e2; color: #991b1b; }

@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
