<template>
  <AdminLayout>
    <div class="page-header">
      <h2 class="ptitle">套餐配置</h2>
      <button class="btn btn--primary" @click="openCreate">
        <span class="btn-icon">+</span> 新建套餐
      </button>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="searchQuery" placeholder="搜索套餐名称..." class="search-input" @input="onSearch" />
      </div>
      <select v-model="filterType" class="filter-select" @change="fetchPlans">
        <option value="">全部类型</option>
        <option value="0">免费版</option>
        <option value="1">月卡</option>
        <option value="2">季卡</option>
        <option value="3">年卡</option>
      </select>
    </div>

    <div v-if="isLoading" class="loading-state"><LoadingSkeleton :rows="3" /></div>
    <div v-else-if="!plans.length" class="empty-state">暂无套餐数据，点击"新建套餐"创建</div>
    <div v-else class="plan-grid">
      <div v-for="plan in plans" :key="plan.id" class="plan-card" :class="{ disabled: !plan.status }">
        <div class="plan-header">
          <span class="plan-type">{{ planTypeLabel(plan.plan_type) }}</span>
          <div class="plan-actions">
            <button class="act-btn toggle-btn" :class="{ off: !plan.status }" :aria-label="plan.status ? '已启用，点击禁用' : '已禁用，点击启用'" @click="toggleStatus(plan)" :title="plan.status ? '禁用' : '启用'">>
              {{ plan.status ? '🟢' : '🔴' }}
            </button>
            <button class="act-btn del-btn" aria-label="删除套餐" @click="confirmDelete(plan)" title="删除">🗑</button>
          </div>
        </div>
        <div class="plan-body">
          <div class="row"><span>套餐名:</span> <input v-model="plan.name" maxlength="100" /></div>
          <div class="row"><span>售价:</span> <input v-model.number="plan.price" type="number" min="0" /> 元</div>
          <div class="row"><span>原价:</span> <input v-model.number="plan.original_price" type="number" min="0" /> 元</div>
          <div class="row"><span>月点数:</span> <input v-model.number="plan.credits" type="number" min="0" /></div>
          <div class="row"><span>日赠送:</span> <input v-model.number="plan.daily_credits" type="number" min="0" /></div>
          <div class="row"><span>批量上限:</span> <input v-model.number="plan.batch_limit" type="number" min="0" /></div>
          <div class="row"><span>保存天数:</span> <input v-model.number="plan.save_days" type="number" min="0" /></div>
          <div class="checks">
            <label><input v-model="plan.watermark_free" type="checkbox" :true-value="1" :false-value="0" /> 去水印</label>
            <label><input v-model="plan.hd_export" type="checkbox" :true-value="1" :false-value="0" /> 高清导出</label>
            <label><input v-model="plan.brand_kit" type="checkbox" :true-value="1" :false-value="0" /> BrandKit</label>
            <label><input v-model="plan.priority_queue" type="checkbox" :true-value="1" :false-value="0" /> 优先队列</label>
          </div>
        </div>
        <div class="plan-footer">
          <button class="btn-save" :disabled="saving === plan.id" @click="savePlan(plan)">{{ saving === plan.id ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <Pagination v-if="total > pageSize" v-model:page="currentPage" :total="total" :page-size="pageSize" @change="fetchPlans" />

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-header"><h3>新建套餐</h3><button class="modal-close" aria-label="关闭" @click="showCreate = false">✕</button></div>
        <div class="modal-body">
          <div class="row"><span>套餐名:</span> <input v-model="newPlan.name" maxlength="100" /></div>
          <div class="row"><span>类型:</span>
            <select v-model.number="newPlan.plan_type">
              <option :value="0">免费版</option><option :value="1">月卡</option><option :value="2">季卡</option><option :value="3">年卡</option>
            </select>
          </div>
          <div class="row"><span>售价:</span> <input v-model.number="newPlan.price" type="number" min="0" /></div>
          <div class="row"><span>原价:</span> <input v-model.number="newPlan.original_price" type="number" min="0" /></div>
          <div class="row"><span>月点数:</span> <input v-model.number="newPlan.credits" type="number" min="0" /></div>
          <div class="row"><span>日赠送:</span> <input v-model.number="newPlan.daily_credits" type="number" min="0" /></div>
          <div class="row"><span>批量上限:</span> <input v-model.number="newPlan.batch_limit" type="number" min="0" /></div>
          <div class="row"><span>保存天数:</span> <input v-model.number="newPlan.save_days" type="number" min="0" /></div>
          <div class="checks">
            <label><input v-model="newPlan.watermark_free" type="checkbox" :true-value="1" :false-value="0" /> 去水印</label>
            <label><input v-model="newPlan.hd_export" type="checkbox" :true-value="1" :false-value="0" /> 高清导出</label>
            <label><input v-model="newPlan.brand_kit" type="checkbox" :true-value="1" :false-value="0" /> BrandKit</label>
            <label><input v-model="newPlan.priority_queue" type="checkbox" :true-value="1" :false-value="0" /> 优先队列</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn-confirm" :disabled="creating" @click="createPlan">{{ creating ? '创建中...' : '确认创建' }}</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="showDelete" class="modal-overlay" @click.self="showDelete = false">
      <div class="modal modal-sm">
        <div class="modal-header"><h3>确认删除</h3></div>
        <div class="modal-body"><p>确定要删除套餐「{{ deleteTarget?.name }}」吗？此操作不可恢复。</p></div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showDelete = false">取消</button>
          <button class="btn-confirm btn-danger" :disabled="deleting" @click="doDelete">{{ deleting ? '删除中...' : '确认删除' }}</button>
        </div>
      </div>
    </div>

    <p v-if="msg" class="toast-msg">{{ msg }}</p>
  </AdminLayout>
</template>

<script setup lang="ts">

import AdminLayout from '~/components/AdminLayout.vue';

const plans = ref<any[]>([]);
const saving = ref(0);
const { message: msg, show: showMsg } = useTimedMessage();
const isLoading = ref(false);
const searchQuery = ref('');
const filterType = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const showCreate = ref(false);
const showDelete = ref(false);
const creating = ref(false);
const deleting = ref(false);
const deleteTarget = ref<any>(null);

const newPlan = ref({
  name: '', plan_type: 1, price: 0, original_price: 0, credits: 100,
  daily_credits: 10, batch_limit: 10, save_days: 30,
  watermark_free: 0, hd_export: 0, brand_kit: 0, priority_queue: 0, status: 1,
});

function planTypeLabel(t: number) {
  const m: Record<number, string> = { 0: '免费版', 1: '月卡', 2: '季卡', 3: '年卡' };
  return m[t] || '未知';
}
const toast = useToast()

async function fetchPlans() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (searchQuery.value) params.set('keyword', searchQuery.value);
    if (filterType.value) params.set('plan_type', filterType.value);
    params.set('page', String(currentPage.value));
    params.set('pageSize', String(pageSize.value));
    const res: any = await $fetch(`/api/admin/plans?${params}`);
    plans.value = res.data?.list || res.data || [];
    total.value = res.data?.total || plans.value.length;
  } catch(e: any) { toast.error(e.data?.msg || '加载失败') }
  isLoading.value = false;
}

