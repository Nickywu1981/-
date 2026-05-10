<!--
  Movio AI v4.1 — Action Migration Page (全球独家杀手功能)
  G4 前端开发 | W3
  单人动作迁移 + 批量动作迁移
-->
<template>
  <div class="work-page">
    <header class="work-header">
      <h1>{{ headerCfg.title || 'AI 动作迁移' }}</h1>
      <p>{{ headerCfg.subtitle || '将动作视频的舞蹈/姿态迁移到您的产品模特上 — 全球独家' }}</p>
    </header>

    <div class="work-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- 单人动作迁移 -->
    <div v-if="activeTab === 'single'" class="work-panel">
      <div class="two-col-upload">
        <div class="upload-col">
          <label>动作参考视频</label>
          <AppMediaUpload accept="video" :multiple="false" :max-size="200" :max-count="1" @uploaded="onSourceVideoUploaded" />
          <p v-if="sourceVideoUrl" class="hint ok">✓ 已选择</p>
        </div>
        <div class="upload-col">
          <label>目标人物图片 (您的模特/产品图)</label>
          <AppMediaUpload accept="image" :multiple="false" :max-size="20" :max-count="1" @uploaded="onTargetImageUploaded" />
          <p v-if="targetImageUrl" class="hint ok">✓ 已选择</p>
        </div>
      </div>

      <div class="options-row" style="margin-top:20px">
        <div class="option">
          <label>动作风格</label>
          <select v-model="actionStyle" class="input">
            <option value="">自动识别</option>
            <option value="dance">热舞带货</option>
            <option value="showcase">产品展示</option>
            <option value="catwalk">模特走秀</option>
            <option value="gesture">手势引导</option>
          </select>
        </div>
      </div>

      <div class="cost-hint">成本：30 点/次</div>

      <button class="btn btn-primary btn-lg" :disabled="!sourceVideoUrl || !targetImageUrl || taskStatus === 'processing' || taskStatus === 'queued'" @click="doMigrate">
        {{ taskStatus === 'processing' ? '迁移中...' : taskStatus === 'queued' ? '排队中...' : '开始动作迁移' }}
      </button>

      <AppTaskProgress v-if="taskStatus !== 'idle'" :status="taskStatus" :progress="taskProgress" :error-message="taskError" :show-download="taskStatus === 'completed'" @retry="doMigrate" @download="downloadResult" />

      <div v-if="resultUrl" class="result-preview">
        <video :src="resultUrl" class="result-video" controls />
        <div class="result-actions">
          <button class="btn btn-primary btn-sm" @click="downloadResult">下载</button>
          <button class="btn btn-secondary btn-sm" @click="copyToClipboard(resultUrl)">复制链接</button>
        </div>
      </div>
    </div>

    <!-- 批量动作迁移 -->
    <div v-if="activeTab === 'batch'" class="work-panel">
      <div class="batch-section">
        <label>源视频（最多10个）</label>
        <AppMediaUpload accept="video" :multiple="true" :max-size="200" :max-count="10" @uploaded="onBatchVideosUploaded" />
        <p class="hint">已选 {{ batchSourceVideos.length }} 个视频</p>
      </div>
      <div class="batch-section" style="margin-top:20px">
        <label>目标人物图片（最多20张）</label>
        <AppMediaUpload accept="image" :multiple="true" :max-size="20" :max-count="20" @uploaded="onBatchImagesUploaded" />
        <p class="hint">已选 {{ batchTargetImages.length }} 张图片</p>
      </div>

      <div v-if="batchSourceVideos.length && batchTargetImages.length" class="batch-summary">
        将生成 {{ batchSourceVideos.length }} × {{ batchTargetImages.length }} = {{ batchSourceVideos.length * batchTargetImages.length }} 个迁移任务
      </div>

      <button class="btn btn-primary btn-lg" style="margin-top:16px" :disabled="!batchSourceVideos.length || !batchTargetImages.length || batchStatus === 'processing'" @click="doBatchMigrate">
        {{ batchStatus === 'processing' ? '批量迁移中...' : '开始批量迁移' }}
      </button>

      <AppTaskProgress v-if="batchStatus !== 'idle'" :status="batchStatus" :progress="batchProgress" @retry="doBatchMigrate" />

      <div v-if="batchChildren.length > 0" class="batch-progress-list">
        <h4>子任务进度</h4>
        <div v-for="child in batchChildren" :key="child.id" class="child-row">
          <span class="child-status" :class="child.status">{{ statusLabel(child.status) }}</span>
          <div class="child-bar"><div class="child-bar-fill" :style="{ width: (child.progress || 0) + '%' }" /></div>
          <span class="child-pct">{{ child.progress || 0 }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppPage } from '~/composables/useAppPage'
import { useTaskPolling } from '~/composables/useTaskPolling'
import { copyToClipboard } from '@/utils/format'

definePageMeta({ layout: 'workspace' })

const { configs } = useAppPage({ configs: ['page.action_migrate.header'] })
const headerCfg = computed(() => configs.value['page.action_migrate.header'] || {})

