<template>
  <AdminLayout>
    <h2 class="ptitle">提示词模板管理</h2>

    <div class="toolbar">
      <input v-model="keyword" type="text" placeholder="搜索模板标题" @keyup.enter="fetchData" />
      <select v-model="filterCategory" class="sel" @change="fetchData">
        <option value="">全部分类</option>
        <option value="main_image">主图</option><option value="scene">场景</option><option value="video">视频</option><option value="script">口播脚本</option><option value="copy">营销文案</option><option value="viral-clone">爆款复刻</option>
      </select>
      <select v-model="filterStatus" class="sel" @change="fetchData">
        <option value="">全部状态</option>
        <option value="0">草稿</option><option value="1">待审核</option><option value="2">已上架</option><option value="3">已下架</option>
      </select>
      <button class="btn btn-primary" @click="openCreate">+ 新建模板</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="8" />

    <div class="table-wrap" v-else-if="list.length">
    <table class="table">
      <thead>
        <tr><th>ID</th><th>编码</th><th>标题</th><th>分类</th><th>状态</th><th>使用次数</th><th>创建时间</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="t in list" :key="t.id">
          <td>{{ t.id }}</td>
          <td class="mono">{{ t.template_code }}</td>
          <td>{{ t.title }}</td>
          <td><span class="category-tag">{{ categoryLabel(t.category) }}</span></td>
          <td><span class="status-tag" :class="statusClass(t.status)">{{ statusLabel(t.status) }}</span></td>
          <td>{{ t.usage_count }}</td>
          <td>{{ t.create_time?.slice(0, 10) }}</td>
          <td class="actions">
            <button class="btn-sm" @click="openEdit(t)">编辑</button>
            <button v-if="t.status === 1" class="btn-sm success" @click="review(t.id, 2)">通过</button>
            <button v-if="t.status === 1" class="btn-sm danger" @click="review(t.id, 3)">驳回</button>
            <button v-if="t.status === 2" class="btn-sm warn" @click="review(t.id, 3)">下架</button>
            <button v-if="t.status === 3" class="btn-sm" @click="review(t.id, 2)">上架</button>
            <button class="btn-sm danger" @click="confirmDelete(t)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    <div v-if="!list.length && !loading" class="empty">暂无模板数据</div>

    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
        <div class="modal">
          <h3>{{ editing.id ? '编辑模板' : '新建模板' }}</h3>
          <div class="form-group">
            <label>标题</label>
            <input v-model="form.title" maxlength="100" type="text" placeholder="模板标题" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <input v-model="form.description" maxlength="500" type="text" placeholder="简短描述" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>分类</label>
              <select v-model="form.category" class="sel">
                <option value="main_image">主图</option><option value="scene">场景</option><option value="video">视频</option><option value="script">口播脚本</option><option value="copy">营销文案</option><option value="viral-clone">爆款复刻</option>
              </select>
            </div>
            <div class="form-group">
              <label>图标</label>
              <input v-model="form.icon" maxlength="50" type="text" placeholder="star" />
            </div>
          </div>
          <div class="form-group">
            <label>提示词内容（用双大括号包裹变量名做占位符，如 product_name）</label>
            <textarea v-model="form.content" maxlength="5000" rows="8" placeholder="输入提示词模板内容..."></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>模型类型</label>
              <select v-model="form.modelType" class="sel">
                <option value="text">文本</option><option value="image">图片</option><option value="video">视频</option>
              </select>
            </div>
            <div class="form-group">
              <label>排序</label>
              <input v-model.number="form.sortOrder" type="number" placeholder="数字越大越靠前" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label><input v-model="form.isPublic" type="checkbox" /> 公开模板</label>
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.status" class="sel">
                <option :value="0">草稿</option><option :value="1">待审核</option><option :value="2">已上架</option><option :value="3">已下架</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn" @click="showModal = false">取消</button>
            <button class="btn btn-primary" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">

const { confirm } = useConfirm()
const toast = useToast()

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const keyword = ref('');
const filterStatus = ref('');
const filterCategory = ref('');
const loading = ref(false);
const showModal = ref(false);

const editing = ref<any>({});
const form = reactive({
  title: '', description: '', category: 'main_image', content: '', icon: 'star',
  modelType: 'text', sortOrder: 0, isPublic: true, status: 2,
});

onMounted(() => { fetchData(); });

