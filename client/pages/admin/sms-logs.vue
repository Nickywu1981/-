<template>
  <AdminLayout>
    <h2 class="ptitle">短信发送日志</h2>
    <div class="filters">
      <input v-model="phone" type="text" placeholder="手机号" @keyup.enter="fetch" />
      <select v-model="result" @change="fetch">
        <option value="">全部结果</option>
        <option value="1">发送成功</option>
        <option value="0">发送失败</option>
      </select>
      <input v-model="startDate" type="date" @change="fetch" />
      <input v-model="endDate" type="date" @change="fetch" />
      <button @click="fetch">搜索</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="7" />

    <template v-else-if="list.length">
    <div class="table-wrap">
    <table class="table">
      <thead><tr>
        <th>ID</th><th>模板编码</th><th>手机号</th><th>内容</th><th>结果</th><th>服务商</th><th>时间</th>
      </tr></thead>
      <tbody>
        <tr v-for="l in list" :key="l.id">
          <td>{{ l.id }}</td>
          <td class="mono">{{ l.template_code }}</td>
          <td>{{ maskPhone(l.phone) }}</td>
          <td class="content-cell">{{ l.content }}</td>
          <td><span class="badge" :class="l.result ? 'ok' : 'fail'">{{ l.result ? '成功' : '失败' }}</span></td>
          <td>{{ l.provider }}</td>
          <td class="time">{{ l.create_time }}</td>
        </tr>
      </tbody>
    </table>
    </div>
    <Pagination :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
    </template>
    <div v-else-if="!loading" class="empty">暂无发送日志</div>
  </AdminLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 30
const phone = ref('')
const result = ref('')
const startDate = ref('')
const endDate = ref('')
const loading = ref(true)
const toast = useToast()

function maskPhone(p: string) {
  if (!p || p.length < 7) return p
  return p.slice(0, 3) + '****' + p.slice(-4)
}

async function fetch() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/sms/logs', {
      params: { page: page.value, pageSize, phone: phone.value, result: result.value, startDate: startDate.value, endDate: endDate.value },
    })
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e: any) { toast.error('加载失败') } finally { loading.value = false }
}
function onPageChange(p: number) { page.value = p; fetch() }
onMounted(fetch)
</script>

<style scoped>
.ptitle { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters input, .filters select { padding: 8px 12px; border: 1px solid var(--input-border); border-radius: var(--radius-md); font-size: 13px; background: var(--bg-input); color: var(--text-primary); outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.filters input:focus, .filters select:focus { border-color: var(--input-focus-border); box-shadow: var(--focus-ring); }
.filters button { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: var(--radius-md); cursor: pointer; white-space: nowrap; font-size: 13px; transition: opacity var(--transition-fast); }
.filters button:hover { opacity: 0.9; }
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; border-collapse: collapse; background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; white-space: nowrap; }
.table th, .table td { padding: 8px 10px; font-size: 12px; text-align: left; border-bottom: 1px solid var(--table-border); }
.table th { background: var(--table-header-bg); font-weight: 600; color: var(--text-secondary); }
tr:hover td { background: var(--table-row-hover); }
.mono { font-family: monospace; font-size: 11px; }
.content-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.time { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.badge { padding: 2px 8px; border-radius: var(--badge-radius); font-size: var(--badge-font-size); }
.badge.ok { background: var(--status-done-bg); color: var(--status-done-text); }
.badge.fail { background: var(--status-fail-bg); color: var(--status-fail-text); }
.empty { text-align: center; padding: 40px; color: var(--text-muted); }
</style>
