<template>
  <div class="finance-withdrawal">
    <div class="page-header">
      <h1 class="page-title">提现管理</h1>
      <button class="btn-primary" @click="showForm = true">+ 申请提现</button>
    </div>

    <!-- 筛选 -->
    <div class="toolbar">
      <select v-model="filterStatus" @change="loadData" class="filter-select">
        <option value="">全部状态</option>
        <option value="pending_review">待审核</option>
        <option value="approved">已通过</option>
        <option value="processing">处理中</option>
        <option value="completed">已完成</option>
        <option value="rejected">已驳回</option>
      </select>
    </div>

    <div class="table-wrap">
      <table v-if="list.length">
        <thead><tr><th>订单号</th><th>金额</th><th>手续费</th><th>到账金额</th><th>收款账户</th><th>状态</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td class="mono">{{ item.order_no }}</td>
            <td class="red">-¥{{ fmt(item.amount) }}</td>
            <td>¥{{ fmt(item.fee) }}</td>
            <td class="green">¥{{ fmt(item.actual_amount) }}</td>
            <td>{{ item.account_name || '-' }} {{ item.account_no ? '(***' + item.account_no.toString().slice(-4) + ')' : '' }}</td>
            <td><span :class="['status-tag', item.status]">{{ statusLabel(item.status) }}</span></td>
            <td>{{ formatDate(item.create_time) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无提现记录</div>
    </div>

    <div class="pager" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; loadData()">上一页</button>
      <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadData()">下一页</button>
    </div>

    <!-- 提现申请弹窗 -->
    <div class="modal-overlay" v-if="showForm" @click.self="showForm = false">
      <div class="modal">
        <h2>申请提现</h2>
        <div class="form-group">
          <label>提现金额 (¥) <span class="required">*</span></label>
          <input v-model.number="form.amount" type="number" min="100" step="0.01" placeholder="最低 100 元" />
        </div>
        <div class="form-group">
          <label>收款账户</label>
          <select v-model="form.bankAccountId">
            <option :value="null">请选择收款账户</option>
            <option v-for="acc in bankAccounts" :key="acc.id" :value="acc.id">
              {{ acc.account_name }} - {{ acc.bank_name || acc.account_type }} (***{{ acc.account_no.slice(-4) }})
            </option>
          </select>
        </div>
        <div v-if="form.amount >= 100" class="fee-note">
          手续费 {{ (form.amount * 0.006).toFixed(2) }} 元 (0.6%)，到账 {{ (form.amount * 0.994).toFixed(2) }} 元
        </div>
        <div v-if="modalError" class="error-msg">{{ modalError }}</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showForm = false">取消</button>
          <button class="btn-primary" @click="handleSubmit" :disabled="submitting">{{ submitting ? '提交中...' : '确认提现' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useApi } from '~/composables/useApi';
const api = useApi();

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
  } catch (e) { console.error(e); }
}

async function loadBankAccounts() {
  try {
    bankAccounts.value = await api.get('/enterprise/finance/bank-accounts') || [];
  } catch (e) { console.error(e); }
}

async function handleSubmit() {
  modalError.value = '';
  if (!form.value.amount || form.value.amount < 100) { modalError.value = '最低提现金额 100 元'; return; }
  submitting.value = true;
  try {
    await api.post('/enterprise/finance/withdrawal', form.value);
    showForm.value = false;
    form.value = { amount: 0, bankAccountId: null };
    loadData();
  } catch (e) { modalError.value = e.data?.msg || e.message || '提现申请失败'; }
  finally { submitting.value = false; }
}

function statusLabel(s) {
  const m = { pending_review: '待审核', approved: '已通过', processing: '处理中', completed: '已完成', rejected: '已驳回', failed: '失败' };
  return m[s] || s;
}
function fmt(n) { return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 24px; margin: 0; color: #1a1a2e; }
.btn-primary { padding: 10px 20px; background: #667eea; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: 0.6; }
.toolbar { margin-bottom: 20px; }
.filter-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: #fff; }

.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; color: #666; font-weight: 500; }
.mono { font-family: monospace; font-size: 12px; }
.green { color: #27ae60; font-weight: 600; }
.red { color: #e74c3c; font-weight: 600; }
.status-tag { padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.status-tag.completed { background: #e8f5e9; color: #27ae60; }
.status-tag.pending_review, .status-tag.processing { background: #fff3e0; color: #f39c12; }
.status-tag.approved { background: #e3f2fd; color: #1a73e8; }
.status-tag.rejected, .status-tag.failed { background: #fbe9e7; color: #e74c3c; }
.empty { padding: 60px; text-align: center; color: #999; }
.pager { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px; }
.pager button { padding: 6px 14px; border: 1px solid #ddd; background: #fff; border-radius: 6px; cursor: pointer; }
.pager button:disabled { opacity: 0.4; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; background: #fff; border-radius: 16px; padding: 28px; }
.modal h2 { margin: 0 0 20px; font-size: 18px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.required { color: #e74c3c; }
.fee-note { padding: 10px; background: #f8f9fb; border-radius: 8px; font-size: 13px; color: #666; margin-bottom: 12px; }
.error-msg { color: #e74c3c; font-size: 13px; margin-bottom: 8px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }
</style>