const activeTab = ref('single')
const tabs = [
  { key: 'single', label: '单人迁移' },
  { key: 'batch', label: '批量迁移' },
]

// ---- 单人迁移 ----
const sourceVideoUrl = ref('')
const targetImageUrl = ref('')
const actionStyle = ref('')
const { status: taskStatus, progress: taskProgress, error: taskError, result, submit } = useTaskPolling()
const resultUrl = computed(() => result.value?.video_url || result.value?.file_url || '')

function onSourceVideoUploaded(files: any[]) { if (files.length > 0) sourceVideoUrl.value = files[0].url }
function onTargetImageUploaded(files: any[]) { if (files.length > 0) targetImageUrl.value = files[0].url }

async function doMigrate() {
  await submit('action_migrate', {
    source_video_url: sourceVideoUrl.value,
    target_person_image: targetImageUrl.value,
    options: actionStyle.value ? { style: actionStyle.value } : {},
  })
}

// ---- 批量迁移 ----
const batchSourceVideos = ref<any[]>([])
const batchTargetImages = ref<any[]>([])
const { status: batchStatus, progress: batchProgress, result: batchResult, submit: submitBatch } = useTaskPolling()
const batchChildren = ref<any[]>([])

function onBatchVideosUploaded(files: any[]) { batchSourceVideos.value = files }
function onBatchImagesUploaded(files: any[]) { batchTargetImages.value = files }

async function doBatchMigrate() {
  await submitBatch('batch_action_migrate', {
    source_video_urls: batchSourceVideos.value.map((f: any) => f.url),
    target_person_images: batchTargetImages.value.map((f: any) => f.url),
    options: {},
  })
}

watch(batchResult, (v) => {
  if (v?.sub_tasks) batchChildren.value = v.sub_tasks
})

function statusLabel(s: string) {
  const map: Record<string, string> = { queued: '排队', processing: '处理中', completed: '完成', failed: '失败' }
  return map[s] || s
}

function downloadResult() { if (resultUrl.value) window.open(resultUrl.value, '_blank', 'noopener,noreferrer') }
</script>

<style scoped>
.work-page { max-width: 960px; margin: 0 auto; padding: var(--cfg-spacing-xl) var(--cfg-spacing-base); }
.work-header { text-align: center; margin-bottom: 24px; }
.work-header h1 { font-size: var(--cfg-font-size-2xl); margin: 0 0 8px 0; }
.work-header p { color: var(--cfg-text-muted); margin: 0; }

.work-tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--cfg-border); }
.tab-btn { padding: 10px 20px; border: none; background: none; font-size: var(--cfg-font-size-base); color: var(--cfg-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: all var(--cfg-transition-fast); }
.tab-btn.active { color: var(--cfg-primary); border-bottom-color: var(--cfg-primary); font-weight: var(--cfg-font-weight-semibold); }

.work-panel { background: var(--cfg-bg-primary); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius-lg); padding: 24px; }
.two-col-upload { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.upload-col label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 8px; font-weight: var(--cfg-font-weight-medium); }
.hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-text-muted); margin: 8px 0; }
.hint.ok { color: var(--cfg-success); }

.options-row { display: flex; gap: 16px; margin-bottom: 20px; }
.option { flex: 1; }
.option label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 6px; }

.cost-hint { font-size: var(--cfg-font-size-sm); color: var(--cfg-warning); margin-bottom: 16px; font-weight: var(--cfg-font-weight-medium); }

.result-preview { margin-top: 24px; }
.result-video { width: 100%; max-height: 480px; border-radius: var(--cfg-radius-base); border: 1px solid var(--cfg-border); }
.result-actions { display: flex; gap: 8px; margin-top: 12px; }

.batch-section label { display: block; font-size: var(--cfg-font-size-sm); color: var(--cfg-text-secondary); margin-bottom: 8px; font-weight: var(--cfg-font-weight-medium); }
.batch-summary { margin-top: 16px; padding: 12px; background: var(--cfg-bg-tertiary); border-radius: var(--cfg-radius-base); font-size: var(--cfg-font-size-sm); color: var(--cfg-primary); text-align: center; font-weight: var(--cfg-font-weight-semibold); }

.batch-progress-list { margin-top: 24px; }
.batch-progress-list h4 { font-size: var(--cfg-font-size-base); margin-bottom: 12px; }
.child-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.child-status { font-size: var(--cfg-font-size-xs); padding: 2px 8px; border-radius: var(--cfg-radius-sm); }
.child-status.queued { background: var(--cfg-bg-tertiary); color: var(--cfg-text-secondary); }
.child-status.processing { background: #dbeafe; color: var(--cfg-primary); }
.child-status.completed { background: #d1fae5; color: var(--cfg-success); }
.child-status.failed { background: #fee2e2; color: var(--cfg-error); }
.child-bar { flex: 1; height: 6px; background: var(--cfg-bg-tertiary); border-radius: 3px; overflow: hidden; }
.child-bar-fill { height: 100%; background: var(--cfg-primary); border-radius: 3px; transition: width 0.3s; }
.child-pct { font-size: var(--cfg-font-size-xs); color: var(--cfg-text-muted); min-width: 36px; text-align: right; }
</style>
