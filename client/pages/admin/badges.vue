<template>
  <AdminLayout>
    <h2 class="ptitle">营销标签管理</h2>

    <div class="toolbar">
      <select v-model="filterCategory" class="sel" @change="fetchData">
        <option value="">全部分类</option>
        <option value="sales">销售类</option>
        <option value="promotion">促销类</option>
        <option value="trust">信任类</option>
        <option value="cross_border">跨境类</option>
      </select>
      <button class="btn btn-primary" @click="openCreate">+ 新建标签</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="6" />

    <div class="table-wrap" v-else-if="list.length">
    <table class="table">
      <thead>
        <tr><th>ID</th><th>图标</th><th>名称</th><th>颜色</th><th>分类</th><th>状态</th><th>排序</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="b in list" :key="b.id">
          <td>{{ b.id }}</td>
          <td><span class="badge-preview" :style="{ background: b.color }">{{ iconMap[b.icon] || '🏷️' }}</span></td>
          <td>{{ b.name }}</td>
          <td><span class="color-swatch" :style="{ background: b.color }" />{{ b.color }}</td>
          <td><span class="category-tag">{{ categoryLabel(b.category) }}</span></td>
          <td><span class="status-dot" :class="b.status === 1 ? 'on' : 'off'" />{{ b.status === 1 ? '启用' : '停用' }}</td>
          <td>{{ b.sort_order }}</td>
          <td class="actions">
            <button class="btn-sm" @click="openEdit(b)">编辑</button>
            <button class="btn-sm" :class="b.status === 1 ? 'warn' : 'success'" @click="toggleStatus(b)">{{ b.status === 1 ? '停用' : '启用' }}</button>
            <button class="btn-sm danger" @click="confirmDelete(b)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>

    <div v-if="!list.length && !loading" class="empty">暂无标签数据</div>

    <Teleport to="body">
      <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
        <div class="modal">
          <h3>{{ editing.id ? '编辑标签' : '新建标签' }}</h3>
          <div class="form-row">
            <div class="form-group">
              <label>名称</label>
              <input v-model="form.name" type="text" placeholder="如：热卖爆款" />
            </div>
            <div class="form-group">
              <label>图标代码</label>
              <input v-model="form.icon" type="text" placeholder="如：fire, star, discount" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>颜色</label>
              <input v-model="form.color" type="color" />
            </div>
            <div class="form-group">
              <label>分类</label>
              <select v-model="form.category" class="sel">
                <option value="sales">销售类</option>
                <option value="promotion">促销类</option>
                <option value="trust">信任类</option>
                <option value="cross_border">跨境类</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>描述</label>
              <input v-model="form.description" type="text" placeholder="简短说明" />
            </div>
            <div class="form-group">
              <label>排序</label>
              <input v-model.number="form.sortOrder" type="number" placeholder="数字越大越靠前" />
            </div>
          </div>
          <div class="form-group">
            <label><input v-model="form.status" type="checkbox" :true-value="1" :false-value="0" /> 启用</label>
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

const toast = useToast()
const list = ref<any[]>([]);
const loading = ref(false);
const showModal = ref(false);
const filterCategory = ref('');
const editing = ref<any>({});

const iconMap: Record<string, string> = {
  fire: '🔥', star: '⭐', clock: '⏰', discount: '🏷️',
  shield: '🛡️', undo: '↩️', global: '🌍', plane: '✈️', gift: '🎁',
};

const form = reactive({
  name: '', icon: 'star', color: '#FF4757', category: 'sales',
  description: '', sortOrder: 0, status: 1,
});

onMounted(() => { fetchData(); });

async function fetchData() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filterCategory.value) params.set('category', filterCategory.value);
    const res = await $fetch(`/api/badges/admin/all?${params}`, { credentials: 'include' });
    list.value = (res as any).data || [];
  } catch (e: any) { toast.error(e.data?.msg || e?.message || '加载失败') } finally { loading.value = false; }

}

