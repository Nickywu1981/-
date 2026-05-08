/**
 * 通联支付聚合收银台 SDK
 *
 * 负责：签名构造、RSA签名/验签、统一下单 HTTP 调用
 * 零外部依赖：使用 Node.js 内置 crypto + 项目已有的 fetch
 */
import crypto from 'crypto';
import { readFileSync } from 'fs';
import allinpayConfig from '../config/allinpay.js';
import logger from './logger.js';
import { BusinessError } from './businessError.js';

// ==================== 密钥缓存 ====================

let _privateKey = null;
let _publicKey = null;

function getPrivateKey() {
  if (_privateKey) return _privateKey;
  try {
    _privateKey = readFileSync(allinpayConfig.privateKeyPath, 'utf-8');
  } catch {
    if (!allinpayConfig.isSandbox) {
      logger.warn('[Allinpay] 私钥文件未找到: ' + allinpayConfig.privateKeyPath);
    }
    _privateKey = '';
  }
  return _privateKey;
}

function getPublicKey() {
  if (_publicKey) return _publicKey;
  try {
    _publicKey = readFileSync(allinpayConfig.publicKeyPath, 'utf-8');
  } catch {
    if (!allinpayConfig.isSandbox) {
      logger.warn('[Allinpay] 公钥文件未找到: ' + allinpayConfig.publicKeyPath);
    }
    _publicKey = '';
  }
  return _publicKey;
}

// ==================== 签名构造 ====================

/**
 * 构造待签名字符串
 * 规则: 除 sign 外所有非空字段按 ASCII 排序 → key=value&key=value&...
 */
export function buildSignString(params) {
  const keys = Object.keys(params)
    .filter(k => k !== 'sign' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .sort();
  return keys.map(k => `${k}=${params[k]}`).join('&');
}

// ==================== RSA 签名 ====================

export function rsaSign(signStr) {
  const privateKey = getPrivateKey();
  if (!privateKey) throw new BusinessError(503, '商户私钥未配置');
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(signStr, 'utf-8');
  return sign.sign(privateKey, 'base64');
}

// ==================== RSA 验签 ====================

export function rsaVerify(signStr, signature) {
  const publicKey = getPublicKey();
  if (!publicKey) throw new BusinessError(503, '通联公钥未配置');
  const verify = crypto.createVerify('RSA-SHA1');
  verify.update(signStr, 'utf-8');
  return verify.verify(publicKey, signature, 'base64');
}

// ==================== Mock 模式检测 ====================

function isMockMode() {
  return allinpayConfig.isSandbox && (!allinpayConfig.cusid || !getPrivateKey());
}

// ==================== 统一下单 ====================

/**
 * 调用通联聚合收银台统一下单接口
 * Mock 模式：无真实商户号/密钥时，返回本地模拟 H5 支付页 URL
 * @param {Object} params - { trxamt, reqsn, body, remark, validtime, acct }
 * @returns {Promise<{payUrl: string, reqsn: string, trxid: string}>}
 */
export async function unifiedOrder(params) {
  // ---- Mock 模式：模拟通联响应 ----
  if (isMockMode()) {
    logger.info('[Allinpay Mock] 统一下单', { reqsn: params.reqsn, trxamt: params.trxamt });
    return {
      payUrl: `${allinpayConfig.returnUrl}?reqsn=${params.reqsn}&mock=1&amount=${params.trxamt}`,
      reqsn: params.reqsn,
      trxid: `MOCK_${Date.now()}`,
    };
  }

  // ---- 真实模式 ----
  const postData = {
    cusid: allinpayConfig.cusid,
    appid: allinpayConfig.appid,
    trxamt: String(params.trxamt),
    reqsn: params.reqsn,
    notify_url: allinpayConfig.notifyUrl,
    body: params.body || 'Movio会员充值',
    remark: params.remark || '',
    validtime: params.validtime || '30',
    acct: params.acct || '',
    sign_type: allinpayConfig.signType,
  };

  const signStr = buildSignString(postData);
  postData.sign = rsaSign(signStr);

  logger.info('[Allinpay] 统一下单请求', { reqsn: postData.reqsn, trxamt: postData.trxamt });

  const bodyStr = new URLSearchParams(postData).toString();

  let res;
  try {
    res = await fetch(allinpayConfig.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyStr,
    });
  } catch (err) {
    logger.error('[Allinpay] 统一下单网络错误', err);
    throw new BusinessError(502, '支付网关连接失败，请稍后重试');
  }

  const raw = await res.text();
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    logger.error('[Allinpay] 统一下单响应解析失败', { raw });
    throw new BusinessError(502, '支付网关响应异常');
  }

  logger.info('[Allinpay] 统一下单响应', result);

  if (result.retcode !== 'SUCCESS') {
    throw new BusinessError(502, result.retmsg || '支付下单失败');
  }

  const respSign = result.sign;
  if (respSign) {
    const verifyStr = buildSignString(result);
    if (!rsaVerify(verifyStr, respSign)) {
      logger.error('[Allinpay] 响应验签失败', { reqsn: postData.reqsn });
    }
  }

  return {
    payUrl: result.pay_url || result.payinfo,
    reqsn: postData.reqsn,
    trxid: result.trxid || '',
  };
}

// ==================== 回调验签 ====================

/**
 * 验证通联异步回调签名
 * @returns {boolean}
 */
export function verifyNotify(body) {
  // Mock 模式跳过验签
  if (isMockMode()) {
    logger.info('[Allinpay Mock] 回调验签跳过');
    return true;
  }

  const { sign, ...rest } = body;
  if (!sign) {
    logger.warn('[Allinpay] 回调缺少 sign 字段');
    return false;
  }
  const signStr = buildSignString(rest);
  return rsaVerify(signStr, sign);
}

export default { buildSignString, rsaSign, rsaVerify, unifiedOrder, verifyNotify };
