<!--
  DataTable — 表格四合一组价
  封装: el-table + 搜索栏 + Pagination + EmptyState + LoadingSkeleton
  Props: columns / data / loading / total / page / pageSize / searchPlaceholder
  Events: @search / @page-change / @row-click
-->
<template>
  <div class="data-table-wrapper">
    <!-- 搜索 + 操作栏 -->
    <div v-if="searchable || $slots.toolbar" class="dt-toolbar">
      <div v-if="searchable" class="dt-search">
        <input
          v-model="searchText"
          :placeholder="searchPlaceholder || '搜索...'"
          class="dt-search-input"
          @input="emitSearch"
        />
      </div>
      <div v-if="$slots.toolbar" class="dt-actions">
        <slot name="toolbar" />
      </div>
    </div>

    <!-- 表格 -->
    <LoadingSkeleton v-if="loading" :rows="5" />
    <EmptyState v-else-if="!data.length" :description="emptyText" />
    <div v-else class="dt-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key" :style="{ width: col.width, textAlign: col.align || 'left' }">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in data" :key="row.id || idx" @click="$emit('row-click', row)" :class="{ 'dt-clickable': $attrs.onRowClick }">
            <td v-for="col in columns" :key="col.key" :style="{ textAlign: col.align || 'left' }">
              <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="dt-pagination">
      <Pagination
        :total="total"
        :page="page"
        :page-size="pageSize"
        @change="$emit('page-change', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  columns: { key: string; label: string; width?: string; align?: string }[]
  data: any[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  emptyText?: string
}>(), {
  loading: false,
  total: 0,
  page: 1,
  pageSize: 20,
  searchable: false,
  emptyText: '暂无数据',
})

const emit = defineEmits<{
  search: [query: string]
  'page-change': [page: number]
  'row-click': [row: any]
}>()

const searchText = ref('')
let debounceTimer: ReturnType<typeof setTimeout>

function emitSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('search', searchText.value)
  }, 300)
}
</script>

<style scoped>
.data-table-wrapper { background: #fff; border-radius: 8px; }
.dt-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; gap: 12px; flex-wrap: wrap; }
.dt-search-input { padding: 6px 12px; border: 1px solid #dcdfe6; border-radius: 6px; font-size: 13px; width: 220px; outline: none; }
.dt-search-input:focus { border-color: #409eff; }
.dt-table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { padding: 12px 16px; text-align: left; font-weight: 600; color: #909399; border-bottom: 1px solid #ebeef5; white-space: nowrap; }
.data-table td { padding: 12px 16px; border-bottom: 1px solid #f2f2f2; color: #303133; }
.data-table tbody tr:hover { background: #f5f7fa; }
.dt-pagination { display: flex; justify-content: flex-end; padding: 16px 0 0; }
.dt-clickable { cursor: pointer; }
.dt-clickable:hover { background: #f5f7fa; }
</style>
