<!--
  WorkPipeline.vue — 通用管线渲染器
  G4 Frontend-B | 配置驱动，读取 PageConfig → 动态渲染全步骤
-->
<template>
  <WorkLayout :title="$t(config.title)" :subtitle="config.subtitle ? $t(config.subtitle) : undefined" :steps="config.ui.stepLabels.map(k => $t(k))" :current-step="state.currentStep">
    <!-- idle 状态 -->
    <template v-if="state.taskStatus === -1">
      <!-- Step: Input -->
      <div v-if="currentStepType === 'input'">
        <div v-for="field in visibleFields(inputFields)" :key="field.key" class="pipeline-field">
          <!-- Image Upload -->
          <template v-if="field.type === 'image-upload'">
            <div class="dropzone" @dragover.prevent @drop.prevent="(e) => handleDrop(e, field)">
              <p class="dz-icon">{{ config.ui.uploadIcon || '📤' }}</p>
              <p>{{ $t(field.label) }}</p>
              <p class="hint">{{ field.hint ? $t(field.hint) : '' }}</p>
              <input :ref="(el) => setFileInputRef(field.key, el)" type="file" :accept="field.upload?.accept ?? 'image/*'" :multiple="field.upload?.multiple" hidden @change="(e) => handleFileInput(e, field)" />
              <button class="btn-outline" type="button" @click="triggerFileInput(field.key)">{{ $t(label('selectFile')) }}</button>
            </div>
            <div v-if="uploadState(field.key).previewUrl" class="preview-box">
              <audio v-if="field.upload?.accept?.includes('audio')" :src="uploadState(field.key).previewUrl" controls class="upload-preview" />
              <img v-else :src="uploadState(field.key).previewUrl" alt="preview" @error="(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }" />
              <button class="preview-remove" type="button" :aria-label="$t('common.remove')" @click="clearUpload(field.key)">✕</button>
            </div>
            <p v-if="uploadState(field.key).error" class="msg msg-error">{{ uploadState(field.key).error }}</p>
            <p v-if="uploadState(field.key).uploading" class="msg">{{ $t('common.uploading') }}</p>
            <div v-if="uploadState(field.key).previewUrl && !uploadState(field.key).uploading" class="actions">
              <div v-if="config.api.cost" class="cost-badge">{{ $t('common.cost_points', { count: config.api.cost }) }}</div>
              <button class="btn btn-brand" type="button" @click="goToNextStep">{{ $t(label('nextStep')) }}</button>
            </div>
          </template>

          <!-- Video Upload -->
          <template v-else-if="field.type === 'video-upload'">
            <div class="dropzone" @dragover.prevent @drop.prevent="(e) => handleDrop(e, field)">
              <p class="dz-icon">🎬</p>
              <p>{{ $t(field.label) }}</p>
              <p class="hint">{{ field.hint ? $t(field.hint) : '' }}</p>
              <input :ref="(el) => setFileInputRef(field.key, el)" type="file" :accept="field.upload?.accept ?? 'video/*'" :multiple="field.upload?.multiple" hidden @change="(e) => handleFileInput(e, field)" />
              <button class="btn-outline" type="button" @click="triggerFileInput(field.key)">{{ $t(label('selectFile')) }}</button>
            </div>
            <div v-if="uploadState(field.key).previewUrl" class="preview-box">
              <video :src="uploadState(field.key).previewUrl" controls class="upload-preview" />
              <button class="preview-remove" type="button" :aria-label="$t('common.remove')" @click="clearUpload(field.key)">✕</button>
            </div>
            <p v-if="uploadState(field.key).error" class="msg msg-error">{{ uploadState(field.key).error }}</p>
            <p v-if="uploadState(field.key).uploading" class="msg">{{ $t('common.uploading') }}</p>
            <div v-if="uploadState(field.key).previewUrl && !uploadState(field.key).uploading" class="actions">
              <div v-if="config.api.cost" class="cost-badge">{{ $t('common.cost_points', { count: config.api.cost }) }}</div>
              <button class="btn btn-brand" type="button" @click="goToNextStep">{{ $t(label('nextStep')) }}</button>
            </div>
          </div>

          <!-- Textarea -->
          <template v-else-if="field.type === 'textarea'">
            <label class="field-label" :for="`field-${field.key}`">{{ $t(field.label) }}</label>
            <textarea :id="`field-${field.key}`" v-model="state.fieldValues[field.key]" class="input-area" :placeholder="field.placeholder ? $t(field.placeholder) : ''" :maxlength="field.validation?.maxLength ?? 5000" rows="6" />
            <PromptEnhancer v-if="state.fieldValues[field.key]" mode="script" :initial-prompt="String(state.fieldValues[field.key] || '')" @applied="(v: string) => state.fieldValues[field.key] = v" />
          </template>
        </div>

        <div v-if="hasAnyUpload && !anyUploadDone" class="empty-hint">
          <span class="empty-icon">{{ config.ui.uploadIcon || '📤' }}</span>
          <p>{{ $t(label('uploadHint')) }}</p>
        </div>

        <div v-if="anyUploadDone || hasTextFields" class="actions">
          <button class="btn btn-brand" type="button" :disabled="!canProceed" @click="goToNextStep">{{ $t(label('nextStep')) }}</button>
        </div>
      </div>

      <!-- Step: Configure -->
      <div v-else-if="currentStepType === 'configure'">
        <div v-for="field in visibleFields(configFields)" :key="field.key" class="pipeline-field">
          <h3>{{ $t(field.label) }}</h3>

          <template v-if="field.type === 'style-chips'">
            <div class="style-row">
              <button v-for="opt in field.options" :key="opt.value" class="style-option" :class="{ active: state.fieldValues[field.key] === opt.value }" type="button" @click="state.fieldValues[field.key] = opt.value">
                <span v-if="opt.icon" class="style-icon">{{ opt.icon }}</span>
                {{ $t(opt.label) }}
              </button>
            </div>
          </template>

          <template v-else-if="field.type === 'bg-grid'">
            <div class="bg-grid">
              <button v-for="opt in field.options" :key="opt.value" class="bg-card" :class="{ active: state.fieldValues[field.key] === opt.value }" type="button" @click="state.fieldValues[field.key] = opt.value">
                <span class="bg-preview" :style="{ background: opt.css }" />
                <span class="bg-label">{{ $t(opt.label) }}</span>
                <span v-if="opt.badge" class="bg-badge">{{ opt.badge }}</span>
              </button>
            </div>
          </template>

          <template v-else-if="field.type === 'option-cards'">
            <div class="op-grid">
              <button v-for="opt in field.options" :key="opt.value" class="op-card" :class="{ active: state.fieldValues[field.key] === opt.value }" type="button" @click="state.fieldValues[field.key] = opt.value">
                <span v-if="opt.icon">{{ opt.icon }}</span>
                {{ $t(opt.label) }}
              </button>
            </div>
          </template>

          <template v-else-if="field.type === 'select'">
            <label class="field-label" :for="`field-${field.key}`">{{ $t(field.label) }}</label>
            <select :id="`field-${field.key}`" v-model="state.fieldValues[field.key]" class="pipeline-select">
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ $t(opt.label) }}</option>
            </select>
          </template>

          <template v-else-if="field.type === 'color-picker'">
            <label class="field-label" :for="`field-${field.key}`">{{ $t(field.label) }}</label>
            <div class="color-picker-row">
              <input :id="`field-${field.key}`" v-model="state.fieldValues[field.key]" type="color" />
              <span>{{ state.fieldValues[field.key] }}</span>
            </div>
          </template>

          <template v-else-if="field.type === 'switch'">
            <label class="switch-label">
              <input v-model="state.fieldValues[field.key]" type="checkbox" class="switch-input" />
              <span class="switch-track"><span class="switch-thumb" /></span>
              {{ $t(field.label) }}
            </label>
          </template>

          <template v-else-if="field.type === 'slider'">
            <label class="slider-label" :for="`field-${field.key}`">{{ $t(field.label) }}: {{ state.fieldValues[field.key] }}</label>
            <input :id="`field-${field.key}`" v-model.number="state.fieldValues[field.key]" type="range" class="slider" :min="field.validation?.min ?? 0" :max="field.validation?.max ?? 100" />
          </template>

          <template v-else-if="field.type === 'number'">
            <label class="field-label" :for="`field-${field.key}`">{{ $t(field.label) }}</label>
            <input :id="`field-${field.key}`" v-model.number="state.fieldValues[field.key]" type="number" class="pipeline-number" :min="field.validation?.min" :max="field.validation?.max" />
          </template>
        </div>

        <div class="actions">
          <button class="btn-outline" type="button" @click="goToPrevStep">{{ $t('common.back') }}</button>
          <button class="btn btn-brand" type="button" :disabled="submitting" @click="submitTask">
            <span v-if="submitting" class="spinner" />
            {{ submitting ? $t(label('processing')) : $t(label('startTask')) }}
          </button>
        </div>
      </div>
    </template>

    <!-- Progress -->
    <div v-else-if="state.taskStatus === 0 || state.taskStatus === 1" class="progress-box">
      <div class="spinner" />
      <p>{{ state.progressMsg || $t(label('queued')) }}</p>
      <div class="bar"><div class="bar-fill" :style="{ width: state.progress + '%' }" /></div>
      <p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">{{ state.progress }}%</p>
    </div>

    <!-- Result -->
    <div v-else-if="state.taskStatus === 2">
      <!-- Single Image -->
      <div v-if="config.ui.resultMode === 'single-image'" class="result-section">
        <h3>{{ $t(label('resultTitle')) }}</h3>
        <img v-if="resultImageUrl" :src="resultImageUrl" class="result-image" @error="(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }" />
        <div class="actions">
          <button class="btn btn-brand" type="button" @click="downloadResult">{{ $t(label('download')) }}</button>
          <button class="btn-outline" type="button" @click="resetAll">{{ $t(label('redo')) }}</button>
        </div>
      </div>

      <!-- Before/After -->
      <div v-else-if="config.ui.resultMode === 'before-after'" class="result-section">
        <h3>{{ $t(label('resultTitle')) }}</h3>
        <div class="compare-row">
          <div class="compare-card">
            <span class="compare-label">{{ $t(label('originalLabel')) }}</span>
            <img :src="firstUploadedUrl" class="compare-img" @error="(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }" />
          </div>
          <span class="compare-arrow">→</span>
          <div class="compare-card">
            <span class="compare-label">{{ $t(label('afterLabel')) }}</span>
            <img :src="resultImageUrl" class="compare-img" @error="(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }" />
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-brand" type="button" @click="downloadResult">{{ $t(label('download')) }}</button>
          <button class="btn-outline" type="button" @click="resetAll">{{ $t(label('redo')) }}</button>
        </div>
      </div>

      <!-- Image Grid -->
      <div v-else-if="config.ui.resultMode === 'image-grid'" class="result-section">
        <h3>{{ $t(label('resultTitle')) }}</h3>
        <div class="image-grid">
          <div v-for="(img, i) in resultImages" :key="i" class="result-card">
            <img :src="img" @error="(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }" />
            <button class="btn-outline" type="button" style="margin:8px;" @click="downloadUrl(img, `result-${i}.png`)">{{ $t(label('download')) }}</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn-outline" type="button" @click="resetAll">{{ $t(label('redo')) }}</button>
        </div>
      </div>

      <!-- Video result -->
      <div v-else-if="config.ui.resultMode === 'video'" class="result-section">
        <h3>{{ $t(label('resultTitle')) }}</h3>
        <video v-if="resultImageUrl" :src="resultImageUrl" controls class="result-video" />
        <div class="actions">
          <button class="btn btn-brand" type="button" @click="downloadResult">{{ $t(label('download')) }}</button>
          <button class="btn-outline" type="button" @click="resetAll">{{ $t(label('redo')) }}</button>
        </div>
      </div>

      <!-- Text result -->
      <div v-else-if="config.ui.resultMode === 'text'" class="result-section">
        <h3>{{ $t(label('resultTitle')) }}</h3>
        <div class="script-output">
          <div class="script-card">{{ state.result }}</div>
        </div>
        <div class="actions">
          <button class="btn-outline" type="button" @click="resetAll">{{ $t(label('redo')) }}</button>
        </div>
      </div>

      <!-- Download only / Success -->
      <div v-else class="result-section">
        <h3>{{ $t(label('resultTitle')) }}</h3>
        <p v-if="!resultImageUrl && resultImages.length === 0" class="success-msg">{{ $t(label('success')) }}</p>
        <div class="actions">
          <button v-if="resultImageUrl || resultImages.length" class="btn btn-brand" type="button" @click="downloadResult">{{ $t(label('download')) }}</button>
          <button class="btn-outline" type="button" @click="resetAll">{{ $t(label('redo')) }}</button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="state.taskStatus === 3" class="error-section" style="text-align:center;padding:40px;">
      <p class="error-icon" style="width:40px;height:40px;border-radius:50%;background:var(--danger);color:#fff;font-weight:700;font-size:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">!</p>
      <p>{{ state.errorMsg || $t(label('failedProcess')) }}</p>
      <button class="btn-outline" type="button" @click="submitTask" style="margin-top:12px;">{{ $t('common.retry') }}</button>
    </div>
  </WorkLayout>
