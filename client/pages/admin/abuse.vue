<template>
  <AdminLayout>
    <h2 class="ptitle">滥用监控</h2>

    <div class="toolbar">
      <input v-model="filterUserId" type="number" placeholder="按用户ID筛选" @keyup.enter="fetchData" />
      <button class="btn" @click="fetchData">查询</button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-num">{{ totalRecords }}</span>
        <span class="stat-label">总记录数</span>
      </div>
      <div class="stat-card warn">
        <span class="stat-num">{{ abuseCount }}</span>
        <span class="stat-label">疑似滥用IP数</span>
      </div>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="6" />

    <div class="table-wrap" v-else-if="list.length">
    <table class="table">
      <thead>
        <tr><th>ID</th><th>用户ID</th><th>API路径</th><th>IP地址</th><th>User-Agent</th><th>时间</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in list" :key="r.id" :class="{ 'row-suspect': isBotUA(r.user_agent) }">
          <td>{{ r.id }}</td>
          <td>{{ r.user_id }}</td>
          <td class="mono">{{ r.api_path }}</td>
          <td>
            <span class="ip-tag" :class="{ suspect: ipCounts[r.ip] > 3 }">{{ r.ip }}</span>
            <span v-if="ipCounts[r.ip] > 3" class="ip-warn">高频</span>
          </td>
          <td class="ua-cell" :title="r.user_agent">{{ truncate(r.user_agent, 40) }}</td>
          <td>{{ r.create_time?.slice(0, 19) }}</td>
          <td class="actions">
            <button class="btn-sm" :disabled="checking" @click="checkUser(r.user_id)">{{ checking ? '检测中...' : '检测该用户' }}</button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    <div v-if="!list.length && !loading" class="empty">暂无滥用记录</div>

    <Teleport to="body">
      <div class="modal-overlay" v-if="showCheckModal" @click.self="showCheckModal = false">
        <div class="modal">
          <h3>用户 #{{ checkUserId }} 滥用检测</h3>
          <div class="check-result" :class="checkResult?.error ? '' : (checkResult?.abusing ? 'abusing' : 'normal')">
            <p v-if="checkResult?.error" class="check-error">❌ 请求失败，请稍后重试</p>
            <p v-else-if="checkResult === null">检测中...</p>
            <p v-else-if="checkResult.abusing">⚠️ 该用户存在高频滥用行为（60秒内超过30次调用）</p>
            <p v-else>✅ 该用户调用频率正常</p>
          </div>
          <div class="modal-actions">
            <button class="btn" @click="showCheckModal = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import { truncate } from '@/utils/format';

const list = ref<any[]>([]);
const total = ref(0);
const totalRecords = ref(0);
const page = ref(1);
const pageSize = 20;
const filterUserId = ref('');
const loading = ref(false);
const checking = ref(false);
const showCheckModal = ref(false);
const checkUserId = ref(0);
const checkResult = ref<any>(null);
const abuseCount = ref(0);
const toast = useToast();

const ipCounts = computed(() => {
  const counts: Record<string, number> = {};
  list.value.forEach(r => { counts[r.ip] = (counts[r.ip] || 0) + 1; });
  return counts;
});

onMounted(() => { fetchData(); });

async function fetchData() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) });
    if (filterUserId.value) params.set('userId', filterUserId.value);
    const res = await $fetch(`/api/admin/abuse/records?${params}`, { credentials: 'include' });
    const data = (res as any).data || {};
    list.value = data.list || [];
    total.value = data.total || 0;
    totalRecords.value = data.total || 0;
    // Count unique IPs with high frequency
    const ipMap: Record<string, number> = {};
    (data.list || []).forEach((r: any) => { ipMap[r.ip] = (ipMap[r.ip] || 0) + 1; });
    abuseCount.value = Object.values(ipMap).filter((c: any) => c > 3).length;
  } catch (e: any) { toast.error(e?.data?.msg || '加载失败') } finally { loading.value = false; }

}

function onPageChange(p: number) { page.value = p; fetchData(); }

async function checkUser(userId: number) {
  checking.value = true;
  checkUserId.value = userId;
  checkResult.value = null;
  showCheckModal.value = true;
  try {
    const res = await $fetch(`/api/admin/abuse/check/${userId}`, { credentials: 'include' });
    checkResult.value = (res as any).data || { abusing: false };
  } catch {
    checkResult.value = { abusing: false, error: true };
    toast.error('滥用检测请求失败');
  } finally { checking.value = false; }
}

function isBotUA(ua: string) {
  return /python|curl|wget|scrapy|selenium|headless/i.test(ua || '');
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.toolbar input { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); width: 180px; font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.btn { padding: 6px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); cursor: pointer; margin-right: 4px; background: var(--bg-card); color: var(--text-primary); transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }

.stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
.stat-card { flex: 1; max-width: 220px; padding: 16px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--input-border); display: flex; flex-direction: column; gap: 4px; }
.stat-card.warn { border-color: var(--warning); }
.stat-num { font-size: 28px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 13px; color: var(--text-muted); }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); text-align: left; font-size: 14px; }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.row-suspect td { background: var(--status-pending-bg); }
.mono { font-family: monospace; font-size: 12px; }
.ip-tag { font-family: monospace; font-size: 12px; padding: 2px 6px; border-radius: var(--radius-xs); background: var(--bg-hover); }
.ip-tag.suspect { background: var(--status-pending-bg); color: var(--status-pending-text); }
.ip-warn { font-size: 11px; color: var(--danger); margin-left: 4px; font-weight: 600; }
.ua-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-muted); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 440px; box-shadow: var(--modal-shadow); }
.modal h3 { margin-bottom: 16px; color: var(--text-primary); font-size: 17px; font-weight: 600; }
.check-result { padding: 20px; border-radius: var(--radius-md); text-align: center; font-size: 15px; margin-bottom: 16px; }
.check-result.abusing { background: var(--status-fail-bg); color: var(--status-fail-text); }
.check-result.normal { background: var(--status-done-bg); color: var(--status-done-text); }
.check-error { color: var(--text-muted); }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.actions { white-space: nowrap; }
</style>
