<template>
  <AdminLayout>
    <div class="page-header">
      <h1>自动化任务</h1>
      <button class="btn-primary" @click="openCreate">+ 新建任务</button>
    </div>

    <div class="toolbar">
      <select v-model="filterStatus" class="sel" @change="search">
        <option value="">全部状态</option>
        <option value="0">排队中</option><option value="1">执行中</option><option value="2">成功</option><option value="3">失败</option><option value="4">已取消</option>
      </select>
      <select v-model="filterType" class="sel" @change="search">
        <option value="">全部类型</option>
        <option value="product_on">商品上架</option><option value="product_off">商品下架</option><option value="ship_order">发货</option><option value="reply_review">评价回复</option><option value="stock_check">库存检查</option>
      </select>
      <input v-model="keyword" type="text" placeholder="搜索平台/店铺" @keyup.enter="search" />
      <button class="btn" @click="search">搜索</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="8" />

    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="fetchData">重试</button>
    </div>

    <template v-else-if="list.length">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>平台</th><th>店铺</th><th>任务类型</th><th>状态</th><th>结果</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="t in list" :key="t.id" class="clickable" @click="openDetail(t)">
              <td>{{ t.id }}</td>
              <td>{{ t.platform || '-' }}</td><td>{{ t.store_name || '-' }}</td>
              <td>{{ typeText(t.task_type) }}</td>
              <td><span :class="statusClass(t.status)">{{ statusText(t.status) }}</span></td>
              <td class="result-cell">{{ t.result_json || t.error_msg || '-' }}</td>
              <td>{{ t.create_time?.slice(0, 16) }}</td>
              <td class="actions" @click.stop>
                <button v-if="t.status===0" class="btn-sm" @click="execute(t)">执行</button>
                <button v-if="t.status<=1" class="btn-sm danger" @click="cancel(t)">取消</button>
                <button v-if="t.status===3" class="btn-sm" @click="retryTask(t)">重试</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else class="empty">暂无自动化任务</div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal">
          <h3>新建自动化任务</h3>
          <div class="form-grid">
            <label>平台 <input v-model="form.platform" placeholder="如: 淘宝/京东/拼多多" /></label>
            <label>店铺名称 <input v-model="form.store_name" placeholder="店铺名称" /></label>
            <label>任务类型
              <select v-model="form.task_type">
                <option value="product_on">商品上架</option><option value="product_off">商品下架</option><option value="ship_order">发货</option><option value="reply_review">评价回复</option><option value="stock_check">库存检查</option>
              </select>
            </label>
            <label>店铺ID <input v-model="form.store_id" placeholder="可选" /></label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="modalOpen = false">取消</button>
            <button class="btn-save" :disabled="saving" @click="save">{{ saving ? '创建中...' : '创建' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="detailOpen" class="modal-overlay" @click.self="detailOpen = false">
        <div class="modal">
          <h3>任务详情 #{{ detail.id }}</h3>
          <div class="detail-grid">
            <div class="detail-item"><span class="dl">平台</span><span class="dv">{{ detail.platform || '-' }}</span></div>
            <div class="detail-item"><span class="dl">店铺</span><span class="dv">{{ detail.store_name || '-' }}</span></div>
            <div class="detail-item"><span class="dl">类型</span><span class="dv">{{ typeText(detail.task_type) }}</span></div>
            <div class="detail-item"><span class="dl">状态</span><span class="dv"><span :class="statusClass(detail.status)">{{ statusText(detail.status) }}</span></span></div>
            <div class="detail-item"><span class="dl">创建时间</span><span class="dv">{{ detail.create_time }}</span></div>
            <div class="detail-item"><span class="dl">完成时间</span><span class="dv">{{ detail.finish_time || '-' }}</span></div>
            <div class="detail-item full" v-if="detail.input_data"><span class="dl">输入参数</span><span class="dv"><pre>{{ JSON.stringify(detail.input_data, null, 2) }}</pre></span></div>
            <div class="detail-item full" v-if="detail.result_json"><span class="dl">执行结果</span><span class="dv"><pre>{{ detail.result_json }}</pre></span></div>
            <div class="detail-item full" v-if="detail.error_msg"><span class="dl">错误信息</span><span class="dv error-msg">{{ detail.error_msg }}</span></div>
          </div>
          <div class="modal-actions">
            <button v-if="detail.status===0" class="btn-save" @click="execute(detail); detailOpen = false">执行</button>
            <button v-if="detail.status<=1" class="btn-danger" @click="cancel(detail); detailOpen = false">取消</button>
            <button v-if="detail.status===3" class="btn-save" @click="retryTask(detail); detailOpen = false">重试</button>
            <button class="btn-cancel" @click="detailOpen = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 15
const keyword = ref('')
const filterStatus = ref('')
const filterType = ref('')
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const modalOpen = ref(false)
const detailOpen = ref(false)
const detail = ref<any>({})
const form = ref({ platform: '', store_name: '', store_id: '', task_type: 'product_on' })

const toast = useToast()
onMounted(fetchData)

function typeText(t: string) {
  const map: Record<string, string> = { product_on: '商品上架', product_off: '商品下架', ship_order: '发货', reply_review: '评价回复', stock_check: '库存检查' }
  return map[t] || t
}
function statusText(s: number) { return ['排队中', '执行中', '成功', '失败', '已取消'][s] || '未知' }
function statusClass(s: number) { return ['badge-pending', 'badge-running', 'badge-ok', 'badge-fail', 'badge-cancel'][s] || '' }

async function fetchData() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize), keyword: keyword.value })
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterType.value) params.set('taskType', filterType.value)
    const res: any = await $fetch(`/api/automation/tasks?${params.toString()}`)
    if (res?.code === 200) { list.value = res.data?.list || []; total.value = res.data?.total || 0 }
    else { list.value = res.data || []; total.value = list.value.length }
  } catch (e: any) { error.value = e.data?.msg || e.message || '加载失败'; toast.error(error.value) } finally { loading.value = false }
}