</template>

<script setup lang="ts">
import type { PageConfig, PipelineState, FieldConfig } from './types'
import { assertValidConfig } from './validators'
import PromptEnhancer from '~/components/PromptEnhancer.vue'

const props = defineProps<{ config: PageConfig }>()

if (import.meta.dev) { assertValidConfig(props.config) }

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2214%22 text-anchor=%22middle%22 x=%22100%22 y=%22110%22%3ENo Image%3C/text%3E%3C/svg%3E'

const { t } = useI18n()
const { createBlobUrl, revoke } = useBlobUrl()
const { download } = useFileDownload()

// ── Default labels ──
const DEFAULT_LABELS: Required<NonNullable<PageConfig['ui']['labels']>> = {
  selectFile: 'common.select_file',
  nextStep: 'common.next_step',
  startTask: 'common.start_generate',
  processing: 'common.processing',
  queued: 'common.queued',
  resultTitle: 'common.result_title',
  uploadHint: 'common.upload_hint',
  originalLabel: 'common.original_label',
  afterLabel: 'common.after_label',
  download: 'common.download',
  redo: 'common.redo',
  success: 'common.success',
  failedUpload: 'common.failed_upload',
  failedTask: 'common.failed_task',
  failedProcess: 'common.failed_process',
  missingRequired: 'common.missing_required',
}

