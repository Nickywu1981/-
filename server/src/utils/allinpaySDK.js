/**
 * 通联支付聚合收银台 SDK
 *
 * 负责：签名构造、RSA签名/验签、统一下单 HTTP 调用
 * 零外部依赖：使用 Node.js 内置 crypto + 项目已有的 fetch
 */
import crypto from 'crypto';
import { promises as fs } from 'fs';
import allinpayConfig from '../config/allinpay.js';
import logger from './logger.js';
import { BusinessError } from './businessError.js';

// ==================== 密钥缓存 ====================

let _privateKey = null;
let _publicKey = null;

async function getPrivateKey() {
  if (_privateKey) return _privateKey;
  try {
    _privateKey = await fs.readFile(allinpayConfig.privateKeyPath, 'utf-8');
  } catch {
    if (!allinpayConfig.isSandbox) {
      logger.warn('[Allinpay] 私钥文件未找到: ' + allinpayConfig.privateKeyPath);
    }
    _privateKey = '';
  }
  return _privateKey;
}

async function getPublicKey() {
  if (_publicKey) return _publicKey;
  try {
    _publicKey = await fs.readFile(allinpayConfig.publicKeyPath, 'utf-8');
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

async function rsaSign(signStr) {
  const privateKey = await getPrivateKey();
  if (!privateKey) throw new BusinessError(503, '商户私钥未配置');
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(signStr, 'utf-8');
  return sign.sign(privateKey, 'base64');
}

// ==================== RSA 验签 ====================

async function rsaVerify(signStr, signature) {
  const publicKey = await getPublicKey();
  if (!publicKey) throw new BusinessError(503, '通联公钥未配置');
  const verify = crypto.createVerify('RSA-SHA1');
  verify.update(signStr, 'utf-8');
  return verify.verify(publicKey, signature, 'base64');
}

// ==================== Mock 模式检测 ====================

async function isMockMode() {
  return allinpayConfig.isSandbox && (!allinpayConfig.cusid || !(await getPrivateKey()));
}

// ==================== 支付渠道映射 ====================

/** 通联 paytype 代码映射 */
const PAYTYPE_MAP = {
  wechat: 'W02',    // 微信JS支付
  alipay: 'A02',    // 支付宝JS支付
  unionpay: 'U02',  // 云闪付JS支付
};

// ==================== 统一下单 ====================

/**
 * 调用通联聚合收银台统一下单接口
 * Mock 模式：无真实商户号/密钥时，返回本地模拟 H5 支付页 URL
 * 对齐官方文档: https://prodoc.allinpay.com/project-32/doc-2615/
 * @param {Object} params - { trxamt, reqsn, payChannel, body, remark, validtime, notifyUrl, frontUrl }
 * @returns {Promise<{payUrl: string, reqsn: string, trxid: string}>}
 */
export async function unifiedOrder(params) {
  // ---- Mock 模式：模拟通联响应 ----
  if (await isMockMode()) {
    logger.info('[Allinpay Mock] 统一下单', { reqsn: params.reqsn, trxamt: params.trxamt });
    return {
      payUrl: `${allinpayConfig.returnUrl}?reqsn=${params.reqsn}&mock=1&amount=${params.trxamt}`,
      reqsn: params.reqsn,
      trxid: `MOCK_${Date.now()}`,
    };
  }

  // ---- 真实模式：聚-合-收银台 4.12 统一下单 ----
  const paytype = PAYTYPE_MAP[params.payChannel] || 'W02';
  const now = new Date();
  // expiretime 格式: yyyyMMddHHmmss
  const expireMinutes = parseInt(params.validtime, 10) || 30;
  const expireTime = params.validtime
    ? new Date(now.getTime() + expireMinutes * 60000).toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    : '';

  const postData = {
    cusid: allinpayConfig.cusid,
    appid: allinpayConfig.appid,
    version: '12',
    charset: 'UTF-8',
    randomstr: crypto.randomBytes(4).toString('hex'),
    trxamt: String(params.trxamt),
    reqsn: params.reqsn,
    paytype,
    body: params.body || 'Movio会员充值',
    remark: params.remark || '',
    notify_url: params.notifyUrl || allinpayConfig.notifyUrl,
    front_url: params.frontUrl || allinpayConfig.frontUrl || '',
    expiretime: expireTime,
    signtype: allinpayConfig.signType,
  };

  const signStr = buildSignString(postData);
  postData.sign = await rsaSign(signStr);

  logger.info('[Allinpay] 统一下单请求', { reqsn: postData.reqsn, trxamt: postData.trxamt, paytype });

  const bodyStr = new URLSearchParams(
    Object.fromEntries(Object.entries(postData).filter(([, v]) => v !== '')),
  ).toString();

  let res;
  try {
    res = await fetch(allinpayConfig.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyStr,
      signal: AbortSignal.timeout(30000),
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

  logger.info('[Allinpay] 统一下单响应', { retcode: result.retcode, retmsg: result.retmsg, trxid: result.trxid, reqsn: postData.reqsn });

  if (result.retcode !== 'SUCCESS') {
    throw new BusinessError(502, result.retmsg || '支付下单失败');
  }

  const respSign = result.sign;
  if (respSign) {
    const verifyStr = buildSignString(result);
    if (!(await rsaVerify(verifyStr, respSign))) {
      logger.error('[Allinpay] 响应验签失败，拒绝响应', { reqsn: postData.reqsn });
      throw new BusinessError(502, '支付网关签名验证失败');
    }
  } else if (!(await isMockMode())) {
    logger.error('[Allinpay] 响应缺少 sign 字段', { reqsn: postData.reqsn });
    throw new BusinessError(502, '支付网关响应缺少签名');
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
export async function verifyNotify(body) {
  // Mock 模式仅在非生产环境且调用方显式标记为 sanbox 允许跳过验签
  if (await isMockMode()) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[Allinpay] 生产环境禁止 Mock 模式验签跳过');
      return false;
    }
    logger.info('[Allinpay Mock] 回调验签跳过 (非生产环境)');
    return true;
  }

  const { sign, ...rest } = body;
  if (!sign) {
    logger.warn('[Allinpay] 回调缺少 sign 字段');
    return false;
  }
  const signStr = buildSignString(rest);
  return await rsaVerify(signStr, sign);
}
