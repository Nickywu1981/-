import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn(), query: vi.fn(), getPool: vi.fn() } }));
vi.mock('../../services/paymentService.js');
vi.mock('../../services/allinpayService.js');
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../config/index.js', () => ({
  jwtSecret: 'test-secret', jwtExpiresIn: '7d',
  isDevelopment: true, isProduction: false,
  logConfig: { level: 'info', sampleRate: 1.0, slowQueryMs: 1000 },
  allinpayConfig: {
    env: 'sandbox', cusid: '', appid: '',
    privateKey: null, publicKey: null, isSandbox: true,
    privateKeyPath: './certs/allinpay_private.pem',
    publicKeyPath: './certs/allinpay_public.pem',
    notifyUrl: '', returnUrl: '', frontUrl: '', signType: 'RSA',
    baseUrl: 'https://syb-test.allinpay.com/apiweb/h5unionpay/onepay',
  },
}));
vi.mock('../../utils/sqlGuard.js', () => ({ guardSQL: vi.fn((v) => v) }));

import * as paymentService from '../../services/paymentService.js';
import * as allinpayService from '../../services/allinpayService.js';
import { getPlans, createOrder, getOrderStatus, checkPaymentResult, sandboxPay, getBillingHistory } from '../../controller/paymentController.js';

function mockReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 1, username: 'u1', role: 'user' },
    path: '/api/test',
    method: 'POST',
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { this._jsonBody = body; return this; });
  res.status = vi.fn(function (code) { this.statusCode = code; return this; });
  res.setHeader = vi.fn();
  return res;
}

describe('paymentController', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── getPlans ───
  describe('getPlans', () => {
    it('返回套餐列表', async () => {
      paymentService.getPlans.mockReturnValue([{ id: 1, name: '月卡', price: 29 }]);
      const req = mockReq();
      const res = mockRes();
      await getPlans(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data).toHaveLength(1);
      expect(res._jsonBody.data[0].name).toBe('月卡');
    });
  });

  // ─── createOrder ───
  describe('createOrder', () => {
    it('无效 planType 抛参数错误', async () => {
      const req = mockReq({ body: { planType: 99 } });
      const res = mockRes();
      await createOrder(req, res);
      // PARAM_INVALID = 4202
      expect(res._jsonBody.code).toBe(4202);
    });

    it('缺少 planType 抛参数错误', async () => {
      const req = mockReq({ body: { payChannel: 'alipay' } });
      const res = mockRes();
      await createOrder(req, res);
      expect(res._jsonBody.code).toBe(4202);
    });

    it('创建订单成功（月卡=1）', async () => {
      paymentService.createPaymentOrder.mockResolvedValue({ reqsn: 'ORD001', payUrl: 'https://pay.test/qr' });
      const req = mockReq({ body: { planType: 1, payChannel: 'wechat' } });
      const res = mockRes();
      await createOrder(req, res);
      expect(paymentService.createPaymentOrder).toHaveBeenCalledWith(1, { planType: 1, payChannel: 'wechat' });
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.reqsn).toBe('ORD001');
    });

    it('创建年卡订单成功（planType=3）', async () => {
      paymentService.createPaymentOrder.mockResolvedValue({ reqsn: 'ORD002', payUrl: 'https://pay.test/qr' });
      const req = mockReq({ body: { planType: 3 } });
      const res = mockRes();
      await createOrder(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── getOrderStatus ───
  describe('getOrderStatus', () => {
    it('查询订单状态', async () => {
      paymentService.getOrder.mockResolvedValue({ reqsn: 'ORD001', status: 1 });
      const req = mockReq({ params: { reqsn: 'ORD001' } });
      const res = mockRes();
      await getOrderStatus(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.status).toBe(1);
    });
  });

  // ─── checkPaymentResult ───
  describe('checkPaymentResult', () => {
    it('订单不存在抛 PAY_ORDER_NOT_FOUND', async () => {
      allinpayService.queryOrder.mockResolvedValue(null);
      const req = mockReq({ params: { reqsn: 'NONEXIST' } });
      const res = mockRes();
      await checkPaymentResult(req, res);
      expect(res._jsonBody.code).toBeGreaterThanOrEqual(400);
    });

    it('订单存在返回结果', async () => {
      allinpayService.queryOrder.mockResolvedValue({ reqsn: 'ORD001', status: 'SUCCESS' });
      const req = mockReq({ params: { reqsn: 'ORD001' } });
      const res = mockRes();
      await checkPaymentResult(req, res);
      expect(res._jsonBody.code).toBe(200);
    });
  });

  // ─── sandboxPay ───
  describe('sandboxPay', () => {
    it('沙箱支付成功', async () => {
      paymentService.sandboxPay.mockResolvedValue({ reqsn: 'ORD001', status: 1 });
      const req = mockReq({ params: { reqsn: 'ORD001' } });
      const res = mockRes();
      await sandboxPay(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.msg).toMatch(/成功/);
    });
  });

  // ─── getBillingHistory ───
  describe('getBillingHistory', () => {
    it('返回账单列表', async () => {
      paymentService.getBillingHistory.mockResolvedValue([{ id: 1, planType: 1, amount: 29 }]);
      const req = mockReq({ query: { page: '1', pageSize: '10' } });
      const res = mockRes();
      await getBillingHistory(req, res);
      expect(res._jsonBody.code).toBe(200);
      expect(res._jsonBody.data.list).toHaveLength(1);
    });
  });
});