function label(key: keyof typeof DEFAULT_LABELS): string {
  return props.config.ui.labels?.[key] || DEFAULT_LABELS[key]
}

// ── State ──
const fileInputRefs = new Map<string, HTMLInputElement>()

const state = reactive<PipelineState>({
  currentStep: 0,
  taskStatus: -1,
  progress: 0,
  progressMsg: '',
  errorMsg: '',
  fieldValues: {},
  uploads: {},
  result: null,
})

// Init defaults
props.config.steps.forEach((step) => {
  step.fields?.forEach((field) => {
    if (field.default !== undefined) { state.fieldValues[field.key] = field.default }
    if (field.type === 'image-upload' || field.type === 'video-upload') {
      state.uploads[field.key] = { previewUrl: '', uploadedUrl: '', uploading: false, error: '' }
    }
  })
})

// ── Computed ──
const allFields = computed(() => props.config.steps.flatMap(s => s.fields || []))
const inputFields = computed(() => allFields.value.filter(f => f.type === 'image-upload' || f.type === 'video-upload' || f.type === 'textarea'))
const configFields = computed(() => allFields.value.filter(f => !['image-upload', 'video-upload', 'textarea'].includes(f.type)))
const currentStepType = computed(() => props.config.steps[state.currentStep]?.type)

