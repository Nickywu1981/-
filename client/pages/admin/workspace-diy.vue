<!--
  Movio AI — 管理后台 · 工作台 DIY 编辑器
  编辑用户端工作台五大导航 + 创作类模块卡片 + AI助手/工作流预留模块
-->
<template>
  <AdminLayout>
    <div class="diy-container">
      <header class="diy-header">
        <h2>🛠 工作台 DIY 编辑器</h2>
        <p>编辑用户端工作台导航菜单、功能卡片、预留模块。修改即时生效。</p>
        <div class="diy-actions">
          <el-button type="primary" @click="saveAll" :loading="saving">💾 保存全部</el-button>
          <el-button @click="loadAll" :loading="loading">🔄 重新加载</el-button>
          <el-button @click="previewVisible = !previewVisible" type="info" plain>
            {{ previewVisible ? '❌ 关闭预览' : '👁 预览' }}
          </el-button>
        </div>
      </header>

      <!-- 预览面板 -->
      <el-collapse-transition>
        <div v-if="previewVisible" class="preview-panel">
          <el-alert type="success" :closable="false" show-icon>
            <template #title>用户端实际展示效果预览</template>
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
        <el-tab-pane label="🏠 顶级导航" name="nav">
          <el-alert type="warning" :closable="false" show-icon style="margin-bottom:16px">
            <template #title>五大固定类目 — 不可增减大类，只可调整顺序/图标/标签/启用状态</template>
          </el-alert>
          <div v-if="!navItems.length && !loading" class="empty-hint">
            <p>暂无导航数据</p>
            <el-button size="small" @click="resetKey('workspace_nav')">恢复默认</el-button>
          </div>
          <draggable v-else v-model="navItems" item-key="path" handle=".drag-handle" @end="navChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" style="width:60px" @change="navChanged = true" />
                <el-input v-model="element.label" size="small" style="width:100px" @change="navChanged = true" />
                <el-input v-model="element.path" size="small" style="width:180px" @change="navChanged = true" />
                <el-switch v-model="element.disabled" size="small" active-text="预留" inactive-text="启用"
                  :active-value="true" :inactive-value="false" @change="navChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="navItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_nav')">↩ 恢复默认</el-button>
          </div>
        </el-tab-pane>

        <!-- ═══ 创作类模块卡片 ═══ -->
        <el-tab-pane label="🎨 创作类卡片" name="cards">
          <el-alert type="info" :closable="false" show-icon style="margin-bottom:16px">
            <template #title>创作类功能卡片 — 控制显示/隐藏、排序、标题、描述、跳转路由</template>
          </el-alert>
          <div v-if="!cardItems.length && !loading" class="empty-hint">
            <p>暂无卡片数据</p>
            <el-button size="small" @click="resetKey('workspace_cards')">恢复默认</el-button>
          </div>
          <draggable v-else v-model="cardItems" item-key="id" handle=".drag-handle" @end="cardsChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row" :class="{ hidden: !element.visible }">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" style="width:50px" @change="cardsChanged = true" />
                <el-input v-model="element.title" size="small" style="width:130px" @change="cardsChanged = true" />
                <el-input v-model="element.desc" size="small" style="width:240px" @change="cardsChanged = true" />
                <el-input v-model="element.route" size="small" style="width:160px" @change="cardsChanged = true" />
                <el-switch v-model="element.visible" size="small" @change="cardsChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="cardItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_cards')">↩ 恢复默认</el-button>
          </div>
        </el-tab-pane>

        <!-- ═══ AI 助手预留 ═══ -->
        <el-tab-pane label="🤖 AI 助手 (预留)" name="assistant">
          <el-alert type="warning" :closable="false" show-icon style="margin-bottom:16px">
            <template #title>AI 助手类 — 暂不开发，仅占位</template>
          </el-alert>
          <div v-if="!assistantItems.length && !loading" class="empty-hint">
            <p>暂无预留模块</p>
            <el-button size="small" @click="resetKey('workspace_assistant')">恢复默认</el-button>
          </div>
          <draggable v-else v-model="assistantItems" item-key="id" handle=".drag-handle" @end="assistantChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row dimmed">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" style="width:50px" @change="assistantChanged = true" />
                <el-input v-model="element.title" size="small" style="width:160px" @change="assistantChanged = true" />
                <el-input v-model="element.desc" size="small" style="width:280px" @change="assistantChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="assistantItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_assistant')">↩ 恢复默认</el-button>
          </div>
        </el-tab-pane>

        <!-- ═══ 工作流预留 ═══ -->
        <el-tab-pane label="⚙ 工作流 (预留)" name="workflow">
          <el-alert type="warning" :closable="false" show-icon style="margin-bottom:16px">
            <template #title>工作流类 — 暂不开发，仅占位</template>
          </el-alert>
          <div v-if="!workflowItems.length && !loading" class="empty-hint">
            <p>暂无预留模块</p>
            <el-button size="small" @click="resetKey('workspace_workflow')">恢复默认</el-button>
          </div>
          <draggable v-else v-model="workflowItems" item-key="id" handle=".drag-handle" @end="workflowChanged = true" animation="200">
            <template #item="{ element, index }">
              <div class="item-row dimmed">
                <span class="drag-handle">⠿</span>
                <span class="item-order">{{ index + 1 }}</span>
                <el-input v-model="element.icon" size="small" style="width:50px" @change="workflowChanged = true" />
                <el-input v-model="element.title" size="small" style="width:160px" @change="workflowChanged = true" />
                <el-input v-model="element.desc" size="small" style="width:280px" @change="workflowChanged = true" />
              </div>
            </template>
          </draggable>
          <div v-if="workflowItems.length" class="tab-footer">
            <el-button size="small" type="danger" text @click="resetKey('workspace_workflow')">↩ 恢复默认</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import draggable from 'vuedraggable'
