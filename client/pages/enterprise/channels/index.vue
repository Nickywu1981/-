<template>
  <div class="channels-page">
    <div class="page-header">
      <h1>{{ $t('enterprise.channels.index.title') }}</h1>
      <button class="btn-primary" @click="showApplyModal = true" v-if="isAgent">{{ $t('enterprise.channels.index.recruitAgent') }}</button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ downstream.length }}</div><div class="stat-label">{{ $t('enterprise.channels.index.activeDownline') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ pendingCount }}</div><div class="stat-label">{{ $t('enterprise.channels.index.pendingReview') }}</div></div>
      <div class="stat-card"><div class="stat-num">{{ policies.length }}</div><div class="stat-label">{{ $t('enterprise.channels.index.commissionPolicy') }}</div></div>
    </div>

    <!-- 下级代理列表 -->
    <div class="card">
      <h3>{{ $t('enterprise.channels.index.downlineAgents') }}</h3>
      <div v-if="loading" class="loading-spin">{{ $t('enterprise.common.loading') }}</div>
      <table class="data-table" v-else-if="channels.list?.length">
        <thead><tr><th>{{ $t('enterprise.channels.index.agentName') }}</th><th>{{ $t('enterprise.channels.index.code') }}</th><th>{{ $t('enterprise.channels.index.level') }}</th><th>{{ $t('enterprise.channels.index.contact') }}</th><th>{{ $t('enterprise.channels.index.status') }}</th><th>{{ $t('enterprise.channels.index.applyTime') }}</th><th>{{ $t('enterprise.channels.index.actions') }}</th></tr></thead>
        <tbody>
          <tr v-for="ch in channels.list" :key="ch.id">
            <td>{{ ch.child_name }}</td>
            <td>{{ ch.child_code }}</td>
            <td>{{ ch.level === 1 ? $t('enterprise.channels.index.direct') : $t('enterprise.channels.index.level2') }}</td>
            <td>{{ ch.contact_name }} / {{ ch.contact_phone }}</td>
            <td><span :class="statusClass(ch.status)">{{ statusLabel(ch.status) }}</span></td>
            <td>{{ formatDateLocale(ch.applied_at) }}</td>
            <td>
              <button v-if="ch.status === 'pending'" class="btn-sm btn-success" @click="audit(ch.id, 'active')">{{ $t('enterprise.channels.index.approve') }}</button>
              <button v-if="ch.status === 'pending'" class="btn-sm btn-danger" @click="audit(ch.id, 'rejected')">{{ $t('enterprise.channels.index.reject') }}</button>
              <button class="btn-sm" @click="viewDetail(ch.id)">{{ $t('enterprise.channels.index.detail') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination" v-if="channels.total > channels.pageSize">
        <button :disabled="channels.page <= 1" @click="loadChannels(channels.page - 1)">{{ $t('enterprise.common.prevPage') }}</button>
        <span>{{ $t('enterprise.common.pageOf', { page: channels.page, total: Math.ceil(channels.total / channels.pageSize) }) }}</span>
        <button :disabled="channels.page >= Math.ceil(channels.total / channels.pageSize)" @click="loadChannels(channels.page + 1)">{{ $t('enterprise.common.nextPage') }}</button>
      </div>
      <p v-else-if="!loading" class="empty">{{ $t('enterprise.channels.index.noData') }}</p>
    </div>

    <!-- 申请弹窗 -->
    <div class="modal-overlay" v-if="showApplyModal" @click.self="showApplyModal = false">
      <div class="modal"><h3>{{ $t('enterprise.channels.index.applyTitle') }}</h3>
        <form @submit.prevent="doApply"><label :for="'apply-code-' + _uid">{{ $t('enterprise.channels.index.inviteCode') }}</label>
          <input v-model="applyForm.agentCode" required :placeholder="$t('enterprise.channels.index.inviteCodePlaceholder')" class="input" :id="'apply-code-' + _uid" />
          <div class="modal-actions"><button type="button" class="btn-cancel" @click="showApplyModal = false">{{ $t('enterprise.common.cancel') }}</button>
            <button type="submit" class="btn-primary" :disabled="applying">{{ $t('enterprise.channels.index.submitApply') }}</button></div>
        </form>
      </div>
    </div>

    <!-- 审核弹窗 -->
    <div class="modal-overlay" v-if="showAuditModal" @click.self="showAuditModal = false">
      <div class="modal"><h3>{{ $t('enterprise.channels.index.auditTitle') }}</h3>
        <p>{{ auditAction === 'active' ? $t('enterprise.channels.index.confirmApprove') : $t('enterprise.channels.index.confirmReject') }}</p>
        <textarea v-model="auditRemark" :placeholder="$t('enterprise.channels.index.auditRemark')" class="input" rows="3"></textarea>
        <div class="modal-actions"><button type="button" class="btn-cancel" @click="showAuditModal = false">{{ $t('enterprise.common.cancel') }}</button>
          <button class="btn-primary" :disabled="auditing" @click="doAudit">{{ $t('enterprise.common.confirm') }}</button></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'user-workspace', middleware: ['auth'] });
