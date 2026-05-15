<!--
  Movio AI v4.1 -- Config Center Page
  G4 前端开发 | T-G4-004
  可视化配置中心: 分组树 + key-value 表单编辑 + 变更日志 + 回滚
  权限: 仅 admin + 运营
-->
<template>
  <div class="config-center">
    <div class="config-header">
      <h1>{{ $t('admin_config.page_title') }}</h1>
      <p>{{ $t('admin_config.page_desc') }}</p>
    </div>

    <div class="config-layout">
      <!-- 左侧: 分组树 -->
      <aside class="config-sidebar">
        <div class="sidebar-search">
          <input v-model="searchQuery" type="text" maxlength="100" class="input" :placeholder="$t('admin_config.search_placeholder')" />
        </div>
        <div class="group-tree">
          <div
            v-for="group in filteredGroups"
            :key="group.group_key"
            class="group-node"
            :class="{ active: activeGroup === group.group_key }"
            @click="selectGroup(group.group_key)"
          >
            <span class="group-icon">{{ group.parent_key ? '└' : '📁' }}</span>
            <div class="group-info">
              <span class="group-name">{{ group.group_name }}</span>
              <span class="group-key">{{ group.group_key }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧: 编辑面板 -->
      <main class="config-main">
        <div v-if="!activeGroup" class="empty-state">
          <p>{{ $t('admin_config.select_group_hint') }}</p>
        </div>

        <template v-else>
          <!-- 操作栏 -->
          <div class="editor-toolbar">
            <h2>{{ activeGroup }}</h2>
            <div class="toolbar-actions">
              <button class="btn btn-sm" @click="showLogs = !showLogs">
                {{ showLogs ? $t('admin_config.edit') : $t('admin_config.change_logs') }}
              </button>
              <button class="btn btn-sm btn-primary" :disabled="!hasChanges" @click="saveAll">
                {{ $t('admin_config.save_all') }}
              </button>
            </div>
          </div>

          <!-- 编辑视图 -->
          <div v-if="!showLogs" class="editor-form">
            <div
              v-for="item in configItems"
              :key="item.item_key"
              class="config-item"
              :class="{ modified: isModified(item) }"
            >
              <div class="item-header">
                <label class="item-key">{{ item.item_key }}</label>
                <span class="item-type">{{ item.item_type }}</span>
              </div>

              <!-- text -->
              <input
                v-if="item.item_type === 'text' || item.item_type === 'url'"
                v-model="editValues[item.item_key]"
                type="text"
                maxlength="2000"
                class="input"
                :placeholder="item.placeholder || item.default_val"
              />

              <!-- textarea -->
              <textarea
                v-else-if="item.item_type === 'textarea'"
                v-model="editValues[item.item_key]"
                class="input"
                maxlength="5000"
                rows="3"
                :placeholder="item.placeholder || item.default_val"
              ></textarea>

              <!-- number -->
              <input
                v-else-if="item.item_type === 'number'"
                v-model.number="editValues[item.item_key]"
                type="number"
                class="input"
              />

              <!-- boolean -->
              <label v-else-if="item.item_type === 'boolean'" class="switch">
                <input v-model="editValues[item.item_key]" type="checkbox" />
                <span class="switch-slider"></span>
              </label>

              <!-- color -->
              <div v-else-if="item.item_type === 'color'" class="color-row">
                <input v-model="editValues[item.item_key]" type="color" class="color-picker" />
                <input v-model="editValues[item.item_key]" type="text" class="input color-text" />
              </div>

              <!-- json -->
              <textarea
                v-else-if="item.item_type === 'json'"
                v-model="editValues[item.item_key]"
                class="input font-mono"
                rows="4"
              ></textarea>

              <!-- default -->
              <input v-else v-model="editValues[item.item_key]" type="text" class="input" />

              <div class="item-actions">
                <button
                  class="btn btn-sm btn-ghost"
                  :disabled="!isModified(item)"
                  @click="saveItem(item.item_key)"
                >
                  {{ $t('admin_config.save_item') }}
                </button>
                <button
                  class="btn btn-sm btn-ghost"
                  :disabled="!isModified(item)"
                  @click="resetItem(item)"
                >
                  {{ $t('admin_config.reset') }}
                </button>
              </div>
              <p v-if="saveStatus[item.item_key]" class="save-status">{{ saveStatus[item.item_key] }}</p>
            </div>
          </div>

          <!-- 变更日志视图 -->
          <div v-if="showLogs" class="logs-panel">
            <div v-if="changeLogs.length === 0" class="empty-state"><p>{{ $t('admin_config.empty_logs') }}</p></div>
            <div v-for="log in changeLogs" :key="log.id" class="log-entry">
              <div class="log-meta">
                <span class="log-item">{{ log.item_key }}</span>
                <span class="log-time">{{ log.created_at }}</span>
                <span class="log-user">{{ log.changed_by_name || $t('admin_config.system') }}</span>
              </div>
              <div class="log-diff">
                <span class="log-old">- {{ log.old_value?.substring(0, 80) }}</span>
                <span class="log-new">+ {{ log.new_value?.substring(0, 80) }}</span>
              </div>
              <button class="btn btn-sm btn-ghost" @click="rollback(log.id)">{{ $t('admin_config.rollback') }}</button>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'

definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })

