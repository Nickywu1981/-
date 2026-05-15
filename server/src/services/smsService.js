/**
 * 短信服务 — 多服务商抽象 + 模板引擎 + 频率控制
 *
 * 支持: mock / aliyun / tencent
 * 配置: config.sms = { provider, providers: { aliyun: {...}, tencent: {...} } }
 */

import * as smsLogDao from '../dao/smsLogDao.js';
import * as smsTemplateDao from '../dao/smsTemplateDao.js';
import config from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
import { renderTemplate, generateCode } from '../utils/templateHelpers.js';
import { registerInterval } from '../utils/shutdownRegistry.js';
import logger from '../utils/logger.js';
import * as codeStore from './codeStore.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// 兜底: Redis 不可用时降级为进程内 Map
// WARNING: Per-process Map — rate limits are bypassable across PM2 cluster workers.
const CODE_CACHE = new Map();
const SMS_SEND_LOG = new Map(); // key: phone, value: [timestamp, ...]
export const _smsCleanupTimer = setInterval(() => {
  try {
  const now = Date.now();
  for (const [key, entry] of CODE_CACHE) {
    if (entry.expires < now) CODE_CACHE.delete(key);
  }
  for (const [key, timestamps] of SMS_SEND_LOG) {
    SMS_SEND_LOG.set(key, timestamps.filter((t) => now - t < 86400000));
    if (SMS_SEND_LOG.get(key)?.length === 0) SMS_SEND_LOG.delete(key);
  }
  } catch (err) { logger.warn('[SMS] cleanup interval error', { error: err.message }); }
}, 300000).unref();
registerInterval(_smsCleanupTimer);

// ==================== 服务商抽象层 ====================

const providers = {
  mock: {
    async send({ phone, content, templateCode }) {
      logger.debug(`[SMS Mock] → ${phone.slice(0,3)}****${phone.slice(-4)} | ${templateCode} | code:***`);
      return { success: true, raw: { code: 'OK', messageId: `mock_${Date.now()}` } };
    },
  },

  aliyun: {
    async send(_payload) {
      const cfg = config.sms?.providers?.aliyun || {};
      if (!cfg.accessKeyId || !cfg.accessKeySecret) {
        throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
      }
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    },
  },

  tencent: {
    async send(_payload) {
      const cfg = config.sms?.providers?.tencent || {};
      if (!cfg.secretId || !cfg.secretKey) {
        throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
      }
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    },
  },
};

function getProvider() {
  const name = config.sms?.provider || 'mock';
  return providers[name] || providers.mock;
}

// ==================== 验证码生成与校验 ====================

function cacheKey(phone, scene) {
  return `sms:${scene}:${phone}`;
}

export async function verifyCode(phone, scene, code) {
  const key = cacheKey(phone, scene);
  // 优先使用 Redis 共享存储（cluster 模式兼容）
  const result = await codeStore.verifyCode(key, code, 5);
  if (result.valid) {
    // 验证通过标记（Redis）
    try { await codeStore.saveCode(`verified:sms:${phone}`, '1', 300); } catch (e) { logger.warn('短信验证标记保存失败', { phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), error: e.message }); }
    return { valid: true };
  }
  // Redis 不可用时降级为进程内 Map
  if (result.reason === 'error') {
    const stored = CODE_CACHE.get(key);
    if (!stored) return { valid: false, reason: '验证码不存在或已过期' };
    if (Date.now() - stored.time > 300000) { CODE_CACHE.delete(key); return { valid: false, reason: '验证码已过期' }; }
    stored.attempts = (stored.attempts || 0) + 1;
    if (stored.attempts > 5) { CODE_CACHE.delete(key); return { valid: false, reason: '尝试次数过多' }; }
    if (stored.code !== String(code)) return { valid: false, reason: '验证码错误' };
    CODE_CACHE.delete(key);
    CODE_CACHE.set(`verified:sms:${phone}`, { time: Date.now() });
    return { valid: true };
  }
  return { valid: false, reason: result.reason === 'max_attempts' ? '尝试次数过多，请重新获取验证码' : result.reason === 'not_found' ? '验证码不存在或已过期' : '验证码错误' };
}

/** @unused — 无路由/中间件调用此函数，验证状态写入后未被消费 */
export async function checkVerified(phone) {
  const key = `verified:sms:${phone}`;
  try {
    const result = await codeStore.verifyCode(key, '1', 1);
    if (result.valid || result.reason === 'mismatch') return true;
  } catch { logger.warn('[SMS] checkVerified Redis 查询失败', { phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }); }
  // 降级: 进程内 Map
  const entry = CODE_CACHE.get(key);
  if (!entry || Date.now() - entry.time > 300000) { CODE_CACHE.delete(key); return false; }
  CODE_CACHE.delete(key);
  return true;
}

// ==================== 核心发送方法 ====================