async function fetchData() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) });
    if (keyword.value) params.set('keyword', keyword.value);
    if (filterStatus.value) params.set('status', filterStatus.value);
    if (filterCategory.value) params.set('category', filterCategory.value);
    const res = await $fetch(`/api/admin/prompts?${params}`, { credentials: 'include' });
    list.value = (res as any).data?.list || [];
    total.value = (res as any).data?.total || 0;
  } catch (e: any) { toast.error('加载失败: ' + (e?.data?.msg || e.message || '网络错误')); } finally { loading.value = false; }

}

function onPageChange(p: number) { page.value = p; fetchData(); }

function openCreate() {
  editing.value = {};
  Object.assign(form, { title: '', description: '', category: 'main_image', content: '', icon: 'star', modelType: 'text', sortOrder: 0, isPublic: true, status: 2 });
  showModal.value = true;
}

function openEdit(t: any) {
  editing.value = t;
  Object.assign(form, {
    title: t.title, description: t.description || '', category: t.category,
    content: t.content, icon: t.icon, modelType: t.model_type, sortOrder: t.sort_order,
    isPublic: !!t.is_public, status: t.status,
  });
  showModal.value = true;
}

async function save() {
  try {
    const body: any = { ...form };
    if (editing.value.id) body.id = editing.value.id;
    body.templateCode = editing.value.template_code;
    await $fetch('/api/admin/prompts', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(body),
    });
    showModal.value = false;
    fetchData();
  } catch (e: any) { toast.error('保存失败: ' + (e?.data?.msg || e.message || '网络错误')); }
}

async function review(id: number, status: number) {
  if (!await confirm({ message: status === 2 ? '确认通过并上架？' : '确认驳回/下架？'} )) return;
  try {
    await $fetch(`/api/admin/prompts/${id}/review`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ status, reviewRemark: status === 3 ? '管理员操作' : '' }),
    });
    fetchData();
  } catch (e: any) { toast.error('操作失败: ' + (e?.data?.msg || e.message || '网络错误')); }
}

async function confirmDelete(t: any) {
  if (!await confirm({ message: `确认删除「${t.title}」？此操作不可恢复。`} )) return;
  try {
    await $fetch(`/api/admin/prompts/${t.id}`, { method: 'DELETE', credentials: 'include' });
    fetchData();
  } catch (e: any) { toast.error('删除失败: ' + (e?.data?.msg || e.message || '网络错误')); }
}

function categoryLabel(c: string) {
  const map: Record<string, string> = { main_image: '主图', scene: '场景', video: '视频', script: '口播脚本', copy: '营销文案', 'viral-clone': '爆款复刻' };
  return map[c] || c;
}
function statusLabel(s: number) {
  const map: Record<number, string> = { 0: '草稿', 1: '待审核', 2: '已上架', 3: '已下架' };
  return map[s] || String(s);
}
function statusClass(s: number) {
  const map: Record<number, string> = { 0: 'draft', 1: 'pending', 2: 'active', 3: 'banned' };
  return map[s] || '';
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.toolbar input { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); width: 200px; font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.toolbar input:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.sel { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); font-size: 13px; outline: none; transition: border-color var(--transition-fast); }
.sel:focus { border-color: var(--input-focus-border); }
.btn { padding: 6px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-primary { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }
.btn-primary:hover { opacity: 0.9; color: var(--text-on-brand); }
.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); cursor: pointer; margin-right: 4px; background: var(--bg-card); color: var(--text-primary); transition: border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.success { background: var(--success); color: var(--text-on-brand); border-color: var(--success); }
.btn-sm.success:hover { opacity: 0.85; }
.btn-sm.danger { background: var(--danger); color: var(--text-on-brand); border-color: var(--danger); }
.btn-sm.danger:hover { opacity: 0.85; }
.btn-sm.warn { background: var(--warning); color: var(--text-on-brand); border-color: var(--warning); }
.btn-sm.warn:hover { opacity: 0.85; }
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); text-align: left; font-size: 14px; }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.mono { font-family: monospace; font-size: 12px; }
.category-tag { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); background: var(--status-processing-bg); color: var(--status-processing-text); }
.status-tag { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); }
.status-tag.draft { background: var(--bg-hover); color: var(--text-muted); }
.status-tag.pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
.status-tag.active { background: var(--status-done-bg); color: var(--status-done-text); }
.status-tag.banned { background: var(--status-fail-bg); color: var(--status-fail-text); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 999; animation: overlay-fade-in var(--transition-base); }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 640px; max-height: 90vh; overflow-y: auto; box-shadow: var(--modal-shadow); animation: modal-enter var(--transition-slow); }
.modal h3 { margin-bottom: 16px; color: var(--text-primary); font-size: 17px; font-weight: 600; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.form-group textarea { resize: vertical; }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.actions { white-space: nowrap; }
</style>
