/**
 * Movio AI v4.1 — useTaskPolling
 * G4 前端开发 | 任务轮询 + 防重复提交
 *
 * 用法:
 *   const { status, progress, result, submit, poll } = useTaskPolling()
 *   await submit('video_gen', { prompt: '...' })
 *   // 自动轮询直到 completed/failed
 */
import { POLL_INTERVAL_MS } from '~/constants/ui'

export function useTaskPolling() {
  const { t } = useI18n()
  const jobId = ref<number | null>(null)
  const status = ref<string>('idle') // idle | queued | processing | completed | failed
  const progress = ref(0)
  const result = ref<any>(null)
  const error = ref<string>('')
  const submitting = ref(false)
  const pollTimer = ref<NodeJS.Timeout | null>(null)
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
      const res: any = await $fetch(`${apiBase}/jobs`, {
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
    } catch (e: any) {
      status.value = 'failed'
      error.value = e?.data?.msg || e.message || t('task.submit_failed')
      useToast().error(e?.data?.msg || e.message || t('task.submit_failed_retry'))
    } finally {
      submitting.value = false
    }
  }

  // -----------------------------------------------------------------------
  // 轮询
  // -----------------------------------------------------------------------
  function startPolling() {
    stopPolling()
    pollTimer.value = setInterval(async () => {
      if (!_active || !jobId.value) return
      try {
        const res: any = await $fetch(`${apiBase}/job/${jobId.value}`, { credentials: 'include' })
        if (res.code === 200) {
          status.value = res.data.status
          progress.value = res.data.progress || 0
          if (res.data.status === 'completed') {
            result.value = res.data.result_data
            stopPolling()
          } else if (res.data.status === 'failed') {
            error.value = res.data.error_message || '任务失败'
            stopPolling()
          }
        }
      } catch {
        // 轮询失败不中断
      }
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollTimer.value) {
      clearInterval(pollTimer.value)
      pollTimer.value = null
    }
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