function visibleFields(fields: FieldConfig[]): FieldConfig[] {
  return fields.filter(f => {
    if (!f.showWhen) return true
    const dep = state.fieldValues[f.showWhen.field]
    if (f.showWhen.notEmpty) return dep !== undefined && dep !== '' && dep !== null
    return dep !== undefined
  })
}

const hasAnyUpload = computed(() => inputFields.value.some(f => f.type === 'image-upload' || f.type === 'video-upload'))
const hasTextFields = computed(() => inputFields.value.some(f => f.type === 'textarea'))

const anyUploadDone = computed(() =>
  inputFields.value.some(f => {
    const us = state.uploads[f.key]
    return us && us.uploadedUrl
  })
)

const canProceed = computed(() => !(hasAnyUpload.value && !anyUploadDone.value))
const submitting = computed(() => state.taskStatus === 0 || state.taskStatus === 1)

const resultImageUrl = computed(() => {
  const r = state.result as Record<string, unknown> | null
  return String(r?.resultUrl || r?.url || '')
})

const resultImages = computed(() => {
  const r = state.result as Record<string, unknown> | null
  const urls = r?.urls || r?.images || (r?.url ? [r.url] : [])
  return (Array.isArray(urls) ? urls : []) as string[]
})

const firstUploadedUrl = computed(() => {
  for (const key of Object.keys(state.uploads)) {
    const u = state.uploads[key]
    if (u?.uploadedUrl) return u.uploadedUrl
  }
  return ''
})

