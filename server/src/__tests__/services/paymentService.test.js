import { describe, it, expect, beforeEach } from 'vitest';

// Mock DAO
vi.mock('../../dao/db.js', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
    getConnection: vi.fn().mockResolvedValue({ execute: vi.fn(), release: vi.fn() }),
  },
}));
vi.mock('../../dao/creditDao.js', () => ({
  getPlanByType: vi.fn().mockResolvedValue({ id: 2, type: 2, name: '季卡', credits: 200, status: 1 }),
  getMembership: vi.fn().mockResolvedValue({ plan_type: 0, end_time: null }),
  createCreditRecord: vi.fn().mockResolvedValue({ id: 1 }),
  listActivePlans: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import * as payment from '../../services/paymentService.js';

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentOrder', () => {
    it('should create a wechat pay order for monthly plan', async () => {
      const result = await payment.createPaymentOrder(1, { planType: 1, payMethod: 'wechat' });
      expect(result.orderId).toContain('PAY');
      expect(result.amount).toBe(29);
      expect(result.payMethod).toBe('wechat');
      expect(result.sandboxPayUrl).toBeTruthy();
    });

    it('should create an alipay order for yearly plan', async () => {
      const result = await payment.createPaymentOrder(1, { planType: 3, payMethod: 'alipay' });
      expect(result.amount).toBe(199);
      expect(result.planName).toBe('年卡');
      expect(result.payMethod).toBe('alipay');
    });

    it('should reject invalid plan type', async () => {
      await expect(payment.createPaymentOrder(1, { planType: 99 })).rejects.toThrow('无效套餐');
    });
  });

  describe('sandboxPay', () => {
    it('should pay an existing order and activate', async () => {
      const order = await payment.createPaymentOrder(1, { planType: 2 });
      const result = await payment.sandboxPay(order.orderId);
      expect(result.status).toBe('activated');
      expect(result.planName).toBe('季卡');
    });

    it('should reject non-existent order', async () => {
      await expect(payment.sandboxPay('NOT_EXIST')).rejects.toThrow('订单不存在');
    });

    it('should reject double payment', async () => {
      const order = await payment.createPaymentOrder(1, { planType: 1 });
      await payment.sandboxPay(order.orderId);
      await expect(payment.sandboxPay(order.orderId)).rejects.toThrow('订单状态异常');
    });
  });

  describe('getOrder', () => {
    it('should return order details', async () => {
      const order = await payment.createPaymentOrder(1, { planType: 2 });
      const detail = await payment.getOrder(order.orderId, 1);
      expect(detail.orderId).toBe(order.orderId);
      expect(detail.status).toBe('pending');
    });

    it('should reject wrong user', async () => {
      const order = await payment.createPaymentOrder(1, { planType: 1 });
      await expect(payment.getOrder(order.orderId, 999)).rejects.toThrow('订单不存在');
    });
  });

  describe('paymentCallback', () => {
    it('should process callback and activate', async () => {
      const order = await payment.createPaymentOrder(1, { planType: 3 });
      const result = await payment.paymentCallback({ orderId: order.orderId, transactionId: 'TXN_001' });
      expect(result.code).toBe('SUCCESS');

      const detail = await payment.getOrder(order.orderId, 1);
      expect(detail.status).toBe('activated');
    });
  });
});
