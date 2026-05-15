<template>
  <div class="finance-withdrawal">
    <div class="page-header">
      <h1 class="page-title">{{ $t('enterprise.finance.withdrawal.title') }}</h1>
      <button class="btn-primary" @click="showForm = true">+ {{ $t('enterprise.finance.withdrawal.applyWithdrawal') }}</button>
    </div>

    <!-- 筛选 -->
    <div class="toolbar">
      <select v-model="filterStatus" @change="loadData" class="filter-select">
        <option value="">{{ $t('enterprise.finance.withdrawal.allStatus') }}</option>
        <option value="pending_review">{{ $t('enterprise.finance.withdrawal.statusPendingReview') }}</option>
        <option value="approved">{{ $t('enterprise.finance.withdrawal.statusApproved') }}</option>
        <option value="processing">{{ $t('enterprise.finance.withdrawal.statusProcessing') }}</option>
        <option value="completed">{{ $t('enterprise.finance.withdrawal.statusCompleted') }}</option>
        <option value="rejected">{{ $t('enterprise.finance.withdrawal.statusRejected') }}</option>
      </select>
    </div>

    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>{{ $t('enterprise.finance.withdrawal.orderNo') }}</th><th>{{ $t('enterprise.finance.withdrawal.amount') }}</th><th>{{ $t('enterprise.finance.withdrawal.fee') }}</th><th>{{ $t('enterprise.finance.withdrawal.actualAmount') }}</th><th>{{ $t('enterprise.finance.withdrawal.bankAccount') }}</th><th>{{ $t('enterprise.finance.withdrawal.status') }}</th><th>{{ $t('enterprise.finance.withdrawal.time') }}</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td class="mono">{{ item.order_no }}</td>
            <td class="red">-¥{{ fmtMoney(item.amount) }}</td>
            <td>¥{{ fmtMoney(item.fee) }}</td>
            <td class="green">¥{{ fmtMoney(item.actual_amount) }}</td>
            <td>{{ item.account_name || '-' }} {{ item.account_no ? '(***' + item.account_no.toString().slice(-4) + ')' : '' }}</td>
            <td><span :class="['status-tag', item.status]">{{ statusLabel(item.status) }}</span></td>
            <td>{{ formatDateLocale(item.create_time) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">{{ $t('enterprise.finance.withdrawal.noData') }}</div>
    </div>

    <div class="pager" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; loadData()">{{ $t('enterprise.common.prevPage') }}</button>
      <span>{{ $t('enterprise.common.pageOf', { page, total: Math.ceil(total / pageSize) }) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadData()">{{ $t('enterprise.common.nextPage') }}</button>
    </div>

    <!-- 提现申请弹窗 -->
    <div class="modal-overlay" v-if="showForm" @click.self="showForm = false">
      <div class="modal">
        <h2>{{ $t('enterprise.finance.withdrawal.applyTitle') }}</h2>
        <div class="form-group">
          <label>{{ $t('enterprise.finance.withdrawal.applyAmount') }} (¥) <span class="required">*</span></label>
          <input v-model.number="form.amount" type="number" min="100" step="0.01" :placeholder="$t('enterprise.finance.withdrawal.applyAmountPlaceholder')" />
        </div>
        <div class="form-group">
          <label>{{ $t('enterprise.finance.withdrawal.applyAccount') }}</label>
          <select v-model="form.bankAccountId">
            <option :value="null">{{ $t('enterprise.finance.withdrawal.applyAccountPlaceholder') }}</option>
            <option v-for="acc in bankAccounts" :key="acc.id" :value="acc.id">
              {{ acc.account_name }} - {{ acc.bank_name || acc.account_type }} (***{{ acc.account_no?.slice(-4) || '****' }})
            </option>
          </select>
        </div>
        <div v-if="form.amount >= 100" class="fee-note">
          {{ $t('enterprise.finance.withdrawal.feeCalc', { fee: (form.amount * 0.006).toFixed(2), actual: (form.amount * 0.994).toFixed(2) }) }}
        </div>
        <div v-if="modalError" class="error-msg">{{ modalError }}</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showForm = false">{{ $t('enterprise.common.cancel') }}</button>
          <button class="btn-primary" @click="handleSubmit" :disabled="submitting">{{ submitting ? $t('enterprise.finance.withdrawal.submitting') : $t('enterprise.finance.withdrawal.confirmWithdrawal') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { formatDateLocale, fmtMoney } from '~/utils/format';
const { t } = useI18n();
const api = useApi();
const toast = useToast();

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const filterStatus = ref('');
const showForm = ref(false);
const form = ref({ amount: 0, bankAccountId: null });
const bankAccounts = ref([]);
const submitting = ref(false);
const modalError = ref('');

onMounted(async () => {
  await Promise.all([loadData(), loadBankAccounts()]);
});

async function loadData() {
  try {
    const params = { page: page.value, pageSize };
    if (filterStatus.value) params.status = filterStatus.value;
    const data = await api.get('/enterprise/finance/withdrawal', params);
    list.value = data?.list || [];
    total.value = data?.total || 0;
  } catch (e) { toast.error(t('enterprise.finance.withdrawal.loadFailed')); }
}

async function loadBankAccounts() {
  try {
    bankAccounts.value = await api.get('/enterprise/finance/bank-accounts') || [];
  } catch (e) { toast.error(t('enterprise.finance.withdrawal.accountsLoadFailed')); }
}

async function handleSubmit() {
  modalError.value = '';
  if (!form.value.amount || form.value.amount < 100) { modalError.value = t('enterprise.finance.withdrawal.minAmountError'); return; }
  submitting.value = true;
  try {
    await api.post('/enterprise/finance/withdrawal', form.value);
    showForm.value = false;
    form.value = { amount: 0, bankAccountId: null };
    loadData();
  } catch (e) { modalError.value = e?.data?.msg || e.message || t('enterprise.finance.withdrawal.applyFailed'); }
  finally { submitting.value = false; }
}

const statusLabels = {
  pending_review: t('enterprise.finance.withdrawal.statusPendingReview'),
  approved: t('enterprise.finance.withdrawal.statusApproved'),
  processing: t('enterprise.finance.withdrawal.statusProcessing'),
  completed: t('enterprise.finance.withdrawal.statusCompleted'),
  rejected: t('enterprise.finance.withdrawal.statusRejected'),
  failed: t('enterprise.finance.withdrawal.statusFailed'),
};
function statusLabel(s) { return statusLabels[s] || s; }

definePageMeta({ layout: 'user-workspace', middleware: ['auth'] });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 24px; margin: 0; color: var(--text-primary); }
.btn-primary { padding: 10px 20px; background: var(--color-brand-primary); color: var(--text-inverse); border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: 0.6; }
.toolbar { margin-bottom: 20px; }
.filter-select { padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 8px; font-size: 14px; background: var(--bg-card); color: var(--text-primary); }

.table-wrap { background: var(--bg-card); border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); }
th { background: var(--bg-subtle); color: var(--text-secondary); font-weight: 500; }
.mono { font-family: monospace; font-size: 12px; }
.green { color: var(--color-success); font-weight: 600; }
.red { color: var(--color-danger); font-weight: 600; }
.status-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.status-tag.completed { background: var(--status-done-bg); color: var(--status-done-text); }
.status-tag.pending_review { background: var(--status-pending-bg); color: var(--status-pending-text); }
.status-tag.processing { background: var(--status-processing-bg); color: var(--status-processing-text); }
.status-tag.approved { background: var(--status-approved-bg); color: var(--status-approved-text); }
.status-tag.rejected { background: var(--status-rejected-bg); color: var(--status-rejected-text); }
.status-tag.failed { background: var(--status-fail-bg); color: var(--status-fail-text); }
.empty { padding: 60px; text-align: center; color: var(--text-muted); }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; }
.pager button { padding: 6px 14px; border: 1px solid var(--border-primary); background: var(--bg-card); border-radius: 6px; cursor: pointer; color: var(--text-primary); }
.pager button:disabled { opacity: 0.4; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; background: var(--bg-card); border-radius: 16px; padding: 28px; }
.modal h2 { margin: 0 0 20px; font-size: 18px; color: var(--text-primary); }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--border-primary); border-radius: 8px; font-size: 14px; box-sizing: border-box; background: var(--bg-card); color: var(--text-primary); }
.required { color: var(--color-danger); }
.fee-note { padding: 10px; background: var(--bg-subtle); border-radius: 8px; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.error-msg { color: var(--color-danger); font-size: 13px; margin-bottom: 8px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--border-primary); background: var(--bg-card); border-radius: 8px; cursor: pointer; color: var(--text-primary); }
</style>
