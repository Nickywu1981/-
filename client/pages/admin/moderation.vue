<template>
  <AdminLayout>
    <div class="page">
      <h1 class="page-title">{{ $t('admin_moderation.page_title') }}</h1>

      <div class="filters">
        <select v-model="filter.status" class="sel" @change="fetchList">
          <option value="">{{ $t('admin_moderation.all_statuses') }}</option>
          <option value="0">{{ $t('admin_moderation.status_pending') }}</option><option value="1">{{ $t('admin_moderation.status_approved') }}</option><option value="2">{{ $t('admin_moderation.status_rejected') }}</option>
        </select>
        <select v-model="filter.type" class="sel" @change="fetchList">
          <option value="">{{ $t('admin_moderation.all_types') }}</option>
          <option value="main_image">{{ $t('admin_moderation.type_main_image') }}</option><option value="scene">{{ $t('admin_moderation.type_scene') }}</option><option value="detail_h5">{{ $t('admin_moderation.type_detail_h5') }}</option><option value="img2video">{{ $t('admin_moderation.type_video') }}</option><option value="batch">{{ $t('admin_moderation.type_batch') }}</option>
        </select>
        <button class="btn-refresh" @click="fetchList">{{ $t('admin_moderation.refresh') }}</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>{{ $t('common.id') }}</th><th>{{ $t('admin_moderation.col_user') }}</th><th>{{ $t('admin_moderation.col_type') }}</th><th>{{ $t('admin_moderation.col_title') }}</th><th>{{ $t('admin_moderation.col_status') }}</th><th>{{ $t('admin_moderation.col_submit_time') }}</th><th>{{ $t('common.action') }}</th></tr>
          </thead>
          <tbody>
            <tr v-if="isLoading"><td colspan="7" class="loading">{{ $t('admin_moderation.loading') }}</td></tr>
            <tr v-else-if="list.length === 0"><td colspan="7" class="empty">{{ $t('admin_moderation.empty') }}</td></tr>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.username || '-' }}</td>
              <td><span class="tag">{{ typeLabel(item.type) }}</span></td>
              <td class="ellipsis" :title="item.title">{{ item.title }}</td>
              <td><span :class="['status', reviewLabel(item.review_status)]">{{ reviewText(item.review_status) }}</span></td>
              <td>{{ formatDateTime(item.create_time) }}</td>
              <td class="actions">
                <button v-if="item.review_status === 0" class="btn-sm btn-ok" :disabled="reviewing" @click="approve(item)">{{ $t('admin_moderation.approve') }}</button>
                <button v-if="item.review_status === 0" class="btn-sm btn-no" :disabled="reviewing" @click="reject(item)">{{ $t('admin_moderation.reject') }}</button>
                <button class="btn-sm btn-view" @click="viewDetail(item)">{{ $t('admin_moderation.detail') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />

      <Teleport to="body">
        <div v-if="detail" class="modal-mask" @click.self="detail = null" @keydown.escape="detail = null">
          <div class="modal-card">
            <h3>{{ $t('admin_moderation.detail_title', { id: detail.id }) }}</h3>
            <div class="detail-grid">
              <div><label>{{ $t('admin_moderation.label_type') }}</label><span>{{ typeLabel(detail.type) }}</span></div>
              <div><label>{{ $t('admin_moderation.label_user') }}</label><span>{{ detail.username || detail.user_id }}</span></div>
              <div><label>{{ $t('admin_moderation.label_title') }}</label><span>{{ detail.title }}</span></div>
              <div><label>{{ $t('admin_moderation.label_review_status') }}</label><span :class="['status', reviewLabel(detail.review_status)]">{{ reviewText(detail.review_status) }}</span></div>
              <div><label>{{ $t('admin_moderation.label_input_params') }}</label><pre>{{ JSON.stringify(detail.input_params, null, 2) }}</pre></div>
              <div v-if="detail.output_result"><label>{{ $t('admin_moderation.label_output_result') }}</label><pre>{{ JSON.stringify(detail.output_result, null, 2) }}</pre></div>
            </div>
            <div class="modal-actions" v-if="detail.review_status === 0">
              <button class="btn-sm btn-ok" :disabled="reviewing" @click="approve(detail)">{{ $t('admin_moderation.approve') }}</button>
              <button class="btn-sm btn-no" :disabled="reviewing" @click="reject(detail)">{{ $t('admin_moderation.reject') }}</button>
            </div>
            <button class="modal-close" @click="detail = null">{{ $t('admin_moderation.close') }}</button>
          </div>
        </div>
      </Teleport>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { formatDateTime } from '@/utils/format'

const { t } = useI18n()
const { confirm } = useConfirm()

const filter = reactive({ status: '', type: '' as string });
const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const detail = ref<any>(null);
const isLoading = ref(false);
const toast = useToast();

onMounted(() => fetchList());

const reviewing = ref(false)

async function fetchList() {
  isLoading.value = true;
  try {
    const res: any = await $fetch('/api/admin/tasks', {
      params: { page: page.value, pageSize, type: filter.type, reviewStatus: filter.status || '' },
      credentials: 'include',
    });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.loadFail')) } finally { isLoading.value = false; }
}

function onPageChange(p: number) { page.value = p; fetchList(); }

async function approve(item: any) {
  if (!(await confirm({ message: t('admin_moderation.confirm_approve') }))) return
  reviewing.value = true;
  try {
    await $fetch(`/api/admin/tasks/${item.id}/approve`, { method: 'POST', credentials: 'include' });
    item.review_status = 1;
    if (detail.value?.id === item.id) detail.value.review_status = 1;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.loadFail')) } finally { reviewing.value = false; }
}

async function reject(item: any) {
  if (!(await confirm({ message: t('admin_moderation.confirm_reject') }))) return
  reviewing.value = true;
  try {
    await $fetch(`/api/admin/tasks/${item.id}/reject`, { method: 'POST', credentials: 'include' });
    item.review_status = 2;
    if (detail.value?.id === item.id) detail.value.review_status = 2;
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; toast.error(err?.data?.msg || t('common.loadFail')) } finally { reviewing.value = false; }
}

function viewDetail(item: any) { detail.value = item; }

function typeLabel(tp: string) {
  const m: Record<string, string> = {
    main_image: t('admin_moderation.type_main_image'),
    scene: t('admin_moderation.type_scene'),
    detail_h5: t('admin_moderation.type_detail_h5'),
    img2video: t('admin_moderation.type_video'),
    batch: t('admin_moderation.type_batch'),
    multi2video: t('admin_moderation.type_multi2video'),
    video_packaging: t('admin_moderation.type_video_packaging'),
    action_transfer: t('admin_moderation.type_action_transfer'),
    person_replace: t('admin_moderation.type_person_replace'),
    digital_human: t('admin_moderation.type_digital_human'),
    script_gen: t('admin_moderation.type_script_gen'),
    shot_plan: t('admin_moderation.type_shot_plan'),
    viral_clone: t('admin_moderation.type_viral_clone'),
  };
  return m[tp] || tp;
}

function reviewLabel(s: number) {
  if (s === 1) return 'approved';
  if (s === 2) return 'rejected';
  return 'pending';
}

function reviewText(s: number) {
  if (s === 1) return t('admin_moderation.status_approved');
  if (s === 2) return t('admin_moderation.status_rejected');
  return t('admin_moderation.status_pending');
}
definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })
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