async function savePlan(plan: any) {
  saving.value = plan.id; msg.value = '';
  try {
    await $fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PUT',
      body: {
        name: plan.name, price: plan.price, original_price: plan.original_price,
        credits: plan.credits, daily_credits: plan.daily_credits, batch_limit: plan.batch_limit,
        save_days: plan.save_days, watermark_free: plan.watermark_free, hd_export: plan.hd_export,
        brand_kit: plan.brand_kit, priority_queue: plan.priority_queue, status: plan.status,
      },
    });
    showMsg('已保存');
  } catch (e: any) { msg.value = e.data?.msg || '保存失败'; }
  saving.value = 0;
}

async function toggleStatus(plan: any) {
  plan.status = plan.status ? 0 : 1;
  await savePlan(plan);
}

function openCreate() { newPlan.value = { name: '', plan_type: 1, price: 0, original_price: 0, credits: 100, daily_credits: 10, batch_limit: 10, save_days: 30, watermark_free: 0, hd_export: 0, brand_kit: 0, priority_queue: 0, status: 1 }; showCreate.value = true; }

async function createPlan() {
  creating.value = true;
  try {
    await $fetch('/api/admin/plans', { method: 'POST', body: newPlan.value });
    showCreate.value = false; showMsg('套餐已创建');
    fetchPlans();
  } catch (e: any) { msg.value = e.data?.msg || '创建失败'; }
  creating.value = false;
}

