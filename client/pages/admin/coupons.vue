<template>
  <div class="page-card">
    <div class="page-header">
      <h1>优惠券管理</h1>
      <button class="btn-primary" @click="openCreate">+ 创建优惠券</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error-msg">{{ error }} <button class="btn-text" @click="fetch">重试</button></div>
    <div v-else-if="!list.length" class="empty">暂无优惠券，点击右上角创建。</div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>ID</th><th>编码</th><th>名称</th><th>类型</th><th>优惠值</th><th>最低订单额</th><th>已用/总量</th><th>状态</th><th>有效期</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in list" :key="row.id">
          <td>{{ row.id }}</td>
          <td><code>{{ row.code }}</code></td>
          <td>{{ row.name }}</td>
          <td><span class="status-tag">{{ row.type === 'fixed' ? '固定金额' : '百分比' }}</span></td>
          <td>{{ row.type === 'fixed' ? '¥' + row.value : row.value + '%' }}</td>
          <td>{{ row.min_order_amount ? '¥' + row.min_order_amount : '-' }}</td>
          <td>{{ row.used_quantity }} / {{ row.total_quantity || '∞' }}</td>
          <td><span :class="['status-tag', row.status ? 'tag-active' : 'tag-offline']">{{ row.status ? '启用' : '停用' }}</span></td>
          <td>{{ row.start_time || '-' }} ~ {{ row.end_time || '-' }}</td>
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
      <div class="modal">
        <h2>{{ editing ? '编辑优惠券' : '创建优惠券' }}</h2>
        <label>优惠券编码 <input v-model="form.code" class="input" /></label>
        <label>名称 <input v-model="form.name" class="input" /></label>
        <label>类型
          <select v-model="form.type" class="input">
            <option value="fixed">固定金额 (¥)</option>
            <option value="percent">百分比折扣 (%)</option>
          </select>
        </label>
        <label>优惠值 <input v-model.number="form.value" class="input" type="number" step="0.01" /></label>
        <label>最低订单金额 <input v-model.number="form.min_order_amount" class="input" type="number" step="0.01" /></label>
        <label v-if="form.type === 'percent'">最大折扣上限 <input v-model.number="form.max_discount" class="input" type="number" step="0.01" /></label>
        <label>发放总量 (0=不限) <input v-model.number="form.total_quantity" class="input" type="number" /></label>
        <label>每人限领 <input v-model.number="form.per_user_limit" class="input" type="number" /></label>
        <label>开始时间 <input v-model="form.start_time" class="input" type="datetime-local" /></label>
        <label>结束时间 <input v-model="form.end_time" class="input" type="datetime-local" /></label>
        <label>状态
          <select v-model.number="form.status" class="input">
            <option :value="1">启用</option>
            <option :value="0">停用</option>
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
const showModal = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const form = reactive({ code: '', name: '', type: 'fixed', value: 0, min_order_amount: 0, max_discount: null as number|null, total_quantity: 0, per_user_limit: 1, start_time: '', end_time: '', status: 1 })

async function fetch() {
  loading.value = true; error.value = ''
  try {
    const res = await $fetch(`/admin/campaign/coupons?page=${page.value}&pageSize=${pageSize}`)
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: any) { error.value = e.message || '加载失败' }
  finally { loading.value = false }
}

function openCreate() { editing.value = null; Object.assign(form, { code: '', name: '', type: 'fixed', value: 0, min_order_amount: 0, max_discount: null, total_quantity: 0, per_user_limit: 1, start_time: '', end_time: '', status: 1 }); showModal.value = true }
function openEdit(row: any) { editing.value = row; Object.assign(form, row); showModal.value = true }

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/admin/campaign/coupons/${editing.value.id}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/admin/campaign/coupons', { method: 'POST', body: form })
    }
    showModal.value = false
    fetch()
  } catch (e: any) { toast.error(e.message || '保存失败') }
  finally { saving.value = false }
}

async function del(id: number) {
  if (!(await confirm({ message: '确认删除此优惠券？', title: '此操作不可撤销' }))) return
  try {
    await $fetch(`/admin/campaign/coupons/${id}`, { method: 'DELETE' })
    fetch()
  } catch (e: any) { toast.error(e.message || '删除失败') }
}

onMounted(fetch)
</script>