function openCreate() {
  editing.value = {};
  Object.assign(form, { name: '', icon: 'star', color: '#FF4757', category: 'sales', description: '', sortOrder: 0, status: 1 });
  showModal.value = true;
}

function openEdit(b: any) {
  editing.value = b;
  Object.assign(form, {
    name: b.name, icon: b.icon, color: b.color, category: b.category,
    description: b.description || '', sortOrder: b.sort_order, status: b.status,
  });
  showModal.value = true;
}

async function save() {
  try {
    const body: any = { ...form };
    if (editing.value.id) {
      await $fetch(`/api/badges/admin/${editing.value.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } else {
      await $fetch('/api/badges/admin', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(body),
      });
    }
    showModal.value = false;
    fetchData();
  } catch (e: any) { toast.error('保存失败: ' + (e.data?.msg || e.message || '网络错误')); }
}

async function toggleStatus(b: any) {
  try {
    await $fetch(`/api/badges/admin/${b.id}`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify({ status: b.status === 1 ? 0 : 1 }),
    });
    fetchData();
  } catch (e: any) { toast.error('操作失败: ' + (e.data?.msg || e.message || '网络错误')); }
}

async function confirmDelete(b: any) {
  if (!confirm(`确认删除「${b.name}」？`)) return;
  try {
    await $fetch(`/api/badges/admin/${b.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    fetchData();
  } catch (e: any) { toast.error('删除失败: ' + (e.data?.msg || e.message || '网络错误')); }
}

function categoryLabel(c: string) {
  const map: Record<string, string> = { sales: '销售类', promotion: '促销类', trust: '信任类', cross_border: '跨境类' };
  return map[c] || c;
}
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.sel { padding: 6px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); font-size: 13px; outline: none; }
.btn { padding: 6px 14px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all var(--transition-fast); }
.btn:hover { border-color: var(--brand); color: var(--brand); }
.btn-primary { background: var(--brand); color: var(--text-on-brand); border-color: var(--brand); }
.btn-primary:hover { opacity: 0.9; color: var(--text-on-brand); }
.btn-sm { padding: 4px 10px; font-size: 12px; border: 1px solid var(--input-border); border-radius: var(--radius-xs); cursor: pointer; margin-right: 4px; background: var(--bg-card); color: var(--text-primary); transition: all var(--transition-fast); }
.btn-sm:hover { border-color: var(--brand); color: var(--brand); }
.btn-sm.success { background: var(--success); color: var(--text-on-brand); border-color: var(--success); }
.btn-sm.danger { background: var(--danger); color: var(--text-on-brand); border-color: var(--danger); }
.btn-sm.warn { background: var(--warning); color: var(--text-on-brand); border-color: var(--warning); }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; }
.table th, .table td { padding: 10px 12px; border-bottom: 1px solid var(--table-border); text-align: left; font-size: 14px; }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.badge-preview { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; }
.color-swatch { display: inline-block; width: 16px; height: 16px; border-radius: 4px; margin-right: 6px; vertical-align: middle; border: 1px solid var(--input-border); }
.category-tag { font-size: 12px; padding: 2px 8px; border-radius: var(--badge-radius); background: var(--status-processing-bg); color: var(--status-processing-text); }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.on { background: var(--success); }
.status-dot.off { background: var(--text-muted); }
.empty { text-align: center; color: var(--text-muted); padding: 40px; }

.modal-overlay { position: fixed; inset: 0; background: var(--modal-overlay); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: var(--bg-card); border-radius: var(--modal-radius); padding: var(--modal-padding); width: 90%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: var(--modal-shadow); }
.modal h3 { margin-bottom: 16px; color: var(--text-primary); font-size: 17px; font-weight: 600; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-sm); font-size: 14px; background: var(--bg-input); color: var(--text-primary); outline: none; }
.form-group input:focus, .form-group select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.form-row { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.actions { white-space: nowrap; }
</style>
