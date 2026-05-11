<template>
  <div class="channels-page">
    <div class="page-header">
      <h1>渠道管理</h1>
      <button class="btn-primary" @click="showApplyModal = true" v-if="isAgent">招募下级代理</button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card"><div class="stat-num">{{ downstream.length }}</div><div class="stat-label">活跃下级</div></div>
      <div class="stat-card"><div class="stat-num">{{ pendingCount }}</div><div class="stat-label">待审核</div></div>
      <div class="stat-card"><div class="stat-num">{{ policies.length }}</div><div class="stat-label">分润政策</div></div>
    </div>

    <!-- 下级代理列表 -->
    <div class="card">
      <h3>下级代理</h3>
      <table class="data-table" v-if="channels.list?.length">
        <thead><tr><th>代理名称</th><th>编码</th><th>层级</th><th>联系人</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="ch in channels.list" :key="ch.id">
            <td>{{ ch.child_name }}</td>
            <td>{{ ch.child_code }}</td>
            <td>{{ ch.level === 1 ? '直营' : '二级' }}</td>
            <td>{{ ch.contact_name }} / {{ ch.contact_phone }}</td>
            <td><span :class="statusClass(ch.status)">{{ statusLabel(ch.status) }}</span></td>
            <td>{{ formatDate(ch.applied_at) }}</td>
            <td>
              <button v-if="ch.status === 'pending'" class="btn-sm btn-success" @click="audit(ch.id, 'active')">通过</button>
              <button v-if="ch.status === 'pending'" class="btn-sm btn-danger" @click="audit(ch.id, 'rejected')">拒绝</button>
              <button class="btn-sm" @click="viewDetail(ch.id)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination" v-if="channels.total > channels.pageSize">
        <button :disabled="channels.page <= 1" @click="loadChannels(channels.page - 1)">上一页</button>
        <span>第 {{ channels.page }} / {{ Math.ceil(channels.total / channels.pageSize) }} 页</span>
        <button :disabled="channels.page >= Math.ceil(channels.total / channels.pageSize)" @click="loadChannels(channels.page + 1)">下一页</button>
      </div>
      <p v-else class="empty">暂无渠道关系</p>
    </div>

    <!-- 申请弹窗 -->
    <div class="modal-overlay" v-if="showApplyModal" @click.self="showApplyModal = false">
      <div class="modal"><h3>申请加入渠道</h3>
        <form @submit.prevent="doApply"><label>上级代理邀请码</label>
          <input v-model="applyForm.agentCode" required placeholder="请输入邀请码" class="input" />
          <div class="modal-actions"><button type="button" class="btn-cancel" @click="showApplyModal = false">取消</button>
            <button type="submit" class="btn-primary">提交申请</button></div>
        </form>
      </div>
    </div>

    <!-- 审核弹窗 -->
    <div class="modal-overlay" v-if="showAuditModal" @click.self="showAuditModal = false">
      <div class="modal"><h3>渠道审核</h3>
        <p>{{ auditAction === 'active' ? '确认通过此渠道申请？' : '确认拒绝此渠道申请？' }}</p>
        <textarea v-model="auditRemark" placeholder="审核备注（可选）" class="input" rows="3"></textarea>
        <div class="modal-actions"><button type="button" class="btn-cancel" @click="showAuditModal = false">取消</button>
          <button class="btn-primary" @click="doAudit">确认</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useToast } from '~/composables/useToast';

const toast = useToast();
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
});

async function loadChannels(page = 1) {
  try {
    const data = await $fetch(`/api/enterprise/channel/relations?page=${page}&pageSize=${channels.pageSize}`, { credentials: 'include' });
    if (data.code === 200) Object.assign(channels, data.data);
  } catch (e) { console.debug('loadChannels failed', e); }
}

async function loadPolicies() {
  try {
    const data = await $fetch('/api/enterprise/channel/policies', { credentials: 'include' });
    if (data.code === 200) policies.value = data.data;
  } catch (e) { console.debug('loadPolicies failed', e); }
}

async function loadDownstream() {
  try {
    const data = await $fetch('/api/enterprise/channel/downstream', { credentials: 'include' });
    if (data.code === 200) downstream.value = data.data;
  } catch (e) { /* ignore */ }
}

async function doApply() {
  try {
    await $fetch('/api/enterprise/channel/relations', { method: 'POST', credentials: 'include', body: applyForm });
    showApplyModal.value = false;
    applyForm.agentCode = '';
    loadChannels();
  } catch (e) { toast.error('申请失败: ' + (e.data?.message || '请重试')); }
}

function audit(id, action) {
  auditTargetId.value = id;
  auditAction.value = action;
  showAuditModal.value = true;
}

async function doAudit() {
  try {
    await $fetch(`/api/enterprise/channel/relations/${auditTargetId.value}/audit`, {
      method: 'PUT', credentials: 'include',
      body: { status: auditAction.value, auditRemark: auditRemark.value },
    });
    showAuditModal.value = false;
    auditRemark.value = '';
    loadChannels();
    loadDownstream();
  } catch (e) { toast.error('审核失败: ' + (e.data?.message || '请重试')); }
}

function viewDetail(id) { /* 详情页待开发 */ }
function statusClass(s) { return { pending: 'status-warn', active: 'status-ok', rejected: 'status-err', suspended: 'status-warn' }[s] || ''; }
function statusLabel(s) { return { pending: '待审核', active: '已通过', rejected: '已拒绝', suspended: '已停用' }[s] || s; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
</script>
