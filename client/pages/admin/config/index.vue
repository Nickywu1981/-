<!--
  Movio AI v4.1 — Config Center Page
  G4 前端开发 | T-G4-004
  可视化配置中心: 分组树 + key-value 表单编辑 + 变更日志 + 回滚
  权限: 仅 admin + 运营
-->
<template>
  <div class="config-center">
    <div class="config-header">
      <h1>配置中心</h1>
      <p>管理全站文案、选项、模板，修改后实时生效</p>
    </div>

    <div class="config-layout">
      <!-- 左侧: 分组树 -->
      <aside class="config-sidebar">
        <div class="sidebar-search">
          <input v-model="searchQuery" type="text" maxlength="100" class="input" placeholder="搜索配置组..." />
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
          <p>请从左侧选择一个配置分组</p>
        </div>

        <template v-else>
          <!-- 操作栏 -->
          <div class="editor-toolbar">
            <h2>{{ activeGroup }}</h2>
            <div class="toolbar-actions">
              <button class="btn btn-sm" @click="showLogs = !showLogs">
                {{ showLogs ? '编辑' : '变更日志' }}
              </button>
              <button class="btn btn-sm btn-primary" :disabled="!hasChanges" @click="saveAll">
                保存全部
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
                  保存此项
                </button>
                <button
                  class="btn btn-sm btn-ghost"
                  :disabled="!isModified(item)"
                  @click="resetItem(item)"
                >
                  重置
                </button>
              </div>
              <p v-if="saveStatus[item.item_key]" class="save-status">{{ saveStatus[item.item_key] }}</p>
            </div>
          </div>

          <!-- 变更日志视图 -->
          <div v-if="showLogs" class="logs-panel">
            <div v-if="changeLogs.length === 0" class="empty-state"><p>暂无变更记录</p></div>
            <div v-for="log in changeLogs" :key="log.id" class="log-entry">
              <div class="log-meta">
                <span class="log-item">{{ log.item_key }}</span>
                <span class="log-time">{{ log.created_at }}</span>
                <span class="log-user">{{ log.changed_by_name || '系统' }}</span>
              </div>
              <div class="log-diff">
                <span class="log-old">- {{ log.old_value?.substring(0, 80) }}</span>
                <span class="log-new">+ {{ log.new_value?.substring(0, 80) }}</span>
              </div>
              <button class="btn btn-sm btn-ghost" @click="rollback(log.id)">回滚</button>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'workspace' })

const toast = useToast()
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
    const res: any = await $fetch(`${apiBase}/admin/config/groups`)
    if (res.code === 200) groups.value = res.data || []
  } catch { toast.error('加载配置分组失败') }
}

// 选择分组
async function selectGroup(groupKey: string) {
  activeGroup.value = groupKey
  showLogs.value = false
  saveStatus.value = {}
  try {
    const res: any = await $fetch(`${apiBase}/config/${groupKey}`)
    if (res.code === 200) {
      configItems.value = Object.entries(res.data || {}).map(([key, val]) => ({
        item_key: key,
        item_value: val,
        item_type: 'text',
        default_val: val,
      }))
      // 从完整数据加载 (admin API)
      const adminRes: any = await $fetch(`${apiBase}/admin/config/items/${groupKey}`)
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
  } catch { toast.error('加载配置失败') }
}

// 加载变更日志
async function loadLogs() {
  try {
    const res: any = await $fetch(`${apiBase}/admin/config/logs/${activeGroup.value}`)
    if (res.code === 200) changeLogs.value = res.data || []
  } catch { toast.error('加载变更日志失败') }
}

watch(showLogs, (v) => { if (v) loadLogs() })

// 保存单项
async function saveItem(itemKey: string) {
  try {
    const res: any = await $fetch(`${apiBase}/admin/config`, {
      method: 'POST',
      body: { group_key: activeGroup.value, item_key: itemKey, item_value: editValues.value[itemKey] },
    })
    if (res.code === 200) {
      originalValues.value[itemKey] = editValues.value[itemKey]
      saveStatus.value[itemKey] = '✓ 已保存'
      msgTimer = setTimeout(() => delete saveStatus.value[itemKey], 2000)
    } else {
      saveStatus.value[itemKey] = '✗ ' + (res.msg || '保存失败')
    }
  } catch (e: any) {
    saveStatus.value[itemKey] = '✗ ' + (e?.data?.msg || '保存失败')
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
      body: { log_id: logId },
    })
    if (res.code === 200) {
      await selectGroup(activeGroup.value)
      await loadLogs()
    }
  } catch { toast.error('回滚配置失败') }
}

