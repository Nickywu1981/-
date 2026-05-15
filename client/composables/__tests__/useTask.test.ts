import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockApiGet = vi.fn()
vi.mock('@/composables/useApi', () => ({
  useApi: () => ({
    get: mockApiGet,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}))

import { useTask } from '@/composables/useTask'

describe('useTask', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockApiGet.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with default state', () => {
    const task = useTask()
    task.reset()
    expect(task.taskId.value).toBe('')
    expect(task.status.value).toBe(-1)
    expect(task.progress.value).toBe(0)
    expect(task.progressMsg.value).toBe('')
    expect(task.result.value).toBeNull()
    expect(task.errorMsg.value).toBe('')
    expect(task.polling.value).toBe(false)
  })

  it('pollTask sets polling to true and status to 0', () => {
    const task = useTask()
    task.reset()
    // Pass explicit baseUrl to make the URL predictable
    task.pollTask('task-123', '/api/tasks/')
    expect(task.taskId.value).toBe('task-123')
    expect(task.polling.value).toBe(true)
    expect(task.status.value).toBe(0)
    task.reset()
  })

  it('pollTask calls api.get after initial delay', async () => {
    mockApiGet.mockResolvedValue({
      status: 1,
      progress: 50,
      progress_msg: 'Processing...',
    })

    const task = useTask()
    task.reset()
    task.pollTask('task-abc', '/api/tasks/')

    // Use async advance to flush both timers and microtasks (Promise resolutions)
    await vi.advanceTimersByTimeAsync(1100)

    expect(mockApiGet).toHaveBeenCalledWith('/api/tasks/task-abc')
    expect(task.status.value).toBe(1)
    expect(task.progress.value).toBe(50)
    expect(task.progressMsg.value).toBe('Processing...')
    task.reset()
  })

  it('pollTask stops polling when status is 2 (completed)', async () => {
    mockApiGet.mockResolvedValue({
      status: 2,
      progress: 100,
      progress_msg: 'Done',
      output_result: { url: 'https://example.com/result.png' },
    })

    const task = useTask()
    task.reset()
    task.pollTask('task-done', '/api/tasks/')

    await vi.advanceTimersByTimeAsync(1100)

    expect(task.status.value).toBe(2)
    expect(task.result.value).toEqual({ url: 'https://example.com/result.png' })
    expect(task.polling.value).toBe(false)
  })

  it('pollTask stops polling when status is 3 (failed)', async () => {
    mockApiGet.mockResolvedValue({
      status: 3,
      progress: 0,
      progress_msg: '',
      error_msg: 'Invalid input',
    })

    const task = useTask()
    task.reset()
    task.pollTask('task-fail', '/api/tasks/')

    await vi.advanceTimersByTimeAsync(1100)

    expect(task.status.value).toBe(3)
    expect(task.errorMsg.value).toBe('Invalid input')
    expect(task.polling.value).toBe(false)
  })

  it('reset clears all state', () => {
    const task = useTask()
    task.taskId.value = 't1'
    task.status.value = 2
    task.progress.value = 100
    task.result.value = { url: 'x' }
    task.errorMsg.value = 'err'
    task.polling.value = true

    task.reset()

    expect(task.taskId.value).toBe('')
    expect(task.status.value).toBe(-1)
    expect(task.progress.value).toBe(0)
    expect(task.progressMsg.value).toBe('')
    expect(task.result.value).toBeNull()
    expect(task.errorMsg.value).toBe('')
    expect(task.polling.value).toBe(false)
  })
})
