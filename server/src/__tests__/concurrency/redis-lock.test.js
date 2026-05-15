// @vitest-environment node
// Redis 分布式锁竞争测试: 验证 cacheGetWithLock 在高并发下正确性
// 需要真实 Redis 环境，已排除于常规 vitest run

import { describe, it, expect } from 'vitest'
import { cacheGetWithLock, cacheSet, cacheDel, cacheGet, getRedis } from '../../dao/redis.js'

const LOCK_TEST_KEY = `conctest_lock_${Date.now()}`
const FETCH_COUNTER = { count: 0 }

describe('redis-lock', () => {
  // 确认 Redis 可用
  beforeAll(async () => {
    const r = await getRedis()
    if (!r) {
      console.warn('[redis-lock] Redis 不可用，使用内存 fallback 测试')
    }
    FETCH_COUNTER.count = 0
  })

  afterAll(async () => {
    await cacheDel(LOCK_TEST_KEY)
  })

  it('50 并发 cacheGetWithLock 回源函数只调用 1 次', async () => {
    // 确保 key 不存在
    await cacheDel(LOCK_TEST_KEY)

    const fetchFn = async () => {
      FETCH_COUNTER.count++
      // 模拟回源延迟
      await new Promise((r) => setTimeout(r, 50))
      return { value: 'cached_data', ts: Date.now() }
    }

    // 50 个并发请求同一个 key
    const promises = Array.from({ length: 50 }, () =>
      cacheGetWithLock(LOCK_TEST_KEY, fetchFn, 10, 3000).catch(() => null)
    )

    const results = await Promise.all(promises)

    // 所有结果一致
    const valid = results.filter(Boolean)
    expect(valid.length).toBe(50)
    valid.forEach((r) => {
      expect(r.value).toBe('cached_data')
    })

    // 回源函数只调用 1 次（其他 49 个等待共享结果）
    expect(FETCH_COUNTER.count).toBe(1)
  })

  it('10 并发不同 key 各自独立回源', async () => {
    const counters = {}
    const keys = Array.from({ length: 10 }, (_, i) => {
      const key = `conctest_indep_${Date.now()}_${i}`
      counters[key] = 0
      return key
    })

    const promises = keys.map((key) => {
      const fetchFn = async () => {
        counters[key]++
        await new Promise((r) => setTimeout(r, 20))
        return { key }
      }
      return cacheGetWithLock(key, fetchFn, 10, 3000).catch(() => null)
    })

    const results = await Promise.all(promises)
    expect(results.filter(Boolean).length).toBe(10)

    // 每个 key 的回源函数各调用 1 次
    Object.values(counters).forEach((count) => {
      expect(count).toBe(1)
    })

    // 清理
    await Promise.all(keys.map((k) => cacheDel(k)))
  })

  it('锁超时保护：fetchFn 超时后锁自动释放', async () => {
    const timeoutKey = `conctest_timeout_${Date.now()}`
    await cacheDel(timeoutKey)

    // 第一个请求：极慢的回源（永不 resolve），锁应在 500ms 后超时
    const slowPromise = cacheGetWithLock(
      timeoutKey,
      () => new Promise(() => {}), // 永不 resolve
      10,
      500, // 500ms 锁超时
    ).catch((e) => e)

    // 等待锁超时
    await new Promise((r) => setTimeout(r, 600))

    // 第二个请求应该能正常获取锁
    const fastResult = await cacheGetWithLock(
      timeoutKey,
      async () => 'recovered',
      10,
      3000,
    )

    expect(fastResult).toBe('recovered')

    const slowResult = await slowPromise
    expect(slowResult?.message).toContain('timeout')

    await cacheDel(timeoutKey)
  })

  it('缓存命中后不触发回源（击穿保护）', async () => {
    const hitKey = `conctest_hit_${Date.now()}`
    await cacheSet(hitKey, { cached: true }, 10)

    let fetchCalled = false
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        cacheGetWithLock(hitKey, async () => {
          fetchCalled = true
          return 'should_not_be_called'
        }, 10, 3000)
      )
    )

    // 缓存命中，fetchFn 不被调用
    expect(fetchCalled).toBe(false)
    results.forEach((r) => {
      expect(r.cached).toBe(true)
    })

    await cacheDel(hitKey)
  })
})