// ── Step navigation ──
function findStepIndex(type: string): number {
  return props.config.steps.findIndex(s => s.type === type)
}

function goToNextStep() {
  const nextIdx = state.currentStep + 1
  // If next step is progress (no configure), submit directly
  if (props.config.steps[nextIdx]?.type === 'progress') {
    submitTask()
    return
  }
  state.currentStep = Math.min(nextIdx, props.config.steps.length - 1)
}

function goToPrevStep() {
  state.currentStep = Math.max(0, state.currentStep - 1)
}

// ── Upload ──
function uploadState(key: string) {
  if (!state.uploads[key]) {
    state.uploads[key] = { previewUrl: '', uploadedUrl: '', uploading: false, error: '' }
  }
  return state.uploads[key]
}

function setFileInputRef(key: string, el: unknown) {
  if (el instanceof HTMLInputElement) fileInputRefs.set(key, el)
}

function triggerFileInput(key: string) { fileInputRefs.get(key)?.click() }
function handleDrop(e: DragEvent, field: FieldConfig) {
  const file = e.dataTransfer?.files?.[0]
  if (file) uploadFile(file, field)
}
function handleFileInput(e: Event, field: FieldConfig) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadFile(file, field)
}

async function uploadFile(file: File, field: FieldConfig) {
  const us = uploadState(field.key)
  us.previewUrl = createBlobUrl(file)
  us.error = ''
  us.uploading = true
  try {
    const form = new FormData()
    form.append(field.upload?.fileFieldName || 'file', file)
    const res = await $fetch('/api/upload/simple', {
      method: 'POST', credentials: 'include', body: form,
    }) as { data?: { url?: string } }
    us.uploadedUrl = res.data?.url || us.previewUrl
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string } }
    us.error = err?.data?.msg || t(label('failedUpload'))
  } finally { us.uploading = false }
}

function clearUpload(key: string) {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  const us = uploadState(key)
  if (us.previewUrl) revoke(us.previewUrl)
  us.previewUrl = ''
  us.uploadedUrl = ''
  us.error = ''
}

// ── Polling ──
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0
let consecutiveFailures = 0
const POLL_INITIAL_MS = 1000
const POLL_INTERVAL_MS = 2000
const POLL_BACKOFF_MS = 5000

