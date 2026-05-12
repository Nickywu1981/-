import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn(), query: vi.fn() } }));

import pool from '../../dao/db.js';
import {
  EVENT, getFunnelMetrics, getActiveUsers, getConversionFunnel,
} from '../../services/analyticsService.js';

// ============================================================
// EVENT 常量
// ============================================================
describe('EVENT constants', () => {
  it('定义所有关键事件类型', () => {
    expect(EVENT.PAGE_VIEW).toBe('page_view');
    expect(EVENT.REGISTER).toBe('register');
    expect(EVENT.FIRST_UPLOAD).toBe('first_upload');
    expect(EVENT.FIRST_GENERATE).toBe('first_generate');
    expect(EVENT.UPGRADE_CLICK).toBe('upgrade_click');
    expect(EVENT.PAYMENT_START).toBe('payment_start');
    expect(EVENT.PAYMENT_SUCCESS).toBe('payment_success');
    expect(EVENT.TOOL_USE).toBe('tool_use');
    expect(EVENT.SHARE).toBe('share');
    expect(EVENT.INVITE).toBe('invite');
  });

  it('共 10 个事件类型', () => {
    expect(Object.keys(EVENT)).toHaveLength(10);
  });
});

// ============================================================
// getFunnelMetrics — 数据映射
// ============================================================
describe('getFunnelMetrics', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('正常数据：计算各项转化率', async () => {
    pool.query.mockResolvedValue([[{
      registrations: 100, first_uploads: 80, first_generates: 60, payments: 20,
    }]]);

    const result = await getFunnelMetrics(30);
    expect(result.registrations).toBe(100);
    expect(result.firstUploads).toBe(80);
    expect(result.uploadRate).toBe('80.0');
    expect(result.generateRate).toBe('60.0');
    expect(result.payRate).toBe('20.0');
  });

  it('零注册时转化率均为 0', async () => {
    pool.query.mockResolvedValue([[{
      registrations: 0, first_uploads: 0, first_generates: 0, payments: 0,
    }]]);

    const result = await getFunnelMetrics();
    expect(result.uploadRate).toBe('0');
    expect(result.generateRate).toBe('0');
    expect(result.payRate).toBe('0');
  });

  it('BigInt 类型正确转为 Number', async () => {
    pool.query.mockResolvedValue([[{
      registrations: BigInt(1000), first_uploads: BigInt(500),
      first_generates: BigInt(250), payments: BigInt(50),
    }]]);

    const result = await getFunnelMetrics();
    expect(typeof result.registrations).toBe('number');
    expect(result.registrations).toBe(1000);
    expect(result.payRate).toBe('5.0');
  });

  it('使用默认 30 天窗口', async () => {
    pool.query.mockResolvedValue([[{ registrations: 1, first_uploads: 0, first_generates: 0, payments: 0 }]]);
    await getFunnelMetrics();
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['operation_log', 30]);
  });

  it('自定义时间窗口', async () => {
    pool.query.mockResolvedValue([[{ registrations: 1, first_uploads: 1, first_generates: 1, payments: 0 }]]);
    await getFunnelMetrics(7);
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['operation_log', 7]);
  });
});

// ============================================================
// getActiveUsers — DAU/MAU
// ============================================================
describe('getActiveUsers', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('返回 DAU/MAU 数字', async () => {
    pool.query
      .mockResolvedValueOnce([[{ count: BigInt(450) }]])
      .mockResolvedValueOnce([[{ count: BigInt(3200) }]]);

    const result = await getActiveUsers();
    expect(result).toEqual({ dau: 450, mau: 3200 });
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// getConversionFunnel — 五步漏斗
// ============================================================
describe('getConversionFunnel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('五步漏斗转换率正确', async () => {
    pool.query.mockResolvedValue([[
      { landing: 1000, registered: 300, activated: 150, paid: 30, retained: 10 },
    ]]);

    const result = await getConversionFunnel();
    expect(result.steps).toHaveLength(5);
    expect(result.steps[0]).toEqual({ name: '访问落地', count: 1000, rate: '100%' });
    expect(result.steps[1]).toEqual({ name: '注册', count: 300, rate: '30.0%' });
    expect(result.steps[2]).toEqual({ name: '激活(首次生成)', count: 150, rate: '50.0%' });
    expect(result.steps[3]).toEqual({ name: '付费转化', count: 30, rate: '20.0%' });
    expect(result.steps[4]).toEqual({ name: '7日留存', count: 10, rate: '6.7%' });
  });

  it('零数据时各步 count 为 0 rate 为 0%', async () => {
    pool.query.mockResolvedValue([[{
      landing: 0, registered: 0, activated: 0, paid: 0, retained: 0 },
    ]]);

    const result = await getConversionFunnel();
    result.steps.forEach(step => {
      expect(step.count).toBe(0);
    });
    expect(result.steps[0].rate).toBe('100%'); // landing always 100%
    expect(result.steps[1].rate).toBe('0%');   // 0/0 → '0%'
  });
});
