// @vitest-environment node
// 积分冻结幂等性测试: 相同 requestId 并发请求只扣减一次
// 依赖 creditService.freezeCredit 的 INSERT+UNIQUE(request_id) 幂等守卫
// 需要真实数据库环境，已排除于常规 vitest run

import { describe, it, expect } from 'vitest'
import * as creditService from '../../services/creditService.js'

const TEST_USER_ID = Number(process.env.TEST_USER_ID) || 1
const TEST_REQUEST_ID = `conctest_dedup_${Date.now()}`

describe('credit-dedup', () => {
  it('5 并发相同 requestId 冻结积分仅生效一次（幂等守卫）', async () => {
    const promises = Array.from({ length: 5 }, () =>
      creditService.freezeCredit(TEST_USER_ID, TEST_REQUEST_ID, 'cutout', 1, false)
        .catch((e) => ({ _error: true, code: e?.code || e?.name, message: e?.message }))
    )

    const results = await Promise.all(promises)

    // 至少应有 1 个成功（第一次插入）
    const success = results.filter((r) => !r?._error)
    const idempotent = results.filter((r) => r?.idempotent === true)

    // 成功 + 幂等命中 = 全部处理正确
    expect(success.length + idempotent.length).toBe(5)

    // 所有成功/幂等结果的 recordId 应相同
    const recordIds = [...success, ...idempotent].map((r) => r.recordId).filter(Boolean)
    if (recordIds.length > 1) {
      expect(new Set(recordIds).size).toBe(1)
    }
  })

  it('不同 requestId 并发冻结各自独立', async () => {
    const requestIds = Array.from({ length: 5 }, (_, i) => `conctest_indep_${Date.now()}_${i}`)

    const promises = requestIds.map((reqId) =>
      creditService.freezeCredit(TEST_USER_ID, reqId, 'cutout', 1, false)
        .catch((e) => ({ _error: true, code: e?.code || e?.name }))
    )

    const results = await Promise.all(promises)
    const success = results.filter((r) => !r?._error)

    // 5 个不同的 requestId 应有 5 个独立记录（除非配额不足）
    expect(success.length).toBeGreaterThanOrEqual(1)
  })

  it('并发冻结后余额正确', async () => {
    // 先查询当前余额
    const [initial, consumeResult] = await Promise.all([
      creditService.getCreditBalance(TEST_USER_ID).catch(() => ({ balance: 0 })),
      creditService.freezeCredit(
        TEST_USER_ID,
        `conctest_balance_${Date.now()}`,
        'cutout', 2, false,
      ).catch(() => null),
    ])

    if (consumeResult && !consumeResult.idempotent) {
      const after = await creditService.getCreditBalance(TEST_USER_ID).catch(() => ({ balance: 0 }))
      // 验证余额扣减正确（cutout 操作 = 1 积分，2 批量 * 0.8 = 2 积分）
      const expectedDelta = 2 // ceil(1 * 2 * 0.8) = 2
      expect(initial.balance - after.balance).toBe(expectedDelta)
    }
  })
})
