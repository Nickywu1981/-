<!--
  Movio AI — 管理后台 · 工作台 DIY 编辑器
  编辑用户端工作台五大导航 + 创作类模块卡片 + AI助手/工作流预留模块
-->
<template>
  <AdminLayout>
    <div class="diy-container">
      <header class="diy-header">
        <h2>{{ $t('admin_workspace_diy.page_title') }}</h2>
        <p>{{ $t('admin_workspace_diy.page_desc') }}</p>
        <div class="diy-actions">
          <el-button type="primary" @click="saveAll" :loading="saving">{{ $t('admin_workspace_diy.save_all') }}</el-button>
          <el-button @click="loadAll" :loading="loading">{{ $t('admin_workspace_diy.reload') }}</el-button>
          <el-button @click="previewVisible = !previewVisible" type="info" plain>
            {{ previewVisible ? $t('admin_workspace_diy.close_preview') : $t('admin_workspace_diy.preview') }}
          </el-button>
        </div>
      </header>

      <!-- 预览面板 -->
      <el-collapse-transition>
        <div v-if="previewVisible" class="preview-panel">
          <el-alert type="success" :closable="false" show-icon>
            <template #title>{{ $t('admin_workspace_diy.preview_title') }}</template>
          </el-alert>
          <div class="preview-grid">
            <div v-for="card in previewCards" :key="card.id" class="preview-card">
              <span class="preview-icon">{{ card.icon }}</span>
              <strong>{{ card.title }}</strong>
              <small>{{ card.desc }}</small>
              <code>{{ card.route }}</code>
            </div>
          </div>
        </div>
      </el-collapse-transition>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- ═══ 五大固定导航 ═══ -->
        <el-tab-pane :label="$t('admin_workspace_diy.tab_nav')" name="nav">
          <el-alert type="warning" :closable="false" show-icon class="tab-alert">
            <template #title>{{ $t('admin_workspace_diy.nav_alert') }}</template>
          </el-alert>
          <div v-if="!navItems.length && !loading" class="empty-hint">
            <p>{{ $t('admin_workspace_diy.no_nav_data') }}</p>
            <el-button size="small" @click="resetKey('workspace_nav')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
          <draggable v-else v-model="navItems" item-key="path" handle=".drag-handle" @end="navChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" class="w-60" @change="navChanged = true" />
                <el-input v-model="element.label" size="small" class="w-100" @change="navChanged = true" />
                <el-input v-model="element.path" size="small" class="w-180" @change="navChanged = true" />
                <el-switch v-model="element.disabled" size="small"
                  :active-text="$t('admin_workspace_diy.label_disabled')"
                  :inactive-text="$t('admin_workspace_diy.label_enabled')"
                  :active-value="true" :inactive-value="false" @change="navChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="navItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_nav')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
        </el-tab-pane>

        <!-- ═══ 创作类模块卡片 ═══ -->
        <el-tab-pane :label="$t('admin_workspace_diy.tab_cards')" name="cards">
          <el-alert type="info" :closable="false" show-icon class="tab-alert">
            <template #title>{{ $t('admin_workspace_diy.cards_alert') }}</template>
          </el-alert>
          <div v-if="!cardItems.length && !loading" class="empty-hint">
            <p>{{ $t('admin_workspace_diy.no_cards') }}</p>
            <el-button size="small" @click="resetKey('workspace_cards')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
          <draggable v-else v-model="cardItems" item-key="id" handle=".drag-handle" @end="cardsChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row" :class="{ hidden: !element.visible }">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" class="w-50" @change="cardsChanged = true" />
                <el-input v-model="element.title" size="small" class="w-130" @change="cardsChanged = true" />
                <el-input v-model="element.desc" size="small" class="w-240" @change="cardsChanged = true" />
                <el-input v-model="element.route" size="small" class="w-160" @change="cardsChanged = true" />
                <el-switch v-model="element.visible" size="small" @change="cardsChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="cardItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_cards')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
        </el-tab-pane>

        <!-- ═══ AI 助手预留 ═══ -->
        <el-tab-pane :label="$t('admin_workspace_diy.tab_ai')" name="assistant">
          <el-alert type="warning" :closable="false" show-icon class="tab-alert">
            <template #title>{{ $t('admin_workspace_diy.ai_coming') }}</template>
          </el-alert>
          <div v-if="!assistantItems.length && !loading" class="empty-hint">
            <p>{{ $t('admin_workspace_diy.no_data') }}</p>
            <el-button size="small" @click="resetKey('workspace_assistant')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
          <draggable v-else v-model="assistantItems" item-key="id" handle=".drag-handle" @end="assistantChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row dimmed">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" class="w-50" @change="assistantChanged = true" />
                <el-input v-model="element.title" size="small" class="w-160" @change="assistantChanged = true" />
                <el-input v-model="element.desc" size="small" class="w-280" @change="assistantChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="assistantItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_assistant')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
        </el-tab-pane>

        <!-- ═══ 工作流预留 ═══ -->
        <el-tab-pane :label="$t('admin_workspace_diy.tab_flow')" name="workflow">
          <el-alert type="warning" :closable="false" show-icon class="tab-alert">
            <template #title>{{ $t('admin_workspace_diy.flow_coming') }}</template>
          </el-alert>
          <div v-if="!workflowItems.length && !loading" class="empty-hint">
            <p>{{ $t('admin_workspace_diy.no_data') }}</p>
            <el-button size="small" @click="resetKey('workspace_workflow')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
          <draggable v-else v-model="workflowItems" item-key="id" handle=".drag-handle" @end="workflowChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row dimmed">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" class="w-50" @change="workflowChanged = true" />
                <el-input v-model="element.title" size="small" class="w-160" @change="workflowChanged = true" />
                <el-input v-model="element.desc" size="small" class="w-280" @change="workflowChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="workflowItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_workflow')">{{ $t('admin_workspace_diy.reset_default') }}</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ElMessage, ElButton, ElCollapseTransition, ElAlert, ElTabs, ElTabPane, ElInput, ElSwitch } from 'element-plus'
