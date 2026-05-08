import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DAOs and dependencies
vi.mock('../../dao/db.js', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[{ affectedRows: 1 }]]),
    query: vi.fn().mockResolvedValue([[{ affectedRows: 1 }]]),
    getConnection: vi.fn().mockResolvedValue({ execute: vi.fn(), release: vi.fn() }),
  },
}));
vi.mock('../../dao/allinpayDao.js', () => ({
  default: {
    create: vi.fn().mockResolvedValue(1),
    getByReqsn: vi.fn().mockResolvedValue(null),
    markPaid: vi.fn().mockResolvedValue(1),
    markFailed: vi.fn().mockResolvedValue(undefined),
    logNotify: vi.fn().mockResolvedValue(undefined),
    isCallbackProcessed: vi.fn().mockResolvedValue(false),
  },
}));
vi.mock('../../dao/membershipDao.js', () => ({
  default: {
    findByUserId: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../dao/rechargeDao.js', () => ({
  default: {
    getByOrderNo: vi.fn().mockResolvedValue(null),
    markPaid: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../utils/allinpaySDK.js', () => ({
  unifiedOrder: vi.fn().mockResolvedValue({ payUrl: 'https://sandbox.allinpay.com/pay/test', trxid: 'TXN_TEST' }),
  verifyNotify: vi.fn().mockReturnValue(true),
}));
vi.mock('../../config/allinpay.js', () => ({
  default: { isSandbox: true },
}));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../dao/creditDao.js', () => ({
  getPlanByType: vi.fn().mockResolvedValue({ id: 2, type: 2, name: '季卡', credits: 200, status: 1 }),
  getMembership: vi.fn().mockResolvedValue({ plan_type: 0, end_time: null }),
  createCreditRecord: vi.fn().mockResolvedValue({ id: 1 }),
  listActivePlans: vi.fn().mockResolvedValue([]),
}));

import * as payment from '../../services/paymentService.js';
import allinpayDao from '../../dao/allinpayDao.js';
import * as allinpaySDK from '../../utils/allinpaySDK.js';

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset key mocks to defaults after clear
    allinpayDao.create.mockResolvedValue(1);
    allinpaySDK.unifiedOrder.mockResolvedValue({ payUrl: 'https://sandbox.allinpay.com/pay/test', trxid: 'TXN_TEST' });
    allinpaySDK.verifyNotify.mockReturnValue(true);
  });

  describe('getPlans', () => {
    it('should return all 3 plans', () => {
      const plans = payment.getPlans();
      expect(plans).toHaveLength(3);
      expect(plans[0].planType).toBe(1);
      expect(plans[0].name).toBe('月卡');
    });
  });

  describe('createPaymentOrder', () => {
    it('should create order for monthly plan', async () => {
      const result = await payment.createPaymentOrder(1, { planType: 1, payChannel: 'wechat' });
      expect(result.reqsn).toMatch(/^MOV/);
      expect(result.amount).toBe(29);
      expect(result.planName).toBe('月卡');
      expect(result.payChannel).toBe('wechat');
      expect(result.payUrl).toBeTruthy();
    });

    it('should create order for yearly plan with alipay', async () => {
      const result = await payment.createPaymentOrder(1, { planType: 3, payChannel: 'alipay' });
      expect(result.amount).toBe(199);
      expect(result.planName).toBe('年卡');
      expect(result.payChannel).toBe('alipay');
    });

    it('should reject invalid plan type', async () => {
      await expect(payment.createPaymentOrder(1, { planType: 99 })).rejects.toThrow('无效套餐');
    });

    it('should reject invalid pay channel', async () => {
      await expect(payment.createPaymentOrder(1, { planType: 1, payChannel: 'bitcoin' })).rejects.toThrow('支付方式');
    });
  });

  describe('sandboxPay', () => {
    it('should pay an existing order', async () => {
      allinpayDao.getByReqsn.mockResolvedValue({
        reqsn: 'MOV_TEST', status: 0, order_type: 'membership',
        amount: 69, user_id: 1, trxid: null, pay_channel: 'wechat',
      });
      const result = await payment.sandboxPay('MOV_TEST');
      expect(result.status).toBe('paid');
      expect(result.reqsn).toBe('MOV_TEST');
    });

    it('should reject non-existent order', async () => {
      allinpayDao.getByReqsn.mockResolvedValue(null);
      await expect(payment.sandboxPay('NOT_EXIST')).rejects.toThrow('订单不存在');
    });
  });

  describe('getOrder', () => {
    it('should return order details', async () => {
      allinpayDao.getByReqsn.mockResolvedValue({
        reqsn: 'MOV_TEST', status: 0, trxid: null, amount: '69.00',
        pay_channel: 'wechat', expire_time: '2026-01-01', pay_time: null,
        create_time: '2026-01-01',
      });
      const detail = await payment.getOrder('MOV_TEST');
      expect(detail.reqsn).toBe('MOV_TEST');
      expect(detail.status).toBe(0);
    });

    it('should reject non-existent order', async () => {
      allinpayDao.getByReqsn.mockResolvedValue(null);
      await expect(payment.getOrder('NOPE', 999)).rejects.toThrow('订单不存在');
    });
  });
});
