<template>
  <div class="ent-tags">
    <div class="page-header">
      <h1 class="page-title">标签管理</h1>
      <button class="btn-primary" @click="showAdd = true">+ 新建标签</button>
    </div>

    <div class="tag-grid" v-if="!loading">
      <div v-for="t in tags" :key="t.id" class="tag-card">
        <div class="tag-preview" :style="{ background: t.color }">{{ t.name }}</div>
        <div class="tag-info">
          <span class="tag-name">{{ t.name }}</span>
          <span class="tag-color">{{ t.color }}</span>
        </div>
        <div class="tag-actions">
          <button class="btn-sm" @click="editTag(t)">编辑</button>
          <button class="btn-sm danger" @click="handleDelete(t)">删除</button>
        </div>
      </div>
      <div v-if="!tags.length" class="empty">暂无标签，点击上方按钮新建</div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <div class="modal-overlay" v-if="showAdd || showEdit" @click.self="closeModal">
      <div class="modal">
        <h3>{{ showEdit ? '编辑标签' : '新建标签' }}</h3>
        <div class="form-group">
          <label>标签名称</label>
          <input v-model="form.name" placeholder="如：高价值客户" class="form-input" maxlength="50" />
        </div>
        <div class="form-group">
          <label>标签颜色</label>
          <div class="color-row">
            <input type="color" v-model="form.color" class="color-picker" />
            <span class="color-hex">{{ form.color }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-text" @click="closeModal">取消</button>
          <button class="btn-primary" @click="submitForm">{{ showEdit ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';

const tags = ref([]);
const loading = ref(true);
const showAdd = ref(false);
const showEdit = ref(false);
const editingId = ref(null);
const form = reactive({ name: '', color: '#3B82F6' });

const $api = (url, opts) => $fetch(url, { baseURL: '/api/enterprise/customers', credentials: 'include', ...opts });

async function loadTags() {
  loading.value = true;
  try { tags.value = await $api('/enterprise/customers/tags'); } catch (e) { /* ignore */ }
  loading.value = false;
}

function editTag(t) {
  editingId.value = t.id;
  form.name = t.name;
  form.color = t.color;
  showEdit.value = true;
}

function closeModal() {
  showAdd.value = false;
  showEdit.value = false;
  editingId.value = null;
  form.name = '';
  form.color = '#3B82F6';
}

async function submitForm() {
  try {
    if (showEdit.value) {
      await $api(`/enterprise/customers/tags/${editingId.value}`, { method: 'PUT', body: { name: form.name, color: form.color } });
    } else {
      await $api('/enterprise/customers/tags', { method: 'POST', body: { name: form.name, color: form.color } });
    }
    closeModal();
    loadTags();
  } catch (e) { /* ignore */ }
}

async function handleDelete(t) {
  if (!confirm(`确认删除标签"${t.name}"？关联的客户将自动解绑。`)) return;
  try {
    await $api(`/enterprise/customers/tags/${t.id}`, { method: 'DELETE' });
    loadTags();
  } catch (e) { /* ignore */ }
}

onMounted(loadTags);
</script>

<style scoped>
.ent-tags { max-width: 960px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; }
.tag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.tag-card { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); display: flex; flex-direction: column; gap: 12px; }
.tag-preview { padding: 12px; border-radius: 6px; color: #fff; font-weight: 600; text-align: center; font-size: 16px; }
.tag-info { display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; }
.tag-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-sm { padding: 4px 10px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; }
.btn-sm.danger { color: #dc2626; border-color: #fca5a5; }
.btn-primary { padding: 8px 20px; background: #3B82F6; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
.btn-text { padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.empty { text-align: center; padding: 48px; color: #9ca3af; grid-column: 1 / -1; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 12px; padding: 24px; min-width: 380px; }
.modal h3 { margin-bottom: 16px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; }
.color-row { display: flex; align-items: center; gap: 12px; }
.color-picker { width: 40px; height: 36px; border: none; cursor: pointer; }
.color-hex { font-size: 14px; color: #6b7280; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
</style>