import draggable from 'vuedraggable'
import { useConfirm } from '~/composables/useConfirm'

const { t } = useI18n()
const { confirm } = useConfirm()

definePageMeta({ layout: 'platform-admin', middleware: ['auth'] })

const activeTab = ref('nav')
const loading = ref(false)
const saving = ref(false)
const previewVisible = ref(false)

const navItems = ref<any[]>([])
const cardItems = ref<any[]>([])
const assistantItems = ref<any[]>([])
const workflowItems = ref<any[]>([])

const navChanged = ref(false)
const cardsChanged = ref(false)
const assistantChanged = ref(false)
const workflowChanged = ref(false)

const previewCards = computed(() =>
  cardItems.value.filter((c) => c.visible).slice(0, 12)
)

async function loadAll() {
  loading.value = true
  try {
    const res = await $fetch('/api/admin/workspace-diy', { credentials: 'include' })
    const d = res.data || res
    const cfg = d.config || d
    navItems.value = tryParse(cfg.workspace_nav) || []
    cardItems.value = tryParse(cfg.workspace_cards) || []
    assistantItems.value = tryParse(cfg.workspace_assistant) || []
    workflowItems.value = tryParse(cfg.workspace_workflow) || []
    navChanged.value = cardsChanged.value = assistantChanged.value = workflowChanged.value = false
    ElMessage.success(t('admin_workspace_diy.loaded'))
  } catch (err: unknown) {
    ElMessage.error(err?.data?.message || t('admin_workspace_diy.load_failed'))
  } finally {
    loading.value = false
  }
}

function tryParse(v: any) {
  if (!v) return null
  if (Array.isArray(v)) return v
  try {
    const p = JSON.parse(v)
    return Array.isArray(p) ? p : null
  } catch {
    return null
  }
}