const { t } = useI18n()
const apiBase = '/api'

// 分组
const groups = ref<any[]>([])
const activeGroup = ref('')
const searchQuery = ref('')

const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value
  const q = searchQuery.value.toLowerCase()
  return groups.value.filter((g: any) =>
    g.group_name.toLowerCase().includes(q) || g.group_key.toLowerCase().includes(q)
  )
})

// 配置项
const configItems = ref<any[]>([])
const editValues = ref<Record<string, any>>({})
const originalValues = ref<Record<string, any>>({})
const saveStatus = ref<Record<string, string>>({})
let msgTimer: ReturnType<typeof setTimeout> | null = null
const hasChanges = computed(() =>
  configItems.value.some(item => isModified(item))
)

function isModified(item: any) {
  return editValues.value[item.item_key] !== originalValues.value[item.item_key]
}

// 变更日志
const showLogs = ref(false)
const changeLogs = ref<any[]>([])

// 加载分组列表
async function loadGroups() {
  try {
    const res: any = await $fetch(`${apiBase}/admin/config/groups`, { credentials: 'include' })
    if (res.code === 200) groups.value = res.data || []
  } catch { ElMessage.error(t('admin_config.load_groups_failed')) }
}

// 选择分组
async function selectGroup(groupKey: string) {
  activeGroup.value = groupKey
  showLogs.value = false
  saveStatus.value = {}
  try {
    const res: any = await $fetch(`${apiBase}/config/${groupKey}`, { credentials: 'include' })
    if (res.code === 200) {
      configItems.value = Object.entries(res.data || {}).map(([key, val]) => ({
        item_key: key,
        item_value: val,
        item_type: 'text',
        default_val: val,
      }))
      // 从完整数据加载 (admin API)
      const adminRes: any = await $fetch(`${apiBase}/admin/config/items/${groupKey}`, { credentials: 'include' })
      if (adminRes.code === 200 && adminRes.data) {
        configItems.value = adminRes.data || []
      }
      // 初始化编辑值
      const vals: Record<string, any> = {}
      const orig: Record<string, any> = {}
      for (const item of configItems.value) {
        vals[item.item_key] = item.item_value ?? item.default_val ?? ''
        orig[item.item_key] = item.item_value ?? item.default_val ?? ''
      }
      editValues.value = vals
      originalValues.value = orig
    }
  } catch { ElMessage.error(t('admin_config.load_failed')) }
}

// 加载变更日志
async function loadLogs() {
  try {
    const res: any = await $fetch(`${apiBase}/admin/config/logs/${activeGroup.value}`, { credentials: 'include' })
    if (res.code === 200) changeLogs.value = res.data || []
  } catch { ElMessage.error(t('admin_config.load_logs_failed')) }
}

watch(showLogs, (v) => { if (v) loadLogs() })

// 保存单项
async function saveItem(itemKey: string) {
  try {
    const res: any = await $fetch(`${apiBase}/admin/config`, {
      method: 'POST',
      credentials: 'include',
      body: { group_key: activeGroup.value, item_key: itemKey, item_value: editValues.value[itemKey] },
    })
    if (res.code === 200) {
      originalValues.value[itemKey] = editValues.value[itemKey]
      saveStatus.value[itemKey] = '\u2713 ' + t('admin_config.saved')
      msgTimer = setTimeout(() => delete saveStatus.value[itemKey], 2000)
    } else {
      saveStatus.value[itemKey] = '\u2717 ' + (res.msg || t('admin_config.save_failed'))
    }
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string };
    saveStatus.value[itemKey] = '\u2717 ' + (err?.data?.msg || t('admin_config.save_failed'))
  }
}

// 保存全部
async function saveAll() {
  for (const item of configItems.value) {
    if (isModified(item)) await saveItem(item.item_key)
  }
}

// 重置单项
function resetItem(item: any) {
  editValues.value[item.item_key] = originalValues.value[item.item_key]
}

// 回滚
async function rollback(logId: number) {
  try {
    const res: any = await $fetch(`${apiBase}/admin/config/rollback`, {
      method: 'POST',
      credentials: 'include',
      body: { log_id: logId },
    })
    if (res.code === 200) {
      await selectGroup(activeGroup.value)
      await loadLogs()
    }
  } catch { ElMessage.error(t('admin_config.rollback_failed')) }
}