function startPolling(taskId: string) {
  stopPolling()
  pollCount = 0
  consecutiveFailures = 0
  const pollUrlTemplate = props.config.api.pollUrlTemplate || '/api/job/{taskId}'

  const poll = async () => {
    try {
      const url = pollUrlTemplate.replace('{taskId}', taskId)
      const res = await $fetch(url, { credentials: 'include' }) as { data?: { status: number; progress?: number; progress_msg?: string; output_result?: { url?: string }; resultUrl?: string; error_msg?: string } }
      const d = res.data
      if (!d) { consecutiveFailures++; return }
      state.taskStatus = d.status as PipelineState['taskStatus']
      state.progress = d.progress ?? 0
      state.progressMsg = d.progress_msg || ''
      consecutiveFailures = 0
      if (d.status === 2) {
        state.result = d.output_result || { url: d.resultUrl }
        state.currentStep = findStepIndex('result')
        stopPolling()
        return
      } else if (d.status === 3) {
        state.errorMsg = d.error_msg || t(label('failedTask'))
        stopPolling()
        return
      }
    } catch (e) {
      consecutiveFailures++
      if (import.meta.dev) console.warn('[WorkPipeline] poll error:', e)
    }

    pollCount++
    if (pollCount > 60) {
      state.taskStatus = 3
      state.errorMsg = t(label('failedTask'))
      stopPolling()
      return
    }
    let interval = POLL_INITIAL_MS
    if (pollCount > 5) interval = POLL_INTERVAL_MS
    if (consecutiveFailures > 3) interval = POLL_BACKOFF_MS
    pollTimer = setTimeout(poll, interval)
  }
  poll()
}

function stopPolling() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
}

// ── Submit ──
async function submitTask() {
  // Prevent double-submit
  if (submitting.value) return

  // Validate required fields
  const missingRequired = allFields.value.filter(f => {
    if (!f.required) return false
    const val = state.fieldValues[f.key]
    if (f.type === 'image-upload' || f.type === 'video-upload') {
      return !state.uploads[f.key]?.uploadedUrl
    }
    return val === undefined || val === null || val === ''
  })
  if (missingRequired.length > 0) {
    state.taskStatus = 3
    state.errorMsg = t(label('missingRequired')) + ': ' + missingRequired.map(f => t(f.label)).join(', ')
    state.currentStep = findStepIndex(missingRequired[0].type === 'image-upload' || missingRequired[0].type === 'video-upload' || missingRequired[0].type === 'textarea' ? 'input' : 'configure')
    return
  }

  state.taskStatus = 0
  state.progress = 0
  state.errorMsg = ''
  state.currentStep = findStepIndex('progress')
  if (state.currentStep < 0) state.currentStep = findStepIndex('result')

  const body: Record<string, unknown> = { ...state.fieldValues }
  for (const [key, us] of Object.entries(state.uploads)) {
    if (us.uploadedUrl) body[key] = us.uploadedUrl
  }

  try {
    const cfg = props.config.api
    const method = cfg.submitMethod || 'POST'
    const fetchOpts: Record<string, unknown> = {
      method,
      credentials: 'include',
    }
    if (method === 'GET') {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v))
      }
      fetchOpts.params = params
    } else if (cfg.formData) {
      const form = new FormData()
      for (const [k, v] of Object.entries(body)) { form.append(k, v instanceof Blob ? v : String(v)) }
      fetchOpts.body = form
    } else {
      fetchOpts.headers = { 'Content-Type': 'application/json' }
      fetchOpts.body = body  // $fetch handles serialization
    }
    const res = await $fetch(cfg.submitUrl, fetchOpts) as { data?: { taskId?: string; resultUrl?: string; url?: string } }
    handleSubmitResponse(res)
  } catch (e: unknown) {
    const err = e as { data?: { msg?: string } }
    state.taskStatus = 3
    state.errorMsg = err?.data?.msg || t(label('failedProcess'))
  }
}

function handleSubmitResponse(res: { data?: { taskId?: string; resultUrl?: string; url?: string; items?: unknown[]; [k: string]: unknown }; code?: number; msg?: string }) {
  const d = res.data
  if (d?.taskId) {
    startPolling(d.taskId)
  } else if (d?.resultUrl || d?.url) {
    state.result = { url: d.resultUrl || d.url }
    state.taskStatus = 2
    state.currentStep = findStepIndex('result')
  } else if (res.data !== undefined) {
    // 直接响应（PUT 保存 / GET 列表 / 纯文本）
    state.result = res.data
    state.taskStatus = 2
    state.currentStep = findStepIndex('result')
  } else {
    state.taskStatus = 3
    state.errorMsg = res.msg || t(label('failedProcess'))
  }
}