function confirmDelete(plan: any) { deleteTarget.value = plan; showDelete.value = true; }

async function doDelete() {
  if (!deleteTarget.value) return; deleting.value = true;
  try {
    await $fetch(`/api/admin/plans/${deleteTarget.value.id}`, { method: 'DELETE' });
    showDelete.value = false; showMsg('套餐已删除');
    fetchPlans();
  } catch (e: any) { msg.value = e.data?.msg || '删除失败'; }
  deleting.value = false;
}

function onSearch() { currentPage.value = 1; fetchPlans(); }

onMounted(fetchPlans);
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ptitle { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.btn { padding: 8px 16px; border: none; border-radius: var(--btn-radius); cursor: pointer; font-size: 13px; font-weight: 500; transition: opacity var(--transition-fast), transform var(--transition-fast); }
.btn--primary { background: var(--brand); color: #fff; }
.btn--primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-icon { margin-right: 4px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.search-box { position: relative; flex: 1; max-width: 300px; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; }
.search-input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); box-sizing: border-box; }
.search-input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.filter-select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.loading-state, .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }
.plan-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 900px) { .plan-grid { grid-template-columns: 1fr; } }
.plan-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-xl); padding: var(--card-padding); transition: box-shadow var(--transition-fast); }
.plan-card:hover { box-shadow: var(--shadow-md); }
.plan-card.disabled { opacity: 0.6; }
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.plan-type { font-weight: 700; font-size: 16px; color: var(--text-primary); }
.plan-actions { display: flex; gap: 8px; }
.act-btn { width: 28px; height: 28px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); background: var(--bg-card); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: transform var(--transition-fast); }
.act-btn:hover { transform: scale(1.1); }
.toggle-btn.off { opacity: 0.4; }
.del-btn:hover { border-color: var(--danger); background: var(--danger-light, #FEE2E2); }
.plan-body .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; }
.plan-body .row span { width: 70px; color: var(--text-secondary); flex-shrink: 0; }
.plan-body .row input, .plan-body .row select { flex: 1; padding: 6px 8px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.plan-body .row input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.checks { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.checks label { font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-primary); }
.plan-footer { margin-top: 16px; }
.btn-save { width: 100%; padding: var(--btn-padding); background: var(--brand); color: #fff; border: none; border-radius: var(--btn-radius); cursor: pointer; font-size: var(--btn-font-size); transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: var(--fade-in); }
.modal { background: var(--bg-card); border-radius: var(--radius-xl); width: 540px; max-width: 90vw; max-height: 80vh; overflow-y: auto; box-shadow: var(--shadow-xl); }
.modal-sm { width: 400px; max-width: 90vw; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
.modal-header h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-secondary); }
.modal-body { padding: 20px; }
.modal-body .row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; }
.modal-body .row span { width: 70px; color: var(--text-secondary); flex-shrink: 0; }
.modal-body .row input, .modal-body .row select { flex: 1; padding: 8px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; box-sizing: border-box; }
.modal-body .checks { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border-light); }
.btn-cancel { padding: 8px 16px; border: 1px solid var(--border-light); border-radius: var(--btn-radius); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; }
.btn-confirm { padding: 8px 16px; border: none; border-radius: var(--btn-radius); background: var(--brand); color: #fff; cursor: pointer; font-size: 13px; font-weight: 500; transition: opacity var(--transition-fast); }
.btn-confirm:hover { opacity: 0.9; }
.btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { background: var(--danger); }
</style>