onMounted(loadGroups)
onBeforeUnmount(() => { if (msgTimer) { clearTimeout(msgTimer); msgTimer = null; } })
</script>

<style scoped>
.config-center { max-width: 1400px; margin: 0 auto; }
.config-header { padding: 32px 24px 16px; }
.config-header h1 { font-size: var(--text-2xl, 1.5rem)); color: var(--text-primary, #1f2937)); margin: 0 0 4px 0; }
.config-header p { font-size: var(--text-sm, 0.875rem)); color: var(--text-muted, #9ca3af)); margin: 0; }

.config-layout { display: flex; min-height: calc(100vh - 120px); }

/* Sidebar */
.config-sidebar { width: 280px; border-right: 1px solid var(--border-color, #e5e7eb)); background: var(--bg-card, #ffffff)); overflow-y: auto; flex-shrink: 0; }
.sidebar-search { padding: 12px; border-bottom: 1px solid var(--border-color, #e5e7eb)); }
.group-tree { padding: 8px; }
.group-node {
  display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px;
  border-radius: var(--radius-sm, 4px)); cursor: pointer;
  transition: background var(--transition-fast, 0.15s ease));
}
.group-node:hover { background: var(--bg-tertiary, #f3f4f6)); }
.group-node.active { background: var(--brand, #5b5fe3)-light); }
.group-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.group-info { display: flex; flex-direction: column; min-width: 0; }
.group-name { font-size: var(--text-sm, 0.875rem)); color: var(--text-primary, #1f2937)); }
.group-key { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); font-family: var(--font-mono, monospace)); }

/* Main */
.config-main { flex: 1; background: var(--bg-secondary, #f9fafb)); min-width: 0; padding: 24px; }

.editor-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.editor-toolbar h2 { font-size: var(--text-lg, 1.125rem)); color: var(--text-primary, #1f2937)); margin: 0; font-family: var(--font-mono, monospace)); }
.toolbar-actions { display: flex; gap: 8px; }

.editor-form { display: flex; flex-direction: column; gap: 16px; }
.config-item {
  background: var(--bg-card, #ffffff)); border: 1px solid var(--border-color, #e5e7eb));
  border-radius: var(--radius-md, 8px)); padding: 16px;
}
.config-item.modified { border-color: var(--warning, #f59e0b)); background: var(--warning-light, #fffbeb)); }
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.item-key { font-size: var(--text-sm, 0.875rem)); font-weight: 600); color: var(--text-primary, #1f2937)); font-family: var(--font-mono, monospace)); }
.item-type { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); background: var(--bg-tertiary, #f3f4f6)); padding: 1px 6px; border-radius: 4px; }
.item-actions { display: flex; gap: 8px; margin-top: 8px; }
.save-status { font-size: var(--text-xs, 0.75rem)); color: var(--success, #10b981)); margin: 4px 0 0 0; }

/* Color picker */
.color-row { display: flex; gap: 8px; align-items: center; }
.color-picker { width: 36px; height: 36px; border: none; cursor: pointer; padding: 0; border-radius: var(--radius-sm, 4px)); }
.color-text { flex: 1; }

/* Switch */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--border-color, #e5e7eb)); border-radius: 24px; transition: background var(--transition-fast, 0.15s ease));
}
.switch-slider::before {
  content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px;
  background: var(--bg-card); border-radius: 50%; transition: transform var(--transition-fast, 0.15s ease));
}
.switch input:checked + .switch-slider { background: var(--brand, #5b5fe3)); }
.switch input:checked + .switch-slider::before { transform: translateX(20px); }

/* Logs */
.logs-panel { display: flex; flex-direction: column; gap: 8px; }
.log-entry { background: var(--bg-card, #ffffff)); border: 1px solid var(--border-color, #e5e7eb)); border-radius: var(--radius-md, 8px)); padding: 12px 16px; }
.log-meta { display: flex; gap: 12px; margin-bottom: 6px; }
.log-item { font-weight: 600); color: var(--text-primary, #1f2937)); font-family: var(--font-mono, monospace)); }
.log-time { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); }
.log-user { font-size: var(--text-xs, 0.75rem)); color: var(--text-muted, #9ca3af)); }
.log-diff { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; }
.log-old { color: var(--danger, #ef4444)); font-family: var(--font-mono, monospace)); font-size: var(--text-xs, 0.75rem)); }
.log-new { color: var(--success, #10b981)); font-family: var(--font-mono, monospace)); font-size: var(--text-xs, 0.75rem)); }

.font-mono { font-family: var(--font-mono, monospace), monospace); font-size: var(--text-sm, 0.875rem)); }

@media (max-width: 768px) {
  .config-layout { flex-direction: column; }
  .config-sidebar { width: 100%; max-height: 200px; border-right: none; border-bottom: 1px solid var(--border-color, #e5e7eb)); }
}
</style>
