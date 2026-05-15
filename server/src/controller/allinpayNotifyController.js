import * as allinpayService from '../services/allinpayService.js';
import { isProduction } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * 通联支付异步回调处理器
 *
 * 重要：必须返回纯文本 "success" 或 "fail"，不能返回 JSON
 */
export async function handleNotify(req, res) {
  try {
    const body = req.body;
    logger.info('[Allinpay] 回调接收', { reqsn: body.reqsn, trxid: body.trxid, trxstatus: body.trxstatus });

    const ok = await allinpayService.handleNotify(body);

    res.type('text/plain').send(ok ? 'success' : 'fail');
  } catch (err) {
    logger.error('[Allinpay] 回调处理异常', { reqsn: req.body?.reqsn, trxid: req.body?.trxid, error: err.message, ...(!isProduction && { stack: err.stack }) });
    res.type('text/plain').send('fail');
  }
}