async function resetKey(key: string) {
  const ok = await confirm({
    title: t('admin_workspace_diy.confirm_reset_title'),
    message: t('admin_workspace_diy.confirm_reset_msg', { key }),
    variant: 'danger',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/workspace-diy/reset/${key}`, { method: 'POST', credentials: 'include' })
    ElMessage.success(t('admin_workspace_diy.reset_success', { key }))
    await loadAll()
  } catch (err: unknown) {
    ElMessage.error(err?.data?.message || t('admin_workspace_diy.reset_failed'))
  }
}

function dirtyMap() {
  return {
    workspace_nav: navChanged.value,
    workspace_cards: cardsChanged.value,
    workspace_assistant: assistantChanged.value,
    workspace_workflow: workflowChanged.value,
  }
}

async function saveAll() {
  saving.value = true
  try {
    const dirty = dirtyMap()
    const tasks = Object.entries(dirty)
      .filter(([, changed]) => changed)
      .map(([key]) => {
        const map: Record<string, any[]> = {
          workspace_nav: navItems.value,
          workspace_cards: cardItems.value,
          workspace_assistant: assistantItems.value,
          workspace_workflow: workflowItems.value,
        }
        return saveKey(key, map[key])
      })
    if (!tasks.length) {
      ElMessage.info(t('admin_workspace_diy.no_changes'))
      saving.value = false
      return
    }
    await Promise.all(tasks)
    navChanged.value = cardsChanged.value = assistantChanged.value = workflowChanged.value = false
    ElMessage.success(t('admin_workspace_diy.save_success_detail', { count: tasks.length }))
  } catch (err: unknown) {
    ElMessage.error(err?.data?.message || t('admin_workspace_diy.save_failed'))
  } finally {
    saving.value = false
  }
}

async function saveKey(key: string, value: any[]) {
  await $fetch(`/api/admin/workspace-diy/${key}`, {
    method: 'PUT',
    body: { config_value: value, description: '' },
    credentials: 'include',
  })
}

onMounted(loadAll)
</script>

<style scoped>
.diy-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
.diy-header {
  margin-bottom: 20px;
}
.diy-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}
.diy-header p {
  margin: 0 0 12px;
  color: var(--text-secondary, #909399);
}
.diy-actions {
  display: flex;
  gap: 10px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.item-row:hover {
  border-color: var(--brand, #409eff);
  box-shadow: 0 2px 8px rgba(91, 95, 227, 0.12);
}
.item-row.hidden {
  opacity: 0.45;
}
.item-row.dimmed {
  opacity: 0.55;
  background: var(--fill-color-light, #f5f7fa);
}
.drag-handle {
  cursor: grab;
  font-size: 18px;
  color: var(--border-color, #c0c4cc);
  user-select: none;
}
.drag-handle:active {
  cursor: grabbing;
}
.item-order {
  width: 22px;
  text-align: center;
  color: var(--text-secondary, #909399);
  font-size: 13px;
  font-weight: 600;
}

.empty-hint {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary, #909399);
}
.empty-hint p {
  margin: 0 0 12px;
}

.tab-footer {
  margin-top: 12px;
  text-align: right;
}

.preview-panel {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px dashed var(--brand, #409eff);
  border-radius: 8px;
  background: var(--color-brand-50, #f0f7ff);
}
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.preview-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.preview-icon {
  font-size: 20px;
}
.preview-card strong {
  font-size: 14px;
}
.preview-card small {
  font-size: 12px;
  color: var(--text-secondary, #909399);
}
.preview-card code {
  font-size: 11px;
  color: var(--brand, #409eff);
  word-break: break-all;
}

.tab-alert { margin-bottom: 16px; }
.w-50  { width: 50px; }
.w-60  { width: 60px; }
.w-100 { width: 100px; }
.w-130 { width: 130px; }
.w-160 { width: 160px; }
.w-180 { width: 180px; }
.w-240 { width: 240px; }
.w-280 { width: 280px; }
</style>
