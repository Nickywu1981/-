<template>
  <div class="admin-crud">
    <div class="crud-toolbar">
      <input v-if="searchable" v-model="keyword" type="text" :placeholder="searchPlaceholder" @keyup.enter="fetch" />
      <select v-if="statusOptions.length" v-model="filterStatus" class="sel" @change="fetch">
        <option value="">全部状态</option>
        <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <slot name="toolbar" />
      <button v-if="showCreate" class="btn btn-primary" @click="openCreate">{{ createLabel }}</button>
    </div>

    <LoadingSkeleton v-if="loading" type="table" :rows="5" :cols="fields.length" />

    <div v-else-if="list.length" class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th v-for="f in fields" :key="f.key">{{ f.label }}</th>
            <th v-if="hasActions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in list" :key="row.id">
            <td v-for="f in fields" :key="f.key" :class="f.mono ? 'mono' : ''">
              <span v-if="f.type === 'badge'" class="badge" :class="f.badgeClass?.(row) || ''">{{ f.render?.(row) || row[f.key] }}</span>
              <span v-else-if="f.type === 'status'" class="status-dot" :class="row[f.key] === 1 ? 'on' : 'off'" />{{ f.render?.(row) || (row[f.key] === 1 ? '启用' : '停用') }}
              <span v-else-if="f.render">{{ f.render!(row) }}</span>
              <span v-else>{{ row[f.key] ?? '-' }}</span>
            </td>
            <td v-if="hasActions" class="actions">
              <button v-if="showEdit" class="btn-sm" @click="$emit('edit', row)">编辑</button>
              <button v-if="showToggle" class="btn-sm" :class="row.status === 1 ? 'warn' : 'success'" @click="$emit('toggle', row)">{{ row.status === 1 ? '停用' : '启用' }}</button>
              <button v-if="showDelete" class="btn-sm danger" @click="$emit('delete', row)">删除</button>
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="!loading" class="empty">{{ emptyText }}</div>

    <Pagination v-if="total > pageSize" :page="page" :page-size="pageSize" :total="total" @change="onPageChange" />
  </div>
</template>

<script setup lang="ts">
interface Field {
  key: string
  label: string
  type?: 'text' | 'badge' | 'status'
  mono?: boolean
  render?: (row: any) => string
  badgeClass?: (row: any) => string
}

interface StatusOption { value: string; label: string }

const props = withDefaults(defineProps<{
  api: string
  fields: Field[]
  statusOptions?: StatusOption[]
  searchable?: boolean
  searchPlaceholder?: string
  showCreate?: boolean
  createLabel?: string
  showEdit?: boolean
  showToggle?: boolean
  showDelete?: boolean
  emptyText?: string
  perPage?: number
}>(), {
  statusOptions: () => [],
  searchable: true,
  searchPlaceholder: '搜索...',
  showCreate: true,
  createLabel: '+ 新建',
  showEdit: true,
  showToggle: false,
  showDelete: true,
  emptyText: '暂无数据',
  perPage: 20,
})

const emit = defineEmits(['create', 'edit', 'toggle', 'delete'])

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = props.perPage
const keyword = ref('')
const filterStatus = ref('')
const loading = ref(true)
const toast = useToast()

function openCreate() { emit('create') }
const hasActions = computed(() => props.showEdit || props.showToggle || props.showDelete)

async function fetch() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (keyword.value) params.set('keyword', keyword.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    const res: any = await $fetch(`${props.api}?${params}`)
    if (res?.code === 200 || res?.code === 0) {
      list.value = res.data?.list || res.data || []
      total.value = res.data?.total || list.value.length
    } else {
      list.value = res.data || []
      total.value = list.value.length
    }
  } catch (e: any) {
    const { $toast } = useNuxtApp()
    $toast?.warn('数据加载失败，请稍后再试')
    console.warn('[AdminCrudTable] fetch failed', props.api, e.message)
  }
  loading.value = false
}

function onPageChange(p: number) { page.value = p; fetch() }
function search() { page.value = 1; fetch() }

onMounted(fetch)
defineExpose({ fetch, list, total, page })
</script>

<style scoped>
.crud-toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.crud-toolbar input { flex:1; min-width:140px; max-width:260px; padding:8px 12px; border:1px solid var(--input-border); border-radius:var(--radius-sm); font-size:13px; background:var(--bg-input); color:var(--text-primary); outline:none; transition:border-color var(--transition-fast),box-shadow var(--transition-fast); }
.crud-toolbar input:focus { border-color:var(--input-focus-border); box-shadow:var(--focus-ring); }
.sel { padding:8px 12px; border:1px solid var(--input-border); border-radius:var(--radius-sm); font-size:13px; background:var(--bg-card); color:var(--text-primary); outline:none; transition:border-color var(--transition-fast); }
.sel:focus { border-color:var(--input-focus-border); }
.btn { padding:8px 16px; border:1px solid var(--input-border); border-radius:var(--radius-sm); background:var(--bg-card); color:var(--text-primary); cursor:pointer; font-size:13px; transition:border-color var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast); }
.btn:hover { border-color:var(--brand); color:var(--brand); }
.btn-primary { background:var(--brand); color:var(--text-on-brand); border-color:var(--brand); }
.btn-primary:hover { opacity:0.9; color:var(--text-on-brand); }
.table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
.table { width:100%; border-collapse:collapse; background:var(--bg-card); border-radius:var(--radius-lg); overflow:hidden; }
.table th, .table td { padding:10px 12px; border-bottom:1px solid var(--table-border); text-align:left; font-size:13px; }
.table th { background:var(--table-header-bg); font-weight:600; color:var(--text-secondary); white-space:nowrap; }
tr:hover td { background:var(--table-row-hover); }
.mono { font-family:monospace; font-size:12px; }
.status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }
.status-dot.on { background:var(--success); }
.status-dot.off { background:var(--text-muted); }
.badge { padding:2px 8px; border-radius:var(--badge-radius); font-size:11px; font-weight:600; }
.actions { display:flex; gap:6px; white-space:nowrap; }
.btn-sm { padding:4px 10px; font-size:12px; border:1px solid var(--input-border); border-radius:var(--radius-xs); cursor:pointer; background:var(--bg-card); color:var(--text-primary); transition:border-color var(--transition-fast), color var(--transition-fast); }
.btn-sm:hover { border-color:var(--brand); color:var(--brand); }
.btn-sm.success { background:var(--success); color:var(--text-on-brand); border-color:var(--success); }
.btn-sm.warn { background:var(--warning); color:var(--text-on-brand); border-color:var(--warning); }
.btn-sm.danger { background:var(--danger); color:var(--text-on-brand); border-color:var(--danger); }
.empty { text-align:center; color:var(--text-muted); padding:60px 0; font-size:14px; }
</style>