import { useConfirm } from '~/composables/useConfirm'

const { confirm } = useConfirm()

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

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
    const res = await $fetch('/api/admin/workspace-diy')
    const d = res.data || res
    const cfg = d.config || d
    navItems.value = tryParse(cfg.workspace_nav) || []
    cardItems.value = tryParse(cfg.workspace_cards) || []
    assistantItems.value = tryParse(cfg.workspace_assistant) || []
    workflowItems.value = tryParse(cfg.workspace_workflow) || []
    navChanged.value = cardsChanged.value = assistantChanged.value = workflowChanged.value = false
    ElMessage.success('配置已加载')
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '加载失败')
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
  const ok = await confirm({ title: '确认重置', message: `确定恢复「${key}」为默认值？此操作不可撤销。`, variant: 'danger' })
  if (!ok) return
  try {
    await $fetch(`/api/admin/workspace-diy/reset/${key}`, { method: 'POST' })
    ElMessage.success(`${key} 已恢复默认`)
    await loadAll()
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '重置失败')
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
      ElMessage.info('没有变更')
      saving.value = false
      return
    }
    await Promise.all(tasks)
    navChanged.value = cardsChanged.value = assistantChanged.value = workflowChanged.value = false
    ElMessage.success(`已保存 ${tasks.length} 项配置 — 用户端即时生效`)
  } catch (err: any) {
    ElMessage.error(err?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function saveKey(key: string, value: any[]) {
  await $fetch(`/api/admin/workspace-diy/${key}`, {
    method: 'PUT',
    body: { config_value: value, description: '' },
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
  color: #909399;
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
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.item-row:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
}
.item-row.hidden {
  opacity: 0.45;
}
.item-row.dimmed {
  opacity: 0.55;
  background: #f5f7fa;
}
.drag-handle {
  cursor: grab;
  font-size: 18px;
  color: #c0c4cc;
  user-select: none;
}
.drag-handle:active {
  cursor: grabbing;
}
.item-order {
  width: 22px;
  text-align: center;
  color: #909399;
  font-size: 13px;
  font-weight: 600;
}

.empty-hint {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
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
  border: 1px dashed #409eff;
  border-radius: 8px;
  background: #f0f7ff;
}
.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.preview-card {
  background: #fff;
  border: 1px solid #e4e7ed;
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
  color: #909399;
}
.preview-card code {
  font-size: 11px;
  color: #409eff;
  word-break: break-all;
}
</style>
