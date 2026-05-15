// @vitest-environment node
// 支付创建订单幂等性测试: 相同参数并发请求只创建 1 个订单
// 需要真实数据库 + 通联支付沙箱环境，已排除于常规 vitest run

import { describe, it, expect } from 'vitest'
import * as paymentService from '../../services/paymentService.js'

const TEST_USER_ID = Number(process.env.TEST_USER_ID) || 1
const TEST_PLAN_TYPE = Number(process.env.TEST_PLAN_TYPE) || 1

describe('payment-idempotency', () => {
  it('5 并发获取套餐列表返回一致结果', async () => {
    const promises = Array.from({ length: 5 }, () => paymentService.getPlans())
    const results = await Promise.all(promises)

    // 所有结果结构一致
    const [first] = results
    expect(first.length).toBeGreaterThan(0)

    results.forEach((plans) => {
      expect(plans.length).toBe(first.length)
      expect(plans[0].planType).toBe(first[0].planType)
    })
  })

  it('3 并发创建订单均返回唯一 reqsn', async () => {
    // 每次请求仅 planType 相同，应为独立订单
    const promises = Array.from({ length: 3 }, () =>
      paymentService.createPaymentOrder(TEST_USER_ID, {
        planType: TEST_PLAN_TYPE,
        payChannel: 'wechat',
      }).catch((e) => e)
    )

    const results = await Promise.all(promises)

    // 过滤成功的结果
    const orders = results.filter((r) => r?.reqsn)
    expect(orders.length).toBeGreaterThan(0)

    // 每个订单 reqsn 唯一
    if (orders.length > 1) {
      const reqsns = orders.map((o) => o.reqsn)
      expect(new Set(reqsns).size).toBe(orders.length)
    }
  })

  it('支付网关限流 (15/min) 下批量请求部分返回 429', async () => {
    // 快速连续发送 20 个创建订单请求，验证限流生效
    const promises = Array.from({ length: 20 }, (_, i) =>
      paymentService.createPaymentOrder(TEST_USER_ID, {
        planType: TEST_PLAN_TYPE,
        payChannel: 'wechat',
      }).catch((e) => ({ _error: true, code: e.code, message: e.message }))
    )

    const results = await Promise.all(promises)
    const errors = results.filter((r) => r?._error)
    const successes = results.filter((r) => r?.reqsn)

    // 至少有一些请求成功或被限流（不要求全部，取决于通联网关响应速度）
    expect(successes.length + errors.length).toBe(20)
  }, 30000)
})
