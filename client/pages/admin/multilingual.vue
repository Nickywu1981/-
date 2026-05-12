<template>
  <AdminLayout>
    <div class="i18n-admin">
      <div class="i18n-header">
        <h2>多语言翻译管理</h2>
        <div class="i18n-actions">
          <span class="i18n-pending" v-if="pendingCount > 0">
            {{ pendingCount }} 项待保存
          </span>
          <button class="i18n-btn primary" :disabled="saving" @click="saveAll">
            {{ saving ? '保存中...' : '保存全部' }}
          </button>
          <label class="i18n-btn">
            📥 导入 JSON
            <input type="file" accept=".json" hidden @change="handleImport" />
          </label>
          <button class="i18n-btn" @click="exportJSON">📤 导出 JSON</button>
        </div>
      </div>

      <!-- 语言切换 + 筛选 + 搜索 -->
      <div class="i18n-toolbar">
        <div class="i18n-locales">
          <button
            v-for="loc in ['zh', 'en', 'es']"
            :key="loc"
            :class="['i18n-locale-btn', { active: activeLocale === loc }]"
            @click="switchLocale(loc)"
          >{{ loc === 'zh' ? '🇨🇳 中文' : loc === 'en' ? '🇺🇸 English' : '🇪🇸 Español' }}</button>
        </div>
        <div class="i18n-filters">
          <select v-model="activeNamespace" class="i18n-select">
            <option value="">全部命名空间</option>
            <option v-for="ns in namespaces" :key="ns" :value="ns">{{ ns }}</option>
          </select>
          <div class="i18n-search">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索 key 或内容..."
              class="i18n-search-input"
              @input="doSearch"
            />
          </div>
        </div>
        <button class="i18n-btn sm" @click="showAddModal = true">+ 新增 key</button>
      </div>

      <!-- 统计 -->
      <div class="i18n-stats">
        共 {{ displayedTranslations.length }} 条翻译
      </div>

      <!-- 翻译列表 -->
      <div v-if="loading" class="i18n-loading">加载中...</div>
      <div v-else class="i18n-table-wrap">
        <table class="i18n-table">
          <thead>
            <tr>
              <th class="col-ns">命名空间</th>
              <th class="col-key">Key</th>
              <th class="col-val">翻译文本</th>
              <th class="col-act">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in displayedTranslations"
              :key="item.key"
              :class="{ 'row-editing': editingKey === item.key, 'row-deleted': pendingDelete.has(item.key) }"
            >
              <td class="col-ns"><code class="ns-tag">{{ item.namespace }}</code></td>
              <td class="col-key"><code class="key-code">{{ item.key }}</code></td>
              <td class="col-val">
                <template v-if="pendingDelete.has(item.key)">
                  <span class="deleted-mark">已标记删除</span>
                  <button class="i18n-link" @click="unmarkDelete(item.key)">撤销</button>
                </template>
                <template v-else-if="editingKey === item.key">
                  <div class="edit-row">
                    <textarea
                      ref="editTextarea"
                      v-model="editValue"
                      class="edit-textarea"
                      rows="2"
                      @keydown.escape="cancelEdit"
                      @keydown.enter.ctrl="setEditValue(item.key, editValue)"
                    ></textarea>
                    <div class="edit-actions">
                      <button class="i18n-btn sm primary" @click="setEditValue(item.key, editValue)">确认</button>
                      <button class="i18n-btn sm" @click="cancelEdit">取消</button>
                      <small>Ctrl+Enter 快捷提交</small>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span
                    class="val-text"
                    :title="item.value"
                    @dblclick="beginEdit(item)"
                  >{{ item.value }}</span>
                </template>
              </td>
              <td class="col-act">
                <template v-if="!pendingDelete.has(item.key)">
                  <button class="i18n-link" @click="beginEdit(item)">编辑</button>
                  <button class="i18n-link danger" @click="markDelete(item.key)">删除</button>
                  <button class="i18n-link" @click="showLogs(item.key)">历史</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 新增 Modal -->
      <Teleport to="body">
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
          <div class="modal-card">
            <h3>新增翻译</h3>
            <div class="modal-form">
              <label>Key (如 common.save)</label>
              <input v-model="newKey" type="text" placeholder="命名空间.key" class="modal-input" />
              <label>翻译文本</label>
              <textarea v-model="newValue" rows="3" placeholder="输入翻译内容..." class="modal-input"></textarea>
            </div>
            <div class="modal-actions">
              <button class="i18n-btn" @click="showAddModal = false">取消</button>
              <button class="i18n-btn primary" @click="addKey">确认新增</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 审计日志 Modal -->
      <Teleport to="body">
        <div v-if="showLogModal" class="modal-overlay" @click.self="showLogModal = false">
          <div class="modal-card wide">
            <h3>变更历史 — {{ logTargetKey }}</h3>
            <table v-if="auditLogs.length" class="log-table">
              <thead>
                <tr><th>时间</th><th>旧值</th><th>新值</th></tr>
              </thead>
              <tbody>
                <tr v-for="log in auditLogs" :key="log.id">
                  <td class="log-time">{{ formatTime(log.changed_at) }}</td>
                  <td class="log-old">{{ log.old_value || '(空)' }}</td>
                  <td class="log-new">{{ log.new_value || '(空)' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty-state">暂无变更记录</div>
            <div class="modal-actions">
              <button class="i18n-btn" @click="showLogModal = false">关闭</button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const {
  activeLocale, activeNamespace, searchQuery,
  translations, namespaces, loading, saving, editingKey,
  pendingChanges, pendingDelete, pendingCount,
  showAddModal, newKey, newValue,
  auditLogs, showLogModal, logTargetKey,
  displayedTranslations,
  fetch, doSearch, startEdit, cancelEdit, setEditValue,
  saveAll, markDelete, unmarkDelete, isPending,
  addKey, importJSON, showLogs,
} = useI18nAdmin()

const editValue = ref('')
const editTextarea = ref<HTMLTextAreaElement | null>(null)

function beginEdit(item: { key: string; value: string }) {
  editValue.value = pendingChanges.value.get(item.key) ?? item.value
  startEdit(item.key)
  nextTick(() => {
    const ta = editTextarea.value
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
  })
}

function switchLocale(loc: string) {
  activeLocale.value = loc
  fetch()
}

function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) importJSON(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function exportJSON() {
  try {
    const res: any = await $fetch(`/api/admin/i18n/${activeLocale.value}/export`)
    const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${activeLocale.value}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e: any) { /* ignore */ }
}

function formatTime(dt: string) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('zh-CN')
}

onMounted(() => { fetch() })
</script>

<style scoped>
.i18n-admin { display: flex; flex-direction: column; gap: 16px; padding: 24px; }
.i18n-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.i18n-header h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0; }
.i18n-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.i18n-pending { font-size: 13px; color: var(--warning, #f59e0b); font-weight: 600; }
.i18n-btn {
  padding: 8px 16px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  background: var(--bg-card); color: var(--text-secondary); font-size: 13px; cursor: pointer;
  font-family: inherit; transition: background .15s; display: inline-flex; align-items: center; gap: 4px;
}
.i18n-btn:hover { background: var(--bg-hover); }
.i18n-btn.primary { background: var(--color-brand-600); color: #fff; border-color: var(--color-brand-600); }
.i18n-btn.primary:hover { background: var(--color-brand-700); }
.i18n-btn.sm { padding: 5px 12px; font-size: 12px; }
.i18n-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.i18n-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.i18n-locales { display: flex; gap: 4px; }
.i18n-locale-btn {
  padding: 6px 14px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  background: var(--bg-card); color: var(--text-secondary); font-size: 13px; cursor: pointer;
  transition: all .15s;
}
.i18n-locale-btn.active { background: var(--color-brand-600); color: #fff; border-color: var(--color-brand-600); }
.i18n-filters { display: flex; align-items: center; gap: 8px; flex: 1; }
.i18n-select {
  padding: 6px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  background: var(--bg-card); color: var(--text-primary); font-size: 13px; outline: none;
}
.i18n-search { flex: 1; max-width: 280px; }
.i18n-search-input {
  width: 100%; padding: 6px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md);
  background: var(--bg-input); color: var(--text-primary); font-size: 13px; outline: none;
}
.i18n-search-input:focus { border-color: var(--color-brand-600); }

.i18n-stats { font-size: 13px; color: var(--text-muted); }
.i18n-loading { text-align: center; padding: 40px; color: var(--text-muted); }

.i18n-table-wrap { overflow-x: auto; border: 1px solid var(--border-light); border-radius: var(--radius-lg); }
.i18n-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.i18n-table th, .i18n-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-light); }
.i18n-table th { background: var(--bg-hover); color: var(--text-secondary); font-weight: 600; font-size: 12px; position: sticky; top: 0; }
.i18n-table tr:hover { background: var(--bg-hover); }
.i18n-table tr.row-deleted { opacity: 0.4; text-decoration: line-through; }
.ns-tag { background: var(--brand-light); color: var(--color-brand-600); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.key-code { font-size: 12px; color: var(--text-secondary); word-break: break-all; }
.val-text { display: block; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; color: var(--text-primary); }
.edit-row { display: flex; flex-direction: column; gap: 6px; }
.edit-textarea { width: 100%; padding: 8px; border: 1px solid var(--color-brand-600); border-radius: 6px; font-size: 13px; resize: vertical; font-family: inherit; background: var(--bg-card); color: var(--text-primary); }
.edit-actions { display: flex; align-items: center; gap: 6px; }
.edit-actions small { color: var(--text-muted); font-size: 11px; }
.deleted-mark { color: var(--danger, #ef4444); font-weight: 500; }
.i18n-link { background: none; border: none; color: var(--color-brand-600); cursor: pointer; font-size: 12px; padding: 2px 4px; font-family: inherit; }
.i18n-link:hover { text-decoration: underline; }
.i18n-link.danger { color: var(--danger, #ef4444); }
.col-ns { width: 100px; }
.col-key { width: 180px; }
.col-act { width: 120px; white-space: nowrap; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 500; display: flex; align-items: center; justify-content: center; }
.modal-card { background: var(--bg-card); border-radius: var(--radius-xl); padding: 28px; min-width: 400px; max-width: 90vw; box-shadow: var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.2)); }
.modal-card.wide { min-width: 600px; }
.modal-card h3 { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
.modal-form { display: flex; flex-direction: column; gap: 10px; }
.modal-form label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.modal-input { padding: 8px 12px; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 13px; font-family: inherit; background: var(--bg-input); color: var(--text-primary); outline: none; width: 100%; box-sizing: border-box; }
.modal-input:focus { border-color: var(--color-brand-600); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

.log-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
.log-table th, .log-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border-light); }
.log-time { white-space: nowrap; color: var(--text-muted); }
.log-old { color: var(--danger, #ef4444); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-new { color: var(--success, #10b981); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-state { text-align: center; padding: 20px; color: var(--text-muted); }
</style>