export async function sendVerificationCode({ phone, scene }) {
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { code: ERROR_CODE.SMS_PHONE_INVALID, success: false, msg: 'Invalid phone number format' };
  }

  const key = cacheKey(phone, scene);
  const existing = CODE_CACHE.get(key);
  if (existing && Date.now() - existing.time < 60000) {
    return { code: ERROR_CODE.SMS_CODE_COOLDOWN, success: false, msg: 'Code already sent, please wait 60s' };
  }

  const hourlyCount = await smsLogDao.countByPhoneLastHour(phone);
  if (hourlyCount >= 5) return { code: ERROR_CODE.SMS_HOURLY_LIMIT, success: false, msg: 'Hourly limit exceeded' };

  const dailyCount = await smsLogDao.countByPhoneToday(phone);
  if (dailyCount >= 10) return { code: ERROR_CODE.SMS_DAILY_LIMIT, success: false, msg: 'Daily limit exceeded' };

  const templateCodeMap = {
    register: 'sms_register_code',
    login: 'sms_login_code',
    reset_password: 'sms_reset_password',
    bind: 'sms_bind_code',
  };
  const templateCode = templateCodeMap[scene];
  if (!templateCode) return { code: ERROR_CODE.SMS_SCENE_INVALID, success: false, msg: 'Unsupported scenario' };

  const template = await smsTemplateDao.findByCode(templateCode);
  if (!template) return { code: ERROR_CODE.SMS_TEMPLATE_MISSING, success: false, msg: 'SMS template not configured' };

  const code = generateCode(6);
  const content = renderTemplate(template.content, { code });
  const provider = getProvider();

  try {
    await provider.send({
      phone,
      content,
      templateCode,
      params: { code },
      providerTemplateId: template.provider_template_id,
    });

    CODE_CACHE.set(key, { code, time: Date.now() });
    await codeStore.saveCode(key, code, 300).catch(err => logger.warn('[SMS] Redis 验证码存储失败，降级使用内存', { error: err.message }));

    await smsLogDao.insertLog({
      templateCode,
      phone,
      params: { code_masked: '******' },
      content,
      result: true,
      provider: config.sms?.provider || 'mock',
    });

    return { code: ERROR_CODE.SMS_CODE_SENT, success: true, msg: 'Verification code sent', expire: 300 };
  } catch (e) {
    logger.error('[SMS] sendVerificationCode failed', { error: e.message });
    await smsLogDao.insertLog({
      templateCode,
      phone,
      params: { code_masked: '******' },
      content,
      result: false,
      provider: config.sms?.provider || 'mock',
    });
    return { code: ERROR_CODE.SMS_SEND_FAILED, success: false, msg: 'SMS send failed' };
  }
}

// ==================== 通知类短信 ====================

export async function sendNotification(phone, { scene, templateCode, params }) {
  // 格式校验
  if (!phone || !/^\+?[\d\- ]{7,20}$/.test(phone)) {
    return { code: ERROR_CODE.PARAM_INVALID, success: false, msg: 'Invalid phone number' };
  }

  // 频率控制：每小时 10 条、每日 30 条
  const now = Date.now();
  const sends = (SMS_SEND_LOG.get(phone) || []).filter(t => now - t < 86400000);
  const hourSends = sends.filter(t => now - t < 3600000).length;
  if (hourSends >= 10) return { code: ERROR_CODE.QUOTA_EXCEEDED, success: false, msg: 'Hourly notification limit exceeded' };
  if (sends.length >= 30) return { code: ERROR_CODE.QUOTA_EXCEEDED, success: false, msg: 'Daily notification limit exceeded' };
  sends.push(now);
  SMS_SEND_LOG.set(phone, sends);

  const template = templateCode
    ? await smsTemplateDao.findByCode(templateCode)
    : await smsTemplateDao.findByCode(scene);

  if (!template) return { code: ERROR_CODE.SMS_TEMPLATE_MISSING, success: false, msg: 'SMS template not configured' };

  const content = renderTemplate(template.content, params || {});
  const provider = getProvider();

  try {
    await provider.send({
      phone, content,
      templateCode: template.template_code,
      params,
      providerTemplateId: template.provider_template_id,
    });
    await smsLogDao.insertLog({
      templateCode: template.template_code, phone, params,
      content, result: true, provider: config.sms?.provider || 'mock',
    });
    return { code: ERROR_CODE.SMS_CODE_SENT, success: true, msg: 'Sent successfully' };
  } catch (e) {
    logger.error('[SMS] sendNotification failed', { error: e.message });
    await smsLogDao.insertLog({
      templateCode: template.template_code, phone, params,
      content, result: false, provider: config.sms?.provider || 'mock',
    });
    return { code: ERROR_CODE.SMS_SEND_FAILED, success: false, msg: 'Send failed' };
  }
}

// ==================== 模板管理 ====================

export async function getTemplates() {
  return smsTemplateDao.listTemplates();
}

export async function updateTemplate(id, fields) {
  return smsTemplateDao.updateTemplate(id, fields);
}

export async function createTemplate(fields) {
  return smsTemplateDao.insertTemplate(fields);
}

export async function deleteTemplate(id) {
  const affected = await smsTemplateDao.deleteTemplate(id);
  if (affected === 0) throw new BusinessError(ERROR_CODE.NOT_FOUND);
}

// ==================== 日志查询 ====================

export async function getLogs(filters) {
  return smsLogDao.listLogs(filters);
}