onMounted(loadGroups)
onBeforeUnmount(() => { if (msgTimer) { clearTimeout(msgTimer); msgTimer = null; } })
</script>

<style scoped>
.config-center { max-width: 1400px; margin: 0 auto; }
.config-header { padding: 32px 24px 16px; }
.config-header h1 { font-size: var(--cfg-font-size-2xl); color: var(--cfg-text-primary); margin: 0 0 4px 0; }
.config-header p { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 0; }

.config-layout { display: flex; min-height: calc(100vh - 120px); }

/* Sidebar */
.config-sidebar { width: 280px; border-right: 1px solid var(--cfg-border); background: var(--cfg-bg-primary); overflow-y: auto; flex-shrink: 0; }
.sidebar-search { padding: 12px; border-bottom: 1px solid var(--cfg-border); }
.group-tree { padding: 8px; }
.group-node {
  display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px;
  border-radius: var(--cfg-radius-sm); cursor: pointer;
  transition: background var(--cfg-transition-fast);
}
.group-node:hover { background: var(--cfg-bg-tertiary); }
.group-node.active { background: var(--cfg-primary-light); }
.group-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.group-info { display: flex; flex-direction: column; min-width: 0; }
.group-name { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-primary); }
.group-key { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); font-family: var(--cfg-font-mono); }

/* Main */
.config-main { flex: 1; background: var(--cfg-bg-secondary); min-width: 0; padding: 24px; }

.editor-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.editor-toolbar h2 { font-size: var(--cfg-font-size-lg); color: var(--cfg-text-primary); margin: 0; font-family: var(--cfg-font-mono); }
.toolbar-actions { display: flex; gap: 8px; }

.editor-form { display: flex; flex-direction: column; gap: 16px; }
.config-item {
  background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border);
  border-radius: var(--cfg-radius-base); padding: 16px;
}
.config-item.modified { border-color: var(--cfg-warning); background: var(--cfg-warning-light); }
.item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.item-key { font-size: var(--cfg-font-size-sm); font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-text-primary); font-family: var(--cfg-font-mono); }
.item-type { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); background: var(--cfg-bg-tertiary); padding: 1px 6px; border-radius: 4px; }
.item-actions { display: flex; gap: 8px; margin-top: 8px; }
.save-status { font-size: var(--cfg-font-size-xs); color: var(--cfg-success); margin: 4px 0 0 0; }

/* Color picker */
.color-row { display: flex; gap: 8px; align-items: center; }
.color-picker { width: 36px; height: 36px; border: none; cursor: pointer; padding: 0; border-radius: var(--cfg-radius-sm); }
.color-text { flex: 1; }

/* Switch */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--cfg-border); border-radius: 24px; transition: background var(--cfg-transition-fast);
}
.switch-slider::before {
  content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px;
  background: #fff; border-radius: 50%; transition: transform var(--cfg-transition-fast);
}
.switch input:checked + .switch-slider { background: var(--cfg-primary); }
.switch input:checked + .switch-slider::before { transform: translateX(20px); }

/* Logs */
.logs-panel { display: flex; flex-direction: column; gap: 8px; }
.log-entry { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-base); padding: 12px 16px; }
.log-meta { display: flex; gap: 12px; margin-bottom: 6px; }
.log-item { font-weight: var(--cfg-font-weight-semibold); color: var(--cfg-text-primary); font-family: var(--cfg-font-mono); }
.log-time { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.log-user { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); }
.log-diff { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; }
.log-old { color: var(--cfg-error); font-family: var(--cfg-font-mono); font-size: var(--cfg-font-size-xs); }
.log-new { color: var(--cfg-success); font-family: var(--cfg-font-mono); font-size: var(--cfg-font-size-xs); }

.font-mono { font-family: var(--cfg-font-mono, monospace); font-size: var(--cfg-font-size-sm); }

@media (max-width: 768px) {
  .config-layout { flex-direction: column; }
  .config-sidebar { width: 100%; max-height: 200px; border-right: none; border-bottom: 1px solid var(--cfg-border); }
}
</style>
