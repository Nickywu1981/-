<template>
  <div class="finance-bank">
    <div class="page-header">
      <h1 class="page-title">收款账户</h1>
      <button class="btn-primary" @click="showForm = true">+ 绑定账户</button>
    </div>

    <div class="card-list" v-if="accounts.length">
      <div class="account-card" v-for="acc in accounts" :key="acc.id" :class="{ default: acc.is_default }">
        <div class="card-header">
          <span class="account-type">{{ typeLabel(acc.account_type) }}</span>
          <span class="default-badge" v-if="acc.is_default">默认</span>
        </div>
        <div class="card-body">
          <div class="info-row"><span class="label">户名</span><span>{{ acc.account_name }}</span></div>
          <div class="info-row"><span class="label">账号</span><span class="mono">****{{ acc.account_no.toString().slice(-4) }}</span></div>
          <div class="info-row" v-if="acc.bank_name"><span class="label">银行</span><span>{{ acc.bank_name }}</span></div>
        </div>
        <div class="card-footer">
          <button class="btn-danger" @click="handleRemove(acc)">解绑</button>
        </div>
      </div>
    </div>
    <div v-else class="empty">暂无绑定收款账户</div>

    <!-- 绑定弹窗 -->
    <div class="modal-overlay" v-if="showForm" @click.self="showForm = false">
      <div class="modal">
        <h2>绑定收款账户</h2>
        <div class="form-group">
          <label>账户类型 <span class="required">*</span></label>
          <select v-model="form.accountType">
            <option value="bank">银行卡</option>
            <option value="wechat">微信</option>
            <option value="alipay">支付宝</option>
          </select>
        </div>
        <div class="form-group">
          <label>户名 <span class="required">*</span></label>
          <input v-model="form.accountName" placeholder="请输入账户户名" />
        </div>
        <div class="form-group">
          <label>账号 <span class="required">*</span></label>
          <input v-model="form.accountNo" placeholder="银行卡号/微信号/支付宝账号" />
        </div>
        <div class="form-group" v-if="form.accountType === 'bank'">
          <label>开户行</label>
          <input v-model="form.bankName" placeholder="例如: 中国工商银行" />
        </div>
        <div class="form-group" v-if="form.accountType === 'bank'">
          <label>支行</label>
          <input v-model="form.bankBranch" placeholder="例如: 深圳南山支行" />
        </div>
        <div class="form-group checkbox">
          <label><input type="checkbox" v-model="form.isDefault" /> 设为默认账户</label>
        </div>
        <div v-if="modalError" class="error-msg">{{ modalError }}</div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showForm = false">取消</button>
          <button class="btn-primary" @click="handleSubmit" :disabled="submitting">{{ submitting ? '提交中...' : '确认绑定' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useApi } from '~/composables/useApi';
import { useToast } from '~/composables/useToast';
const api = useApi();
const toast = useToast();

const accounts = ref([]);
const showForm = ref(false);
const form = ref({ accountType: 'bank', accountName: '', accountNo: '', bankName: '', bankBranch: '', isDefault: false });
const submitting = ref(false);
const modalError = ref('');

onMounted(() => loadAccounts());

async function loadAccounts() {
  try {
    accounts.value = await api.get('/enterprise/finance/bank-accounts') || [];
  } catch (e) { toast.error('收款账户加载失败'); }
}

async function handleSubmit() {
  modalError.value = '';
  if (!form.value.accountName || !form.value.accountNo) { modalError.value = '户名和账号为必填项'; return; }
  submitting.value = true;
  try {
    await api.post('/enterprise/finance/bank-account', form.value);
    showForm.value = false;
    form.value = { accountType: 'bank', accountName: '', accountNo: '', bankName: '', bankBranch: '', isDefault: false };
    loadAccounts();
  } catch (e) { modalError.value = e?.data?.msg || e.message || '绑定失败'; }
  finally { submitting.value = false; }
}

async function handleRemove(acc) {
  if (!confirm(`确定解绑 ${acc.account_name} 的账户吗？`)) return;
  try {
    await api.delete(`/enterprise/finance/bank-accounts/${acc.id}`);
    loadAccounts();
  } catch (e) { toast.error(e?.data?.msg || e.message || '解绑失败'); }
}

function typeLabel(t) { const m = { bank: '银行卡', wechat: '微信', alipay: '支付宝' }; return m[t] || t; }

definePageMeta({ layout: 'enterprise' });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 24px; margin: 0; color: #1a1a2e; }
.btn-primary { padding: 10px 20px; background: #667eea; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: 0.6; }

.card-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.account-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 2px solid transparent; }
.account-card.default { border-color: #667eea; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.account-type { font-weight: 600; font-size: 15px; }
.default-badge { background: #e8f0fe; color: #1a73e8; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
.info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.info-row .label { color: #888; }
.mono { font-family: monospace; }
.card-footer { margin-top: 14px; text-align: right; }
.btn-danger { padding: 4px 14px; border: 1px solid #e74c3c; color: #e74c3c; background: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; }
.empty { text-align: center; padding: 60px; color: #999; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; background: #fff; border-radius: 16px; padding: 28px; }
.modal h2 { margin: 0 0 20px; font-size: 18px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.checkbox label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.checkbox input[type="checkbox"] { width: auto; }
.required { color: #e74c3c; }
.error-msg { color: #e74c3c; font-size: 13px; margin-bottom: 8px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid #ddd; background: #fff; border-radius: 8px; cursor: pointer; }
</style>
