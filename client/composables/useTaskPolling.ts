/**
 * Movio AI v4.1 — useTaskPolling
 * G4 前端开发 | 任务轮询 + 防重复提交
 *
 * 用法:
 *   const { status, progress, result, submit, poll } = useTaskPolling()
 *   await submit('video_gen', { prompt: '...' })
 *   // 自动轮询直到 completed/failed
 */
import { POLL_INTERVAL_MS, POLL_BACKOFF_MS, POLL_MAX_BACKOFF_MS } from '~/constants/ui'
import { useApi, extractErrorMsg } from '~/composables/useApi'

export function useTaskPolling() {
  const { t } = useI18n()
  const api = useApi()
  const jobId = ref<number | null>(null)
  const status = ref<string>('idle') // idle | queued | processing | completed | failed
  const progress = ref(0)
  const result = ref<any>(null)
  const error = ref<string>('')
  const submitting = ref(false)
  const pollTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  let _pollCount = 0

  // -----------------------------------------------------------------------
  // 提交任务 (防重复提交)
  // -----------------------------------------------------------------------
  async function submit(taskType: string, params: Record<string, any>) {
    if (submitting.value) {
      useToast().warn(t('task.submit_in_progress'))
      return
    }
    if (jobId.value && ['queued', 'processing'].includes(status.value)) {
      useToast().warn(t('task.duplicate_submit'))
      return
    }

    submitting.value = true
    status.value = 'queued'
    error.value = ''

    try {
      const data = await api.post<{ job_id: number }>('/jobs', { task_type: taskType, task_params: params })
      jobId.value = data.job_id
      status.value = 'queued'
      startPolling()
    } catch (e: unknown) {
      status.value = 'failed'
      error.value = extractErrorMsg(e, 'task.submit_failed')
      useToast().error(error.value)
    } finally {
      submitting.value = false
    }
  }

  // -----------------------------------------------------------------------
  // 轮询 (指数退避)
  // -----------------------------------------------------------------------
  function schedulePoll() {
    if (!_active || !jobId.value) return
    const backoff = Math.min(
      POLL_INTERVAL_MS + _pollCount * POLL_BACKOFF_MS,
      POLL_MAX_BACKOFF_MS,
    )
    pollTimer.value = setTimeout(pollOnce, backoff)
  }

  async function pollOnce() {
    if (!_active || !jobId.value) return
    try {
      const data = await api.get<{ status: string; progress?: number; result_data?: unknown; error_message?: string }>(`/job/${jobId.value}`)
      status.value = data.status
      progress.value = data.progress || 0
      if (data.status === 'completed') {
        result.value = data.result_data
        _pollCount = 0
        return
      } else if (data.status === 'failed') {
        error.value = data.error_message || t('task.failed')
        _pollCount = 0
        return
      }
    } catch (e) {
      if (import.meta.dev) console.warn('[TaskPolling] 轮询请求失败', e)
    }
    _pollCount++
    schedulePoll()
  }

  function startPolling() {
    stopPolling()
    _pollCount = 0
    schedulePoll()
  }

  function stopPolling() {
    if (pollTimer.value) {
      clearTimeout(pollTimer.value)
      pollTimer.value = null
    }
    _pollCount = 0
  }

  function reset() {
    stopPolling()
    jobId.value = null
    status.value = 'idle'
    progress.value = 0
    result.value = null
    error.value = ''
    submitting.value = false
  }

  let _active = true
  onUnmounted(() => { _active = false; stopPolling() })
  onDeactivated(() => { _active = false; stopPolling() })
  onActivated(() => { _active = true })

  return { jobId, status, progress, result, error, submitting, submit, stopPolling, reset }
}
