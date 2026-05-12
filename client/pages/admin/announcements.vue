<template>
  <div class="page-card">
    <div class="page-header">
      <h1>公告管理</h1>
      <button class="btn-primary" @click="openCreate">+ 发布公告</button>
    </div>

    <div class="filters">
      <select v-model="filterType" @change="fetch">
        <option value="">全部类型</option>
        <option value="system">系统公告</option>
        <option value="activity">活动公告</option>
        <option value="maintenance">维护公告</option>
        <option value="notice">普通通知</option>
      </select>
      <select v-model="filterStatus" @change="fetch">
        <option value="">全部状态</option>
        <option :value="0">草稿</option>
        <option :value="1">已发布</option>
        <option :value="2">已下线</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="fetch">重试</button></div>
    <div v-else-if="!list.length" class="empty">暂无公告，点击右上角发布。</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>ID</th><th>标题</th><th>类型</th><th>级别</th><th>置顶</th><th>目标用户</th><th>状态</th><th>发布时间</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in list" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.title }}</td>
          <td><span class="status-tag">{{ typeLabel(row.type) }}</span></td>
          <td><span :class="['status-tag', levelClass(row.level)]">{{ levelLabel(row.level) }}</span></td>
          <td>{{ row.is_pinned ? '📌' : '-' }}</td>
          <td>{{ row.target_audience || '全部' }}</td>
          <td><span :class="['status-tag', statusClass(row.status)]">{{ statusLabel(row.status) }}</span></td>
          <td>{{ row.publish_time || '-' }}</td>
          <td class="actions">
            <button class="btn-text" @click="openEdit(row)">编辑</button>
            <button class="btn-text danger" @click="del(row.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="page--; fetch()">上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页 (共 {{ total }} 条)</span>
      <button :disabled="page >= totalPages" @click="page++; fetch()">下一页</button>
    </div>

    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal" style="max-width:700px">
        <h2>{{ editing ? '编辑公告' : '发布公告' }}</h2>
        <label>标题 <input v-model="form.title" class="input" /></label>
        <label>类型
          <select v-model="form.type" class="input">
            <option value="system">系统公告</option>
            <option value="activity">活动公告</option>
            <option value="maintenance">维护公告</option>
            <option value="notice">普通通知</option>
          </select>
        </label>
        <label>内容 (HTML) <textarea v-model="form.content" class="input" rows="6" /></label>
        <label>级别
          <select v-model.number="form.level" class="input">
            <option :value="1">普通</option>
            <option :value="2">重要</option>
            <option :value="3">紧急</option>
          </select>
        </label>
        <label class="checkbox-label"><input v-model.number="form.is_pinned" type="checkbox" :true-value="1" :false-value="0" /> 置顶公告</label>
        <label>目标用户
          <select v-model="form.target_audience" class="input">
            <option value="all">全部用户</option>
            <option value="new_user">新用户</option>
            <option value="vip">VIP</option>
            <option value="enterprise">企业用户</option>
          </select>
        </label>
        <label>发布时间 <input v-model="form.publish_time" class="input" type="datetime-local" /></label>
        <label>状态
          <select v-model.number="form.status" class="input">
            <option :value="0">草稿</option>
            <option :value="1">已发布</option>
            <option :value="2">已下线</option>
          </select>
        </label>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showModal = false">取消</button>
          <button class="btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast();
const { confirm } = useConfirm();
const list = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = computed(() => Math.ceil(total.value / pageSize))
const filterType = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const form = reactive({ title: '', type: 'notice', content: '', level: 1, is_pinned: 0, target_audience: 'all', publish_time: '', status: 0 })

function typeLabel(t: string) { return { system: '系统', activity: '活动', maintenance: '维护', notice: '通知' }[t] || t }
function levelLabel(l: number) { return { 1: '普通', 2: '重要', 3: '紧急' }[l] || l }
function levelClass(l: number) { return { 1: 'tag-draft', 2: 'tag-warn', 3: 'tag-error' }[l] || '' }
function statusLabel(s: number) { return { 0: '草稿', 1: '已发布', 2: '已下线' }[s] || s }
function statusClass(s: number) { return { 0: 'tag-draft', 1: 'tag-active', 2: 'tag-offline' }[s] || '' }

async function fetch() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (filterType.value) params.set('type', filterType.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $fetch(`/api/admin/campaign/announcements?${params}`)
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: any) { error.value = e.message || '加载失败' }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; Object.assign(form, { title: '', type: 'notice', content: '', level: 1, is_pinned: 0, target_audience: 'all', publish_time: '', status: 0 }); showModal.value = true }
function openEdit(row: any) { editing.value = row; Object.assign(form, { ...row, is_pinned: row.is_pinned || 0 }); showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/campaign/announcements/${editing.value.id}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/api/admin/campaign/announcements', { method: 'POST', body: form })
    }
    showModal.value = false
    fetch()
  } catch (e: any) { toast.error(e.message || '保存失败') }
  finally { saving.value = false }
}

async function del(id: number) {
  if (!(await confirm({ message: '确认删除此公告？', title: '此操作不可撤销' }))) return
  try {
    await $fetch(`/api/admin/campaign/announcements/${id}`, { method: 'DELETE' })
    fetch()
  } catch (e: any) { toast.error(e.message || '删除失败') }
}

onMounted(fetch)
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
</script>