// ── Download ──
function downloadResult() {
  const url = resultImageUrl.value || resultImages.value[0]
  if (!url) return
  const ext = props.config.ui.resultMode === 'video' ? '.mp4' : '.png'
  download(url, `${props.config.id}-result${ext}`)
}
function downloadUrl(url: string, filename: string) { download(url, filename) }

// ── Reset ──
function resetAll() {
  stopPolling()
  state.currentStep = 0
  state.taskStatus = -1
  state.result = null
  state.progress = 0
  state.progressMsg = ''
  state.errorMsg = ''
  for (const key of Object.keys(state.uploads)) { clearUpload(key) }
}

onUnmounted(() => stopPolling())
</script>

<style scoped>
.pipeline-field { margin-bottom: 20px; }
.field-label { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }

.color-picker-row { display: flex; align-items: center; gap: 12px; }
.color-picker-row input[type="color"] { width: 40px; height: 40px; border: none; border-radius: var(--radius-md); cursor: pointer; }

.pipeline-select { width: 100%; max-width: 320px; padding: 10px 14px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-primary); font-size: 14px; }
.pipeline-number { width: 100%; max-width: 160px; padding: 10px 14px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); background: var(--bg-card); color: var(--text-primary); font-size: 14px; }

.switch-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: var(--text-primary); }
.switch-input { display: none; }
.switch-track { width: 44px; height: 24px; border-radius: 12px; background: var(--border-light); position: relative; transition: background .2s; }
.switch-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.switch-input:checked + .switch-track { background: var(--brand); }
.switch-input:checked + .switch-track .switch-thumb { transform: translateX(20px); }

.bg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.bg-card { padding: 16px 12px; border: 2px solid var(--border-light); border-radius: var(--radius-lg); background: var(--bg-card); cursor: pointer; text-align: center; transition: border-color var(--transition-fast), transform var(--transition-fast); position: relative; }
.bg-card:hover { border-color: var(--brand); transform: translateY(-2px); }
.bg-card.active { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-alpha); }
.bg-preview { display: block; width: 80px; height: 60px; margin: 0 auto 8px; border-radius: var(--radius-md); border: 1px solid var(--border-light); }
.bg-label { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.bg-badge { position: absolute; top: 6px; right: 6px; padding: 1px 6px; background: var(--brand); color: #fff; border-radius: var(--radius-xs); font-size: 10px; font-weight: 600; }

.dropzone { width: 100%; max-width: 480px; padding: 48px 24px; border: 2px dashed var(--border-light); border-radius: var(--radius-xl); text-align: center; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
.dropzone:hover { border-color: var(--brand); background: var(--brand-alpha); }

.msg { font-size: 13px; color: var(--text-muted); }
.msg-error { color: var(--danger); }
.actions { display: flex; align-items: center; gap: 16px; margin-top: 12px; }
.cost-badge { padding: 4px 12px; background: var(--brand-alpha); border-radius: var(--radius-lg); font-size: 12px; color: var(--brand); }
.preview-box { position: relative; width: 100%; max-width: 320px; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-light); }
.preview-box img, .preview-box video { width: 100%; display: block; }
.upload-preview { max-height: 200px; }
.preview-remove { position: absolute; top: 8px; right: 8px; min-width: 28px; min-height: 28px; border: none; border-radius: 50%; background: rgba(0,0,0,.5); color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

.empty-hint { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.empty-hint p { font-size: 15px; color: var(--text-secondary); }

.result-image { max-width: 400px; max-height: 400px; border-radius: var(--radius-lg); }
.result-video { max-width: 600px; max-height: 400px; border-radius: var(--radius-lg); }
.compare-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; }
.compare-card { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.compare-label { font-size: 12px; color: var(--text-muted); }
.compare-img { max-width: 200px; max-height: 200px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); }
.compare-arrow { font-size: 24px; color: var(--brand); }
.success-msg { font-size: 14px; color: var(--text-secondary); padding: 8px 0; }
</style>
