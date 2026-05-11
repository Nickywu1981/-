<template>
  <div class="page-card">
    <div class="page-header">
      <h1>运营活动管理</h1>
      <button class="btn-primary" @click="openCreate">+ 创建活动</button>
    </div>

    <div class="filters">
      <select v-model="filterType" @change="fetch">
        <option value="">全部类型</option>
        <option value="promotion">促销活动</option>
        <option value="coupon">优惠券活动</option>
        <option value="event">互动活动</option>
        <option value="announcement">通知活动</option>
      </select>
      <select v-model="filterStatus" @change="fetch">
        <option value="">全部状态</option>
        <option :value="0">草稿</option>
        <option :value="1">进行中</option>
        <option :value="2">已结束</option>
        <option :value="3">已下线</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="fetch">重试</button></div>
    <div v-else-if="!list.length" class="empty">暂无运营活动，点击右上角创建。</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>ID</th><th>标题</th><th>类型</th><th>状态</th><th>目标用户</th><th>开始时间</th><th>结束时间</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in list" :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.title }}</td>
          <td><span class="status-tag">{{ typeLabel(row.type) }}</span></td>
          <td><span :class="['status-tag', statusClass(row.status)]">{{ statusLabel(row.status) }}</span></td>
          <td>{{ row.target_audience || '全部' }}</td>
          <td>{{ row.start_time || '-' }}</td>
          <td>{{ row.end_time || '-' }}</td>
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

    <!-- Modal -->
    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal">
        <h2>{{ editing ? '编辑活动' : '创建活动' }}</h2>
        <label>标题 <input v-model="form.title" class="input" /></label>
        <label>类型
          <select v-model="form.type" class="input">
            <option value="promotion">促销活动</option>
            <option value="coupon">优惠券活动</option>
            <option value="event">互动活动</option>
            <option value="announcement">通知活动</option>
          </select>
        </label>
        <label>描述 <textarea v-model="form.description" class="input" rows="3" /></label>
        <label>封面图 URL <input v-model="form.cover_url" class="input" /></label>
        <label>奖励类型 <input v-model="form.reward_type" class="input" placeholder="credits/coupon/points" /></label>
        <label>奖励数值 <input v-model.number="form.reward_value" class="input" type="number" /></label>
        <label>开始时间 <input v-model="form.start_time" class="input" type="datetime-local" /></label>
        <label>结束时间 <input v-model="form.end_time" class="input" type="datetime-local" /></label>
        <label>目标用户
          <select v-model="form.target_audience" class="input">
            <option value="all">全部用户</option>
            <option value="new_user">新用户</option>
            <option value="vip">VIP</option>
            <option value="enterprise">企业用户</option>
          </select>
        </label>
        <label>状态
          <select v-model.number="form.status" class="input">
            <option :value="0">草稿</option>
            <option :value="1">进行中</option>
            <option :value="2">已结束</option>
            <option :value="3">已下线</option>
          </select>
        </label>
        <label>排序 <input v-model.number="form.sort_order" class="input" type="number" /></label>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showModal = false">取消</button>
          <button class="btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from '~/composables/useConfirm';
const toast = useToast();
const confirm = useConfirm();
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
const form = reactive({ title: '', type: 'promotion', description: '', cover_url: '', reward_type: '', reward_value: 0, start_time: '', end_time: '', target_audience: 'all', status: 1, sort_order: 0 })

function typeLabel(t: string) { return { promotion: '促销', coupon: '优惠券', event: '互动', announcement: '通知' }[t] || t }
function statusLabel(s: number) { return { 0: '草稿', 1: '进行中', 2: '已结束', 3: '已下线' }[s] || s }
function statusClass(s: number) { return { 0: 'tag-draft', 1: 'tag-active', 2: 'tag-ended', 3: 'tag-offline' }[s] || '' }

async function fetch() {
  loading.value = true; error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (filterType.value) params.set('type', filterType.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res = await $fetch(`/admin/campaign/campaigns?${params}`)
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: any) { error.value = e.message || '加载失败' }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; Object.assign(form, { title: '', type: 'promotion', description: '', cover_url: '', reward_type: '', reward_value: 0, start_time: '', end_time: '', target_audience: 'all', status: 1, sort_order: 0 }); showModal.value = true }
function openEdit(row: any) { editing.value = row; Object.assign(form, row); showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/admin/campaign/campaigns/${editing.value.id}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/admin/campaign/campaigns', { method: 'POST', body: form })
    }
    showModal.value = false
    fetch()
  } catch (e: any) { toast.error(e.message || '保存失败') }
  finally { saving.value = false }
}

async function del(id: number) {
  if (!(await confirm('确认删除此活动？', '此操作不可撤销'))) return
  try {
    await $fetch(`/admin/campaign/campaigns/${id}`, { method: 'DELETE' })
    fetch()
  } catch (e: any) { toast.error(e.message || '删除失败') }
}

onMounted(fetch)
</script>
