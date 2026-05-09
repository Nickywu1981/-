<template>
  <div class="page">
    <h2>我的合集</h2>
    <button class="btn" @click="showForm = true">+ 新建合集</button>

    <div v-if="showForm" class="form-card">
      <input v-model="form.name" placeholder="合集名称" />
      <input v-model="form.description" placeholder="描述（选填）" />
      <div class="form-actions">
        <button class="btn-outline" @click="showForm = false">取消</button>
        <button class="btn" @click="saveCollection" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
      </div>
    </div>

    <div v-if="loading" class="loading-msg">加载中...</div>

    <div v-else-if="collections.length" class="grid">
      <div v-for="c in collections" :key="c.id" class="card">
        <div class="card-cover">{{ c.name.slice(0, 1) }}</div>
        <div class="card-name">{{ c.name }}</div>
        <div class="card-desc">{{ c.description || '暂无描述' }}</div>
        <div class="card-meta">{{ c.item_count || 0 }} 项 · {{ c.is_public ? '公开' : '私密' }}</div>
        <button class="btn-del" @click="deleteCollection(c.id)">删除</button>
      </div>
    </div>

    <div v-else class="empty">还没有合集，创建一个吧</div>

    <Pagination v-if="total > 20" v-model:page="page" :total="total" :page-size="20" @update:page="fetchData" />
  </div>
</template>

<script setup lang="ts">


const showForm = ref(false);
const loading = ref(true);
const saving = ref(false);
const collections = ref<any[]>([]);
const page = ref(1);
const total = ref(0);
const form = reactive({ name: '', description: '' });

async function fetchData() {
  loading.value = true;
  try {
    const data: any = await $fetch(`/api/collections?page=${page.value}&size=20`, { credentials: 'include' });
    collections.value = data.list || data.data?.list || [];
    total.value = data.total || data.data?.total || 0;
  } catch { toast.error('加载失败'); }
  loading.value = false;
}

async function saveCollection() {
  if (!form.name.trim()) return toast.warn('请输入合集名称');
  saving.value = true;
  try {
    await $fetch('/api/collections', { method: 'POST', body: { name: form.name, description: form.description }, credentials: 'include' });
    toast.success('创建成功');
    showForm.value = false;
    form.name = ''; form.description = '';
    fetchData();
  } catch { toast.error('创建失败'); }
  saving.value = false;
}

async function deleteCollection(id: number) {
  if (!confirm('确定删除？')) return;
  try {
    await $fetch(`/api/collections/${id}`, { method: 'DELETE', credentials: 'include' });
    toast.success('已删除');
    fetchData();
  } catch { toast.error('删除失败'); }
}

onMounted(fetchData);
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 24px; }
h2 { font-size: 20px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
.btn { padding: 8px 20px; border-radius: 8px; background: var(--brand-gradient, linear-gradient(135deg, #7C3AED, #A78BFA)); color: #fff; border: none; cursor: pointer; transition: all .2s; }
.btn:hover { opacity: .9; transform: translateY(-1px); }
.btn:disabled { opacity: .6; }
.btn-outline { padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.btn-del { padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-size: 13px; }
.btn-del:hover { border-color: var(--danger); color: var(--danger); }
.form-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
.form-card input { padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input); color: var(--text-primary); font-size: 14px; transition: border-color .2s; }
.form-card input:focus { border-color: var(--brand); outline: none; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; transition: all .2s; cursor: pointer; }
.card:hover { box-shadow: 0 4px 16px rgba(124, 58, 237, .1); transform: translateY(-2px); border-color: var(--brand); }
.card-cover { width: 60px; height: 60px; border-radius: 12px; background: var(--brand-gradient, linear-gradient(135deg, #7C3AED, #A78BFA)); color: #fff; font-size: 24px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.card-name { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.card-desc { font-size: 13px; color: var(--text-tertiary); margin-bottom: 8px; }
.card-meta { font-size: 12px; color: var(--text-hint); margin-bottom: 12px; }
.loading-msg { text-align: center; color: var(--text-secondary); padding: 40px; }
.empty { text-align: center; color: var(--text-tertiary); padding: 60px 0; }
</style>
