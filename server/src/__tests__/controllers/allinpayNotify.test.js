import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/allinpayService.js', () => ({ handleNotify: vi.fn() }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), error: vi.fn() } }));

const { handleNotify } = await import('../../controller/allinpayNotifyController.js');
const allinpayService = await import('../../services/allinpayService.js');

function mockRes() {
  return { type: vi.fn().mockReturnThis(), send: vi.fn() };
}

describe('allinpayNotifyController — 通联支付回调', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('成功回调应返回纯文本 success', async () => {
    allinpayService.handleNotify.mockResolvedValueOnce(true);
    const req = { body: { reqsn: 'T001', trxid: 'P001', trxstatus: 'TRX_SUCCESS' } };
    const res = mockRes();
    await handleNotify(req, res);
    expect(allinpayService.handleNotify).toHaveBeenCalledWith(req.body);
    expect(res.type).toHaveBeenCalledWith('text/plain');
    expect(res.send).toHaveBeenCalledWith('success');
  });

  it('service 抛异常应返回 fail 不 crash', async () => {
    allinpayService.handleNotify.mockRejectedValueOnce(new Error('DB down'));
    const req = { body: { reqsn: 'T002' } };
    const res = mockRes();
    await handleNotify(req, res);
    expect(res.type).toHaveBeenCalledWith('text/plain');
    expect(res.send).toHaveBeenCalledWith('fail');
  });

  it('空 body 也能正常处理不 crash', async () => {
    allinpayService.handleNotify.mockResolvedValueOnce(true);
    const req = { body: {} };
    const res = mockRes();
    await handleNotify(req, res);
    expect(res.send).toHaveBeenCalledWith('success');
  });

  it('body 为 undefined 时 logger 抛 TypeError → catch 返回 fail', async () => {
    const req = {};
    const res = mockRes();
    await handleNotify(req, res);
    expect(res.send).toHaveBeenCalledWith('fail');
  });
});
