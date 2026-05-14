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

export function useTaskPolling() {
  const { t } = useI18n()
  const jobId = ref<number | null>(null)
  const status = ref<string>('idle') // idle | queued | processing | completed | failed
  const progress = ref(0)
  const result = ref<any>(null)
  const error = ref<string>('')
  const submitting = ref(false)
  const pollTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  let _pollCount = 0
  const apiBase = useRuntimeConfig().public.apiBase || '/api'

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
      const res = await $fetch<{ code: number; data?: { job_id: number }; msg?: string }>(`${apiBase}/jobs`, {
        method: 'POST',
        body: { task_type: taskType, task_params: params },
        credentials: 'include',
      })
      if (res.code === 200) {
        jobId.value = res.data.job_id
        status.value = 'queued'
        startPolling()
      } else {
        status.value = 'failed'
        error.value = res.msg || t('task.submit_failed')
      }
    } catch (e: unknown) {
      const err = e as { data?: { msg?: string }; message?: string };
      status.value = 'failed'
      error.value = err?.data?.msg || err.message || t('task.submit_failed')
      useToast().error(err?.data?.msg || err.message || t('task.submit_failed_retry'))
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
      const res = await $fetch<{ code: number; data?: { status: string; progress?: number; result_data?: unknown; error_message?: string } }>(`${apiBase}/job/${jobId.value}`, { credentials: 'include' })
      if (res.code === 200) {
        status.value = res.data.status
        progress.value = res.data.progress || 0
        if (res.data.status === 'completed') {
          result.value = res.data.result_data
          _pollCount = 0
          return
        } else if (res.data.status === 'failed') {
          error.value = res.data.error_message || t('task.failed')
          _pollCount = 0
          return
        }
      }
    } catch (e) {
      if (import.meta.dev) console.warn('[TaskPolling] 轮询请求失败', e);
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
