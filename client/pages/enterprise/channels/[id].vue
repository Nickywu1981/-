<template>
  <div class="page">
    <div class="page-header"><h1>渠道详情</h1><button class="btn-cancel" @click="router.back()">返回</button></div>
    <div class="card" v-if="channel">
      <h3>渠道信息</h3>
      <div class="detail-grid">
        <div><label>代理名称</label><span>{{ channel.child_name }}</span></div>
        <div><label>编码</label><span>{{ channel.child_code }}</span></div>
        <div><label>层级</label><span>{{ channel.level === 1 ? '直营' : '二级' }}</span></div>
        <div><label>状态</label><span :style="statusStyle(channel.status)">{{ statusLabel(channel.status) }}</span></div>
        <div><label>联系人</label><span>{{ channel.contact_name }}</span></div>
        <div><label>联系电话</label><span>{{ channel.contact_phone }}</span></div>
        <div><label>申请时间</label><span>{{ formatDate(channel.applied_at) }}</span></div>
        <div><label>分润比例</label><span>{{ channel.commission_rate || '-' }}%</span></div>
      </div>
    </div>
    <p v-else-if="loadError" class="empty">加载失败 <button class="btn-cancel" @click="loadChannel">重试</button></p>
    <p v-else class="empty">加载中...</p>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'enterprise' });
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
const router = useRouter(); const route = useRoute(); const channel = ref(null); const loadError = ref(false);
async function loadChannel() {
  loadError.value = false;
  try {
    const r = await $fetch(`/api/enterprise/channel/relations/${route.params.id}`, { credentials: 'include' });
    if (r.code === 200) channel.value = r.data; else loadError.value = true;
  } catch (e) { console.debug('loadChannel', e); loadError.value = true; }
}
onMounted(loadChannel);
function statusLabel(s) { return { pending: '待审核', active: '已通过', rejected: '已拒绝', suspended: '已停用' }[s] || s; }
function statusStyle(s) { return { pending: { color: '#f59e0b' }, active: { color: '#10b981' }, rejected: { color: '#ef4444' }, suspended: { color: '#f59e0b' } }[s] || {}; }
function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '-'; }
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-grid div { display: flex; flex-direction: column; }
.detail-grid label { font-size: 12px; color: #999; margin-bottom: 4px; }
.detail-grid span { font-size: 16px; color: #333; }
</style>