import { formatDateLocale } from '~/utils/format';
import { extractErrorMsg } from '~/composables/useApi';
const { t } = useI18n();

const toast = useToast();
const router = useRouter();
const loading = ref(true);
const applying = ref(false);
const auditing = ref(false);
const isAgent = ref(true);
const channels = reactive({ list: [], total: 0, page: 1, pageSize: 20 });
const policies = ref([]);
const downstream = ref([]);
const showApplyModal = ref(false);
const showAuditModal = ref(false);
const auditAction = ref('');
const auditTargetId = ref(null);
const auditRemark = ref('');
const applyForm = reactive({ agentCode: '' });

const pendingCount = computed(() => channels.list.filter(c => c.status === 'pending').length);

onMounted(async () => {
  await Promise.all([loadChannels(), loadPolicies(), loadDownstream()]);
  loading.value = false;
});

async function loadChannels(page = 1) {
  try {
    const data = await $fetch(`/api/enterprise/channel/relations?page=${page}&pageSize=${channels.pageSize}`, { credentials: 'include' });
    if (data.code === 200) Object.assign(channels, data.data);
  } catch (e) { toast.error(t('enterprise.channels.index.loadFailed')); }
}

async function loadPolicies() {
  try {
    const data = await $fetch('/api/enterprise/channel/policies', { credentials: 'include' });
    if (data.code === 200) policies.value = data.data;
  } catch (e) { toast.error(t('enterprise.channels.index.policyLoadFailed')); }
}

async function loadDownstream() {
  try {
    const data = await $fetch('/api/enterprise/channel/downstream', { credentials: 'include' });
    if (data.code === 200) downstream.value = data.data;
  } catch (e) { toast.error(t('enterprise.channels.index.downlineLoadFailed')); }
}

async function doApply() {
  applying.value = true;
  try {
    await $fetch('/api/enterprise/channel/relations', { method: 'POST', credentials: 'include', body: applyForm });
    showApplyModal.value = false;
    applyForm.agentCode = '';
    loadChannels();
  } catch (e) { toast.error(extractErrorMsg(e, 'enterprise.channels.index.applyFailed')); }
  finally { applying.value = false; }
}

function audit(id, action) {
  auditTargetId.value = id;
  auditAction.value = action;
  showAuditModal.value = true;
}

async function doAudit() {
  auditing.value = true;
  try {
    await $fetch(`/api/enterprise/channel/relations/${auditTargetId.value}/audit`, {
      method: 'PUT', credentials: 'include',
      body: { status: auditAction.value, auditRemark: auditRemark.value },
    });
    showAuditModal.value = false;
    auditRemark.value = '';
    loadChannels();
    loadDownstream();
  } catch (e) { toast.error(extractErrorMsg(e, 'enterprise.channels.index.auditFailed')); }
  finally { auditing.value = false; }
}

function viewDetail(id) { router.push(`/enterprise/channels/${id}`); }
function statusClass(s) { return { pending: 'status-warn', active: 'status-ok', rejected: 'status-err', suspended: 'status-warn' }[s] || ''; }
function statusLabel(s) { return { pending: t('enterprise.common.statusPending'), active: t('enterprise.common.statusActive'), rejected: t('enterprise.common.statusRejected'), suspended: t('enterprise.common.statusSuspended') }[s] || s; }
</script>