function search() { page.value = 1; fetchData() }
function onPageChange(p: number) { page.value = p; fetchData() }
function openCreate() { form.value = { platform: '', store_name: '', store_id: '', task_type: 'product_on' }; modalOpen.value = true }
function openDetail(t: any) { detail.value = t; detailOpen.value = true }

async function save() {
  saving.value = true
  try {
    const res: any = await $fetch('/api/automation/tasks', { method: 'POST', body: form.value })
    if (res?.code === 200 || res?.code === 0) { toast.success('任务已创建'); modalOpen.value = false; fetchData() }
    else { toast.error(res?.msg || '创建失败') }
  } catch (e: any) { toast.error(e.data?.msg || e.message || '创建失败') } finally { saving.value = false }
}

async function execute(t: any) {
  try {
    const res: any = await $fetch(`/api/automation/admin/execute/${t.id}`, { method: 'POST' })
    if (res?.code === 200 || res?.code === 0) { t.status = 1; toast.success('任务已开始执行') }
    else { toast.error(res?.msg || '执行失败') }
  } catch (e: any) { toast.error(e.data?.msg || e.message || '执行失败') }
}

async function cancel(t: any) {
  try {
    const res: any = await $fetch(`/api/automation/tasks/${t.id}/cancel`, { method: 'POST' })
    if (res?.code === 200 || res?.code === 0) { t.status = 4; toast.success('任务已取消') }
    else { toast.error(res?.msg || '取消失败') }
  } catch (e: any) { toast.error(e.data?.msg || e.message || '取消失败') }
}

async function retryTask(t: any) {
  try {
    const res: any = await $fetch(`/api/automation/admin/execute/${t.id}`, { method: 'POST' })
    if (res?.code === 200 || res?.code === 0) { t.status = 1; toast.success('任务已重新提交'); fetchData() }
    else { toast.error(res?.msg || '重试失败') }
  } catch (e: any) { toast.error(e.data?.msg || e.message || '重试失败') }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.btn-primary { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-primary:hover { opacity: 0.9; }

.toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar input { flex: 1; min-width: 140px; max-width: 240px; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; outline: none; background: var(--bg-input); color: var(--text-primary); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-card); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn:hover { opacity: 0.9; }

.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--table-border); font-size: 13px; }
th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.actions { display: flex; gap: 6px; }
tr.clickable { cursor: pointer; transition: background var(--transition-fast); }
.result-cell { max-width: 150px; overflow: hidden; text-overflow: ellipsis; }

.badge-ok { color: var(--success); font-weight: 600; }
.badge-pending { color: var(--warning); font-weight: 600; }
.badge-running { color: var(--brand); font-weight: 600; }
.badge-fail { color: var(--danger); font-weight: 600; }
.badge-cancel { color: var(--text-muted); }

.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; }
.error-state p { color: var(--text-muted); margin: 12px 0 20px; }
.retry-btn { padding: 8px 24px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; font-size: 14px; transition: opacity var(--transition-fast); }
.retry-btn:hover { opacity: 0.9; }
.empty { text-align: center; color: var(--text-muted); padding: 60px 0; }

.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: all var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.danger { color: var(--danger); border-color: var(--danger); }
.btn-sm.danger:hover { background: var(--danger); color: #fff; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); z-index: 5000; display: flex; align-items: center; justify-content: center; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { font-size: 17px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text-secondary); }
.form-grid input, .form-grid select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-grid input:focus, .form-grid select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }

.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.detail-item { display: flex; gap: 12px; align-items: flex-start; }
.detail-item.full { flex-direction: column; gap: 4px; }
.dl { font-size: 12px; color: var(--text-muted); min-width: 80px; flex-shrink: 0; }
.dv { font-size: 13px; color: var(--text-primary); word-break: break-all; }
.dv pre { background: var(--bg-hover); padding: 10px; border-radius: var(--radius-sm); font-size: 12px; overflow-x: auto; max-height: 200px; color: var(--text-primary); }
.error-msg { color: var(--danger); background: var(--status-fail-bg); padding: 8px 12px; border-radius: var(--radius-sm); }

.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-cancel { padding: 8px 20px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-save { padding: 8px 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-save:hover { opacity: 0.9; }
.btn-save:disabled { opacity: .5; cursor: not-allowed; }
.btn-danger { padding: 8px 20px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 13px; transition: opacity var(--transition-fast); }
.btn-danger:hover { opacity: 0.9; }

@media (max-width: 640px) {
  .toolbar { flex-direction: column; }
  .toolbar select, .toolbar input { width: 100%; max-width: 100%; }
}
</style>
