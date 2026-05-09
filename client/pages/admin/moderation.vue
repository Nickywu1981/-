<template>
  <AdminLayout>
    <div class="page">
      <h1 class="page-title">内容审核</h1>

      <div class="filters">
        <select v-model="filter.status" class="sel" @change="fetchList">
          <option value="">全部状态</option>
          <option value="0">待审核</option><option value="1">已通过</option><option value="2">已拒绝</option>
        </select>
        <select v-model="filter.type" class="sel" @change="fetchList">
          <option value="">全部类型</option>
          <option value="main_image">主图生成</option><option value="scene">场景图</option><option value="detail_h5">详情页</option><option value="img2video">视频生成</option><option value="batch">批量处理</option>
        </select>
        <button class="btn-refresh" @click="fetchList">刷新</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>用户</th><th>类型</th><th>任务标题</th><th>状态</th><th>提交时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-if="isLoading"><td colspan="7" class="loading">加载中...</td></tr>
            <tr v-else-if="list.length === 0"><td colspan="7" class="empty">暂无审核任务</td></tr>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.username || '-' }}</td>
              <td><span class="tag">{{ typeLabel(item.type) }}</span></td>
              <td class="ellipsis" :title="item.title">{{ item.title }}</td>
              <td><span :class="['status', reviewLabel(item.review_status)]">{{ reviewText(item.review_status) }}</span></td>
              <td>{{ formatTime(item.create_time) }}</td>
              <td class="actions">
                <button v-if="item.review_status === 0" class="btn-sm btn-ok" @click="approve(item)">通过</button>
                <button v-if="item.review_status === 0" class="btn-sm btn-no" @click="reject(item)">拒绝</button>
                <button class="btn-sm btn-view" @click="viewDetail(item)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

      <Teleport to="body">
        <div v-if="detail" class="modal-mask" @click.self="detail = null">
          <div class="modal-card">
            <h3>任务详情 #{{ detail.id }}</h3>
            <div class="detail-grid">
              <div><label>类型</label><span>{{ typeLabel(detail.type) }}</span></div>
              <div><label>用户</label><span>{{ detail.username || detail.user_id }}</span></div>
              <div><label>标题</label><span>{{ detail.title }}</span></div>
              <div><label>审核状态</label><span :class="['status', reviewLabel(detail.review_status)]">{{ reviewText(detail.review_status) }}</span></div>
              <div><label>输入参数</label><pre>{{ JSON.stringify(detail.input_params, null, 2) }}</pre></div>
              <div v-if="detail.output_result"><label>输出结果</label><pre>{{ JSON.stringify(detail.output_result, null, 2) }}</pre></div>
            </div>
            <div class="modal-actions" v-if="detail.review_status === 0">
              <button class="btn-sm btn-ok" @click="approve(detail)">通过</button>
              <button class="btn-sm btn-no" @click="reject(detail)">拒绝</button>
            </div>
            <button class="modal-close" @click="detail = null">关闭</button>
          </div>
        </div>
      </Teleport>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const formatTime = formatDateTime

const filter = reactive({ status: '', type: '' as string });
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const detail = ref<any>(null);
const isLoading = ref(false);
const toast = useToast();

onMounted(() => fetchList());

async function fetchList() {
  isLoading.value = true;
  try {
    const res: any = await $fetch('/api/admin/tasks', {
      params: { page: page.value, pageSize, type: filter.type, reviewStatus: filter.status || '' },
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch(e: any) { toast.error(e.data?.msg || '加载失败') }
  isLoading.value = false;
}

function onPageChange(p: number) { page.value = p; fetchList(); }

async function approve(item: any) {
  try {
    await $fetch(`/api/admin/tasks/${item.id}/approve`, { method: 'POST' });
    item.review_status = 1;
    if (detail.value?.id === item.id) detail.value.review_status = 1;
  } catch(e: any) { toast.error(e.data?.msg || '加载失败') }
}

async function reject(item: any) {
  try {
    await $fetch(`/api/admin/tasks/${item.id}/reject`, { method: 'POST' });
    item.review_status = 2;
    if (detail.value?.id === item.id) detail.value.review_status = 2;
  } catch(e: any) { toast.error(e.data?.msg || '加载失败') }
}

function viewDetail(item: any) { detail.value = item; }

function typeLabel(t: string) {
  const m: Record<string, string> = {
    main_image: '主图', scene: '场景图', detail_h5: '详情页', img2video: '视频',
    batch: '批量', multi2video: '多图合成', video_packaging: '视频包装',
    action_transfer: '动作迁移', person_replace: '人物替换', digital_human: '口播',
    script_gen: '脚本', shot_plan: '分镜', viral_clone: '复刻',
  };
  return m[t] || t;
}

function reviewLabel(s: number) {
  if (s === 1) return 'approved';
  if (s === 2) return 'rejected';
  return 'pending';
}

function reviewText(s: number) {
  if (s === 1) return '已通过';
  if (s === 2) return '已拒绝';
  return '待审核';
}
</script>

<style scoped>
.page { max-width: 1100px; margin: 0 auto; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn-refresh { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-refresh:hover { opacity: 0.9; }
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border-light); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 12px 14px; background: var(--table-header-bg); color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border-light); white-space: nowrap; }
td { padding: 10px 14px; border-bottom: 1px solid var(--table-border); color: var(--text-primary); }
tr:hover td { background: var(--table-row-hover); }
.ellipsis { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag { padding: 2px 8px; background: var(--bg-hover); border-radius: var(--radius-xs); font-size: 12px; color: var(--text-secondary); }
.status { padding: 2px 8px; border-radius: var(--radius-xs); font-size: 12px; }
.status.pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.status.approved { background: var(--status-done-bg); color: var(--status-done-text); }
.status.rejected { background: var(--status-fail-bg); color: var(--status-fail-text); }
.actions { display: flex; gap: 6px; }
.btn-sm { padding: 4px 12px; border-radius: var(--radius-xs); font-size: 12px; cursor: pointer; border: none; transition: opacity var(--transition-fast); }
.btn-sm:hover { opacity: 0.85; }
.btn-ok { background: var(--success); color: #fff; }
.btn-no { background: var(--danger); color: #fff; }
.btn-view { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--input-border); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

.modal-mask { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: overlay-fade-in var(--transition-base); }
.modal-card { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); max-width: 640px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal-card h3 { margin-bottom: 16px; font-size: 17px; font-weight: 600; color: var(--text-primary); }
.detail-grid { display: grid; gap: 12px; }
.detail-grid > div label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
.detail-grid > div span { color: var(--text-primary); font-size: 13px; }
.detail-grid pre { background: var(--bg-hover); padding: 10px; border-radius: var(--radius-sm); font-size: 12px; max-height: 200px; overflow: auto; color: var(--text-primary); }
.modal-actions { margin-top: 16px; display: flex; gap: 8px; }
.modal-close { margin-top: 12px; width: 100%; padding: 10px; background: var(--bg-hover); color: var(--text-primary); border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: background var(--transition-fast); }
.modal-close:hover { background: var(--border-light); }
</style>
