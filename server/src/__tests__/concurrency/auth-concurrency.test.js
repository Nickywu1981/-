// @vitest-environment node
// 并发登录压测: 验证 token 唯一性 + 无 session 竞争
// 需要真实数据库环境，已排除于常规 vitest run

import { describe, it, expect } from 'vitest'
import * as authService from '../../services/auth.service.js'

// 用时间戳生成唯一测试用户，避免与其他测试冲突
const TEST_PREFIX = `conctest_${Date.now()}`

describe('auth-concurrency', () => {
  const testUsers = []

  // 预注册 10 个测试用户
  beforeAll(async () => {
    for (let i = 0; i < 10; i++) {
      const phone = `1380000${String(i).padStart(4, '0')}`
      try {
        const result = await authService.register({
          phone,
          password: 'ConcurrentTest123!',
          nickname: `${TEST_PREFIX}_${i}`,
        })
        testUsers.push({ id: result.user.id, phone, password: 'ConcurrentTest123!' })
      } catch {
        // 可能已存在，直接记录凭据用于登录
        testUsers.push({ phone, password: 'ConcurrentTest123!' })
      }
    }
  })

  it('10 并发登录生成唯一 token', async () => {
    const loginPromises = testUsers.map((u) =>
      authService.login({ phone: u.phone, password: u.password })
    )

    const results = await Promise.all(loginPromises)

    // 所有登录成功
    expect(results.length).toBe(10)
    results.forEach((r) => {
      expect(r.token).toBeTruthy()
      expect(r.user.id).toBeTruthy()
    })

    // 所有 token 唯一
    const tokens = results.map((r) => r.token)
    const uniqueTokens = new Set(tokens)
    expect(uniqueTokens.size).toBe(10)
  })

  it('同用户 5 并发登录无 session 冲突', async () => {
    const u = testUsers[0]
    const promises = Array.from({ length: 5 }, () =>
      authService.login({ phone: u.phone, password: u.password })
    )

    const results = await Promise.all(promises)
    expect(results.length).toBe(5)

    // 每个 token 都不同（每次登录生成新 token）
    const tokens = results.map((r) => r.token)
    const uniqueTokens = new Set(tokens)
    expect(uniqueTokens.size).toBe(5)
  })

  it('并发爆破触发账号锁定', async () => {
    // 用不存在的用户模拟暴力破解
    const fakePhone = '13900009999'
    const attempts = Array.from({ length: 6 }, () =>
      authService.login({ phone: fakePhone, password: 'wrong' }).catch((e) => e)
    )

    const results = await Promise.all(attempts)

    // 前 5 次返回 PASSWORD_WRONG，第 6 次触发 TOO_MANY_REQUESTS
    const lockedError = results.find(
      (r) => r?.code === 429001 || r?.message?.includes('锁定')
    )
    expect(lockedError).toBeTruthy()
  })
})
